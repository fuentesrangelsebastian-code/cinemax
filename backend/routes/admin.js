const express  = require('express');
const router   = express.Router();
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const { query, withTransaction } = require('../db/connection');
const auth     = require('../middleware/auth');

// ─── POST /api/admin/login ─────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Credenciales requeridas.' });

  try {
    const result = await query('SELECT * FROM admins WHERE email = $1', [email]);
    if (!result.rows.length) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    const admin = result.rows[0];
    const valid = await bcrypt.compare(password, admin.password_hash);
    if (!valid) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor.' });
  }
});

// ─── Todas las rutas siguientes requieren autenticación ───────────────────────
router.use(auth);

// ─── GET /api/admin/peliculas ─────────────────────────────────────────────────
// Todas las películas (activas e inactivas) para el panel
router.get('/peliculas', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        p.id, p.titulo, p.descripcion, p.clasificacion, p.imagen_url,
        p.precio_vip, p.precio_estandar,
        p.asientos_vip_total, p.asientos_estandar_total,
        p.horario, p.activa, p.creado_en,
        COUNT(a.id) FILTER (WHERE a.tipo = 'vip'      AND a.ocupado = FALSE) AS asientos_vip_disponibles,
        COUNT(a.id) FILTER (WHERE a.tipo = 'estandar' AND a.ocupado = FALSE) AS asientos_estandar_disponibles
      FROM peliculas p
      LEFT JOIN asientos a ON a.pelicula_id = p.id
      GROUP BY p.id
      ORDER BY p.creado_en DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener películas.' });
  }
});

// ─── POST /api/admin/peliculas ────────────────────────────────────────────────
// Crear nueva película y generar sus asientos automáticamente
router.post('/peliculas', async (req, res) => {
  const {
    titulo, descripcion, clasificacion, imagen_url,
    precio_vip, precio_estandar,
    asientos_vip_total, asientos_estandar_total,
    horario,
  } = req.body;

  if (!titulo?.trim()) return res.status(400).json({ error: 'El título es requerido.' });
  if (!precio_vip || !precio_estandar) return res.status(400).json({ error: 'Los precios son requeridos.' });

  try {
    const result = await withTransaction(async (client) => {
      // Insertar película
      const peli = await client.query(`
        INSERT INTO peliculas
          (titulo, descripcion, clasificacion, imagen_url,
           precio_vip, precio_estandar,
           asientos_vip_total, asientos_estandar_total, horario)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING *
      `, [
        titulo.trim(), descripcion || '', clasificacion || 'TP', imagen_url || null,
        precio_vip, precio_estandar,
        asientos_vip_total || 30, asientos_estandar_total || 80,
        horario || null,
      ]);

      const { id, asientos_vip_total: vt, asientos_estandar_total: et } = peli.rows[0];

      // Generar asientos VIP
      for (let i = 1; i <= vt; i++) {
        await client.query(
          'INSERT INTO asientos (pelicula_id, codigo, tipo) VALUES ($1,$2,$3)',
          [id, `VIP-${String(i).padStart(2, '0')}`, 'vip']
        );
      }
      // Generar asientos estándar
      for (let i = 1; i <= et; i++) {
        await client.query(
          'INSERT INTO asientos (pelicula_id, codigo, tipo) VALUES ($1,$2,$3)',
          [id, `STD-${String(i).padStart(3, '0')}`, 'estandar']
        );
      }

      return peli.rows[0];
    });

    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear película.' });
  }
});

// ─── PUT /api/admin/peliculas/:id ─────────────────────────────────────────────
// Editar película. Si cambia la cantidad de asientos, regenera solo los asientos libres.
router.put('/peliculas/:id', async (req, res) => {
  const { id } = req.params;
  const {
    titulo, descripcion, clasificacion, imagen_url,
    precio_vip, precio_estandar,
    asientos_vip_total, asientos_estandar_total,
    horario, activa,
  } = req.body;

  if (!titulo?.trim()) return res.status(400).json({ error: 'El título es requerido.' });

  try {
    const result = await withTransaction(async (client) => {
      // Obtener película actual para comparar asientos
      const current = await client.query('SELECT * FROM peliculas WHERE id = $1', [id]);
      if (!current.rows.length) throw new Error('Película no encontrada.');
      const prev = current.rows[0];

      // Actualizar campos de la película
      const updated = await client.query(`
        UPDATE peliculas SET
          titulo                  = $1,
          descripcion             = $2,
          clasificacion           = $3,
          imagen_url              = $4,
          precio_vip              = $5,
          precio_estandar         = $6,
          asientos_vip_total      = $7,
          asientos_estandar_total = $8,
          horario                 = $9,
          activa                  = $10
        WHERE id = $11
        RETURNING *
      `, [
        titulo.trim(), descripcion || '', clasificacion || prev.clasificacion,
        imagen_url || prev.imagen_url,
        precio_vip || prev.precio_vip, precio_estandar || prev.precio_estandar,
        asientos_vip_total || prev.asientos_vip_total,
        asientos_estandar_total || prev.asientos_estandar_total,
        horario || prev.horario,
        activa !== undefined ? activa : prev.activa,
        id,
      ]);

      // Si se agregaron más asientos VIP, generar los nuevos
      const newVip = parseInt(asientos_vip_total) || prev.asientos_vip_total;
      const newStd = parseInt(asientos_estandar_total) || prev.asientos_estandar_total;

      if (newVip > prev.asientos_vip_total) {
        for (let i = prev.asientos_vip_total + 1; i <= newVip; i++) {
          await client.query(
            'INSERT INTO asientos (pelicula_id, codigo, tipo) VALUES ($1,$2,$3)',
            [id, `VIP-${String(i).padStart(2, '0')}`, 'vip']
          );
        }
      }
      if (newStd > prev.asientos_estandar_total) {
        for (let i = prev.asientos_estandar_total + 1; i <= newStd; i++) {
          await client.query(
            'INSERT INTO asientos (pelicula_id, codigo, tipo) VALUES ($1,$2,$3)',
            [id, `STD-${String(i).padStart(3, '0')}`, 'estandar']
          );
        }
      }

      return updated.rows[0];
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    const status = err.message === 'Película no encontrada.' ? 404 : 500;
    res.status(status).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/peliculas/:id ──────────────────────────────────────────
// Soft delete: marca la película como inactiva (no borra ventas históricas)
router.delete('/peliculas/:id', async (req, res) => {
  try {
    const result = await query(
      'UPDATE peliculas SET activa = FALSE WHERE id = $1 RETURNING id',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Película no encontrada.' });
    res.json({ message: 'Película eliminada correctamente.', id: req.params.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al eliminar película.' });
  }
});

// ─── GET /api/admin/ventas ────────────────────────────────────────────────────
// Lista todas las ventas con el nombre de la película y asientos asignados
router.get('/ventas', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        v.id,
        v.numero_factura,
        v.nombre_cliente,
        v.email_cliente,
        p.titulo            AS titulo_pelicula,
        v.tipo_boleto,
        v.cantidad,
        v.total,
        v.fecha_compra,
        STRING_AGG(a.codigo, ', ' ORDER BY a.codigo) AS asientos_asignados
      FROM ventas v
      JOIN peliculas       p  ON p.id = v.pelicula_id
      LEFT JOIN detalle_asientos da ON da.venta_id = v.id
      LEFT JOIN asientos         a  ON a.id = da.asiento_id
      GROUP BY v.id, p.titulo
      ORDER BY v.fecha_compra DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener ventas.' });
  }
});

// ─── GET /api/admin/ventas/resumen ────────────────────────────────────────────
// Resumen estadístico para el dashboard
router.get('/ventas/resumen', async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*)                                     AS total_ventas,
        COALESCE(SUM(total), 0)                      AS total_recaudado,
        COALESCE(SUM(cantidad), 0)                   AS total_boletos,
        COUNT(*) FILTER (WHERE tipo_boleto = 'vip')  AS ventas_vip,
        COUNT(*) FILTER (WHERE tipo_boleto = 'estandar') AS ventas_estandar
      FROM ventas
    `);

    const porPelicula = await query(`
      SELECT
        p.titulo,
        COUNT(v.id)       AS ventas,
        SUM(v.total)      AS recaudado,
        SUM(v.cantidad)   AS boletos_vendidos
      FROM ventas v
      JOIN peliculas p ON p.id = v.pelicula_id
      GROUP BY p.id, p.titulo
      ORDER BY recaudado DESC
    `);

    res.json({
      resumen: stats.rows[0],
      por_pelicula: porPelicula.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener resumen.' });
  }
});

module.exports = router;
