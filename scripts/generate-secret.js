// Genera una clave secreta aleatoria para usar como SESSION_SECRET en .env
// Uso: npm run gen-secret
const crypto = require('crypto');
console.log('\nCopia esta linea dentro de tu archivo .env:\n');
console.log(`SESSION_SECRET=${crypto.randomBytes(48).toString('hex')}\n`);
