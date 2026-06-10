require('dotenv').config();
const { pool } = require('./connection');

const SQL = `
-- ─── Extensión para UUIDs ─────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tabla: peliculas ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS peliculas (
  id                        SERIAL PRIMARY KEY,
  titulo                    VARCHAR(255) NOT NULL,
  descripcion               TEXT,
  clasificacion             VARCHAR(10) NOT NULL DEFAULT 'TP',
  imagen_url                TEXT,
  precio_vip                NUMERIC(10,2) NOT NULL DEFAULT 0,
  precio_estandar           NUMERIC(10,2) NOT NULL DEFAULT 0,
  asientos_vip_total        INT NOT NULL DEFAULT 30,
  asientos_estandar_total   INT NOT NULL DEFAULT 80,
  horario                   TIMESTAMPTZ,
  activa                    BOOLEAN NOT NULL DEFAULT TRUE,
  creado_en                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tabla: asientos ─────────────────────────────────────────────────────────
-- Cada fila = un asiento físico vinculado a una función de película
CREATE TABLE IF NOT EXISTS asientos (
  id           SERIAL PRIMARY KEY,
  pelicula_id  INT NOT NULL REFERENCES peliculas(id) ON DELETE CASCADE,
  codigo       VARCHAR(10) NOT NULL,   -- Ej: "VIP-01", "STD-047"
  tipo         VARCHAR(10) NOT NULL CHECK (tipo IN ('vip', 'estandar')),
  ocupado      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_asientos_pelicula_tipo_ocupado
  ON asientos (pelicula_id, tipo, ocupado);

-- ─── Tabla: ventas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ventas (
  id               SERIAL PRIMARY KEY,
  numero_factura   VARCHAR(20) NOT NULL UNIQUE,
  pelicula_id      INT NOT NULL REFERENCES peliculas(id),
  nombre_cliente   VARCHAR(255) NOT NULL,
  email_cliente    VARCHAR(255) NOT NULL,
  tipo_boleto      VARCHAR(10) NOT NULL CHECK (tipo_boleto IN ('vip', 'estandar')),
  cantidad         INT NOT NULL CHECK (cantidad > 0),
  total            NUMERIC(10,2) NOT NULL,
  fecha_compra     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Tabla: detalle_asientos ─────────────────────────────────────────────────
-- Relación N:M entre ventas y asientos (qué asientos se asignaron a cada venta)
CREATE TABLE IF NOT EXISTS detalle_asientos (
  id         SERIAL PRIMARY KEY,
  venta_id   INT NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  asiento_id INT NOT NULL REFERENCES asientos(id)
);

-- ─── Tabla: admins ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id             SERIAL PRIMARY KEY,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function init() {
  console.log('🗄️  Inicializando base de datos...');
  try {
    await pool.query(SQL);
    console.log('✅ Tablas creadas correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error al inicializar la BD:', err.message);
    process.exit(1);
  }
}

init();
