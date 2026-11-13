/* =========================================================
   VIBRA API · core/catalogo.js
   Datos fijos del negocio (los mismos de app/core/catalogo.js).
   ========================================================= */

const Catalogo = {
  SERVICIOS: [
    {
      id: 'sonido', nombre: 'Sonido profesional',
      descripcion: 'Equipos de alta fidelidad adaptados a tu espacio.',
      config: {
        tipo: 'cantidades',
        items: [
          { id: 'grande', nombre: 'Parlantes grandes', precio: 90, max: 16 },
          { id: 'mediano', nombre: 'Parlantes medianos', precio: 60, max: 16 },
          { id: 'bajo', nombre: 'Bajos (subwoofers)', precio: 110, max: 8 },
          { id: 'monitor', nombre: 'Monitores de piso', precio: 45, max: 8 },
          { id: 'microfono', nombre: 'Micrófonos inalámbricos', precio: 30, max: 10 },
          { id: 'consola', nombre: 'Consola de mezcla', precio: 150, max: 2 },
        ],
      },
    },
    { id: 'dj', nombre: 'DJ & animación', descripcion: 'Música, energía y animadores que conectan con todos.', config: null },
    {
      id: 'iluminacion', nombre: 'Iluminación',
      descripcion: 'Diseño lumínico que transforma cualquier ambiente.',
      config: {
        tipo: 'cantidades',
        items: [
          { id: 'pulpo', nombre: 'Pulpo LED', precio: 55, max: 8 },
          { id: 'par', nombre: 'Luces LED fijas (PAR)', precio: 20, max: 40 },
          { id: 'movil', nombre: 'Cabezas móviles', precio: 40, max: 24 },
          { id: 'laser', nombre: 'Láser', precio: 70, max: 6 },
          { id: 'estrobo', nombre: 'Luz estroboscópica', precio: 35, max: 6 },
          { id: 'bola', nombre: 'Bola de espejos', precio: 40, max: 4 },
        ],
      },
    },
    {
      id: 'efectos', nombre: 'Efectos especiales',
      descripcion: 'Humo, confeti, chispas frías y momentos inesperados.',
      config: {
        tipo: 'cantidades',
        items: [
          { id: 'humo', nombre: 'Máquina de humo', precio: 60, max: 6 },
          { id: 'chispas', nombre: 'Chispas frías', precio: 50, max: 8 },
          { id: 'confeti', nombre: 'Cañón de confeti', precio: 45, max: 8 },
          { id: 'co2', nombre: 'Cañón de CO₂', precio: 80, max: 6 },
          { id: 'burbujas', nombre: 'Máquina de burbujas', precio: 30, max: 6 },
        ],
      },
    },
    { id: 'musica', nombre: 'Música en directo', descripcion: 'Artistas y bandas para emocionar a tus invitados.', config: null },
    { id: 'medida', nombre: 'Algo a medida', descripcion: 'Cuéntanos tu idea y diseñaremos una experiencia única.', config: { tipo: 'texto' } },
  ],

  ESTADOS: {
    nueva: 'Nueva',
    revision: 'En revisión',
    propuesta: 'Propuesta enviada',
    confirmada: 'Confirmada',
  },
  COBROS: { pendiente: 'Pendiente', pagado: 'Pagado' },
  TIPOS_EVENTO: ['Boda', 'Cumpleaños', 'Evento corporativo', 'Fiesta privada', 'Concierto', 'Otro'],
  INVITADOS: ['Menos de 50', '50 a 100', '100 a 200', 'Más de 200'],
  ESPACIOS: ['Interior', 'Exterior', 'Interior y exterior'],
  IVA: 0.21,

  servicio(id) { return Catalogo.SERVICIOS.find((s) => s.id === id); },
  equipo(servicioId, itemId) { return Catalogo.servicio(servicioId)?.config?.items?.find((i) => i.id === itemId) || null; },

  detalleServicio(item) {
    const v = item.config;
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
    if (typeof v === 'string') return v;
    return v.map((x) => `${Catalogo.equipo(item.id, x.id)?.nombre || x.id} ×${x.cantidad}`).join(' · ');
  },

  /** Σ cantidad × precio unitario de los equipos elegidos. */
  precioReferencia(item) {
    if (!Array.isArray(item.config)) return 0;
    return item.config.reduce((t, x) => t + (Catalogo.equipo(item.id, x.id)?.precio || 0) * (Number(x.cantidad) || 0), 0);
  },
};

module.exports = Catalogo;
