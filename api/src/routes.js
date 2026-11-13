/* =========================================================
   VIBRA API · routes.js
   Tabla de rutas: método + ruta + quién puede entrar + controlador.
     acceso: 'publico' | 'usuario' (cualquiera con sesión) | 'admin'
   ========================================================= */

const Auth = require('./controllers/AuthController');
const Clientes = require('./controllers/ClienteController');
const Solicitudes = require('./controllers/SolicitudController');

const rutas = [
  // Autenticación
  ['POST', '/api/auth/registro', 'publico', Auth.registro, 'Crear cuenta de cliente'],
  ['POST', '/api/auth/login', 'publico', Auth.login, 'Iniciar sesión (devuelve token)'],
  ['GET', '/api/auth/perfil', 'usuario', Auth.perfil, 'Usuario conectado'],
  ['POST', '/api/auth/logout', 'usuario', Auth.logout, 'Cerrar sesión'],
  ['GET', '/api/usuarios', 'admin', Auth.listar, 'Listar cuentas'],

  // Catálogo
  ['GET', '/api/catalogo', 'publico', Solicitudes.catalogo, 'Servicios, estados y opciones'],

  // Solicitudes / eventos
  ['GET', '/api/solicitudes', 'usuario', Solicitudes.listar, 'Listar (filtros: ?estado=&cobro=&q=)'],
  ['POST', '/api/solicitudes', 'usuario', Solicitudes.crear, 'Crear solicitud (cliente) o evento manual (admin)'],
  ['GET', '/api/solicitudes/:id', 'usuario', Solicitudes.obtener, 'Detalle de una solicitud'],
  ['PUT', '/api/solicitudes/:id', 'admin', Solicitudes.actualizar, 'Gestionar estado, cobro, precio, datos'],
  ['DELETE', '/api/solicitudes/:id', 'admin', Solicitudes.eliminar, 'Eliminar solicitud'],
  ['GET', '/api/solicitudes/:id/propuesta-inicial', 'admin', Solicitudes.propuestaInicial, 'Propuesta sugerida'],
  ['PUT', '/api/solicitudes/:id/propuesta', 'admin', Solicitudes.guardarPropuesta, 'Guardar / enviar propuesta'],
  ['POST', '/api/solicitudes/:id/aceptar', 'usuario', Solicitudes.aceptar, 'El cliente acepta la propuesta'],
  ['GET', '/api/solicitudes/:id/mensajes', 'usuario', Solicitudes.mensajes, 'Chat de la solicitud'],
  ['POST', '/api/solicitudes/:id/mensajes', 'usuario', Solicitudes.enviarMensaje, 'Enviar mensaje'],

  // Clientes
  ['GET', '/api/clientes', 'admin', Clientes.listar, 'Listar clientes (?q=)'],
  ['POST', '/api/clientes', 'admin', Clientes.crear, 'Crear cliente'],
  ['GET', '/api/clientes/:id', 'admin', Clientes.obtener, 'Detalle de cliente'],
  ['PUT', '/api/clientes/:id', 'admin', Clientes.actualizar, 'Editar cliente'],
  ['DELETE', '/api/clientes/:id', 'admin', Clientes.eliminar, 'Eliminar cliente'],

  // Panel de control
  ['GET', '/api/resumen', 'admin', Solicitudes.resumen, 'Métricas del panel'],
  ['POST', '/api/reiniciar', 'admin', Solicitudes.reiniciar, 'Borrar todos los datos'],
].map(([metodo, ruta, acceso, handler, descripcion]) => ({
  metodo, ruta, acceso, handler, descripcion,
  // '/api/solicitudes/:id' → /^\/api\/solicitudes\/([^/]+)$/
  regex: new RegExp(`^${ruta.replace(/:(\w+)/g, '([^/]+)')}$`),
  params: [...ruta.matchAll(/:(\w+)/g)].map((m) => m[1]),
}));

module.exports = rutas;
