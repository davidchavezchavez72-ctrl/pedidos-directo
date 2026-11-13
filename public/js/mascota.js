// Countriball navideno que pasea por la pagina y dice cosas de Navidad.
(function () {
  try { if (sessionStorage.getItem('mascota-oculta') === '1') return; } catch (e) {}

  var frases = [
    '¡Feliz Navidad! ¡Ándale, escoge tus esferas!',
    '¿Ya escogiste tus esferas?',
    'Por docena te salen más baratas.',
    'La esfera azul brilla en la oscuridad. ¡Pruébala de noche!',
    'Todas están hechas a mano, con mucho cariño.',
    '¿Tienes empresa? ¡Hacemos esferas con tu logo!',
    'Un árbol sin esferas está muy triste...',
    '¡Ho, ho, ho! ¡Que no te gane la Navidad!',
    'Combina colores y arma tu docena.',
    '¡Regala esferas a tu familia esta Navidad!',
  ];

  var quieto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var box = document.createElement('div');
  box.className = 'mascota';
  box.innerHTML =
    '<div class="mascota-burbuja" hidden></div>' +
    '<button type="button" class="mascota-cerrar" aria-label="Ocultar">&times;</button>' +
    '<img class="mascota-img" src="/images/countriball-navidad.webp" alt="Countriball navideño" width="180" height="241" />';
  document.body.appendChild(box);

  var burbuja = box.querySelector('.mascota-burbuja');
  var img = box.querySelector('.mascota-img');
  var i = Math.floor(Math.random() * frases.length);
  var timerOcultar;

  function hablar() {
    burbuja.textContent = frases[i % frases.length];
    i++;
    burbuja.hidden = false;
    clearTimeout(timerOcultar);
    timerOcultar = setTimeout(function () { burbuja.hidden = true; }, 5500);
  }

  function mover() {
    var w = box.offsetWidth, h = box.offsetHeight;
    var vw = window.innerWidth, vh = window.innerHeight;
    var bottomSpace = document.body.classList.contains('has-total-bar') ? 80 : 16;
    // Se queda cerca de las orillas para no tapar lo que el cliente esta llenando
    var izquierda = Math.random() < 0.5;
    var x = izquierda ? 6 + Math.random() * Math.min(60, vw * 0.08) : vw - w - 6 - Math.random() * Math.min(60, vw * 0.08);
    var y = 70 + Math.random() * Math.max(0, vh - h - 70 - bottomSpace);
    box.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
    box.classList.toggle('mascota-derecha', !izquierda);
  }

  img.addEventListener('click', hablar);
  box.querySelector('.mascota-cerrar').addEventListener('click', function () {
    box.remove();
    try { sessionStorage.setItem('mascota-oculta', '1'); } catch (e) {}
  });

  if (quieto) {
    box.classList.add('mascota-quieta');
  } else {
    mover();
    setInterval(mover, 7000);
  }
  setTimeout(hablar, 1500);
  setInterval(hablar, 12000);
  window.addEventListener('resize', function () { if (!quieto) mover(); });
})();
