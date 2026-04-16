import { Router } from 'express';
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js';
import { getMe } from '../controllers/auth.controller.js';

const router = Router();

// Aplica verificación de sesión Clerk en todas las rutas de auth
router.use(authMiddleware);

router.get('/me', requireAuth, getMe);

export default router;
