# 🎬 CineMax — Sistema de Venta de Boletos de Cine

Proyecto universitario de Teoría de Sistemas. Plataforma web completa para la venta de boletos de cine con catálogo de películas, compra online, asignación automática de asientos, facturación por email y panel de administración.

---

## 📦 Estructura del proyecto

```
cinemax/
├── frontend/               # React + Vite
│   ├── src/
│   │   ├── App.jsx         # App completa (componentes, páginas, lógica UI)
│   │   └── main.jsx        # Punto de entrada React
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── backend/                # Node.js + Express
    ├── db/
    │   ├── connection.js   # Pool PostgreSQL
    │   ├── init.js         # Crea las tablas
    │   └── seed.js         # Datos iniciales (películas + admin)
    ├── middleware/
    │   └── auth.js         # JWT middleware
    ├── routes/
    │   ├── public.js       # GET /peliculas, POST /compras
    │   └── admin.js        # CRUD películas, ventas, login
    ├── services/
    │   └── email.js        # Nodemailer + plantilla HTML factura
    ├── server.js           # Entry point Express
    └── package.json
```

---

## 🚀 Instalación y ejecución local

### Prerrequisitos

- Node.js 18+
- PostgreSQL 14+ (local o Supabase)
- npm o yarn

---

### 1. Base de datos

**Opción A — Supabase (recomendado, gratis)**

1. Crea una cuenta en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Copia la **Connection string** desde `Settings > Database > Connection string > URI`

**Opción B — PostgreSQL local**

```bash
createdb cinemax
```

---

### 2. Backend

```bash
cd cinemax/backend
npm install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tu DATABASE_URL, JWT_SECRET, SMTP, etc.

# Crear tablas
npm run db:init

# Cargar datos iniciales (películas + admin)
npm run db:seed

# Iniciar servidor de desarrollo
npm run dev
```

El servidor corre en **http://localhost:4000**

---

### 3. Frontend

```bash
cd cinemax/frontend
npm install

# (Opcional) Configurar si el backend no está en localhost:4000
cp .env.example .env

# Iniciar servidor de desarrollo
npm run dev
```

La app corre en **http://localhost:3000**

---

## 🔐 Credenciales de administrador por defecto

```
Email:      admin@cinemax.com
Contraseña: Admin2024!
```

> Puedes cambiarlas en el archivo `.env` del backend antes de correr el seed.

---

## 📡 Endpoints de la API

### Públicos

| Método | Ruta                | Descripción                          |
|--------|---------------------|--------------------------------------|
| GET    | `/api/peliculas`    | Lista películas activas con asientos |
| GET    | `/api/peliculas/:id`| Detalle de una película              |
| POST   | `/api/compras`      | Procesar compra de boletos           |

**Body de `/api/compras`:**
```json
{
  "pelicula_id":    1,
  "nombre_cliente": "Carlos Pérez",
  "email_cliente":  "carlos@correo.com",
  "tipo_boleto":    "estandar",
  "cantidad":       2
}
```

### Admin (requieren Bearer Token)

| Método | Ruta                        | Descripción               |
|--------|-----------------------------|---------------------------|
| POST   | `/api/admin/login`          | Login → retorna JWT       |
| GET    | `/api/admin/peliculas`      | Todas las películas       |
| POST   | `/api/admin/peliculas`      | Crear película            |
| PUT    | `/api/admin/peliculas/:id`  | Editar película           |
| DELETE | `/api/admin/peliculas/:id`  | Eliminar (soft delete)    |
| GET    | `/api/admin/ventas`         | Lista todas las ventas    |
| GET    | `/api/admin/ventas/resumen` | Estadísticas de ventas    |

---

## 🗄️ Estructura de la base de datos

### `peliculas`
| Columna                  | Tipo           | Descripción                        |
|--------------------------|----------------|------------------------------------|
| id                       | SERIAL PK      | Identificador único                |
| titulo                   | VARCHAR(255)   | Nombre de la película              |
| descripcion              | TEXT           | Sinopsis                           |
| clasificacion            | VARCHAR(10)    | Clasificación por edad (TP, +13…)  |
| precio_vip               | NUMERIC(10,2)  | Precio boleto VIP en COP           |
| precio_estandar          | NUMERIC(10,2)  | Precio boleto estándar en COP      |
| asientos_vip_total       | INT            | Total asientos VIP                 |
| asientos_estandar_total  | INT            | Total asientos estándar            |
| horario                  | TIMESTAMPTZ    | Fecha y hora de la función         |
| activa                   | BOOLEAN        | Si aparece en el catálogo público  |

### `asientos`
| Columna     | Tipo        | Descripción                          |
|-------------|-------------|--------------------------------------|
| id          | SERIAL PK   | Identificador único                  |
| pelicula_id | INT FK      | Película a la que pertenece          |
| codigo      | VARCHAR(10) | Código legible (VIP-01, STD-042)     |
| tipo        | VARCHAR(10) | 'vip' o 'estandar'                   |
| ocupado     | BOOLEAN     | TRUE si ya fue vendido               |

### `ventas`
| Columna         | Tipo           | Descripción                     |
|-----------------|----------------|---------------------------------|
| id              | SERIAL PK      | Identificador único             |
| numero_factura  | VARCHAR(20)    | Código único CM-YYYYMMDD-XXXXX  |
| pelicula_id     | INT FK         | Película comprada               |
| nombre_cliente  | VARCHAR(255)   | Nombre del comprador            |
| email_cliente   | VARCHAR(255)   | Email del comprador             |
| tipo_boleto     | VARCHAR(10)    | 'vip' o 'estandar'              |
| cantidad        | INT            | Número de boletos               |
| total           | NUMERIC(10,2)  | Precio total en COP             |
| fecha_compra    | TIMESTAMPTZ    | Marca de tiempo de la compra    |

### `detalle_asientos`
| Columna    | Tipo      | Descripción                          |
|------------|-----------|--------------------------------------|
| id         | SERIAL PK | Identificador único                  |
| venta_id   | INT FK    | Venta a la que pertenece             |
| asiento_id | INT FK    | Asiento asignado                     |

### `admins`
| Columna       | Tipo         | Descripción                     |
|---------------|--------------|---------------------------------|
| id            | SERIAL PK    | Identificador único             |
| email         | VARCHAR(255) | Email de acceso                 |
| password_hash | VARCHAR(255) | Hash bcrypt de la contraseña    |

---

## ☁️ Deploy en producción

### Frontend → Vercel

```bash
cd frontend
npm run build
# Subir carpeta dist/ a Vercel, o conectar el repo
# Variable de entorno: VITE_API_URL=https://tu-backend.railway.app/api
```

### Backend → Railway

1. Crea un nuevo proyecto en [railway.app](https://railway.app)
2. Agrega un servicio PostgreSQL
3. Agrega el servicio del backend desde tu repositorio
4. Configura las variables de entorno del `.env.example`
5. Railway detecta `npm start` automáticamente

---

## ⚙️ Variables de entorno del backend

| Variable              | Descripción                            | Ejemplo                          |
|-----------------------|----------------------------------------|----------------------------------|
| `DATABASE_URL`        | Connection string PostgreSQL           | `postgresql://user:pass@host/db` |
| `JWT_SECRET`          | Clave secreta para firmar tokens JWT   | `cadena_aleatoria_larga`         |
| `ADMIN_EMAIL`         | Email del admin inicial (para seed)    | `admin@cinemax.com`              |
| `ADMIN_PASSWORD`      | Contraseña del admin inicial           | `Admin2024!`                     |
| `SMTP_HOST`           | Servidor SMTP                          | `smtp.gmail.com`                 |
| `SMTP_PORT`           | Puerto SMTP                            | `587`                            |
| `SMTP_USER`           | Usuario SMTP (tu email Gmail)          | `tucorreo@gmail.com`             |
| `SMTP_PASS`           | Contraseña de aplicación Gmail         | `xxxx xxxx xxxx xxxx`            |
| `PORT`                | Puerto del servidor                    | `4000`                           |
| `FRONTEND_URL`        | URL del frontend para CORS             | `http://localhost:3000`          |

---

## 📧 Configurar email con Gmail

1. Ve a [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Crea una contraseña de aplicación para "Correo"
3. Copia la contraseña de 16 caracteres en `SMTP_PASS`

> Si no configuras SMTP, el sistema funciona igual pero imprime las facturas en la consola del servidor (modo desarrollo).

---

## 🔒 Seguridad implementada

- Contraseñas hasheadas con **bcrypt** (12 rondas)
- Autenticación admin con **JWT** (expira en 8h)
- Transacciones SQL con **SELECT FOR UPDATE SKIP LOCKED** para evitar doble-asignación de asientos
- Validación de inputs en backend antes de cualquier operación
- Soft delete en películas para preservar historial de ventas

---

## 👥 Autores

Proyecto universitario — Teoría de Sistemas
