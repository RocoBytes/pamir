import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { createCierre, getCierres } from '../controllers/cierres.controller.js';

const router = Router();

router.use(authMiddleware);

router.get('/', getCierres);
router.post('/', createCierre);

export default router;
