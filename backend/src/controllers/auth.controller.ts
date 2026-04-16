import { Request, Response } from 'express';

/**
 * GET /api/auth/me
 *
 * Devuelve el perfil del usuario autenticado (desde req.user).
 * El upsert en DB ocurre automáticamente en authMiddleware la primera vez.
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'No autenticado' });
    return;
  }
  res.json(req.user);
}
