require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const { initDB } = require('./src/db');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(express.json());

app.use('/api/auth',     require('./src/routes/auth'));
app.use('/api/stations', require('./src/routes/stations'));
app.use('/api/users',    require('./src/routes/users'));
app.use('/api/admin',    require('./src/routes/admin'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.use((_req, res) => res.status(404).json({ error: 'Rota não encontrada' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 3001;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🔌 Flui API rodando em http://localhost:${PORT}`);
    console.log(`   GET  /api/health`);
    console.log(`   POST /api/auth/login`);
    console.log(`   POST /api/auth/register`);
    console.log(`   GET  /api/stations\n`);
  });
}).catch(err => {
  console.error('Falha ao inicializar banco:', err);
  process.exit(1);
});
