/* =========================================================
   CONTROLADOR · Solicitudes / eventos
   El admin ve y gestiona todo; el cliente solo lo suyo.
   ========================================================= */

const SolicitudModel = require('../models/SolicitudModel');
const UsuarioModel = require('../models/UsuarioModel');
const Catalogo = require('../core/catalogo');
const DB = require('../core/db');
const { ApiError } = require('../core/utils');

/** Devuelve la solicitud si el usuario puede verla (admin o dueño). */
function permitida(usuario, id) {
  const s = SolicitudModel.porId(id);
  if (usuario.rol !== 'admin' && s.cliente.email !== usuario.email) throw new ApiError(403, 'Esta solicitud no es tuya.');
  return s;
}

const SolicitudController = {
  /** GET /api/catalogo (público) */
  catalogo() {
    return {
      data: {
        servicios: Catalogo.SERVICIOS,
        estados: Catalogo.ESTADOS,
        cobros: Catalogo.COBROS,
        tiposEvento: Catalogo.TIPOS_EVENTO,
        invitados: Catalogo.INVITADOS,
        espacios: Catalogo.ESPACIOS,
        iva: Catalogo.IVA,
      },
    };
  },

  /** GET /api/solicitudes?estado=&cobro=&q= */
  listar({ usuario, query }) {
    const filtros = { estado: query.estado, cobro: query.cobro, q: query.q };
    if (usuario.rol !== 'admin') filtros.email = usuario.email; // el cliente solo ve las suyas
    const lista = SolicitudModel.filtrar(filtros);
    return { data: { total: lista.length, solicitudes: lista } };
  },

  /** GET /api/solicitudes/:id */
  obtener({ usuario, params }) {
    const s = permitida(usuario, params.id);
    return { data: { ...s, totalesPropuesta: s.propuesta ? SolicitudModel.totalesPropuesta(s.propuesta) : null } };
  },

  /**
   * POST /api/solicitudes
   * Cliente → solicitud web (sus datos salen de su cuenta).
   * Admin   → evento manual (debe enviar cliente, precio…).
   */
  crear({ usuario, body }) {
    let s;
    if (usuario.rol === 'admin') {
      s = SolicitudModel.crear(body, 'manual');
    } else {
      const cliente = { nombre: UsuarioModel.nombreCompleto(usuario), email: usuario.email, telefono: usuario.telefono };
      s = SolicitudModel.crear({ ...body, cliente }, 'web');
    }
    return { status: 201, data: { mensaje: `Solicitud ${s.id} creada.`, solicitud: s } };
  },

  /** PUT /api/solicitudes/:id (admin) */
  actualizar({ params, body }) {
    return { data: { mensaje: 'Gestión guardada.', solicitud: SolicitudModel.actualizar(params.id, body) } };
  },

  /** DELETE /api/solicitudes/:id (admin) */
  eliminar({ params }) {
    SolicitudModel.eliminar(params.id);
    return { data: { mensaje: `Solicitud ${params.id} eliminada.` } };
  },

  /** GET /api/solicitudes/:id/propuesta-inicial (admin) */
  propuestaInicial({ params }) {
    return { data: SolicitudModel.propuestaInicial(params.id) };
  },

  /** PUT /api/solicitudes/:id/propuesta (admin) */
  guardarPropuesta({ params, body }) {
    const s = SolicitudModel.guardarPropuesta(params.id, body);
    return { data: { mensaje: body.enviar ? 'Propuesta enviada al cliente.' : 'Borrador de propuesta guardado.', solicitud: s } };
  },

  /** POST /api/solicitudes/:id/aceptar (cliente dueño) */
  aceptar({ usuario, params }) {
    permitida(usuario, params.id);
    return { data: { mensaje: '¡Propuesta aceptada! Tu evento está confirmado.', solicitud: SolicitudModel.aceptarPropuesta(params.id) } };
  },

  /** GET /api/solicitudes/:id/mensajes */
  mensajes({ usuario, params }) {
    return { data: permitida(usuario, params.id).mensajes || [] };
  },

  /** POST /api/solicitudes/:id/mensajes */
  enviarMensaje({ usuario, params, body }) {
    permitida(usuario, params.id);
    const autor = usuario.rol === 'admin' ? 'admin' : 'cliente';
    return { status: 201, data: SolicitudModel.agregarMensaje(params.id, autor, body.texto) };
  },

  /** GET /api/resumen (admin) — métricas del Panel de control */
  resumen() {
    return { data: { ...SolicitudModel.estadisticas(), actualizado: new Date().toISOString() } };
  },

  /** POST /api/reiniciar (admin) — igual que "Borrar todos los datos" */
  reiniciar() {
    DB.reiniciar();
    return { data: { mensaje: 'Datos borrados. Solo queda la cuenta del administrador.' } };
  },
};

module.exports = SolicitudController;
