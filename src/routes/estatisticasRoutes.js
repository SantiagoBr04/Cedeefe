import { Router } from 'express';
import estatisticasController from '../controllers/estatisticasController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = new Router();

// Rota protegida: pega as estatísticas gerais do perfil logado
router.get('/gerais', authMiddleware, estatisticasController.getEstatisticasGerais);

export default router;
