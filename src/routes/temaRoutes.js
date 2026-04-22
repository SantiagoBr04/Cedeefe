import express from 'express';
import temaController from '../controllers/temaController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Busca os temas vinculados a uma disciplina específica (qualquer usuário logado)
router.get('/disciplina/:disciplina_cod', authMiddleware, temaController.getTemasPorDisciplina);

// Apenas administradores: Criação, Edição e Exclusão
router.post('/', authMiddleware, adminMiddleware, temaController.criarTema);
router.put('/:cod', authMiddleware, adminMiddleware, temaController.editarTema);
router.delete('/:cod', authMiddleware, adminMiddleware, temaController.excluirTema);

export default router;
