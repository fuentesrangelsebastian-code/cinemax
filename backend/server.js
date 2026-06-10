require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const publicRoutes = require('./routes/public');
const adminRoutes  = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Middlewares globales ─────────────────────────────────────────────────────
app.use(cors({
  origin: "*",
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger simple en desarrollo
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.path}`);
    next();
  });
}

// ─── Rutas ────────────────────────────────────────────────────────────────────
app.use('/api',        publicRoutes);   // GET /api/peliculas, POST /api/compras
app.use('/api/admin',  adminRoutes);    // POST /api/admin/login, /api/admin/peliculas, etc.

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  timestamp: new Date().toISOString(),
  env: process.env.NODE_ENV,
}));

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

// ─── Error handler global ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({ error: 'Error interno del servidor.' });
});

// ─── Arrancar servidor ────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🎬 CineMax Backend corriendo en http://localhost:${PORT}`);
  console.log(`   Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   BD:      ${process.env.DATABASE_URL ? '✅ Configurada' : '❌ Falta DATABASE_URL'}`);
  console.log(`   SMTP:    ${process.env.SMTP_USER && process.env.SMTP_USER !== 'tucorreo@gmail.com' ? '✅ Configurado' : '⚠️  Modo simulación'}`);
  console.log(`   JWT:     ${process.env.JWT_SECRET ? '✅ Configurado' : '❌ Falta JWT_SECRET'}\n`);
});
