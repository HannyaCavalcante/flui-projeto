const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { get, run, all } = require('../db');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

function safeUser(u) {
  const { password_hash, ...s } = u;
  return s;
}

// GET /api/users/me
router.get('/me', async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/users/me
router.put('/me', async (req, res) => {
  try {
    const { name, car, password } = req.body;
    if (password) {
      if (password.length < 6)
        return res.status(400).json({ error: 'Senha precisa ter ao menos 6 caracteres' });
      await run(
        'UPDATE users SET name = COALESCE(?, name), car = COALESCE(?, car), password_hash = ? WHERE id = ?',
        [name || null, car !== undefined ? car : null, bcrypt.hashSync(password, 10), req.user.id]
      );
    } else {
      await run(
        'UPDATE users SET name = COALESCE(?, name), car = COALESCE(?, car) WHERE id = ?',
        [name || null, car !== undefined ? car : null, req.user.id]
      );
    }
    const user = await get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    res.json(safeUser(user));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/me/history
router.get('/me/history', async (req, res) => {
  try {
    const rows = await all(
      `SELECT ch.*, s.name AS station_name, s.address
       FROM charge_history ch JOIN stations s ON ch.station_id = s.id
       WHERE ch.user_id = ? ORDER BY ch.created_at DESC LIMIT 20`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/users/me/reservations
router.get('/me/reservations', async (req, res) => {
  try {
    const rows = await all(
      `SELECT r.*, s.name AS station_name, s.address
       FROM reservations r JOIN stations s ON r.station_id = s.id
       WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 10`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
