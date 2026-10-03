# Pedidos Directo

Pagina para que tus clientes escriban su pedido. Cada pedido se guarda en una
base de datos privada, aparece en un panel de administrador protegido con
usuario y contrasena (solo tu lo ves), y ademas te llega una notificacion por
correo.

**Web publicada:** https://pedidos-directo.onrender.com

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

## 3. Configurar la base de datos (PostgreSQL)

Si no configuras esto, los pedidos se guardan en memoria mientras el servidor
esta corriendo, pero **se pierden al reiniciar**. En produccion SIEMPRE define
`DATABASE_URL` con una base de datos PostgreSQL real, por ejemplo creando
"New Postgres" en Render (tiene un plan gratuito, aunque las bases gratis de
Render expiran a los 30 dias y hay que pasarlas a un plan pago para
conservarlas mas tiempo).

## 4. Configurar el correo de notificaciones (Resend)

El envio de correo usa Resend (API por HTTPS) en vez de SMTP directo, porque
la mayoria de los planes gratuitos de hosting (como Render) bloquean las
conexiones SMTP para evitar spam.

1. Crea una cuenta gratis en https://resend.com con tu correo.
2. Ve a https://resend.com/api-keys y crea una API Key.
3. Copia esa clave en `.env`, en la variable `RESEND_API_KEY`.
4. Pon tu correo en `EMAIL_TO` (debe ser el mismo con el que te registraste en
   Resend, a menos que verifiques un dominio propio en Resend).

Si no configuras esto, la pagina sigue funcionando y los pedidos se siguen
guardando en el panel, simplemente no se enviara el correo.

## 5. Iniciar el servidor

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
- El archivo `.env` esta en `.gitignore`: nunca se sube al repositorio.

## Mantenimiento

- **La base de datos gratuita de Render expira el 2 de noviembre de 2026.**
  Antes de esa fecha, pasa `pedidos-directo-db` a un plan pago (desde el
  dashboard de Render) o migra los datos a otro proveedor para no perderlos.
- Las variables de entorno (correo, base de datos, credenciales del panel) se
  configuran en Render: Dashboard -> pedidos-directo -> Environment.
- Para ver pedidos entrantes en vivo o depurar errores, usa los Logs del
  servicio en el dashboard de Render.
