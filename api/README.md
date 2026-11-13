# Vibra API · Guía para probarla en Postman

API REST de Vibra hecha con **Node.js puro** (no hay que instalar paquetes).
Usa las mismas reglas de negocio que la web (modelos Usuario, Cliente, Solicitud, Sesión), pero guarda los datos en `api/data/db.json` en lugar del `localStorage`.

## 1. Requisitos

- **Node.js 18 o superior**. Compruébalo en una terminal: `node -v`
  Si no lo tienes: descárgalo de https://nodejs.org (versión LTS) e instálalo.
- **Postman** (app de escritorio o web).

## 2. Encender la API

```bash
cd proyecto-Vibra/api
node server.js
```

Debe aparecer:

```
  Vibra API funcionando
  → http://localhost:3000
```

Deja esa terminal abierta mientras usas Postman (Ctrl + C para apagarla).
Si el puerto 3000 está ocupado: `PORT=4000 node server.js` (en Windows PowerShell: `$env:PORT=4000; node server.js`) y cambia la variable `baseUrl` en Postman.

## 3. Importar la colección en Postman

1. Postman → **Import** → arrastra `Vibra-API.postman_collection.json` (está en la raíz del proyecto).
2. Aparece la colección **Vibra API** con 8 carpetas numeradas.
3. No hay que copiar tokens a mano: el login guarda el token en las variables de la colección (`tokenAdmin`, `tokenCliente`) y cada petición lo usa sola.

## 4. Demostración en clase (orden recomendado)

Ejecuta las peticiones **en orden**, de arriba abajo. Cada una trae tests (pestaña **Test Results**).
Para correrlo todo de una vez: clic derecho en la colección → **Run collection** → **Run Vibra API** (debe salir todo en verde: 96 tests).

| Carpeta | Qué demuestra |
|---|---|
| 0 · Preparación | La API responde, login de admin, datos limpios, catálogo |
| 1 · Autenticación | Registro (201), duplicado (409), validaciones (400), login (200 / 401), token obligatorio (401) |
| 2 · Cliente | Crear solicitud, validación de fecha pasada, el cliente solo ve lo suyo, chat, permisos por rol (403) |
| 3 · Admin | Listar y filtrar, cambiar estado, propuesta con cálculo de IVA 21 %, enviar propuesta |
| 4 · Cliente acepta | La solicitud pasa a confirmada, no se puede aceptar dos veces (409), cobro pagado |
| 5 · CRUD eventos | POST, PUT, DELETE y 404 tras borrar |
| 6 · CRUD clientes | GET, POST, PUT, DELETE y búsqueda |
| 7 · Panel | Métricas calculadas, usuarios sin contraseña, logout |

## 5. Endpoints

Las rutas con candado necesitan la cabecera `Authorization: Bearer <token>` (en Postman: pestaña **Authorization → Bearer Token**).

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/` | público | Estado de la API y lista de endpoints |
| POST | `/api/auth/registro` | público | Crear cuenta de cliente |
| POST | `/api/auth/login` | público | Iniciar sesión → devuelve `token` |
| GET | `/api/auth/perfil` | 🔒 usuario | Usuario conectado |
| POST | `/api/auth/logout` | 🔒 usuario | Cerrar sesión |
| GET | `/api/usuarios` | 🔒 admin | Listar cuentas |
| GET | `/api/catalogo` | público | Servicios, equipos, estados y opciones |
| GET | `/api/solicitudes?estado=&cobro=&q=` | 🔒 usuario | Admin: todas · cliente: solo las suyas |
| POST | `/api/solicitudes` | 🔒 usuario | Cliente: solicitud web · admin: evento manual |
| GET | `/api/solicitudes/:id` | 🔒 usuario | Detalle |
| PUT | `/api/solicitudes/:id` | 🔒 admin | Estado, cobro, precio, datos del evento |
| DELETE | `/api/solicitudes/:id` | 🔒 admin | Eliminar |
| GET | `/api/solicitudes/:id/propuesta-inicial` | 🔒 admin | Propuesta sugerida según servicios |
| PUT | `/api/solicitudes/:id/propuesta` | 🔒 admin | Guardar (`enviar:false`) o enviar (`enviar:true`) |
| POST | `/api/solicitudes/:id/aceptar` | 🔒 cliente dueño | Aceptar la propuesta |
| GET / POST | `/api/solicitudes/:id/mensajes` | 🔒 usuario | Chat con el asesor |
| GET | `/api/clientes?q=` | 🔒 admin | Listar / buscar clientes |
| POST | `/api/clientes` | 🔒 admin | Crear cliente |
| GET / PUT / DELETE | `/api/clientes/:id` | 🔒 admin | Ver, editar, eliminar |
| GET | `/api/resumen` | 🔒 admin | Métricas del Panel de control |
| POST | `/api/reiniciar` | 🔒 admin | Borrar todo (deja solo al admin) |

**Cuenta inicial:** `admin@gmail.com` / `admin123`

### Códigos de respuesta

`200` OK · `201` creado · `400` datos inválidos (con `campos` explicando cada error) · `401` sin sesión o credenciales malas · `403` sin permiso por rol · `404` no existe · `405` método no permitido · `409` conflicto (correo repetido, propuesta ya aceptada).

## 6. Estructura (MVC)

```
api/
├── server.js                 Servidor HTTP: recibe la petición, busca la ruta, responde JSON
├── package.json              npm start = node server.js
├── data/db.json              Base de datos (se crea sola al arrancar)
└── src/
    ├── routes.js             Tabla de rutas: método + URL + acceso + controlador
    ├── core/                 db (lectura/escritura del JSON), catálogo y utilidades
    ├── models/               MODELOS: Usuario, Sesion, Cliente, Solicitud (reglas de negocio)
    └── controllers/          CONTROLADORES: Auth, Cliente, Solicitud
```

En la API la "vista" es la respuesta JSON que ves en Postman.
Las contraseñas se guardan cifradas (scrypt con sal) y la API nunca las devuelve.

## Problemas frecuentes

- **`Could not send request` / `ECONNREFUSED`** → la API no está encendida. Ejecuta `node server.js` y deja la terminal abierta.
- **401 en todo** → reiniciaste el servidor y los tokens se borran; vuelve a ejecutar los logins (carpeta 0 y 1).
- **`node` no se reconoce** → instala Node.js y abre una terminal nueva.
- **400 "El cuerpo debe ser un JSON válido"** → en Postman: Body → raw → JSON.
