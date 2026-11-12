const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

let insertOrder;
let getAllOrders;

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (projectId && clientEmail && privateKey) {
  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });

  const db = getFirestore();
  const ordersCollection = db.collection('orders');

  insertOrder = async ({ name, phone, email, details, notes }) => {
    const docRef = await ordersCollection.add({
      name,
      phone,
      email: email || null,
      details,
      notes: notes || null,
      created_at: FieldValue.serverTimestamp(),
    });
    const snap = await docRef.get();
    const data = snap.data();
    return {
      id: snap.id,
      ...data,
      created_at: data.created_at ? data.created_at.toDate() : new Date(),
    };
  };

  getAllOrders = async () => {
    const snapshot = await ordersCollection.orderBy('created_at', 'desc').get();
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        created_at: data.created_at ? data.created_at.toDate() : new Date(),
      };
    });
  };
} else {
  // Sin credenciales de Firebase: almacen en memoria solo para desarrollo.
  // Los datos se pierden al reiniciar. En produccion SIEMPRE define
  // FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL y FIREBASE_PRIVATE_KEY.
  console.warn('[db] Credenciales de Firebase no configuradas: usando almacen en memoria (solo para desarrollo).');
  const memoryOrders = [];
  let nextId = 1;

  insertOrder = async ({ name, phone, email, details, notes }) => {
    const order = {
      id: String(nextId++),
      name,
      phone,
      email: email || null,
      details,
      notes: notes || null,
      created_at: new Date(),
    };
    memoryOrders.unshift(order);
    return order;
  };

  getAllOrders = async () => memoryOrders;
}

module.exports = { insertOrder, getAllOrders };
