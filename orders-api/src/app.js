require('dotenv').config();

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');

const authRoutes    = require('./routes/auth.routes');
const productRoutes = require('./routes/product.routes');
const orderRoutes   = require('./routes/order.routes');

const app  = express();
const PORT = process.env.PORT || 3002;

// ── Middlewares globales ──────────────────────────────────
app.use(helmet());
app.use(cors());
app.use(express.json());

// ── Rutas ─────────────────────────────────────────────────
app.use('/auth',     authRoutes);
app.use('/products', productRoutes);
app.use('/orders',   orderRoutes);

// ── Health check ──────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status:    'ok',
    service:   'orders-api',
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
  console.log(`✅ orders-api corriendo en http://localhost:${PORT}`);
});

module.exports = app;