/* =========================================================
   MODELO · Cliente
   Base de datos de clientes con su actividad y facturación.
   ========================================================= */

const DB = require('../core/db');
const { Utils, ApiError, lanzarSiHayErrores } = require('../core/utils');

const ClienteModel = {
  /** Lista de clientes con estadísticas calculadas desde las solicitudes. */
  todos() {
    const SolicitudModel = require('./SolicitudModel'); // se carga aquí para evitar dependencia circular
    const solicitudes = SolicitudModel.todas();
    return DB.tabla('clientes').map((c) => {
      const propias = solicitudes.filter((s) => s.cliente.email === c.email);
      return {
        ...c,
        eventos: (c.eventosPrevios || 0) + propias.length,
        facturacion: (c.facturacionPrevia || 0) + propias.reduce((t, s) => t + SolicitudModel.importeEstimado(s), 0),
        solicitudes: propias.map((s) => ({ id: s.id, tipo: s.tipo, fecha: s.fecha, estado: s.estado })),
      };
    });
  },

  porId(id) {
    const c = ClienteModel.todos().find((x) => x.id === id);
    if (!c) throw new ApiError(404, 'El cliente no existe.');
    return c;
  },

  porEmail(email) {
    const e = (email || '').trim().toLowerCase();
    return DB.tabla('clientes').find((c) => c.email === e) || null;
  },

  buscar(texto = '') {
    const q = Utils.normalizar(texto.trim());
    const lista = ClienteModel.todos();
    return q ? lista.filter((c) => Utils.normalizar(`${c.nombre} ${c.email}`).includes(q)) : lista;
  },

  validar(d, { parcial = false } = {}) {
    const err = {};
    if (!parcial || d.nombre !== undefined) if (!d.nombre?.trim()) err.nombre = 'El nombre es obligatorio.';
    if (!parcial) if (!Utils.emailValido(d.email)) err.email = 'Correo no válido.';
    return err;
  },

  crear(d = {}) {
    lanzarSiHayErrores(ClienteModel.validar(d), 'Datos no válidos.');
    if (ClienteModel.porEmail(d.email)) {
      throw new ApiError(409, 'Ya existe un cliente con este correo.', { email: 'Ya existe un cliente con este correo.' });
    }
    const cliente = {
      id: 'c' + Date.now() + Math.random().toString(36).slice(2, 5),
      nombre: d.nombre.trim(),
      email: d.email.trim().toLowerCase(),
      telefono: (d.telefono || '').trim(),
      ciudad: (d.ciudad || '').trim(),
      eventosPrevios: 0,
      facturacionPrevia: 0,
      creado: new Date().toISOString(),
    };
    DB.transaccion((db) => { db.clientes.push(cliente); });
    return cliente;
  },

  /** Edita nombre, teléfono o ciudad. El correo no cambia porque une al cliente con sus eventos. */
  actualizar(id, d = {}) {
    lanzarSiHayErrores(ClienteModel.validar(d, { parcial: true }), 'Datos no válidos.');
    DB.transaccion((db) => {
      const c = db.clientes.find((x) => x.id === id);
      if (!c) throw new ApiError(404, 'El cliente no existe.');
      ['nombre', 'telefono', 'ciudad'].forEach((k) => { if (d[k] !== undefined) c[k] = String(d[k]).trim(); });
    });
    return ClienteModel.porId(id);
  },

  eliminar(id) {
    DB.transaccion((db) => {
      const antes = db.clientes.length;
      db.clientes = db.clientes.filter((c) => c.id !== id);
      if (db.clientes.length === antes) throw new ApiError(404, 'El cliente no existe.');
    });
  },

  /** Crea el cliente si no existe (al registrarse o al crear eventos). */
  asegurar({ nombre, email, telefono = '', ciudad = '' }) {
    if (!email) return null;
    return ClienteModel.porEmail(email) || ClienteModel.crear({ nombre, email, telefono, ciudad });
  },
};

module.exports = ClienteModel;
