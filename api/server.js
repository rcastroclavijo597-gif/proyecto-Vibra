/* =========================================================
   VIBRA API · server.js
   Servidor HTTP con Node.js puro (sin instalar nada).
   Arrancar:  node server.js     →  http://localhost:3000
   ========================================================= */

const http = require('http');
const rutas = require('./src/routes');
const SesionModel = require('./src/models/SesionModel');
const DB = require('./src/core/db');
const { ApiError } = require('./src/core/utils');

const PUERTO = Number(process.env.PORT) || 3000;
const MAX_BODY = 1024 * 1024; // 1 MB

function enviar(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end(data === undefined ? '' : JSON.stringify(data, null, 2));
}

function leerBody(req) {
  return new Promise((resolve, reject) => {
    let texto = '';
    req.on('data', (trozo) => {
      texto += trozo;
      if (texto.length > MAX_BODY) reject(new ApiError(413, 'El cuerpo de la petición es demasiado grande.'));
    });
    req.on('end', () => {
      if (!texto.trim()) return resolve({});
      try {
        const json = JSON.parse(texto);
        if (typeof json !== 'object' || json === null || Array.isArray(json)) throw new Error();
        resolve(json);
      } catch {
        reject(new ApiError(400, 'El cuerpo debe ser un JSON válido (en Postman: Body → raw → JSON).'));
      }
    });
    req.on('error', reject);
  });
}

const servidor = http.createServer(async (req, res) => {
  const inicio = Date.now();
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const ruta = url.pathname.replace(/\/+$/, '') || '/';

  try {
    if (req.method === 'OPTIONS') return enviar(res, 204);

    // Página de bienvenida: lista todos los endpoints
    if (ruta === '/' || ruta === '/api') {
      return enviar(res, 200, {
        nombre: 'Vibra API',
        version: '1.0.0',
        estado: 'funcionando',
        autenticacion: 'Haz POST /api/auth/login y envía el token en la cabecera Authorization: Bearer <token>',
        endpoints: rutas.map((r) => ({ metodo: r.metodo, ruta: r.ruta, acceso: r.acceso, descripcion: r.descripcion })),
      });
    }

    const coincidentes = rutas.filter((r) => r.regex.test(ruta));
    if (!coincidentes.length) throw new ApiError(404, `La ruta ${ruta} no existe. Mira GET / para ver los endpoints.`);
    const r = coincidentes.find((x) => x.metodo === req.method);
    if (!r) throw new ApiError(405, `Método ${req.method} no permitido en ${ruta}. Usa: ${coincidentes.map((x) => x.metodo).join(', ')}.`);

    const valores = ruta.match(r.regex).slice(1).map(decodeURIComponent);
    const ctx = {
      params: Object.fromEntries(r.params.map((p, i) => [p, valores[i]])),
      query: Object.fromEntries(url.searchParams),
      body: ['POST', 'PUT'].includes(req.method) ? await leerBody(req) : {},
    };
    if (r.acceso !== 'publico') Object.assign(ctx, SesionModel.exigir(req, r.acceso === 'admin' ? 'admin' : null));

    const { status = 200, data } = r.handler(ctx);
    enviar(res, status, data);
  } catch (err) {
    const status = err instanceof ApiError ? err.status : 500;
    if (status === 500) console.error(err);
    const cuerpo = { error: status === 500 ? 'Error interno del servidor.' : err.message };
    if (err.campos) cuerpo.campos = Object.fromEntries(Object.entries(err.campos).filter(([, v]) => v));
    enviar(res, status, cuerpo);
  } finally {
    console.log(`${req.method} ${req.url} → ${res.statusCode} (${Date.now() - inicio} ms)`);
  }
});

servidor.listen(PUERTO, () => {
  DB.cargar(); // crea data/db.json la primera vez
  console.log('');
  console.log('  Vibra API funcionando');
  console.log(`  → http://localhost:${PUERTO}`);
  console.log(`  Datos en: ${DB.archivo}`);
  console.log('  Admin: admin@gmail.com / admin123');
  console.log('  (Ctrl + C para detener)');
  console.log('');
});
