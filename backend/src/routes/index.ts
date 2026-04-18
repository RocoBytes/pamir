import { Router } from 'express';
import healthRouter from './health.route.js';
import authRouter from './auth.route.js';
import salidasRouter from './salidas.route.js';
import uploadRouter from './upload.route.js';
import integrantesRouter from './integrantes.route.js';
import cierresRouter from './cierres.route.js';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/salidas', salidasRouter);
router.use('/salidas', uploadRouter); // POST /api/salidas/:id/gpx
router.use('/integrantes', integrantesRouter);
router.use('/cierres', cierresRouter);

export default router;
