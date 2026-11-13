/* =========================================================
   MODELO · Usuario
   Registro y autenticación de cuentas (clientes y admin).
   ========================================================= */

const DB = require('../core/db');
const { Utils, ApiError, lanzarSiHayErrores } = require('../core/utils');
const ClienteModel = require('./ClienteModel');

const UsuarioModel = {
  todos() { return DB.tabla('usuarios'); },
  porId(id) { return UsuarioModel.todos().find((u) => u.id === id) || null; },
  porEmail(email) {
    const e = (email || '').trim().toLowerCase();
    return UsuarioModel.todos().find((u) => u.email.toLowerCase() === e) || null;
  },

  /** Lo que se puede mostrar: nunca la contraseña. */
  publico(u) {
    if (!u) return null;
    const { password, ...resto } = u;
    return resto;
  },

  nombreCompleto(u) { return [u.nombre, u.apellidos].filter(Boolean).join(' '); },

  validarRegistro(d) {
    const err = {};
    if (!d.nombre?.trim()) err.nombre = 'Escribe tu nombre.';
    if (!d.apellidos?.trim()) err.apellidos = 'Escribe tus apellidos.';
    if (!Utils.emailValido(d.email)) err.email = 'Introduce un correo válido.';
    if (!/^[+\d][\d\s-]{6,}$/.test((d.telefono || '').trim())) err.telefono = 'Introduce un teléfono válido.';
    if (String(d.password || '').length < 8) err.password = 'Mínimo 8 caracteres.';
    if (d.terminos !== true) err.terminos = 'Debes aceptar los términos de uso.';
    return err;
  },

  registrar(d = {}) {
    lanzarSiHayErrores(UsuarioModel.validarRegistro(d), 'Datos no válidos.');
    if (UsuarioModel.porEmail(d.email)) {
      throw new ApiError(409, 'Ya existe una cuenta con este correo.', { email: 'Ya existe una cuenta con este correo.' });
    }
    const usuario = {
      id: 'u' + Date.now(),
      nombre: d.nombre.trim(),
      apellidos: d.apellidos.trim(),
      email: d.email.trim().toLowerCase(),
      telefono: d.telefono.trim(),
      password: Utils.hashPassword(d.password),
      rol: 'cliente',
    };
    DB.transaccion((db) => { db.usuarios.push(usuario); });
    ClienteModel.asegurar({ nombre: UsuarioModel.nombreCompleto(usuario), email: usuario.email, telefono: usuario.telefono });
    return UsuarioModel.publico(usuario);
  },

  autenticar(email, password) {
    const u = UsuarioModel.porEmail(email);
    if (!u || !Utils.verificarPassword(password, u.password)) throw new ApiError(401, 'Correo o contraseña incorrectos.');
    return u;
  },
};

module.exports = UsuarioModel;
