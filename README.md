# Pedidos Web

Pagina para que tus clientes escriban su pedido. Cada pedido se guarda en una
base de datos privada, aparece en un panel de administrador protegido con
usuario y contrasena (solo tu lo ves), y ademas te llega una notificacion por
correo.

## 1. Instalar dependencias

```bash
npm install
```

## 2. Configurar el archivo .env

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Genera una clave secreta para las sesiones:

```bash
npm run gen-secret
```

Copia el valor que te muestra dentro de `.env` en `SESSION_SECRET`.

Genera el hash de la contrasena que usaras para entrar al panel de
administrador (nunca escribas la contrasena directamente en el archivo):

```bash
npm run hash-password
```

Copia el valor que te muestra dentro de `.env` en `ADMIN_PASSWORD_HASH`, y
define tu usuario en `ADMIN_USERNAME`.

## 3. Configurar el correo de notificaciones (Gmail)

Para que te lleguen los pedidos a `davidchavezchavez74@gmail.com` necesitas
una "Contrasena de aplicacion" de Google (no tu contrasena normal de Gmail):

1. Activa la verificacion en 2 pasos en tu cuenta de Google (si no la tienes).
2. Ve a https://myaccount.google.com/apppasswords
3. Crea una contrasena de aplicacion (elige "Otra" y ponle un nombre, p. ej. "Pedidos Web").
4. Copia esa contrasena de 16 caracteres en `.env`, en la variable `EMAIL_PASS`.
5. Confirma que `EMAIL_USER` y `EMAIL_TO` tengan tu correo.

Si no configuras esto, la pagina sigue funcionando y los pedidos se siguen
guardando en el panel, simplemente no se enviara el correo.

## 4. Iniciar el servidor

```bash
npm start
```

Abre http://localhost:3000 para ver el formulario de pedidos.

Entra a http://localhost:3000/admin/login con tu usuario y contrasena para
ver los pedidos recibidos.

## Seguridad incluida

- Las contrasenas del administrador se guardan como hash (bcrypt), nunca en texto plano.
- Inicio de sesion protegido contra fuerza bruta (limite de intentos).
- El formulario de pedidos tambien tiene limite de envios para evitar spam.
- Proteccion CSRF en los formularios (envio de pedido, login y logout).
- Cookies de sesion `httpOnly`, `sameSite=strict` y (en produccion) `secure`.
- Cabeceras de seguridad HTTP con Helmet (CSP, etc.).
- Validacion y saneamiento de todos los campos del formulario.
- Consultas a la base de datos siempre parametrizadas (sin inyeccion SQL).
- La base de datos (`data/orders.db`) y el archivo `.env` estan en `.gitignore`: nunca se suben a un repositorio.

## Publicar la pagina en internet (produccion)

Para que tus clientes accedan desde cualquier lugar, necesitas desplegar esta
carpeta en un servicio como Render, Railway o un VPS, y:

1. Define las mismas variables de entorno del `.env` en la configuracion del servicio (nunca subas el archivo `.env`).
2. Pon `NODE_ENV=production` para que las cookies de sesion exijan HTTPS.
3. Usa un dominio con HTTPS (la mayoria de estos servicios lo dan automaticamente).

Si quieres, puedo ayudarte a desplegarla en un servicio especifico.
