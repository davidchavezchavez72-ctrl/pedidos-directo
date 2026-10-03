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

module.exports = { ensureCsrfToken, verifyCsrfToken };
