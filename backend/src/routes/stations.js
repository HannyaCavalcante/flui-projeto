const router = require('express').Router();
const { get, run, all } = require('../db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

function parse(row) {
  return {
    ...row,
    connectors: JSON.parse(row.connectors || '[]'),
    amenities:  JSON.parse(row.amenities  || '[]'),
    distance:   '-- km',
    confirmations: 0,
    reports: 0,
    coords:   { lat: row.lat,      lng: row.lng },
    position: { top: row.pos_top,  left: row.pos_left },
  };
}

// GET /api/stations
router.get('/', async (req, res) => {
  try {
    const { connector, power, amenity, q, status } = req.query;
    let rows = (await all('SELECT * FROM stations ORDER BY name')).map(parse);

    if (connector && connector !== 'all')
      rows = rows.filter(s => s.connectors.includes(connector));
    if (power)
      rows = rows.filter(s => s.power >= Number(power));
    if (amenity && amenity !== 'all')
      rows = rows.filter(s => s.amenities.includes(amenity));
    if (status)
      rows = rows.filter(s => s.status === status);
    if (q) {
      const term = q.toLowerCase();
      rows = rows.filter(s =>
        [s.name, s.address, ...s.connectors, ...s.amenities].join(' ').toLowerCase().includes(term)
      );
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/stations/:id
router.get('/:id', async (req, res) => {
  try {
    const row = await get('SELECT * FROM stations WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Ponto não encontrado' });

    const station = parse(row);
    const reviews = await all(
      `SELECT r.id, r.rating, r.text, r.created_at, u.name AS driver
       FROM reviews r JOIN users u ON r.user_id = u.id
       WHERE r.station_id = ? ORDER BY r.created_at DESC`,
      [req.params.id]
    );
    res.json({ ...station, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stations/:id/reserve  (driver)
router.post('/:id/reserve', authMiddleware, async (req, res) => {
  try {
    const row = await get('SELECT * FROM stations WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Ponto não encontrado' });
    if (row.available === 0)
      return res.status(409).json({ error: 'Sem conectores disponíveis no momento' });

    const connector = req.body.connector_type || JSON.parse(row.connectors)[0] || '';
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const result = await run(
      'INSERT INTO reservations (station_id, user_id, connector_type, status, expires_at) VALUES (?, ?, ?, ?, ?)',
      [req.params.id, req.user.id, connector, 'confirmed', expiresAt]
    );
    await run(
      'UPDATE stations SET available = MAX(0, available - 1) WHERE id = ?',
      [req.params.id]
    );

    res.status(201).json({
      id: Number(result.lastInsertRowid),
      station_id: req.params.id,
      station_name: row.name,
      connector_type: connector,
      expires_at: expiresAt,
      status: 'confirmed',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stations/:id/reviews  (driver)
router.post('/:id/reviews', authMiddleware, async (req, res) => {
  try {
    const { rating, text } = req.body;
    if (!rating || !text) return res.status(400).json({ error: 'Rating e texto obrigatórios' });
    if (rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating deve ser 1–5' });

    const row = await get('SELECT id FROM stations WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Ponto não encontrado' });

    await run(
      'INSERT INTO reviews (station_id, user_id, rating, text) VALUES (?, ?, ?, ?)',
      [req.params.id, req.user.id, Number(rating), text]
    );

    const avg = await get('SELECT AVG(rating) AS v FROM reviews WHERE station_id = ?', [req.params.id]);
    await run('UPDATE stations SET rating = ROUND(?, 1) WHERE id = ?', [avg.v, req.params.id]);

    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/stations  (admin)
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const {
      name, address, connectors = [], power, chargers = 4, available,
      price = 'Grátis', hours = '24 horas', amenities = [], status = 'Ativo',
      lat, lng, pos_top = 50, pos_left = 50,
    } = req.body;

    if (!name || !address || !power)
      return res.status(400).json({ error: 'Nome, endereço e potência são obrigatórios' });

    const id = `${name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}-${Date.now()}`;

    await run(
      `INSERT INTO stations
        (id, name, address, connectors, power, chargers, available, price, hours, amenities, status, lat, lng, pos_top, pos_left)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, address, JSON.stringify(connectors), power, chargers,
       available ?? chargers, price, hours, JSON.stringify(amenities), status,
       lat ?? null, lng ?? null, pos_top, pos_left]
    );

    const station = parse(await get('SELECT * FROM stations WHERE id = ?', [id]));
    res.status(201).json(station);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/stations/:id  (admin)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const existing = await get('SELECT * FROM stations WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Ponto não encontrado' });

    const { name, address, connectors, power, chargers, available, price, hours, amenities, status, lat, lng } = req.body;

    await run(
      `UPDATE stations SET
        name       = COALESCE(?, name),
        address    = COALESCE(?, address),
        connectors = COALESCE(?, connectors),
        power      = COALESCE(?, power),
        chargers   = COALESCE(?, chargers),
        available  = COALESCE(?, available),
        price      = COALESCE(?, price),
        hours      = COALESCE(?, hours),
        amenities  = COALESCE(?, amenities),
        status     = COALESCE(?, status),
        lat        = COALESCE(?, lat),
        lng        = COALESCE(?, lng)
       WHERE id = ?`,
      [name, address,
       connectors ? JSON.stringify(connectors) : null,
       power, chargers, available, price, hours,
       amenities ? JSON.stringify(amenities) : null,
       status, lat, lng,
       req.params.id]
    );

    res.json(parse(await get('SELECT * FROM stations WHERE id = ?', [req.params.id])));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/stations/:id  (admin)
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const result = await run('DELETE FROM stations WHERE id = ?', [req.params.id]);
    if (!result.rowsAffected) return res.status(404).json({ error: 'Ponto não encontrado' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
