import { Router } from 'express';
import { authMiddleware, requireAuth } from '../middleware/auth.middleware.js';
import { getDocumentos } from '../controllers/documentos.controller.js';

const router = Router();

router.get('/', authMiddleware, requireAuth, getDocumentos);

export default router;
