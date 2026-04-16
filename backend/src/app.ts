import express, { Application } from 'express';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import apiRouter from './routes/index.js';

const app: Application = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
// En producción restringe el origen al dominio de Vercel (FRONTEND_URL).
// En desarrollo permite cualquier origen para facilitar el trabajo local.
app.use(cors({
  origin: process.env.FRONTEND_URL ?? true,
  credentials: true,
}));
app.use(express.json());

// Clerk: inicializa el contexto de autenticación para todas las rutas.
// Debe estar ANTES del router para que getAuth(req) funcione en cualquier middleware.
app.use(clerkMiddleware());

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

export default app;
