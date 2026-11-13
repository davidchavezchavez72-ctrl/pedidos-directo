// Solicitudes de esferas personalizadas (logo del cliente -> diseno -> pedido).
// Usa Firestore si hay credenciales de Firebase; si no, memoria (solo desarrollo).
// Las imagenes (logo y diseno) se guardan aparte, como texto base64, para no
// pasar el limite de 1 MB por documento de Firestore.
const crypto = require('crypto');
const { getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

const useFirestore = getApps().length > 0;

function newToken() {
  return crypto.randomBytes(24).toString('hex');
}

const toDate = (v) => (v && typeof v.toDate === 'function' ? v.toDate() : v ? new Date(v) : null);
function normalize(id, data) {
  return {
    id,
    ...data,
    created_at: toDate(data.created_at) || new Date(),
    mockup_at: toDate(data.mockup_at),
    expires_at: toDate(data.expires_at),
  };
}

let api;

if (useFirestore) {
  const db = getFirestore();
  const requests = db.collection('custom_requests');
  const images = db.collection('custom_images');

  api = {
    async createRequest({ name, phone, email, brand, notes, logo }) {
      const ref = await requests.add({
        name, phone, email, brand, notes,
        status: 'esperando_diseno',
        token: newToken(),
        created_at: FieldValue.serverTimestamp(),
      });
      await images.doc(`${ref.id}_logo`).set(logo);
      const snap = await ref.get();
      return normalize(snap.id, snap.data());
    },
    async listRequests() {
      const snap = await requests.orderBy('created_at', 'desc').get();
      return snap.docs.map((d) => normalize(d.id, d.data()));
    },
    async getRequest(id) {
      const snap = await requests.doc(id).get();
      return snap.exists ? normalize(snap.id, snap.data()) : null;
    },
    async getRequestByToken(token) {
      const snap = await requests.where('token', '==', token).limit(1).get();
      return snap.empty ? null : normalize(snap.docs[0].id, snap.docs[0].data());
    },
    async getImage(id, kind) {
      const snap = await images.doc(`${id}_${kind}`).get();
      return snap.exists ? snap.data() : null;
    },
    async setMockup(id, mockup, expiresAt) {
      await images.doc(`${id}_mockup`).set(mockup);
      await requests.doc(id).update({
        status: 'diseno_enviado',
        token: newToken(),
        mockup_at: FieldValue.serverTimestamp(),
        expires_at: expiresAt,
      });
      return api.getRequest(id);
    },
    async markOrdered(id, orderId) {
      await requests.doc(id).update({ status: 'pedido', order_id: orderId });
    },
  };
} else {
  const store = new Map();
  const imgs = new Map();
  let nextId = 1;
  api = {
    async createRequest({ name, phone, email, brand, notes, logo }) {
      const id = String(nextId++);
      store.set(id, { name, phone, email, brand, notes, status: 'esperando_diseno', token: newToken(), created_at: new Date() });
      imgs.set(`${id}_logo`, logo);
      return normalize(id, store.get(id));
    },
    async listRequests() {
      return [...store.entries()].map(([id, d]) => normalize(id, d)).sort((a, b) => b.created_at - a.created_at);
    },
    async getRequest(id) {
      return store.has(id) ? normalize(id, store.get(id)) : null;
    },
    async getRequestByToken(token) {
      for (const [id, d] of store) if (d.token === token) return normalize(id, d);
      return null;
    },
    async getImage(id, kind) {
      return imgs.get(`${id}_${kind}`) || null;
    },
    async setMockup(id, mockup, expiresAt) {
      imgs.set(`${id}_mockup`, mockup);
      Object.assign(store.get(id), { status: 'diseno_enviado', token: newToken(), mockup_at: new Date(), expires_at: expiresAt });
      return api.getRequest(id);
    },
    async markOrdered(id, orderId) {
      Object.assign(store.get(id), { status: 'pedido', order_id: orderId });
    },
  };
}

// Suma dias habiles (lunes a viernes) a una fecha.
function addBusinessDays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

// Valida una imagen enviada como data URL (la pagina ya la reduce de tamano).
const MAX_IMAGE_CHARS = 900 * 1024; // cabe de sobra en un documento de Firestore
function parseImage(dataUrl) {
  if (typeof dataUrl !== 'string') return null;
  const m = dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m || m[2].length > MAX_IMAGE_CHARS) return null;
  return { type: m[1], data: m[2] };
}

module.exports = { ...api, addBusinessDays, parseImage };
