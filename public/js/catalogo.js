// Pinta los circulos de color (la politica de seguridad no permite style="" en el HTML).
document.querySelectorAll('[data-color]').forEach(function (el) {
  if (/^#[0-9a-fA-F]{3,8}$/.test(el.dataset.color)) el.style.backgroundColor = el.dataset.color;
});

// Cambia la foto del producto al color que el cliente esta viendo o eligiendo.
document.querySelectorAll('[data-target][data-image]').forEach(function (el) {
  function show() {
    var img = document.getElementById(el.dataset.target);
    if (img) img.src = el.dataset.image;
    var card = el.closest('.product-card');
    if (card) {
      card.querySelectorAll('.color-swatch').forEach(function (s) {
        s.classList.toggle('active', s.dataset.image === el.dataset.image);
      });
    }
  }
  el.addEventListener(el.tagName === 'BUTTON' ? 'click' : 'focus', show);
  if (el.tagName === 'INPUT') el.addEventListener('input', show);
});

// Total en vivo con precio por pieza y por docena (12 piezas del mismo producto).
(function () {
  var box = document.getElementById('order-total');
  if (!box) return;
  var cards = document.querySelectorAll('.product-card[data-product]');
  function update() {
    var html = '', total = 0, count = 0;
    cards.forEach(function (card) {
      var price = Number(card.dataset.price) || 0, dozen = Number(card.dataset.dozen) || 0, qty = 0;
      card.querySelectorAll('input[type=number]').forEach(function (i) {
        var n = parseInt(i.value, 10); if (n > 0) qty += Math.min(n, Number(i.max) || 50);
      });
      if (!qty || !price) return;
      var dz = dozen ? Math.floor(qty / 12) : 0, rest = qty - dz * 12, sub = dz * dozen + rest * price;
      var name = card.querySelector('.product-name').textContent;
      var parts = [];
      if (dz) parts.push(dz + (dz > 1 ? ' docenas' : ' docena'));
      if (rest) parts.push(rest + (rest > 1 ? ' piezas' : ' pieza'));
      var line = document.createElement('p');
      line.textContent = qty + 'x ' + name + ' (' + parts.join(' + ') + '): $' + sub;
      html += line.outerHTML;
      if (dozen && rest && rest >= 8) {
        var tip = document.createElement('p'); tip.className = 'order-total-tip';
        tip.textContent = 'Con ' + (12 - rest) + ' mas completas otra docena a $' + dozen;
        html += tip.outerHTML;
      }
      total += sub;
      count += qty;
    });
    var money = '$' + total.toLocaleString('es-MX');
    document.getElementById('order-total-lines').innerHTML = html;
    document.getElementById('order-total-sum').textContent = money;
    box.hidden = total === 0;
    var bar = document.getElementById('total-bar');
    if (bar) {
      document.getElementById('total-bar-sum').textContent = money;
      document.getElementById('total-bar-count').textContent = count;
      bar.hidden = total === 0;
      document.body.classList.toggle('has-total-bar', total > 0);
    }
    var st = document.getElementById('submit-total');
    if (st) { document.getElementById('submit-total-sum').textContent = money; st.hidden = total === 0; }
  }
  document.querySelectorAll('.product-card input[type=number]').forEach(function (i) {
    i.addEventListener('input', update);
  });
  update();
})();
