const crypto = require('crypto');

function ensureCsrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  const sent = req.body && req.body._csrf;
  const expected = req.session && req.session.csrfToken;
  if (!sent || !expected || sent !== expected) {
    return res.status(403).render('error', {
      message: 'Token de seguridad invalido o expirado. Recarga la pagina e intenta de nuevo.',
    });
  }
  next();
}

// Version "suave" para el formulario de pedidos: no bloquea con una pagina de
// error, solo marca req.csrfValid. Asi, si el token expiro (por ejemplo porque
// la pagina se actualizo o el servidor se reinicio mientras el cliente llenaba
// su pedido), se le vuelve a mostrar el formulario con sus datos ya llenos y un
// token nuevo, en lugar de perder todo. El pedido NO se guarda en ese caso.
function checkCsrfToken(req, res, next) {
  const sent = req.body && req.body._csrf;
  const expected = req.session && req.session.csrfToken;
  req.csrfValid = Boolean(sent && expected && sent === expected);
  next();
}

module.exports = { ensureCsrfToken, verifyCsrfToken, checkCsrfToken };
