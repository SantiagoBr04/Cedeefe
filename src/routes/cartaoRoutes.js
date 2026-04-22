import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import cartaoController from '../controllers/cartaoController.js';
import upload from '../config/multer.js'; 

const router = express.Router();

router.use(authMiddleware);

// Rota para criar cartão aceitando 1 arquivo (imagem)
router.post('/', upload.single('imagem'), cartaoController.criar);

// Rota para listar cartões num baralho
router.get('/baralho/:baralho_id', cartaoController.listarPorBaralho);

// Rota para revisar/resolver
router.post('/:id/revisar', cartaoController.revisarCartao);

// Editar um cartão (Upload opcional em "imagem" no atualizar)
router.put('/:id', upload.single('imagem'), cartaoController.editar);

// Deletar um cartão
router.delete('/:id', cartaoController.deletar);

export default router;