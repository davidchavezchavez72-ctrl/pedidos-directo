const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

let url = process.env.TURSO_DATABASE_URL;
let authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  const dataDir = path.join(__dirname, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  url = `file:${path.join(dataDir, 'orders.db')}`;
}

const db = createClient({ url, authToken });

const ready = db.execute(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    details TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
  );
`);

async function insertOrder({ name, phone, email, details, notes }) {
  await ready;
  const info = await db.execute({
    sql: `INSERT INTO orders (name, phone, email, details, notes) VALUES (?, ?, ?, ?, ?)`,
    args: [name, phone, email || null, details, notes || null],
  });
  const result = await db.execute({
    sql: 'SELECT * FROM orders WHERE id = ?',
    args: [info.lastInsertRowid],
  });
  return result.rows[0];
}

async function getAllOrders() {
  await ready;
  const result = await db.execute('SELECT * FROM orders ORDER BY id DESC');
  return result.rows;
}

module.exports = { db, insertOrder, getAllOrders };
