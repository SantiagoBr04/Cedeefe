// Importa o Router para poder criar rotas, o controller e os middlewares nescessarios também
import { Router } from 'express';
import questaoController from '../controllers/questaoController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import adminMiddleware from '../middlewares/adminMiddleware.js'; 

// Cria o objeto router com a configuração padrão do expressa para receber requisições HTTP
const router = new Router();

// Rota para adicionar uma nova questão.
// Note a "corrente" de middlewares: a requisição passa primeiro pelo auth, depois pelo admin.
router.post(
  '/', 
  authMiddleware, 
  adminMiddleware, 
  questaoController.addQuestao
);

// Rota para deletar uma questão
router.delete(
  '/:cod', 
  authMiddleware, 
  adminMiddleware, 
  questaoController.deleteQuestao
);

// Export default para exportar o valor principal do arquivo.
export default router;