require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const products = require('./products');
const { insertOrder, getAllOrders, updateOrderStatus } = require('./db');
const { requireAuth } = require('./middleware/auth');
const { ensureCsrfToken, verifyCsrfToken } = require('./middleware/csrf');
const { sendOrderNotification, sendShippedNotification } = require('./mailer');

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

// ======================= RUTAS PUBLICAS =======================

app.get('/', (req, res) => {
  res.render('index', { products, errors: [], values: {}, success: req.query.success === '1' });
});

app.post(
  '/pedido',
  orderLimiter,
  verifyCsrfToken,
  [
    body('name').trim().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres.'),
    body('phone').trim().isLength({ min: 6, max: 30 }).withMessage('Indica un telefono valido.'),
    body('email').trim().isEmail().withMessage('Indica un correo electronico valido.').normalizeEmail(),
  ],
  async (req, res) => {
    const errors = validationResult(req);

    const items = products
      .map((product) => {
        const qtyRaw = req.body[`qty_${product.id}`];
        const quantity = parseInt(qtyRaw, 10);
        return Number.isInteger(quantity) && quantity > 0
          ? { productId: product.id, name: product.name, image: product.image, quantity: Math.min(quantity, 50) }
          : null;
      })
      .filter(Boolean);

    if (items.length === 0) {
      errors.errors.push({ msg: 'Selecciona al menos un producto y su cantidad.' });
    }

    if (!errors.isEmpty()) {
      return res.status(400).render('index', {
        products,
        errors: errors.array(),
        values: req.body,
        success: false,
      });
    }

    const { name, phone, email } = req.body;
    const order = await insertOrder({ name, phone, email, items });

    sendOrderNotification(order).catch((err) => {
      console.error('[mailer] Error enviando la notificacion del pedido:', err.message);
    });

    res.redirect('/?success=1');
  }
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
