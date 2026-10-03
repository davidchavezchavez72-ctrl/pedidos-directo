const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

let insertOrder;
let getAllOrders;

if (connectionString) {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  const ready = pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      details TEXT NOT NULL,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  insertOrder = async ({ name, phone, email, details, notes }) => {
    await ready;
    const result = await pool.query(
      `INSERT INTO orders (name, phone, email, details, notes) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, phone, email || null, details, notes || null]
    );
    return result.rows[0];
  };

  getAllOrders = async () => {
    await ready;
    const result = await pool.query('SELECT * FROM orders ORDER BY id DESC');
    return result.rows;
  };
} else {
  // Sin DATABASE_URL: almacen en memoria solo para desarrollo local.
  // Los datos se pierden al reiniciar. En produccion SIEMPRE define DATABASE_URL.
  console.warn('[db] DATABASE_URL no configurado: usando almacen en memoria (solo para desarrollo).');
  const memoryOrders = [];
  let nextId = 1;

  insertOrder = async ({ name, phone, email, details, notes }) => {
    const order = {
      id: nextId++,
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
