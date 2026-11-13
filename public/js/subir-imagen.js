// Reduce la imagen elegida (logo o diseno) en el navegador antes de enviarla,
// para que suba rapido y quepa en la base de datos.
(function () {
  var MAX_CHARS = 880 * 1024;
  document.querySelectorAll('input[type=file][data-target]').forEach(function (input) {
    var hidden = document.getElementById(input.dataset.target);
    var preview = document.getElementById(input.dataset.preview);
    var msg = document.getElementById(input.dataset.msg);
    var form = input.closest('form');
    var btn = form && form.querySelector('button[type=submit]');
    function say(t, bad) { if (msg) { msg.textContent = t; msg.className = 'field-hint' + (bad ? ' hint-error' : ''); } }

    input.addEventListener('change', function () {
      hidden.value = '';
      if (preview) preview.hidden = true;
      var file = input.files && input.files[0];
      if (!file) return;
      if (!/^image\//.test(file.type)) { say('Ese archivo no es una imagen. Elige una foto o imagen (JPG o PNG).', true); return; }
      say('Preparando imagen...');
      if (btn) btn.disabled = true;
      var img = new Image();
      img.onload = function () {
        var max = 1000, out = '', tries = 0;
        do {
          var scale = Math.min(1, max / Math.max(img.width, img.height));
          var c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.width * scale));
          c.height = Math.max(1, Math.round(img.height * scale));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          out = c.toDataURL('image/webp', 0.85);
          if (out.indexOf('data:image/webp') !== 0) out = c.toDataURL('image/png');
          if (out.length > MAX_CHARS) out = c.toDataURL('image/jpeg', 0.85);
          max = Math.round(max * 0.75); tries++;
        } while (out.length > MAX_CHARS && tries < 6);
        if (btn) btn.disabled = false;
        if (out.length > MAX_CHARS) { say('La imagen es muy grande. Prueba con otra.', true); return; }
        hidden.value = out;
        if (preview) { preview.src = out; preview.hidden = false; }
        say('Imagen lista.');
      };
      img.onerror = function () { if (btn) btn.disabled = false; say('No se pudo leer la imagen. Prueba con otra (JPG o PNG).', true); };
      var reader = new FileReader();
      reader.onload = function () { img.src = reader.result; };
      reader.onerror = img.onerror;
      reader.readAsDataURL(file);
    });

    if (form) form.addEventListener('submit', function (e) {
      if (!hidden.value) { e.preventDefault(); say('Primero elige la imagen.', true); input.focus(); }
    });
  });
})();
