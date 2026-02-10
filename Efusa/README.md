Perfecto 👍 aquí tienes el **`README.md` completo**, claro y alineado **100% con la estructura real de tu proyecto**, Vercel + Neon + HTML + JS vanilla.

Puedes copiarlo tal cual y pegarlo en la raíz del proyecto.

---

```md
# EFUSA – Gestión de Jugadores y Pagos

Sistema web para la gestión de **jugadores, pagos y alertas** del club EFUSA.  
Desarrollado con **HTML + JavaScript**, backend con **Node.js (Vercel Serverless Functions)** y base de datos **PostgreSQL (Neon)**.

---

## 🚀 Tecnologías usadas

- Frontend: HTML, TailwindCSS, JavaScript Vanilla
- Backend: Node.js (Serverless Functions)
- Base de datos: PostgreSQL (Neon)
- Hosting: Vercel

---

## 📁 Estructura del proyecto

```

/
├── api/
│   ├── jugadores.js
│   ├── pagos.js
│   └── alertas.js
│
├── public/
│   ├── index.html
│   ├── jugadores.html
│   ├── pagos.html
│   ├── alertas.html
│   └── recursos/
│       └── js/
│           ├── api.js
│           ├── configuracion.js
│           ├── jugadores.js
│           ├── pagos.js
│           ├── alertas.js
│           └── whatsapp.js
│
├── package.json
├── vercel.json
└── README.md

```

---

## 🌐 Rutas del sistema

### Frontend
- `/` → Inicio
- `/jugadores.html` → Gestión de jugadores
- `/pagos.html` → Registro y control de pagos
- `/alertas.html` → Alertas y notificaciones

### API (Backend)
- `/api/jugadores`
- `/api/pagos`
- `/api/alertas`

---

## ⚙️ Configuración de base de datos (Neon)

### Variable de entorno en Vercel

En **Vercel → Project → Settings → Environment Variables**:

```

DATABASE_URL=postgres://usuario:password@host.neon.tech/db?sslmode=require

````

⚠️ **Nunca** subas esta URL al código.

---

## 🗄️ Base de datos

Base de datos **PostgreSQL** alojada en Neon.

Tablas principales:
- `jugadores`
- `pagos`
- `alertas`

(Los scripts SQL se crean directamente en Neon).

---

## 🧪 Desarrollo local (opcional)

```bash
npm install
vercel dev
````

Luego abrir:

```
http://localhost:3000
```

---

## 📦 Deploy en Vercel

1. Subir el proyecto a GitHub
2. Importar repositorio en Vercel
3. Configurar `DATABASE_URL`
4. Deploy 🚀

---

## ✅ Características

* CRUD de jugadores
* Registro de pagos
* Filtros por fecha y jugador
* Cálculo automático de totales
* Alertas de pagos pendientes
* Exportación a Excel
* Diseño responsive con Tailwind

---

## 👨‍💻 Autor

Proyecto desarrollado para **EFUSA**
Soporte y mejoras continuas.

---

## 📝 Notas

* El frontend se sirve desde `/public`
* El backend funciona como funciones serverless
* Compatible con Node >= 20

---

💚 EFUSA – Control claro, simple y moderno

```

---

Si quieres, el siguiente paso puede ser:
- 📄 **README más corto (modo producción)**
- 🧾 **SQL completo documentado**
- 🧪 **Guía de pruebas paso a paso**
- 🔐 **Sistema de login futuro**

Tú decides 🔥
::contentReference[oaicite:0]{index=0}
```
