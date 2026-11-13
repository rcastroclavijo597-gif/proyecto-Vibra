/* =========================================================
   MODELO · Sesión
   En el navegador se usaba sessionStorage. En la API, al iniciar
   sesión se entrega un token que se envía en cada petición:
     Authorization: Bearer <token>
   Los tokens viven en memoria: si reinicias el servidor, vuelve
   a hacer login.
   ========================================================= */

const { Utils, ApiError } = require('../core/utils');
const UsuarioModel = require('./UsuarioModel');

const sesiones = new Map(); // token → { userId, desde }

const SesionModel = {
  iniciar(usuario) {
    const token = Utils.token();
    sesiones.set(token, { userId: usuario.id, desde: new Date().toISOString() });
    return token;
  },

  /** Usuario dueño del token o null. */
  usuarioDe(token) {
    const s = token && sesiones.get(token);
    return s ? UsuarioModel.porId(s.userId) : null;
  },

  cerrar(token) { sesiones.delete(token); },

  /** Lee la cabecera Authorization y exige sesión (y rol, si se indica). */
  exigir(req, rol = null) {
    const cabecera = req.headers.authorization || '';
    const token = cabecera.startsWith('Bearer ') ? cabecera.slice(7).trim() : '';
    const usuario = SesionModel.usuarioDe(token);
    if (!usuario) throw new ApiError(401, 'Debes iniciar sesión. Envía la cabecera Authorization: Bearer <token>.');
    if (rol && usuario.rol !== rol) throw new ApiError(403, 'No tienes permiso para esta acción.');
    return { usuario, token };
  },
};

module.exports = SesionModel;
