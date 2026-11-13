// Calcula el total del pedido con precio por pieza y por docena.
// Por cada 12 piezas del mismo producto (sumando todos sus colores) se cobra
// el precio de docena; las piezas que sobren se cobran a precio normal.
function computeTotals(items, products) {
  const byProduct = new Map();
  items.forEach((item) => {
    byProduct.set(item.productId, (byProduct.get(item.productId) || 0) + item.quantity);
  });

  const lines = [];
  let total = 0;
  byProduct.forEach((qty, productId) => {
    const p = products.find((x) => x.id === productId);
    if (!p || !p.price) return;
    const dozens = p.dozenPrice ? Math.floor(qty / 12) : 0;
    const rest = qty - dozens * 12;
    const subtotal = dozens * p.dozenPrice + rest * p.price;
    lines.push({ productId, name: p.name, qty, dozens, rest, price: p.price, dozenPrice: p.dozenPrice || null, subtotal });
    total += subtotal;
  });
  return { lines, total };
}

module.exports = { computeTotals };
