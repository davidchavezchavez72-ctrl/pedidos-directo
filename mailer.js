const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
  return transporter;
}

async function sendOrderNotification(order) {
  const t = getTransporter();
  if (!t) {
    console.warn('[mailer] EMAIL_USER/EMAIL_PASS no configurados: no se envio notificacion por correo.');
    return;
  }

  const to = process.env.EMAIL_TO || process.env.EMAIL_USER;
  const fecha = new Date(order.created_at).toLocaleString('es-ES');

  await t.sendMail({
    from: `"Pedidos Web" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Nuevo pedido #${order.id} de ${order.name}`,
    text:
      `Nuevo pedido recibido\n\n` +
      `Nombre: ${order.name}\n` +
      `Telefono: ${order.phone}\n` +
      `Email: ${order.email || '(no indicado)'}\n` +
      `Fecha: ${fecha}\n\n` +
      `Detalle del pedido:\n${order.details}\n\n` +
      (order.notes ? `Notas adicionales:\n${order.notes}\n\n` : '') +
      `Puedes ver todos los pedidos en el panel de administrador.`,
  });
}

module.exports = { sendOrderNotification };
