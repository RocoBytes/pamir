import express, { Application } from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import apiRouter from './routes/index.js';

const app: Application = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
const FRONTEND_URL = process.env.FRONTEND_URL;

app.use(cors({
  origin: FRONTEND_URL
    ? (origin: string | undefined, callback: (err: Error | null, origin?: string | boolean) => void) => {
        // Acepta el dominio de producción y cualquier preview de Vercel
        const allowed =
          !origin ||
          origin === FRONTEND_URL ||
          /^https:\/\/[a-z0-9-]+-[a-z0-9]+\.vercel\.app$/.test(origin);
        callback(null, allowed ? origin : false);
      }
    : true,
  credentials: true,
}));
app.use(express.json());

// Clerk: inicializa el contexto de autenticación para todas las rutas.
// Debe estar ANTES del router para que getAuth(req) funcione en cualquier middleware.
app.use(clerkMiddleware());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

export default app;
