import express from 'express';
import {
    getTemasPorDisciplina,
    criarTema,
    editarTema,
    excluirTema
} from '../controllers/temaController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js';

const router = express.Router();

// Busca os temas vinculados a uma disciplina específica (qualquer usuário logado)
router.get('/disciplina/:disciplina_cod', authMiddleware, getTemasPorDisciplina);

// Apenas administradores: Criação, Edição e Exclusão
router.post('/', authMiddleware, adminMiddleware, criarTema);
router.put('/:cod', authMiddleware, adminMiddleware, editarTema);
router.delete('/:cod', authMiddleware, adminMiddleware, excluirTema);

export default router;
