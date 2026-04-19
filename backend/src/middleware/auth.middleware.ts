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
    const hasHeader = !!req.headers.authorization;
    if (hasHeader) {
      console.warn('[authMiddleware] Authorization header present but Clerk returned no userId — verify CLERK_SECRET_KEY matches the frontend publishable key');
    }
    req.user = null;
    return next();
  }

  try {
    let user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
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
      console.log('[authMiddleware] New user created:', user.email);
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
