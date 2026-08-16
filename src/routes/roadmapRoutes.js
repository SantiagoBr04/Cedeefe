import express from 'express';
import roadmapController from '../controllers/roadmapController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// Rota para obter o progresso de todos os roadmaps do usuário
router.get('/', authMiddleware, roadmapController.obterProgressoGeral);

// Rota para obter o progresso do usuário em uma disciplina específica
router.get('/:disciplina', authMiddleware, roadmapController.obterProgresso);

// Rota para salvar/atualizar a marcação de um tópico do roadmap
router.post('/:disciplina', authMiddleware, roadmapController.salvarProgresso);

export default router;
