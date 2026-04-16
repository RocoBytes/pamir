# Pamir

Sistema de registro de salidas de montaña — stack PERN.

**Frontend**: React 19 + Vite 8 + TypeScript + Tailwind CSS (Fase 4)
**Backend**: Express 4 + TypeScript
**Base de datos**: PostgreSQL en Neon.tech (Fase 2)
**Despliegue**: Vercel (frontend) + Render.com (backend)

---

## Requisitos

- Node.js 18+
- npm 10+

---

## Desarrollo

### Frontend

```bash
cd frontend
npm install
npm run dev        # servidor Vite en http://localhost:5173
npm run build      # type-check + build → frontend/dist/
npm run lint       # ESLint + Prettier rules
npm run preview    # previsualizar build de producción
```

### Backend

```bash
cd backend
npm install
npm run dev        # ts-node-dev con hot reload en http://localhost:3001
npm run build      # tsc → compila a backend/dist/
npm run start      # node dist/index.js  (comando de producción en Render.com)
npm run lint       # ESLint
npm run format     # Prettier
```

### Ambos workspaces desde la raíz

```bash
# Instalar todas las dependencias
(cd frontend && npm install) && (cd backend && npm install)

# Lint ambos
(cd frontend && npm run lint) && (cd backend && npm run lint)

# Build ambos
(cd frontend && npm run build) && (cd backend && npm run build)
```

---

## Variables de entorno

```bash
cp backend/.env.example backend/.env    # Fase 2: DATABASE_URL, GOOGLE_CLIENT_ID, etc.
cp frontend/.env.example frontend/.env  # Fase 2: VITE_API_URL, etc.
```

---

## Despliegue

### Vercel (Frontend)

1. Conecta el repositorio en [vercel.com](https://vercel.com)
2. Configura **Root Directory** → `frontend`
3. Build command: `npm run build` · Output: `dist`
4. Añade estas variables de entorno en el dashboard de Vercel:

| Variable | Valor |
|---|---|
| `VITE_GOOGLE_CLIENT_ID` | Tu Client ID de Google Cloud Console |
| `VITE_API_URL` | URL de tu servicio en Render.com (sin `/api`) |

> El archivo [frontend/vercel.json](frontend/vercel.json) ya configura las rewrites para SPA routing.

---

### Render.com (Backend)

1. Conecta el repositorio en [render.com](https://render.com)
2. Render detecta automáticamente [render.yaml](render.yaml) (Blueprint)
3. Añade manualmente las variables marcadas con `sync: false` en el dashboard:

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Neon.tech pooled endpoint |
| `GOOGLE_CLIENT_ID` | Mismo que en Vercel |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Email de la Service Account de Drive |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Clave privada del JSON (con `\n` literales) |
| `GOOGLE_DRIVE_FOLDER_ID` | ID de la carpeta de Drive destino |
| `FRONTEND_URL` | URL de tu app en Vercel (para CORS) |

#### Anti-cold-start

El endpoint `GET /api/health` responde `200 OK` en < 5 ms.
Configura un ping externo cada **14 minutos** en [cron-job.org](https://cron-job.org) apuntando a:
```
https://tu-app.onrender.com/api/health
```

---

### Neon.tech (Base de datos)

1. Crea un proyecto en [neon.tech](https://neon.tech)
2. Copia la **Connection string (pooled)** y pégala como `DATABASE_URL` en Render
3. Ejecuta las migraciones una sola vez desde local:

```bash
cd backend
DATABASE_URL="postgresql://..." npm run db:migrate -- init
```

---

## Estado del proyecto

| Fase | Descripción | Estado |
|---|---|---|
| 1 | Andamiaje y configuración inicial | ✅ Completa |
| 2 | Backend core y base de datos | ✅ Completa |
| 3 | Integraciones (Google Auth + Drive) | ✅ Completa |
| 4 | Frontend UI/UX (Wizard 5 pasos) | ✅ Completa |
| 5 | Preparación para despliegue | ✅ Completa |
