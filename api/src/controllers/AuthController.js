/* =========================================================
   CONTROLADOR · Autenticación
   ========================================================= */

const UsuarioModel = require('../models/UsuarioModel');
const SesionModel = require('../models/SesionModel');
const { ApiError } = require('../core/utils');

const AuthController = {
  /** POST /api/auth/registro */
  registro({ body }) {
    const usuario = UsuarioModel.registrar(body);
    const token = SesionModel.iniciar(usuario);
    return { status: 201, data: { mensaje: 'Cuenta creada correctamente.', token, usuario } };
  },

  /** POST /api/auth/login */
  login({ body }) {
    if (!body.email || !body.password) throw new ApiError(400, 'Envía email y password.', { email: !body.email ? 'Obligatorio.' : undefined, password: !body.password ? 'Obligatorio.' : undefined });
    const usuario = UsuarioModel.autenticar(body.email, body.password);
    const token = SesionModel.iniciar(usuario);
    return { data: { mensaje: `Bienvenido, ${usuario.nombre}.`, token, usuario: UsuarioModel.publico(usuario) } };
  },

  /** GET /api/auth/perfil */
  perfil({ usuario }) {
    return { data: UsuarioModel.publico(usuario) };
  },

  /** POST /api/auth/logout */
  logout({ token }) {
    SesionModel.cerrar(token);
    return { data: { mensaje: 'Sesión cerrada.' } };
  },

  /** GET /api/usuarios (admin) */
  listar() {
    return { data: UsuarioModel.todos().map(UsuarioModel.publico) };
  },
};

module.exports = AuthController;
