// Detalles navidenos: nieve cayendo y cuenta regresiva para Navidad.
(function () {
  // --- Cuenta regresiva ---
  var cd = document.getElementById('countdown');
  if (cd) {
    var hoy = new Date();
    var y = hoy.getFullYear();
    var navidad = new Date(y, 11, 25);
    var inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    var texto;
    if (hoy.getMonth() === 11 && hoy.getDate() === 24) texto = '¡Hoy es Nochebuena!';
    else if (hoy.getMonth() === 11 && hoy.getDate() === 25) texto = '¡Feliz Navidad!';
    else if (hoy.getMonth() === 11 && hoy.getDate() > 25) texto = '¡Feliz Año Nuevo!';
    else if (hoy.getMonth() === 0 && hoy.getDate() <= 6) texto = '¡Feliz Día de Reyes!';
    else {
      var dias = Math.round((navidad - inicio) / 86400000);
      texto = dias === 1 ? '¡Mañana es Navidad!' : '¡Faltan ' + dias + ' días para Navidad!';
    }
    cd.textContent = texto;
    cd.hidden = false;
  }

  // --- Nieve ---
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var c = document.createElement('canvas');
  c.className = 'snow';
  c.setAttribute('aria-hidden', 'true');
  document.body.prepend(c);
  var ctx = c.getContext('2d');
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var flakes = [], W = 0, H = 0;

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    c.width = W * dpr; c.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var n = W < 600 ? 35 : 70;
    while (flakes.length < n) flakes.push(nuevo(true));
    flakes.length = n;
  }
  function nuevo(cualquierAltura) {
    return {
      x: Math.random() * W,
      y: cualquierAltura ? Math.random() * H : -10,
      r: 1 + Math.random() * 2.6,
      vy: 0.3 + Math.random() * 0.9,
      vx: -0.3 + Math.random() * 0.6,
      fase: Math.random() * Math.PI * 2,
      o: 0.45 + Math.random() * 0.5,
    };
  }
  var t = 0;
  function paso() {
    if (!document.hidden) {
      t += 0.01;
      ctx.clearRect(0, 0, W, H);
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.y += f.vy;
        f.x += f.vx + Math.sin(t + f.fase) * 0.35;
        if (f.y > H + 10 || f.x < -10 || f.x > W + 10) flakes[i] = nuevo(false);
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + f.o + ')';
        ctx.fill();
      }
    }
    requestAnimationFrame(paso);
  }
  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(paso);
})();
