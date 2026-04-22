import express from 'express';
import authMiddleware from '../middlewares/authMiddleware.js';
import baralhoController from '../controllers/baralhoController.js';
import upload from '../config/multer.js'; // Usa o middleware de arquivo se for para upload de arquivo TXT

const router = express.Router();

router.use(authMiddleware); // Protege as rotas

router.post('/', baralhoController.criar);
router.get('/', baralhoController.listar);
// Reutiliza upload, limitando a 1 arquivo do campo "arquivo_importacao"
router.post('/importar', upload.single('arquivo_importacao'), baralhoController.importar); 
router.put('/:id', baralhoController.editar);
router.delete('/:id', baralhoController.deletar);

export default router;