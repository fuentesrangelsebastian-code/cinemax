require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool, withTransaction } = require('./connection');

// ─── Películas de ejemplo ──────────────────────────────────────────────────────
const PELICULAS = [
  {
    titulo: 'Dune: Parte Tres',
    descripcion: 'Paul Atreides continúa su épico viaje en Arrakis, enfrentando la mayor amenaza que el universo conocido haya visto. Una batalla que decidirá el destino de toda la humanidad.',
    clasificacion: '+13',
    precio_vip: 28000,
    precio_estandar: 18000,
    asientos_vip_total: 40,
    asientos_estandar_total: 100,
    horario: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    titulo: 'Spider-Man: Más Allá del Multiverso',
    descripcion: 'Miles Morales regresa con nuevas aventuras que van más allá de los universos conocidos. El destino de todos los Spider-Man está en sus manos.',
    clasificacion: 'TP',
    precio_vip: 25000,
    precio_estandar: 16000,
    asientos_vip_total: 30,
    asientos_estandar_total: 90,
    horario: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
  },
  {
    titulo: 'Oppenheimer: El Regreso',
    descripcion: 'Una historia basada en los diarios inéditos de Oppenheimer, revelando los secretos que se llevó a la tumba sobre el Proyecto Manhattan y sus consecuencias.',
    clasificacion: '+16',
    precio_vip: 30000,
    precio_estandar: 20000,
    asientos_vip_total: 25,
    asientos_estandar_total: 70,
    horario: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
  },
  {
    titulo: 'Moana 3: El Mar Eterno',
    descripcion: 'Moana emprende su mayor aventura: cruzar el océano desconocido para descubrir el origen de la magia que une a todas las islas del Pacífico.',
    clasificacion: 'TP',
    precio_vip: 22000,
    precio_estandar: 14000,
    asientos_vip_total: 35,
    asientos_estandar_total: 110,
    horario: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    titulo: 'John Wick: Capítulo 6',
    descripcion: 'El asesino más letal del mundo regresa para enfrentarse a la conspiración definitiva. Ninguna organización, ninguna regla, ningún hombre puede detenerlo.',
    clasificacion: '+18',
    precio_vip: 27000,
    precio_estandar: 17000,
    asientos_vip_total: 30,
    asientos_estandar_total: 80,
    horario: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString(),
  },
];

// Genera los asientos para una película
function generarAsientos(peliculaId, vipTotal, estandarTotal) {
  const asientos = [];
  for (let i = 1; i <= vipTotal; i++) {
    asientos.push({ pelicula_id: peliculaId, codigo: `VIP-${String(i).padStart(2, '0')}`, tipo: 'vip' });
  }
  for (let i = 1; i <= estandarTotal; i++) {
    asientos.push({ pelicula_id: peliculaId, codigo: `STD-${String(i).padStart(3, '0')}`, tipo: 'estandar' });
  }
  return asientos;
}

async function seed() {
  console.log('🌱 Cargando datos iniciales...');
  try {
    await withTransaction(async (client) => {

      // ── Admin ──────────────────────────────────────────────────────────────
      const email   = process.env.ADMIN_EMAIL    || 'admin@cinemax.com';
      const passRaw = process.env.ADMIN_PASSWORD || 'Admin2024!';
      const hash    = await bcrypt.hash(passRaw, 12);

      await client.query(`
        INSERT INTO admins (email, password_hash)
        VALUES ($1, $2)
        ON CONFLICT (email) DO NOTHING
      `, [email, hash]);
      console.log(`  ✅ Admin creado: ${email}`);

      // ── Películas + asientos ────────────────────────────────────────────────
      for (const p of PELICULAS) {
        // Evitar duplicados por título
        const exists = await client.query(
          'SELECT id FROM peliculas WHERE titulo = $1', [p.titulo]
        );
        if (exists.rows.length) {
          console.log(`  ⏭️  Película ya existe: ${p.titulo}`);
          continue;
        }

        const res = await client.query(`
          INSERT INTO peliculas
            (titulo, descripcion, clasificacion, precio_vip, precio_estandar,
             asientos_vip_total, asientos_estandar_total, horario)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING id
        `, [p.titulo, p.descripcion, p.clasificacion, p.precio_vip, p.precio_estandar,
            p.asientos_vip_total, p.asientos_estandar_total, p.horario]);

        const peliculaId = res.rows[0].id;
        const asientos = generarAsientos(peliculaId, p.asientos_vip_total, p.asientos_estandar_total);

        for (const a of asientos) {
          await client.query(
            'INSERT INTO asientos (pelicula_id, codigo, tipo) VALUES ($1,$2,$3)',
            [a.pelicula_id, a.codigo, a.tipo]
          );
        }
        console.log(`  🎬 Película "${p.titulo}" + ${asientos.length} asientos`);
      }
    });

    console.log('\n🎉 Seed completado exitosamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  }
}

seed();
