const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'orders.db'));

db.exec(`
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

function insertOrder({ name, phone, email, details, notes }) {
  const stmt = db.prepare(
    `INSERT INTO orders (name, phone, email, details, notes) VALUES (?, ?, ?, ?, ?)`
  );
  const info = stmt.run(name, phone, email || null, details, notes || null);
  const getStmt = db.prepare('SELECT * FROM orders WHERE id = ?');
  return getStmt.get(Number(info.lastInsertRowid));
}

function getAllOrders() {
  return db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
}

module.exports = { db, insertOrder, getAllOrders };
