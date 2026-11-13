require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const products = require('./products');
const ESTADOS = require('./estados');
const { computeTotals } = require('./pricing');
const { insertOrder, getAllOrders, updateOrderStatus } = require('./db');
const custom = require('./customdb'); // va despues de ./db (que inicia Firebase)
const CUSTOM = require('./custom-product');
const { requireAuth } = require('./middleware/auth');
const { ensureCsrfToken, verifyCsrfToken, checkCsrfToken } = require('./middleware/csrf');
const { sendOrderNotification, sendShippedNotification, sendCustomRequestNotification, sendMockupReady } = require('./mailer');

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// --- Validacion de configuracion minima ---
if (!process.env.SESSION_SECRET) {
  console.error('Falta SESSION_SECRET en .env. Genera uno con: npm run gen-secret');
  process.exit(1);
}
if (!process.env.ADMIN_PASSWORD_HASH) {
  console.error('Falta ADMIN_PASSWORD_HASH en .env. Genera uno con: npm run hash-password');
  process.exit(1);
}

if (isProd) app.set('trust proxy', 1);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Seguridad: cabeceras HTTP ---
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
  })
);

// Las rutas que reciben imagenes (logo / diseno) aceptan formularios mas grandes.
const bigForm = express.urlencoded({ extended: false, limit: '1500kb' });
app.use('/personalizada/enviar', bigForm);
app.use('/admin/personalizadas', bigForm);
app.use(express.urlencoded({ extended: true, limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd, // requiere HTTPS en produccion
      sameSite: 'strict',
      maxAge: 2 * 60 * 60 * 1000, // 2 horas
    },
  })
);

app.use(ensureCsrfToken);

// --- Limitadores de peticiones (anti fuerza bruta / anti spam) ---
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Has enviado demasiados pedidos en poco tiempo. Intenta de nuevo mas tarde.',
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Demasiados intentos de inicio de sesion. Intenta de nuevo en unos minutos.',
});

const contactValidators = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
  body('phone').trim().isLength({ min: 6, max: 30 }).withMessage('Indica un telefono valido.'),
  body('email').trim().isEmail().withMessage('Indica un correo electronico valido.').normalizeEmail(),
];
const addressValidators = [
  body('street').trim().isLength({ min: 3, max: 150 }).withMessage('Escribe tu calle y numero.'),
  body('colonia').trim().isLength({ min: 2, max: 100 }).withMessage('Escribe tu colonia.'),
  body('city').trim().isLength({ min: 2, max: 100 }).withMessage('Escribe tu ciudad o municipio.'),
  body('state').trim().isIn(ESTADOS).withMessage('Selecciona tu estado.'),
  body('zip').trim().matches(/^\d{5}$/).withMessage('El codigo postal debe tener 5 numeros.'),
  body('references').optional({ values: 'falsy' }).trim().isLength({ max: 300 }).withMessage('Las referencias pueden tener maximo 300 caracteres.'),
];

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Has enviado demasiados logos en poco tiempo. Intenta de nuevo mas tarde.',
});

// Pasa los errores de funciones async al manejador de errores (evita que el servidor se caiga).
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) : '';

// ======================= RUTAS PUBLICAS =======================

app.get('/', (req, res) => {
  const success = req.query.success === '1';
  const lastOrder = success ? req.session.lastOrder || null : null;
  if (req.session.lastOrder) delete req.session.lastOrder;
  res.render('index', { products, estados: ESTADOS, errors: [], values: {}, success, lastOrder });
});

app.post(
  '/pedido',
  orderLimiter,
  checkCsrfToken,
  [
    ...contactValidators,
    body('street').trim().isLength({ min: 3, max: 150 }).withMessage('Escribe tu calle y numero.'),
    body('colonia').trim().isLength({ min: 2, max: 100 }).withMessage('Escribe tu colonia.'),
    body('city').trim().isLength({ min: 2, max: 100 }).withMessage('Escribe tu ciudad o municipio.'),
    body('state').trim().isIn(ESTADOS).withMessage('Selecciona tu estado.'),
    body('zip').trim().matches(/^\d{5}$/).withMessage('El codigo postal debe tener 5 numeros.'),
    body('references').optional({ values: 'falsy' }).trim().isLength({ max: 300 }).withMessage('Las referencias pueden tener maximo 300 caracteres.'),
  ],
  async (req, res) => {
    // Si el token de seguridad expiro, no guardamos nada: le regresamos el
    // formulario con todo lo que ya habia llenado para que solo vuelva a enviar.
    if (!req.csrfValid) {
      return res.render('index', {
        products,
        estados: ESTADOS,
        lastOrder: null,
        errors: [
          {
            msg: 'La pagina se actualizo mientras hacias tu pedido. Tus datos siguen aqui: revisalos y presiona "Enviar pedido" otra vez.',
          },
        ],
        values: req.body,
        success: false,
      });
    }

    const errors = validationResult(req);

    const readQty = (field) => {
      const quantity = parseInt(req.body[field], 10);
      return Number.isInteger(quantity) && quantity > 0 ? Math.min(quantity, 50) : 0;
    };

    const items = [];
    products.forEach((product) => {
      if (Array.isArray(product.colors) && product.colors.length) {
        // Producto con colores: una linea por cada color que pidio el cliente
        product.colors.forEach((color) => {
          const quantity = readQty(`qty_${product.id}__${color.id}`);
          if (quantity) {
            items.push({
              productId: product.id,
              name: product.name,
              color: color.name,
              colorHex: color.hex,
              colorNote: color.note || null,
              image: color.image,
              price: product.price || null,
              quantity,
            });
          }
        });
      } else {
        const quantity = readQty(`qty_${product.id}`);
        if (quantity) {
          items.push({
            productId: product.id,
            name: product.name,
            image: product.image,
            price: product.price || null,
            quantity,
          });
        }
      }
    });

    if (items.length === 0) {
      errors.errors.push({ msg: 'Selecciona al menos un producto y su cantidad.' });
    }

    if (!errors.isEmpty()) {
      return res.status(400).render('index', {
        products,
        estados: ESTADOS,
        lastOrder: null,
        errors: errors.array(),
        values: req.body,
        success: false,
      });
    }

    const { name, phone, email } = req.body;
    const address = {
      street: req.body.street,
      colonia: req.body.colonia,
      city: req.body.city,
      state: req.body.state,
      zip: req.body.zip,
      references: req.body.references || '',
    };
    const { lines: pricing, total } = computeTotals(items, products);
    const order = await insertOrder({ name, phone, email, address, items, pricing, total });

    sendOrderNotification(order).catch((err) => {
      console.error('[mailer] Error enviando la notificacion del pedido:', err.message);
    });

    req.session.lastOrder = { total, pricing };
    res.redirect('/?success=1');
  }
);

// ================= ESFERAS PERSONALIZADAS (CLIENTE) =================

// 1) El cliente sube el logo de su marca o empresa.
app.get('/personalizada', (req, res) => {
  res.render('personalizada', { custom: CUSTOM, errors: [], values: {}, sent: req.query.enviado === '1' });
});

app.post(
  '/personalizada/enviar',
  uploadLimiter,
  checkCsrfToken,
  [
    ...contactValidators,
    body('brand').optional({ values: 'falsy' }).trim().isLength({ max: 100 }).withMessage('El nombre de la marca puede tener maximo 100 caracteres.'),
    body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 500 }).withMessage('Las indicaciones pueden tener maximo 500 caracteres.'),
  ],
  wrap(async (req, res) => {
    const values = { ...req.body, logo: undefined };
    const show = (errors) => res.status(400).render('personalizada', { custom: CUSTOM, errors, values, sent: false });
    if (!req.csrfValid) {
      return show([{ msg: 'La pagina se actualizo mientras llenabas el formulario. Vuelve a elegir tu logo y presiona "Enviar logo".' }]);
    }
    const errors = validationResult(req).array();
    const logo = custom.parseImage(req.body.logo);
    if (!logo) errors.push({ msg: 'Elige la imagen del logo de tu marca o empresa (JPG o PNG).' });
    if (errors.length) return show(errors);

    const { name, phone, email } = req.body;
    const request = await custom.createRequest({
      name, phone, email, brand: req.body.brand || '', notes: req.body.notes || '', logo,
    });
    sendCustomRequestNotification(request, logo).catch((err) => {
      console.error('[mailer] Error avisando de la esfera personalizada:', err.message);
    });
    res.redirect('/personalizada?enviado=1');
  })
);

// 2) Con el link que le llega, el cliente ve su diseno y hace su pedido.
const loadByToken = wrap(async (req, res, next) => {
  const request = await custom.getRequestByToken(String(req.params.token || ''));
  if (!request || !['diseno_enviado', 'pedido'].includes(request.status)) {
    return res.status(404).render('error', { message: 'Este link no es valido. Revisa que lo hayas copiado completo.' });
  }
  req.customRequest = request;
  req.customExpired = request.status === 'diseno_enviado' && request.expires_at && new Date() > request.expires_at;
  next();
});

app.get('/personalizada/ver/:token/imagen', loadByToken, wrap(async (req, res) => {
  const img = await custom.getImage(req.customRequest.id, 'mockup');
  if (!img) return res.status(404).end();
  res.set('Content-Type', img.type).set('Cache-Control', 'private, max-age=3600');
  res.send(Buffer.from(img.data, 'base64'));
}));

function renderMockupPage(req, res, extra = {}) {
  const r = req.customRequest;
  res.render('personalizada-ver', {
    custom: CUSTOM,
    estados: ESTADOS,
    request: r,
    expired: req.customExpired,
    expiresText: fmtDate(r.expires_at),
    errors: [],
    values: { name: r.name, phone: r.phone, email: r.email },
    done: null,
    ...extra,
  });
}

app.get('/personalizada/ver/:token', loadByToken, (req, res) => {
  const done = req.query.listo === '1' ? req.session.lastCustomOrder || null : null;
  renderMockupPage(req, res, { done });
});

app.post(
  '/personalizada/ver/:token/pedido',
  orderLimiter,
  loadByToken,
  checkCsrfToken,
  [
    body('quantity').isInt({ min: 1, max: 500 }).withMessage('Escribe cuantas esferas quieres (de 1 a 500).'),
    ...contactValidators,
    ...addressValidators,
  ],
  wrap(async (req, res) => {
    const r = req.customRequest;
    const fail = (errors) => res.status(400).render('personalizada-ver', {
      custom: CUSTOM, estados: ESTADOS, request: r, expired: req.customExpired,
      expiresText: fmtDate(r.expires_at), errors, values: req.body, done: null,
    });
    if (r.status === 'pedido') return fail([{ msg: 'Ya hiciste el pedido de esta esfera. Si quieres mas, contactanos.' }]);
    if (req.customExpired) return fail([{ msg: 'El plazo para hacer el pedido de esta esfera ya termino. Contactanos para ayudarte.' }]);
    if (!req.csrfValid) {
      return fail([{ msg: 'La pagina se actualizo mientras hacias tu pedido. Tus datos siguen aqui: revisalos y presiona "Hacer pedido" otra vez.' }]);
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) return fail(errors.array());

    const quantity = parseInt(req.body.quantity, 10);
    const label = r.brand ? `${CUSTOM.name} - ${r.brand}` : CUSTOM.name;
    const items = [{
      productId: CUSTOM.id,
      name: label,
      image: null,
      imageUrl: `/personalizada/ver/${r.token}/imagen`,
      price: CUSTOM.price,
      quantity,
    }];
    const { lines: pricing, total } = computeTotals(items, [{ ...CUSTOM, id: CUSTOM.id, name: label }]);
    const { name, phone, email } = req.body;
    const address = {
      street: req.body.street, colonia: req.body.colonia, city: req.body.city,
      state: req.body.state, zip: req.body.zip, references: req.body.references || '',
    };
    const order = await insertOrder({ name, phone, email, address, items, pricing, total });
    await custom.markOrdered(r.id, order.id);
    sendOrderNotification(order).catch((err) => {
      console.error('[mailer] Error enviando la notificacion del pedido:', err.message);
    });
    req.session.lastCustomOrder = { total, pricing };
    res.redirect(`/personalizada/ver/${r.token}?listo=1`);
  })
);

// ======================= ADMIN: LOGIN =======================

app.get('/admin/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin/pedidos');
  res.render('login', { error: null });
});

app.post('/admin/login', loginLimiter, verifyCsrfToken, async (req, res) => {
  const { username, password } = req.body;

  const validUser =
    typeof username === 'string' && username === process.env.ADMIN_USERNAME;
  const validPass =
    typeof password === 'string' &&
    (await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH));

  if (!validUser || !validPass) {
    return res.status(401).render('login', { error: 'Usuario o contrasena incorrectos.' });
  }

  // Regenerar la sesion al iniciar sesion evita ataques de fijacion de sesion
  req.session.regenerate((err) => {
    if (err) return res.status(500).render('error', { message: 'Error iniciando sesion.' });
    req.session.isAdmin = true;
    res.redirect('/admin/pedidos');
  });
});

app.post('/admin/logout', requireAuth, verifyCsrfToken, (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.redirect('/admin/login');
  });
});

// ======================= ADMIN: PEDIDOS =======================

app.get('/admin/pedidos', requireAuth, async (req, res) => {
  const orders = await getAllOrders();
  res.render('orders', { orders });
});

app.post('/admin/pedidos/:id/enviar', requireAuth, verifyCsrfToken, async (req, res) => {
  const order = await updateOrderStatus(req.params.id, 'enviado');

  if (order) {
    sendShippedNotification(order).catch((err) => {
      console.error('[mailer] Error enviando la notificacion de envio:', err.message);
    });
  }

  res.redirect('/admin/pedidos');
});

// ================= ADMIN: ESFERAS PERSONALIZADAS =================

app.get('/admin/personalizadas', requireAuth, wrap(async (req, res) => {
  const requests = await custom.listRequests();
  const base = `${req.protocol}://${req.get('host')}`;
  res.render('admin-personalizadas', {
    requests,
    base,
    now: new Date(),
    fmtDate,
    error: req.query.error || null,
    ok: req.query.ok || null,
  });
}));

app.get('/admin/personalizadas/:id/:kind(logo|mockup)', requireAuth, wrap(async (req, res) => {
  const img = await custom.getImage(req.params.id, req.params.kind);
  if (!img) return res.status(404).end();
  res.set('Content-Type', img.type).set('Cache-Control', 'private, max-age=600');
  res.send(Buffer.from(img.data, 'base64'));
}));

app.post('/admin/personalizadas/:id/diseno', requireAuth, verifyCsrfToken, wrap(async (req, res) => {
  const request = await custom.getRequest(req.params.id);
  if (!request) return res.redirect('/admin/personalizadas?error=No+se+encontro+la+solicitud');
  const mockup = custom.parseImage(req.body.mockup);
  if (!mockup) return res.redirect('/admin/personalizadas?error=Elige+la+imagen+del+diseno+de+la+esfera');
  const expiresAt = custom.addBusinessDays(new Date(), 2);
  const updated = await custom.setMockup(request.id, mockup, expiresAt);
  const link = `${req.protocol}://${req.get('host')}/personalizada/ver/${updated.token}`;
  sendMockupReady(updated, link, fmtDate(expiresAt)).catch((err) => {
    console.error('[mailer] Error enviando el diseno al cliente:', err.message);
  });
  res.redirect('/admin/personalizadas?ok=Diseno+enviado.+Tambien+puedes+mandarle+el+link+por+WhatsApp.');
}));

// ======================= MANEJO DE ERRORES =======================

app.use((req, res) => {
  res.status(404).render('error', { message: 'Pagina no encontrada.' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('error', {
    message: 'Ocurrio un error inesperado. Intenta de nuevo mas tarde.',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
