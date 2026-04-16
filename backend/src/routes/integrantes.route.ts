import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createIntegrante, getIntegranteByRut } from '../controllers/integrantes.controller.js';

const router = Router();

router.use(authMiddleware);

// Buscar por RUT exacto (para el picker del wizard)
router.get('/by-rut/:rut', getIntegranteByRut);

// Crear integrante (formulario de registro)
router.post('/', createIntegrante);

export default router;
