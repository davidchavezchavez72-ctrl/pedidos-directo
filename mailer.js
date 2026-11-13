const RESEND_API_URL = 'https://api.resend.com/emails';

// Direccion publica de la pagina, para que las imagenes se vean en el correo.
const PUBLIC_URL = (process.env.PUBLIC_URL || 'https://pedidos-directo.onrender.com').replace(/\/$/, '');

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatAddress(a) {
  if (!a) return '';
  return `${a.street}, Col. ${a.colonia}, ${a.city}, ${a.state}, C.P. ${a.zip}` +
    (a.references ? `\nReferencias: ${a.references}` : '');
}

function formatPricing(order) {
  if (!order.total) return '';
  const lines = (order.pricing || []).map((l) => {
    const parts = [];
    if (l.dozens) parts.push(`${l.dozens} docena${l.dozens > 1 ? 's' : ''} ($${l.dozenPrice})`);
    if (l.rest) parts.push(`${l.rest} pieza${l.rest > 1 ? 's' : ''} ($${l.price} c/u)`);
    return `${l.qty}x ${l.name}: ${parts.join(' + ')} = $${l.subtotal}`;
  });
  return lines.join('\n') + `\nTOTAL: $${order.total}`;
}

function formatItems(items) {
  return items
    .map((item) => `- ${item.quantity}x ${item.name}${item.color ? ` (color: ${item.color}${item.colorNote ? ` - ${item.colorNote}` : ''})` : ''}`)
    .join('\n');
}

// Lista de productos en HTML, con la foto de cada producto en el color pedido.
function formatItemsHtml(items) {
  return items
    .map((item) => {
      const img = `${PUBLIC_URL}/images/${encodeURIComponent(item.image)}`;
      const color = item.color
        ? `<br><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${escapeHtml(item.colorHex || '#ccc')};vertical-align:middle"></span> Color: <b>${escapeHtml(item.color)}</b>${item.colorNote ? ` <i>(${escapeHtml(item.colorNote)})</i>` : ''}`
        : '';
      return (
        `<tr><td style="padding:6px 12px 6px 0"><img src="${img}" width="110" height="110" alt="${escapeHtml(item.name)}" style="border-radius:8px;object-fit:cover"></td>` +
        `<td style="padding:6px 0;font-size:15px"><b>${item.quantity}x</b> ${escapeHtml(item.name)}${color}</td></tr>`
      );
    })
    .join('');
}

async function sendEmail({ to, subject, text, html }) {
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
      ...(html ? { html } : {}),
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
      `Direccion: ${formatAddress(order.address)}\n` +
      `Fecha: ${fecha}\n\n` +
      `Productos seleccionados:\n${formatItems(order.items)}\n\n` +
      (order.total ? `${formatPricing(order)}\n\n` : '') +
      `Puedes ver todos los pedidos en el panel de administrador.`,
    html:
      `<h2 style="margin:0 0 12px">Nuevo pedido recibido</h2>` +
      `<p><b>Nombre:</b> ${escapeHtml(order.name)}<br>` +
      `<b>Telefono:</b> ${escapeHtml(order.phone)}<br>` +
      `<b>Email:</b> ${escapeHtml(order.email)}<br>` +
      `<b>Direccion:</b> ${escapeHtml(formatAddress(order.address)).replace(/\n/g, '<br>')}<br>` +
      `<b>Fecha:</b> ${escapeHtml(fecha)}</p>` +
      `<h3 style="margin:16px 0 4px">Productos</h3>` +
      `<table cellpadding="0" cellspacing="0">${formatItemsHtml(order.items)}</table>` +
      (order.total ? `<p style="font-size:15px">${escapeHtml(formatPricing(order)).replace(/\n/g, '<br>').replace(/TOTAL: (.*)$/, '<b style="font-size:18px">TOTAL: $1</b>')}</p>` : '') +
      `<p><a href="${PUBLIC_URL}/admin/pedidos">Ver todos los pedidos en el panel</a></p>`,
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
      (order.address ? `Se envio a: ${formatAddress(order.address)}\n\n` : '') +
      `Gracias por tu compra.`,
  });
}

module.exports = { sendOrderNotification, sendShippedNotification };
