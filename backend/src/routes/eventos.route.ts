import { Router } from 'express';
import { authMiddleware, requireAuth, requireRolAdmin } from '../middleware/auth.middleware.js';
import { getCategorias, getEventos, getEventoById } from '../controllers/eventos.controller.js';
import {
  createEvento,
  updateEvento,
  deleteEventoBorrador,
  publicarEvento,
  despublicarEvento,
  cancelarEvento,
} from '../controllers/eventos-admin.controller.js';

const router = Router();

// Todo el módulo exige sesión; no hay vistas públicas de eventos.
router.use(authMiddleware, requireAuth);

// Rutas literales antes de /:id
router.get('/categorias', getCategorias);
router.get('/', getEventos);
router.get('/:id', getEventoById);

router.post('/', requireRolAdmin, createEvento);
router.put('/:id', requireRolAdmin, updateEvento);
router.delete('/:id', requireRolAdmin, deleteEventoBorrador);
router.post('/:id/publicar', requireRolAdmin, publicarEvento);
router.post('/:id/despublicar', requireRolAdmin, despublicarEvento);
router.post('/:id/cancelar', requireRolAdmin, cancelarEvento);

export default router;
