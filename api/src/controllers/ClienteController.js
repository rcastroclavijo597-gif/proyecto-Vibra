/* =========================================================
   CONTROLADOR · Clientes (solo administrador)
   ========================================================= */

const ClienteModel = require('../models/ClienteModel');

const ClienteController = {
  /** GET /api/clientes?q=texto */
  listar({ query }) { return { data: ClienteModel.buscar(query.q || '') }; },

  /** GET /api/clientes/:id */
  obtener({ params }) { return { data: ClienteModel.porId(params.id) }; },

  /** POST /api/clientes */
  crear({ body }) {
    const c = ClienteModel.crear(body);
    return { status: 201, data: { mensaje: 'Cliente creado.', cliente: ClienteModel.porId(c.id) } };
  },

  /** PUT /api/clientes/:id */
  actualizar({ params, body }) {
    return { data: { mensaje: 'Cliente actualizado.', cliente: ClienteModel.actualizar(params.id, body) } };
  },

  /** DELETE /api/clientes/:id */
  eliminar({ params }) {
    ClienteModel.eliminar(params.id);
    return { data: { mensaje: `Cliente ${params.id} eliminado.` } };
  },
};

module.exports = ClienteController;
