const RESEND_API_URL = 'https://api.resend.com/emails';

async function sendOrderNotification(order) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.EMAIL_TO;

  if (!apiKey || !to) {
    console.warn('[mailer] RESEND_API_KEY/EMAIL_TO no configurados: no se envio notificacion por correo.');
    return;
  }

  const fecha = new Date(order.created_at).toLocaleString('es-ES');

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Pedidos Directo <onboarding@resend.dev>',
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
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

module.exports = { sendOrderNotification };
