import { Router } from 'express';
import adminController from '../controllers/adminController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';

const router = new Router();

router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/usuarios', adminController.listarUsuarios);
router.get('/listas', adminController.listarListas);
router.delete('/usuarios/:cod', adminController.excluirUsuario);
router.delete('/listas/:cod', adminController.excluirLista);

// Rota de Estatísticas do Dashboard
router.get('/dashboard-stats', adminController.obterDashboardStats);

// Rotas de Questões Reportadas
router.get('/questoes-reportadas', adminController.listarQuestoesReportadas);
router.put('/questoes-reportadas/:questaoCod', adminController.atualizarEEditarQuestaoReportada);
router.put('/questoes-reportadas/:questaoCod/descartar', adminController.descartarReportesQuestao);

export default router;