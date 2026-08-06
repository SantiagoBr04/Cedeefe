// Importa o Router para poder criar rotas, o controller e os middlewares nescessarios também
import { Router } from 'express';
import questaoController from '../controllers/questaoController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js'; 

import upload from '../config/multer.js';

// Cria o objeto router com a configuração padrão do expressa para receber requisições HTTP
const router = new Router();

// Rota para adicionar uma nova questão.
// Note a "corrente" de middlewares: a requisição passa primeiro pelo auth, depois pelo admin.
router.post(
  '/', 
  authMiddleware, 
  adminMiddleware, 
  upload.single('imagem'), // Middleware do multer entra aqui
  questaoController.addQuestao
);

// Rota para deletar uma questão
router.delete(
  '/:cod', 
  authMiddleware, 
  adminMiddleware, 
  questaoController.deleteQuestao
);

// Rota para analisar PDFs de prova e gabarito via Gemini
router.post(
  '/importar-pdf-analise',
  authMiddleware,
  adminMiddleware,
  upload.fields([
    { name: 'pdf_prova', maxCount: 1 },
    { name: 'pdf_gabarito', maxCount: 1 }
  ]),
  questaoController.analisarPdf
);

// Rota para confirmar e salvar as questões revisadas no banco de dados
router.post(
  '/importar-pdf-confirmar',
  authMiddleware,
  adminMiddleware,
  questaoController.confirmarImportacaoLote
);

// Rota para fazer upload de imagem individual de questão na tela de revisão
router.post(
  '/upload-imagem',
  authMiddleware,
  adminMiddleware,
  upload.single('imagem'),
  questaoController.uploadImagem
);

// Rotas para gerenciar rascunhos de importação em servidor sem usar localStorage
router.post(
  '/rascunho',
  authMiddleware,
  adminMiddleware,
  questaoController.salvarRascunho
);

router.get(
  '/rascunhos',
  authMiddleware,
  adminMiddleware,
  questaoController.listarRascunhos
);

router.get(
  '/rascunho/:loteId',
  authMiddleware,
  adminMiddleware,
  questaoController.obterRascunho
);

// Export default para exportar o valor principal do arquivo.
export default router;