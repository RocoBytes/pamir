import { Router } from 'express';
import { authMiddleware, requireAuth, requireAdmin } from '../middleware/auth.middleware.js';
import { getStats } from '../controllers/admin.controller.js';

const router = Router();

// All admin endpoints require an authenticated admin user
router.use(authMiddleware, requireAuth, requireAdmin);

router.get('/stats', getStats);

export default router;
