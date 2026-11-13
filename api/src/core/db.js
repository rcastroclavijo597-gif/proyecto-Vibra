/* =========================================================
   VIBRA API · core/db.js
   Persistencia: en el navegador se usaba localStorage; aquí
   los datos se guardan en el archivo api/data/db.json.
   Los modelos son los únicos que hablan con la base.
   ========================================================= */

const fs = require('fs');
const path = require('path');
const { Utils } = require('./utils');

const CARPETA = path.join(__dirname, '..', '..', 'data');
const ARCHIVO = path.join(CARPETA, 'db.json');

/** Datos iniciales: solo la cuenta del administrador (igual que app/core/seed.js). */
function semilla() {
  return {
    secuencia: 1001, // el primer evento será EV-1001
    usuarios: [
      { id: 'u1', nombre: 'Admin', apellidos: '', email: 'admin@gmail.com', telefono: '', password: Utils.hashPassword('admin123'), rol: 'admin' },
    ],
    clientes: [],
    solicitudes: [],
  };
}

const DB = {
  archivo: ARCHIVO,

  cargar() {
    if (!fs.existsSync(ARCHIVO)) {
      const datos = semilla();
      DB.guardar(datos);
      return datos;
    }
    try {
      return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
    } catch (e) {
      console.warn('db.json dañado, se restablece.', e.message);
      const datos = semilla();
      DB.guardar(datos);
      return datos;
    }
  },

  guardar(db) {
    fs.mkdirSync(CARPETA, { recursive: true });
    const tmp = `${ARCHIVO}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
    fs.renameSync(tmp, ARCHIVO); // escritura segura: nunca queda a medias
  },

  tabla(nombre) { return DB.cargar()[nombre] || []; },

  /** Abre la base, aplica cambios con fn(db) y la vuelve a guardar. */
  transaccion(fn) {
    const db = DB.cargar();
    const resultado = fn(db);
    DB.guardar(db);
    return resultado;
  },

  reiniciar() { DB.guardar(semilla()); },
};

module.exports = DB;
