import { Router } from 'express';
import subtemaController from '../controllers/subtemaController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = new Router();

// Rota para listar todos os subtemas (pode receber ?tema_cod=X via query)
router.get('/', authMiddleware, subtemaController.listarSubtemas);

export default router;
