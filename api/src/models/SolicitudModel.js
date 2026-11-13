/* =========================================================
   MODELO · Solicitud (evento)
   Creación, estados, cobros, propuestas, mensajes y métricas.
   Mismas reglas que app/models/SolicitudModel.js.
   ========================================================= */

const DB = require('../core/db');
const Catalogo = require('../core/catalogo');
const { Utils, ApiError, lanzarSiHayErrores } = require('../core/utils');
const ClienteModel = require('./ClienteModel');

const SolicitudModel = {
  /* ---------- Lectura ---------- */
  numero(id) { return parseInt(String(id).replace(/\D/g, ''), 10) || 0; },

  todas() {
    return DB.tabla('solicitudes').sort((a, b) => SolicitudModel.numero(b.id) - SolicitudModel.numero(a.id));
  },

  porId(id) {
    const s = SolicitudModel.todas().find((x) => x.id === id);
    if (!s) throw new ApiError(404, `La solicitud ${id} no existe.`);
    return s;
  },

  /** Filtra por estado, cobro, email del cliente y texto libre. */
  filtrar({ estado, cobro, email, q } = {}) {
    if (estado && !Catalogo.ESTADOS[estado]) throw new ApiError(400, `Estado no válido. Usa: ${Object.keys(Catalogo.ESTADOS).join(', ')}.`);
    if (cobro && !Catalogo.COBROS[cobro]) throw new ApiError(400, 'Cobro no válido. Usa: pendiente, pagado.');
    const texto = Utils.normalizar((q || '').trim());
    return SolicitudModel.todas().filter((s) =>
      (!estado || s.estado === estado)
      && (!cobro || s.cobro === cobro)
      && (!email || s.cliente.email === email.toLowerCase())
      && (!texto || Utils.normalizar(`${s.id} ${s.cliente.nombre} ${s.cliente.email} ${s.tipo}`).includes(texto)));
  },

  /* ---------- Cálculos ---------- */
  totalesPropuesta(propuesta) {
    const subtotal = (propuesta?.conceptos || []).reduce((t, c) => t + (Number(c.precio) || 0), 0);
    const iva = Math.round(subtotal * Catalogo.IVA * 100) / 100;
    return { subtotal, iva, total: Math.round((subtotal + iva) * 100) / 100 };
  },

  importeEstimado(s) {
    if (s.propuesta && s.propuesta.estado === 'borrador') return SolicitudModel.totalesPropuesta(s.propuesta).total;
    return Number(s.precio) || 0;
  },

  estadisticas() {
    const todas = SolicitudModel.todas();
    const pendientes = todas.filter((s) => s.cobro === 'pendiente');
    const pagadas = todas.filter((s) => s.cobro === 'pagado');
    const suma = (l) => l.reduce((t, s) => t + (Number(s.precio) || 0), 0);
    const porEstado = Object.fromEntries(Object.keys(Catalogo.ESTADOS).map((k) => [k, todas.filter((s) => s.estado === k).length]));
    return {
      solicitudesNuevas: porEstado.nueva,
      eventosActivos: todas.length,
      porEstado,
      pendienteDeCobro: suma(pendientes),
      eventosPendientes: pendientes.length,
      facturacion: suma(pagadas),
      eventosPagados: pagadas.length,
      totalClientes: DB.tabla('clientes').length,
    };
  },

  /* ---------- Validación ---------- */
  validarServicios(servicios, err) {
    if (!Array.isArray(servicios) || !servicios.length) { err.servicios = 'Selecciona al menos un servicio.'; return; }
    servicios.forEach((s) => {
      const def = Catalogo.servicio(s?.id);
      if (!def) { err.servicios = `Servicio desconocido: "${s?.id}". Consulta GET /api/catalogo.`; return; }
      if (def.config?.tipo === 'cantidades') {
        const ok = Array.isArray(s.config) && s.config.some((x) => Number(x.cantidad) > 0);
        if (!ok) err[`cfg-${s.id}`] = `Elige al menos un equipo de ${def.nombre.toLowerCase()} y su cantidad.`;
        (s.config || []).forEach((x) => {
          const eq = Catalogo.equipo(s.id, x.id);
          if (!eq) err[`cfg-${s.id}`] = `Equipo desconocido en ${def.nombre}: "${x.id}".`;
          else if (Number(x.cantidad) > eq.max) err[`cfg-${s.id}`] = `Máximo ${eq.max} de ${eq.nombre}.`;
        });
      }
    });
  },

  /** Reglas del paso 2 del asistente (lo que envía el cliente). */
  validarDetalles(d, { esNueva = true } = {}) {
    const err = {};
    if (!Catalogo.TIPOS_EVENTO.includes(d.tipo)) err.tipo = `Elige qué estás celebrando: ${Catalogo.TIPOS_EVENTO.join(', ')}.`;
    if (!Utils.fechaValida(d.fecha)) err.fecha = 'Indica la fecha con formato AAAA-MM-DD.';
    else if (esNueva && d.fecha < Utils.hoyISO()) err.fecha = 'La fecha no puede ser pasada.';
    if (!Catalogo.INVITADOS.includes(d.invitados)) err.invitados = `Selecciona una opción: ${Catalogo.INVITADOS.join(', ')}.`;
    if (!d.ciudad?.trim()) err.ciudad = 'Indica la ciudad.';
    if (!Catalogo.ESPACIOS.includes(d.espacio)) err.espacio = `Selecciona una opción: ${Catalogo.ESPACIOS.join(', ')}.`;
    SolicitudModel.validarServicios(d.servicios, err);
    return err;
  },

  /** Reglas extra del evento manual del administrador. */
  validarManual(d) {
    const err = SolicitudModel.validarDetalles(d, { esNueva: false });
    if (!d.cliente?.nombre?.trim()) err.nombre = 'El nombre del cliente es obligatorio.';
    if (!Utils.emailValido(d.cliente?.email)) err.email = 'Correo del cliente no válido.';
    if (!d.cliente?.telefono?.trim()) err.telefono = 'El teléfono del cliente es obligatorio.';
    if (!(Number(d.precio) > 0)) err.precio = 'Indica un importe mayor que 0.';
    if (d.estado !== undefined && !Catalogo.ESTADOS[d.estado]) err.estado = 'Estado no válido.';
    if (d.cobro !== undefined && !Catalogo.COBROS[d.cobro]) err.cobro = 'Cobro no válido.';
    return err;
  },

  limpiarServicios(servicios) {
    return servicios.map((s) => {
      const def = Catalogo.servicio(s.id);
      let config = null;
      if (def.config?.tipo === 'cantidades') config = s.config.filter((x) => Number(x.cantidad) > 0).map((x) => ({ id: x.id, cantidad: Number(x.cantidad) }));
      if (def.config?.tipo === 'texto') config = String(s.config || '').trim();
      return { id: s.id, config };
    });
  },

  /* ---------- Escritura ---------- */
  /**
   * @param {object} d datos del evento (incluye cliente {nombre, email, telefono})
   * @param {'web'|'manual'} origen web = lo envía el cliente · manual = lo crea el admin
   */
  crear(d = {}, origen = 'web') {
    lanzarSiHayErrores(origen === 'manual' ? SolicitudModel.validarManual(d) : SolicitudModel.validarDetalles(d));
    const ahora = new Date().toISOString();
    const solicitud = DB.transaccion((db) => {
      const nueva = {
        id: `EV-${db.secuencia++}`,
        origen,
        cliente: {
          nombre: d.cliente.nombre.trim(),
          email: d.cliente.email.trim().toLowerCase(),
          telefono: (d.cliente.telefono || '').trim(),
        },
        tipo: d.tipo, fecha: d.fecha, invitados: d.invitados, espacio: d.espacio,
        ciudad: d.ciudad.trim(),
        notas: (d.notas || '').trim(),
        servicios: SolicitudModel.limpiarServicios(d.servicios),
        fotos: [],
        precio: origen === 'manual' ? Number(d.precio) : 0,
        estado: origen === 'manual' ? (d.estado || 'nueva') : 'nueva',
        cobro: origen === 'manual' ? (d.cobro || 'pendiente') : 'pendiente',
        propuesta: null,
        actividad: [{
          titulo: 'Solicitud recibida',
          descripcion: origen === 'manual' ? 'El administrador creó este evento manualmente.' : 'El cliente envió la solicitud desde la web.',
          fecha: ahora,
        }],
        mensajes: [],
        creada: ahora,
      };
      db.solicitudes.push(nueva);
      return nueva;
    });
    ClienteModel.asegurar({ ...solicitud.cliente, ciudad: solicitud.ciudad });
    return solicitud;
  },

  /** Gestión del admin: estado, cobro, precio y datos del evento. Deja registro en la actividad. */
  actualizar(id, cambios = {}) {
    const permitidos = ['estado', 'cobro', 'precio', 'tipo', 'fecha', 'invitados', 'espacio', 'ciudad', 'notas', 'servicios'];
    const extra = Object.keys(cambios).filter((k) => !permitidos.includes(k));
    if (extra.length) throw new ApiError(400, `Campos no editables: ${extra.join(', ')}. Permitidos: ${permitidos.join(', ')}.`);
    if (!Object.keys(cambios).length) throw new ApiError(400, 'Envía al menos un campo para actualizar.');

    return DB.transaccion((db) => {
      const s = db.solicitudes.find((x) => x.id === id);
      if (!s) throw new ApiError(404, `La solicitud ${id} no existe.`);

      const err = {};
      if (cambios.estado !== undefined && !Catalogo.ESTADOS[cambios.estado]) err.estado = `Usa: ${Object.keys(Catalogo.ESTADOS).join(', ')}.`;
      if (cambios.cobro !== undefined && !Catalogo.COBROS[cambios.cobro]) err.cobro = 'Usa: pendiente, pagado.';
      if (cambios.precio !== undefined && !(Number(cambios.precio) >= 0)) err.precio = 'El precio debe ser un número mayor o igual a 0.';
      const detalles = ['tipo', 'fecha', 'invitados', 'espacio', 'ciudad', 'servicios'];
      if (detalles.some((k) => cambios[k] !== undefined)) {
        Object.assign(err, SolicitudModel.validarDetalles({ ...s, ...cambios }, { esNueva: false }));
      }
      lanzarSiHayErrores(err);

      const ahora = new Date().toISOString();
      const log = (titulo, descripcion) => s.actividad.push({ titulo, descripcion, fecha: ahora });

      if (cambios.estado && cambios.estado !== s.estado) log(`Estado actualizado: ${Catalogo.ESTADOS[cambios.estado]}`, 'El cliente puede ver este cambio desde su panel.');
      if (cambios.cobro && cambios.cobro !== s.cobro) log(`Cobro marcado como ${Catalogo.COBROS[cambios.cobro].toLowerCase()}`, 'Se actualizó el estado del cobro.');
      if (cambios.precio !== undefined && Number(cambios.precio) !== Number(s.precio)) log('Precio acordado actualizado', `Nuevo importe: ${Utils.euros(cambios.precio)}.`);
      if (['tipo', 'fecha', 'invitados', 'espacio', 'ciudad', 'notas', 'servicios'].some((k) => cambios[k] !== undefined && JSON.stringify(cambios[k]) !== JSON.stringify(s[k]))) {
        log('Datos del evento editados', 'Se modificó la información del evento.');
      }

      Object.assign(s, cambios);
      if (cambios.precio !== undefined) s.precio = Number(cambios.precio);
      if (cambios.servicios) s.servicios = SolicitudModel.limpiarServicios(cambios.servicios);
      if (typeof s.ciudad === 'string') s.ciudad = s.ciudad.trim();
      return s;
    });
  },

  eliminar(id) {
    DB.transaccion((db) => {
      const antes = db.solicitudes.length;
      db.solicitudes = db.solicitudes.filter((s) => s.id !== id);
      if (db.solicitudes.length === antes) throw new ApiError(404, `La solicitud ${id} no existe.`);
    });
  },

  /** Propuesta sugerida a partir de los servicios pedidos (lo que precarga presupuesto.html). */
  propuestaInicial(id) {
    const s = SolicitudModel.porId(id);
    const base = { sonido: 650, dj: 720, iluminacion: 480, efectos: 300, musica: 900, medida: 400 };
    const conceptos = s.servicios.map((x) => ({
      nombre: Catalogo.servicio(x.id).nombre,
      detalle: Catalogo.detalleServicio(x),
      precio: Catalogo.precioReferencia(x) || base[x.id] || 0,
    }));
    conceptos.push({ nombre: 'Transporte y montaje', detalle: `${s.ciudad || 'Ciudad'} y alrededores`, precio: 200 });
    const propuesta = {
      estado: 'borrador',
      conceptos,
      mensaje: `Hola ${s.cliente.nombre.split(' ')[0]}, hemos preparado esta propuesta según los detalles de tu ${s.tipo.toLowerCase()}. Todos los servicios incluyen montaje, pruebas y asistencia técnica.`,
    };
    return { ...propuesta, ...SolicitudModel.totalesPropuesta(propuesta) };
  },

  /** Guarda la propuesta; con enviar=true pasa la solicitud a "propuesta" y fija el precio con IVA. */
  guardarPropuesta(id, { conceptos, mensaje = '', enviar = false } = {}) {
    if (!Array.isArray(conceptos)) throw new ApiError(400, 'Envía "conceptos" como una lista de { nombre, detalle, precio }.');
    const limpios = conceptos
      .map((c) => ({ nombre: String(c?.nombre || '').trim(), detalle: String(c?.detalle || '').trim(), precio: Number(c?.precio) || 0 }))
      .filter((c) => c.nombre);
    if (enviar && !limpios.length) throw new ApiError(400, 'Añade al menos un concepto.');
    if (enviar && limpios.some((c) => c.precio <= 0)) throw new ApiError(400, 'Todos los conceptos necesitan un precio.');

    const datos = { estado: enviar ? 'enviada' : 'borrador', conceptos: limpios, mensaje: String(mensaje).trim() };
    const totales = SolicitudModel.totalesPropuesta(datos);

    return DB.transaccion((db) => {
      const s = db.solicitudes.find((x) => x.id === id);
      if (!s) throw new ApiError(404, `La solicitud ${id} no existe.`);
      if (s.estado === 'confirmada') throw new ApiError(409, 'La solicitud ya está confirmada; no se puede cambiar la propuesta.');
      s.propuesta = datos;
      if (enviar) {
        s.precio = totales.total;
        s.estado = 'propuesta';
        s.actividad.push({ titulo: 'Propuesta enviada', descripcion: `Se envió una propuesta de ${Utils.euros(totales.total)} al cliente.`, fecha: new Date().toISOString() });
      }
      return { ...s, totales };
    });
  },

  /** El cliente acepta la propuesta desde su panel. */
  aceptarPropuesta(id) {
    return DB.transaccion((db) => {
      const s = db.solicitudes.find((x) => x.id === id);
      if (!s) throw new ApiError(404, `La solicitud ${id} no existe.`);
      if (s.estado !== 'propuesta' || s.propuesta?.estado !== 'enviada') {
        throw new ApiError(409, 'Esta solicitud no tiene una propuesta enviada pendiente de aceptar.');
      }
      s.estado = 'confirmada';
      s.propuesta.estado = 'aceptada';
      s.actividad.push({ titulo: 'Propuesta aceptada', descripcion: 'El cliente aceptó la propuesta desde su panel.', fecha: new Date().toISOString() });
      return s;
    });
  },

  agregarMensaje(id, autor, texto) {
    const limpio = String(texto || '').trim();
    if (!limpio) throw new ApiError(400, 'El mensaje no puede estar vacío.', { texto: 'Escribe un mensaje.' });
    return DB.transaccion((db) => {
      const s = db.solicitudes.find((x) => x.id === id);
      if (!s) throw new ApiError(404, `La solicitud ${id} no existe.`);
      const mensaje = { autor, texto: limpio, fecha: new Date().toISOString() };
      s.mensajes = s.mensajes || [];
      s.mensajes.push(mensaje);
      return mensaje;
    });
  },
};

module.exports = SolicitudModel;
