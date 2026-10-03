// Genera el hash seguro de una contraseña para usar como ADMIN_PASSWORD_HASH en .env
// Uso: npm run hash-password
const readline = require('readline');
const bcrypt = require('bcryptjs');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

rl.question('Escribe la contrasena que quieres usar para el panel de administrador: ', (password) => {
  rl.close();
  if (!password || password.length < 8) {
    console.error('\nLa contrasena debe tener al menos 8 caracteres. Intenta de nuevo.');
    process.exit(1);
  }
  const hash = bcrypt.hashSync(password, 12);
  console.log('\nCopia esta linea dentro de tu archivo .env:\n');
  console.log(`ADMIN_PASSWORD_HASH=${hash}\n`);
});
