const express = require('express');
const router  = express.Router();
const { query, withTransaction } = require('../db/connection');
const { sendInvoiceEmail } = require('../services/email');
const { v4: uuidv4 } = require('uuid');

// ─── GET /api/peliculas ───────────────────────────────────────────────────────
// Retorna todas las películas activas con conteo de asientos disponibles
router.get('/peliculas', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        p.id,
        p.titulo,
        p.descripcion,
        p.clasificacion,
        p.imagen_url,
        p.precio_vip,
        p.precio_estandar,
        p.asientos_vip_total,
        p.asientos_estandar_total,
        p.horario,
        COUNT(a.id) FILTER (WHERE a.tipo = 'vip'      AND a.ocupado = FALSE) AS asientos_vip_disponibles,
        COUNT(a.id) FILTER (WHERE a.tipo = 'estandar' AND a.ocupado = FALSE) AS asientos_estandar_disponibles
      FROM peliculas p
      LEFT JOIN asientos a ON a.pelicula_id = p.id
      WHERE p.activa = TRUE
      GROUP BY p.id
      ORDER BY p.horario ASC NULLS LAST, p.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener películas.' });
  }
});

// ─── GET /api/peliculas/:id ───────────────────────────────────────────────────
router.get('/peliculas/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT
        p.*,
        COUNT(a.id) FILTER (WHERE a.tipo = 'vip'      AND a.ocupado = FALSE) AS asientos_vip_disponibles,
        COUNT(a.id) FILTER (WHERE a.tipo = 'estandar' AND a.ocupado = FALSE) AS asientos_estandar_disponibles
      FROM peliculas p
      LEFT JOIN asientos a ON a.pelicula_id = p.id
      WHERE p.id = $1 AND p.activa = TRUE
      GROUP BY p.id
    `, [req.params.id]);

    if (!result.rows.length) return res.status(404).json({ error: 'Película no encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener película.' });
  }
});

// ─── POST /api/compras ────────────────────────────────────────────────────────
// Procesa la compra de boletos con asignación automática de asientos
router.post('/compras', async (req, res) => {
  const { pelicula_id, nombre_cliente, email_cliente, tipo_boleto, cantidad } = req.body;

  // Validaciones básicas
  if (!pelicula_id || !nombre_cliente?.trim() || !email_cliente?.trim()) {
    return res.status(400).json({ error: 'Faltan campos requeridos.' });
  }
  if (!['vip', 'estandar'].includes(tipo_boleto)) {
    return res.status(400).json({ error: 'Tipo de boleto inválido.' });
  }
  const cantNum = parseInt(cantidad);
  if (!cantNum || cantNum < 1 || cantNum > 20) {
    return res.status(400).json({ error: 'Cantidad de boletos inválida (1-20).' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_cliente)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  try {
    const result = await withTransaction(async (client) => {

      // 1. Verificar que la película existe y está activa
      const pelicula = await client.query(
        'SELECT * FROM peliculas WHERE id = $1 AND activa = TRUE',
        [pelicula_id]
      );
      if (!pelicula.rows.length) throw new Error('Película no disponible.');

      const peli = pelicula.rows[0];

      // 2. Verificar y seleccionar asientos disponibles (SELECT FOR UPDATE evita condición de carrera)
      const asientosDisp = await client.query(`
        SELECT id, codigo FROM asientos
        WHERE pelicula_id = $1
          AND tipo       = $2
          AND ocupado    = FALSE
        ORDER BY RANDOM()
        LIMIT $3
        FOR UPDATE SKIP LOCKED
      `, [pelicula_id, tipo_boleto, cantNum]);

      if (asientosDisp.rows.length < cantNum) {
        throw new Error(`No hay suficientes asientos ${tipo_boleto === 'vip' ? 'VIP' : 'estándar'} disponibles.`);
      }

      const asientosSeleccionados = asientosDisp.rows;
      const ids = asientosSeleccionados.map(a => a.id);
      const codigos = asientosSeleccionados.map(a => a.codigo);

      // 3. Marcar asientos como ocupados
      await client.query(
        `UPDATE asientos SET ocupado = TRUE WHERE id = ANY($1::int[])`,
        [ids]
      );

      // 4. Calcular total
      const precio = tipo_boleto === 'vip' ? peli.precio_vip : peli.precio_estandar;
      const total  = parseFloat(precio) * cantNum;

      // 5. Generar número de factura único: CM-YYYYMMDD-XXXXX
      const hoy = new Date();
      const fecha = hoy.toISOString().slice(0, 10).replace(/-/g, '');
      const sufijo = uuidv4().replace(/-/g, '').slice(0, 5).toUpperCase();
      const numero_factura = `CM-${fecha}-${sufijo}`;

      // 6. Registrar la venta
      const venta = await client.query(`
        INSERT INTO ventas
          (numero_factura, pelicula_id, nombre_cliente, email_cliente,
           tipo_boleto, cantidad, total)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING id, numero_factura, fecha_compra
      `, [numero_factura, pelicula_id, nombre_cliente.trim(), email_cliente.trim(),
          tipo_boleto, cantNum, total]);

      const ventaId = venta.rows[0].id;

      // 7. Registrar detalle de asientos
      for (const asientoId of ids) {
        await client.query(
          'INSERT INTO detalle_asientos (venta_id, asiento_id) VALUES ($1,$2)',
          [ventaId, asientoId]
        );
      }

      return {
        id: ventaId,
        numero_factura,
        nombre_cliente:   nombre_cliente.trim(),
        email_cliente:    email_cliente.trim(),
        titulo_pelicula:  peli.titulo,
        tipo_boleto,
        cantidad:         cantNum,
        asientos:         codigos,
        total,
        fecha_compra:     venta.rows[0].fecha_compra,
      };
    });

    // 8. Enviar email con la factura (fuera de la transacción para no bloquear BD)
    sendInvoiceEmail(result).catch(err =>
      console.error('Error enviando email:', err.message)
    );

    res.status(201).json(result);
  } catch (err) {
    console.error('Error en compra:', err.message);
    const status = err.message.includes('disponibles') || err.message.includes('disponible') ? 409 : 500;
    res.status(status).json({ error: err.message });
  }
});

module.exports = router;
