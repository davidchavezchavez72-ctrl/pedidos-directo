const RESEND_API_URL = 'https://api.resend.com/emails';

function formatItems(items) {
  return items.map((item) => `- ${item.quantity}x ${item.name}`).join('\n');
}

async function sendEmail({ to, subject, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn('[mailer] RESEND_API_KEY no configurado: no se envio el correo.');
    return;
  }

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Pedidos Directo <onboarding@resend.dev>',
      to,
      subject,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

// Notifica al dueño del negocio (EMAIL_TO) de un pedido nuevo.
async function sendOrderNotification(order) {
  const to = process.env.EMAIL_TO;
  if (!to) {
    console.warn('[mailer] EMAIL_TO no configurado: no se envio notificacion por correo.');
    return;
  }

  const fecha = new Date(order.created_at).toLocaleString('es-ES');

  await sendEmail({
    to,
    subject: `Nuevo pedido #${order.id} de ${order.name}`,
    text:
      `Nuevo pedido recibido\n\n` +
      `Nombre: ${order.name}\n` +
      `Telefono: ${order.phone}\n` +
      `Email: ${order.email}\n` +
      `Fecha: ${fecha}\n\n` +
      `Productos seleccionados:\n${formatItems(order.items)}\n\n` +
      `Puedes ver todos los pedidos en el panel de administrador.`,
  });
}

// Notifica al cliente que su pedido fue enviado.
// NOTA: con el dominio de Resend sin verificar, esto SOLO llega de verdad si
// order.email es el mismo correo con el que se creo la cuenta de Resend.
// Para enviar a cualquier cliente real, hay que verificar un dominio propio
// en https://resend.com/domains.
async function sendShippedNotification(order) {
  if (!order.email) return;

  await sendEmail({
    to: order.email,
    subject: `Tu pedido #${order.id} fue enviado`,
    text:
      `Hola ${order.name},\n\n` +
      `Tu pedido ya fue enviado. Estos son los productos:\n${formatItems(order.items)}\n\n` +
      `Gracias por tu compra.`,
  });
}

module.exports = { sendOrderNotification, sendShippedNotification };
