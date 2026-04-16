import { getAuth, clerkClient } from '@clerk/express';
import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma.js';

/**
 * Extrae y verifica la sesión Clerk del header Authorization.
 * Non-blocking: si no hay sesión válida, req.user = null y continúa.
 * Si el usuario no existe aún en nuestra DB, hace upsert usando los datos de Clerk.
 */
export async function authMiddleware(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const { userId } = getAuth(req);

  if (!userId) {
    req.user = null;
    return next();
  }

  try {
    // Buscar en nuestra DB primero para evitar llamadas innecesarias a Clerk
    let user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      // Primera vez: obtener datos de Clerk y hacer upsert en nuestra DB
      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
      const firstName = clerkUser.firstName ?? '';
      const lastName = clerkUser.lastName ?? '';
      const name = `${firstName} ${lastName}`.trim() || email;
      const picture = clerkUser.imageUrl ?? null;

      user = await prisma.user.upsert({
        where: { id: userId },
        update: { name, picture },
        create: { id: userId, email, name, picture },
      });
    }

    req.user = { id: user.id, email: user.email, name: user.name };
  } catch (err) {
    console.error('[authMiddleware] Clerk error:', err);
    req.user = null;
  }

  next();
}

/**
 * Guard de autenticación: devuelve 401 si req.user es null.
 * Debe usarse DESPUÉS de authMiddleware.
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({ error: 'Autenticación requerida' });
    return;
  }
  next();
}
