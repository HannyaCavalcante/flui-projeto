const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { get, run } = require('../db');

const SECRET = () => process.env.JWT_SECRET || 'flui_secret';

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET(),
    { expiresIn: '7d' }
  );
}

function safeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email e senha obrigatórios' });

    const user = await get('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
    if (!user || !bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Credenciais inválidas' });

    res.json({ token: signToken(user), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, car = '' } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: 'Nome, email e senha obrigatórios' });
    if (password.length < 6)
      return res.status(400).json({ error: 'A senha precisa ter ao menos 6 caracteres' });

    const exists = await get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (exists) return res.status(409).json({ error: 'Email já cadastrado' });

    const hash   = bcrypt.hashSync(password, 10);
    const result = await run(
      'INSERT INTO users (name, email, password_hash, role, car) VALUES (?, ?, ?, ?, ?)',
      [name, email.toLowerCase(), hash, 'driver', car]
    );

    const user = await get('SELECT * FROM users WHERE id = ?', [Number(result.lastInsertRowid)]);
    res.status(201).json({ token: signToken(user), user: safeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Token não fornecido' });

    const payload = jwt.verify(token, SECRET());
    const user    = await get('SELECT * FROM users WHERE id = ?', [payload.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(safeUser(user));
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;
