const nodemailer = require('nodemailer');

// ─── Crear transporte SMTP ─────────────────────────────────────────────────────
function createTransport() {
  // En desarrollo sin credenciales SMTP, usa Ethereal (correo de prueba)
  if (!process.env.SMTP_USER || process.env.SMTP_USER === 'tucorreo@gmail.com') {
    console.warn('⚠️  SMTP no configurado. Los emails se simularán en consola.');
    return null;
  }

  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

// ─── Formateo de moneda ────────────────────────────────────────────────────────
function fmtCOP(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }).format(n);
}

function fmtDate(d) {
  return new Date(d).toLocaleString('es-CO', {
    dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Bogota',
  });
}

// ─── Plantilla HTML de la factura ─────────────────────────────────────────────
function buildInvoiceHTML(data) {
  const {
    numero_factura, nombre_cliente, email_cliente,
    titulo_pelicula, tipo_boleto, cantidad,
    asientos, total, fecha_compra,
  } = data;

  const rows = [
    ['Película',         titulo_pelicula],
    ['Tipo de boleto',   tipo_boleto === 'vip' ? '⭐ VIP' : '🎟 Estándar'],
    ['Cantidad',         `${cantidad} boleto${cantidad > 1 ? 's' : ''}`],
    ['Asientos asignados', asientos.join(', ')],
    ['Fecha de compra',  fmtDate(fecha_compra)],
  ];

  const rowsHTML = rows.map(([k, v]) => `
    <tr>
      <td style="padding:10px 16px;color:#888;font-size:13px;border-bottom:1px solid #222;">${k}</td>
      <td style="padding:10px 16px;color:#eee;font-size:13px;border-bottom:1px solid #222;text-align:right;">${v}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Factura CineMax #${numero_factura}</title></head>
<body style="margin:0;padding:0;background:#0a0a0e;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0e;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:#111118;border-radius:16px 16px 0 0;padding:32px;text-align:center;border:1px solid #222;border-bottom:none;">
            <div style="font-size:36px;margin-bottom:8px;">🎬</div>
            <h1 style="margin:0;color:#f5c842;font-size:28px;letter-spacing:4px;font-weight:900;">CINEMAX</h1>
            <p style="margin:8px 0 0;color:#555;font-size:13px;">Tu destino de entretenimiento</p>
          </td>
        </tr>

        <!-- Ticket header -->
        <tr>
          <td style="background:#16161f;padding:20px 32px;border-left:1px solid #222;border-right:1px solid #222;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:2px;">Factura</p>
                  <p style="margin:4px 0 0;color:#f5c842;font-size:16px;font-family:monospace;font-weight:700;">#${numero_factura}</p>
                </td>
                <td align="right">
                  <p style="margin:0;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:2px;">Estado</p>
                  <p style="margin:4px 0 0;color:#4ade80;font-size:14px;font-weight:700;">✓ Confirmada</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Cliente -->
        <tr>
          <td style="background:#111118;padding:24px 32px;border-left:1px solid #222;border-right:1px solid #222;border-top:1px solid #1e1e2a;">
            <p style="margin:0 0 4px;color:#555;font-size:11px;text-transform:uppercase;letter-spacing:2px;">Comprado por</p>
            <p style="margin:0;color:#fff;font-size:18px;font-weight:700;">${nombre_cliente}</p>
            <p style="margin:4px 0 0;color:#888;font-size:13px;">${email_cliente}</p>
          </td>
        </tr>

        <!-- Detalle -->
        <tr>
          <td style="background:#111118;padding:0 32px;border-left:1px solid #222;border-right:1px solid #222;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #1e1e2a;">
              ${rowsHTML}
            </table>
          </td>
        </tr>

        <!-- Total -->
        <tr>
          <td style="background:#16161f;padding:20px 32px;border-left:1px solid #222;border-right:1px solid #222;border-top:1px solid #1e1e2a;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="color:#888;font-size:14px;">Total pagado</td>
                <td align="right" style="color:#f5c842;font-size:26px;font-weight:900;font-family:monospace;">${fmtCOP(total)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#0d0d14;border-radius:0 0 16px 16px;padding:24px 32px;text-align:center;border:1px solid #222;border-top:1px solid #1e1e2a;">
            <p style="margin:0;color:#444;font-size:12px;line-height:1.6;">
              Presenta este correo en taquilla para retirar tus boletos.<br/>
              CineMax · Todos los derechos reservados
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Enviar email ──────────────────────────────────────────────────────────────
async function sendInvoiceEmail(data) {
  const transport = createTransport();
  const html = buildInvoiceHTML(data);

  if (!transport) {
    // Modo desarrollo: mostrar en consola
    console.log('\n📧 ─── SIMULACIÓN DE EMAIL ──────────────────────────');
    console.log(`  Para:    ${data.email_cliente}`);
    console.log(`  Asunto:  Tu factura CineMax #${data.numero_factura}`);
    console.log(`  Película: ${data.titulo_pelicula}`);
    console.log(`  Asientos: ${data.asientos.join(', ')}`);
    console.log(`  Total:   ${fmtCOP(data.total)}`);
    console.log('────────────────────────────────────────────────────\n');
    return { simulated: true };
  }

  const info = await transport.sendMail({
    from:    `"CineMax 🎬" <${process.env.SMTP_USER}>`,
    to:      data.email_cliente,
    subject: `Tu factura CineMax #${data.numero_factura} — ${data.titulo_pelicula}`,
    html,
    text: `Factura #${data.numero_factura}\nPelícula: ${data.titulo_pelicula}\nAsientos: ${data.asientos.join(', ')}\nTotal: ${fmtCOP(data.total)}`,
  });

  console.log(`📧 Email enviado a ${data.email_cliente} [${info.messageId}]`);
  return info;
}

module.exports = { sendInvoiceEmail };
