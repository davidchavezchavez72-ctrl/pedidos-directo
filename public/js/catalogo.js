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
