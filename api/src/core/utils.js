/* =========================================================
   VIBRA API · core/utils.js
   Funciones de ayuda: errores HTTP, validaciones y contraseñas.
   ========================================================= */

const crypto = require('crypto');

/** Error con código HTTP. "campos" lleva los errores de validación por campo. */
class ApiError extends Error {
  constructor(status, mensaje, campos = null) {
    super(mensaje);
    this.status = status;
    this.campos = campos;
  }
}

/** Lanza 400 si el objeto de errores tiene algo. */
function lanzarSiHayErrores(errores, mensaje = 'Revisa los campos marcados.') {
  if (Object.keys(errores).length) throw new ApiError(400, mensaje, errores);
}

const Utils = {
  emailValido(email) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email || ''); },

  normalizar(s = '') { return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); },

  hoyISO() {
    const h = new Date();
    return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
  },

  fechaValida(f) { return /^\d{4}-\d{2}-\d{2}$/.test(f || '') && !Number.isNaN(new Date(f).getTime()); },

  euros(n) {
    const num = Number(n) || 0;
    const [entero, dec] = Math.abs(num).toFixed(2).split('.');
    return `${num < 0 ? '-' : ''}${entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${dec} €`;
  },

  /** Guarda la contraseña cifrada (scrypt + sal), nunca en texto plano. */
  hashPassword(password) {
    const sal = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(password, sal, 32).toString('hex');
    return `${sal}:${hash}`;
  },

  verificarPassword(password, guardado) {
    const [sal, hash] = String(guardado || '').split(':');
    if (!sal || !hash) return false;
    const calculado = crypto.scryptSync(String(password || ''), sal, 32);
    return crypto.timingSafeEqual(calculado, Buffer.from(hash, 'hex'));
  },

  token() { return crypto.randomBytes(24).toString('hex'); },
};

module.exports = { Utils, ApiError, lanzarSiHayErrores };
