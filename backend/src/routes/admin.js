const router = require('express').Router();
const { get, run, all } = require('../db');
const { adminMiddleware } = require('../middleware/auth');

router.use(adminMiddleware);

// GET /api/admin/metrics
router.get('/metrics', async (req, res) => {
  try {
    const active       = await get("SELECT COUNT(*) AS c FROM stations WHERE status = 'Ativo'");
    const totalSt      = await get("SELECT COUNT(*) AS c FROM stations");
    const avgRating    = await get('SELECT AVG(rating) AS v FROM stations');
    const reservations = await get('SELECT COUNT(*) AS c FROM reservations');
    const drivers      = await get("SELECT COUNT(*) AS c FROM users WHERE role = 'driver'");
    const reviews      = await get('SELECT COUNT(*) AS c FROM reviews');

    res.json({
      activeStations:    active.c,
      totalStations:     totalSt.c,
      avgRating:         avgRating.v ? Number(avgRating.v).toFixed(1) : '0.0',
      totalReservations: reservations.c,
      registeredDrivers: drivers.c,
      totalReviews:      reviews.c,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reports
router.get('/reports', async (req, res) => {
  try {
    const byDay = await all(
      `SELECT date(created_at) AS date, COUNT(*) AS count
       FROM reservations
       WHERE created_at >= datetime('now', '-7 days')
       GROUP BY date(created_at) ORDER BY date`
    );

    const byStation = await all(
      `SELECT s.name, COUNT(r.id) AS reservations
       FROM stations s LEFT JOIN reservations r ON r.station_id = s.id
       GROUP BY s.id ORDER BY reservations DESC LIMIT 6`
    );

    const reviewStats = await all(
      `SELECT s.name, COUNT(rv.id) AS reviews, ROUND(AVG(rv.rating), 1) AS avg_rating
       FROM stations s LEFT JOIN reviews rv ON rv.station_id = s.id
       GROUP BY s.id ORDER BY reviews DESC LIMIT 6`
    );

    res.json({ byDay, byStation, reviewStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const users = await all(
      `SELECT id, name, email, role, car, level, charges, eco_score, created_at
       FROM users ORDER BY created_at DESC`
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/stations/:id/availability
router.patch('/stations/:id/availability', async (req, res) => {
  try {
    const { available } = req.body;
    if (available === undefined || available < 0)
      return res.status(400).json({ error: 'Valor inválido para available' });

    const row = await get('SELECT chargers FROM stations WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Ponto não encontrado' });

    const newVal = Math.min(Number(available), row.chargers);
    await run('UPDATE stations SET available = ? WHERE id = ?', [newVal, req.params.id]);
    res.json({ success: true, available: newVal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
