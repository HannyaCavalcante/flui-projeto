const bcrypt    = require('bcryptjs');
const { run, get, initDB } = require('./db');

async function seed() {
  await initDB();

  // Limpar
  await run('DELETE FROM charge_history');
  await run('DELETE FROM reservations');
  await run('DELETE FROM reviews');
  await run('DELETE FROM users');
  await run('DELETE FROM stations');

  // Admin
  await run(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
    ['Admin Flui', 'admin@flui.com', bcrypt.hashSync('admin123', 10), 'admin']
  );

  // Motoristas demo
  const r1 = await run(
    'INSERT INTO users (name, email, password_hash, role, car, level, progress, charges, co2_saved, eco_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    ['Carlos Mendes', 'carlos@flui.com', bcrypt.hashSync('123456', 10), 'driver', 'Tesla Model 3', 12, 78, 87, 1247, 94]
  );
  const driverId = Number(r1.lastInsertRowid);

  const r2 = await run(
    'INSERT INTO users (name, email, password_hash, role, car, level, charges) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ['Ana Souza', 'ana@flui.com', bcrypt.hashSync('123456', 10), 'driver', 'BYD Dolphin', 5, 23]
  );
  const d2 = Number(r2.lastInsertRowid);

  // Estações
  const stations = [
    {
      id: 'eldorado', name: 'Shopping Eldorado',
      address: 'Av. Rebouças, 3970 - Pinheiros, São Paulo',
      connectors: ['CCS2', 'Tipo 2'], power: 150, chargers: 6, available: 3,
      price: 'R$ 2,80/kWh', hours: '24 horas', amenities: ['Café', 'Banheiro', 'Wi-Fi'],
      status: 'Ativo', queue: 'Baixa', rating: 4.8,
      lat: -23.5831, lng: -46.6783, pos_top: 37, pos_left: 56,
      reviews: [[driverId, 5, 'Carregamento rápido e ponto bem sinalizado.'], [d2, 4, 'Ótima estrutura, faltou vaga coberta.']],
    },
    {
      id: 'supercharger-pinheiros', name: 'Tesla Supercharger Pinheiros',
      address: 'Av. Rebouças, 2470 - Pinheiros, São Paulo',
      connectors: ['CCS2', 'CHAdeMO'], power: 250, chargers: 12, available: 8,
      price: 'R$ 2,50/kWh', hours: '06:00 às 23:00', amenities: ['Mercado', 'Banheiro', 'Wi-Fi'],
      status: 'Ativo', queue: 'Média', rating: 4.6,
      lat: -23.5666, lng: -46.6934, pos_top: 54, pos_left: 42,
      reviews: [[driverId, 5, 'Resolvi a recarga enquanto fazia compras.'], [d2, 4, 'Boa potência e fácil de achar.']],
    },
    {
      id: 'shell-vila-olimpia', name: 'Posto Shell Vila Olímpia',
      address: 'Rua Gomes de Carvalho, 1329 - Vila Olímpia, SP',
      connectors: ['Tipo 2'], power: 100, chargers: 4, available: 0,
      price: 'R$ 3,20/kWh', hours: '07:00 às 22:00', amenities: ['Café', 'Banheiro'],
      status: 'Manutenção', queue: 'Alta', rating: 4.2,
      lat: -23.5956, lng: -46.6858, pos_top: 62, pos_left: 62,
      reviews: [[driverId, 4, 'Bom para carga longa.'], [d2, 3, 'Conectores indisponíveis.']],
    },
    {
      id: 'ipiranga-paulista', name: 'Posto Ipiranga Paulista',
      address: 'Av. Paulista, 1578 - Bela Vista, São Paulo',
      connectors: ['CCS2', 'Tipo 2', 'CHAdeMO'], power: 50, chargers: 3, available: 2,
      price: 'Grátis', hours: '24 horas', amenities: ['Café', 'Wi-Fi', 'Banheiro'],
      status: 'Ativo', queue: 'Baixa', rating: 4.9,
      lat: -23.5614, lng: -46.6559, pos_top: 43, pos_left: 69,
      reviews: [[driverId, 5, 'O melhor ponto da região central!'], [d2, 5, 'Mapa certeiro.']],
    },
    {
      id: 'eletroposto-brooklin', name: 'Eletroposto Brooklin',
      address: 'Rua Dr. Renato Paes de Barros, 714 - Brooklin, SP',
      connectors: ['CCS2', 'Tipo 2'], power: 120, chargers: 8, available: 5,
      price: 'R$ 2,60/kWh', hours: '06:00 às 24:00', amenities: ['Wi-Fi', 'Banheiro', 'Estacionamento'],
      status: 'Ativo', queue: 'Baixa', rating: 4.7,
      lat: -23.6010, lng: -46.6929, pos_top: 70, pos_left: 40,
      reviews: [[driverId, 5, 'Ótimo para carregar durante o trabalho.'], [d2, 4, 'Mais vagas cobertas seria perfeito.']],
    },
    {
      id: 'green-charge-moema', name: 'Green Charge Moema',
      address: 'Av. Ibirapuera, 2344 - Moema, São Paulo',
      connectors: ['CCS2', 'CHAdeMO', 'Tipo 2'], power: 180, chargers: 6, available: 4,
      price: 'R$ 2,90/kWh', hours: '07:00 às 22:00', amenities: ['Café', 'Wi-Fi'],
      status: 'Ativo', queue: 'Média', rating: 4.5,
      lat: -23.5968, lng: -46.6647, pos_top: 65, pos_left: 58,
      reviews: [[driverId, 5, 'Excelente localização.'], [d2, 4, 'Preço justo para a região.']],
    },
  ];

  for (const s of stations) {
    await run(
      `INSERT INTO stations
        (id, name, address, connectors, power, chargers, available, price, hours, amenities, status, queue, rating, lat, lng, pos_top, pos_left)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [s.id, s.name, s.address, JSON.stringify(s.connectors), s.power, s.chargers, s.available,
       s.price, s.hours, JSON.stringify(s.amenities), s.status, s.queue, s.rating,
       s.lat, s.lng, s.pos_top, s.pos_left]
    );
    for (const [uid, rating, text] of s.reviews)
      await run('INSERT INTO reviews (station_id, user_id, rating, text) VALUES (?, ?, ?, ?)',
        [s.id, uid, rating, text]);
  }

  // Histórico demo
  await run('INSERT INTO charge_history (station_id, user_id, kwh, duration_min, cost) VALUES (?, ?, ?, ?, ?)',
    ['eldorado', driverId, 45.2, 32, 126.56]);
  await run('INSERT INTO charge_history (station_id, user_id, kwh, duration_min, cost) VALUES (?, ?, ?, ?, ?)',
    ['ipiranga-paulista', driverId, 30.0, 45, 0]);
  await run('INSERT INTO charge_history (station_id, user_id, kwh, duration_min, cost) VALUES (?, ?, ?, ?, ?)',
    ['supercharger-pinheiros', driverId, 60.5, 25, 151.25]);
  await run('INSERT INTO charge_history (station_id, user_id, kwh, duration_min, cost) VALUES (?, ?, ?, ?, ?)',
    ['green-charge-moema', d2, 22.0, 20, 63.80]);

  // Reservas demo
  for (const [sid, uid, conn] of [
    ['eldorado', driverId, 'CCS2'],
    ['ipiranga-paulista', driverId, 'Tipo 2'],
    ['green-charge-moema', d2, 'CHAdeMO'],
  ]) {
    await run(
      "INSERT INTO reservations (station_id, user_id, connector_type, status, expires_at) VALUES (?, ?, ?, 'completed', datetime('now', '-1 day'))",
      [sid, uid, conn]
    );
  }

  console.log('\n✅ Banco de dados populado!\n');
  console.log('  👤 Admin      → admin@flui.com  / admin123');
  console.log('  🚗 Motorista  → carlos@flui.com / 123456');
  console.log('  🚗 Motorista  → ana@flui.com    / 123456\n');
  process.exit(0);
}

seed().catch(err => { console.error(err); process.exit(1); });
