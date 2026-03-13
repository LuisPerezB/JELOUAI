require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');

const authRoutes     = require('./routes/auth.routes');
const customerRoutes = require('./routes/customer.routes');
const internalRoutes = require('./routes/internal.routes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Middlewares globales ──────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Rutas ─────────────────────────────────────────────────
app.use('/auth',      authRoutes);
app.use('/customers', customerRoutes);
app.use('/internal',  internalRoutes);

// ── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'customers-api',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ── Error handler global ──────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  console.log(`✅ customers-api corriendo en http://localhost:${PORT}`);
});

module.exports = app;