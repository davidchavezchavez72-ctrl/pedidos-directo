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
      const img = item.imageUrl ? `${PUBLIC_URL}${item.imageUrl}` : `${PUBLIC_URL}/images/${encodeURIComponent(item.image)}`;
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

async function sendEmail({ to, subject, text, html, attachments }) {
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
      ...(attachments ? { attachments } : {}),
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

// Avisa al dueno que un cliente subio el logo para una esfera personalizada.
async function sendCustomRequestNotification(request, logo) {
  const to = process.env.EMAIL_TO;
  if (!to) return;
  const ext = logo.type.split('/')[1] === 'jpeg' ? 'jpg' : logo.type.split('/')[1];
  await sendEmail({
    to,
    subject: `Nueva esfera personalizada de ${request.name}${request.brand ? ` (${request.brand})` : ''}`,
    text:
      `Un cliente subio su logo para una esfera personalizada.\n\n` +
      `Nombre: ${request.name}\nTelefono: ${request.phone}\nEmail: ${request.email}\n` +
      (request.brand ? `Marca o empresa: ${request.brand}\n` : '') +
      (request.notes ? `Indicaciones: ${request.notes}\n` : '') +
      `\nEl logo va adjunto. Cuando tengas el diseno, subelo en ${PUBLIC_URL}/admin/personalizadas`,
    html:
      `<h2 style="margin:0 0 12px">Nueva esfera personalizada</h2>` +
      `<p><b>Nombre:</b> ${escapeHtml(request.name)}<br><b>Telefono:</b> ${escapeHtml(request.phone)}<br>` +
      `<b>Email:</b> ${escapeHtml(request.email)}` +
      (request.brand ? `<br><b>Marca o empresa:</b> ${escapeHtml(request.brand)}` : '') +
      (request.notes ? `<br><b>Indicaciones:</b> ${escapeHtml(request.notes)}` : '') +
      `</p><p>El logo va adjunto en este correo.</p>` +
      `<p><a href="${PUBLIC_URL}/admin/personalizadas">Subir el diseno de la esfera</a></p>`,
    attachments: [{ filename: `logo-${String(request.brand || request.name).replace(/[^a-z0-9]+/gi, '-').slice(0, 40)}.${ext}`, content: logo.data }],
  });
}

// Le avisa al cliente que su esfera ya esta lista para verla y pedirla.
// NOTA: igual que el aviso de envio, con el dominio de Resend sin verificar
// solo llega si el correo del cliente es el mismo de la cuenta de Resend.
async function sendMockupReady(request, link, expiresText) {
  if (!request.email) return;
  await sendEmail({
    to: request.email,
    subject: 'Tu esfera personalizada esta lista',
    text:
      `Hola ${request.name},\n\n` +
      `Ya tenemos el diseno de tu esfera${request.brand ? ` con el logo de ${request.brand}` : ''}.\n` +
      `Velo y haz tu pedido aqui: ${link}\n\n` +
      `Tienes 2 dias habiles para hacer tu pedido (hasta el ${expiresText}).\n\nGracias.`,
    html:
      `<h2 style="margin:0 0 12px">Tu esfera personalizada esta lista</h2>` +
      `<p>Hola ${escapeHtml(request.name)}, ya tenemos el diseno de tu esfera` +
      (request.brand ? ` con el logo de <b>${escapeHtml(request.brand)}</b>` : '') + `.</p>` +
      `<p><a href="${link}" style="display:inline-block;background:#2f6fed;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Ver mi esfera y hacer mi pedido</a></p>` +
      `<p>Tienes <b>2 dias habiles</b> para hacer tu pedido (hasta el ${escapeHtml(expiresText)}).</p>`,
  });
}

module.exports = { sendOrderNotification, sendShippedNotification, sendCustomRequestNotification, sendMockupReady };
