import { Router } from 'express';
import { authMiddleware, requireAuth, requireRolAdmin } from '../middleware/auth.middleware.js';
import {
  getCategorias,
  getEventos,
  getEventoById,
  inscribirse,
  retirarse,
} from '../controllers/eventos.controller.js';
import {
  createEvento,
  updateEvento,
  deleteEventoBorrador,
  publicarEvento,
  despublicarEvento,
  cancelarEvento,
  getPostulantes,
  finalizarEvento,
  reenviarNotificaciones,
} from '../controllers/eventos-admin.controller.js';

const router = Router();

// Todo el módulo exige sesión; no hay vistas públicas de eventos.
router.use(authMiddleware, requireAuth);

// Rutas literales antes de /:id
router.get('/categorias', getCategorias);
router.get('/', getEventos);
router.get('/:id', getEventoById);
router.post('/:id/inscripcion', inscribirse);
router.delete('/:id/inscripcion', retirarse);

router.post('/', requireRolAdmin, createEvento);
router.put('/:id', requireRolAdmin, updateEvento);
router.delete('/:id', requireRolAdmin, deleteEventoBorrador);
router.post('/:id/publicar', requireRolAdmin, publicarEvento);
router.post('/:id/despublicar', requireRolAdmin, despublicarEvento);
router.post('/:id/cancelar', requireRolAdmin, cancelarEvento);
router.get('/:id/postulantes', requireRolAdmin, getPostulantes);
router.post('/:id/finalizar', requireRolAdmin, finalizarEvento);
router.post('/:id/notificaciones/reenviar', requireRolAdmin, reenviarNotificaciones);

export default router;
