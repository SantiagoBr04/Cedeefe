// Importa o Router para poder criar rotas, o controller e o middleware nescessario também
import { Router } from 'express';
import listaController from '../controllers/listaController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

// Cria o objeto router com a configuração padrão do expressa para receber requisições HTTP
const router = new Router();

// Todas as rotas de simulado precisam que o usuário esteja logado.
// Em vez de adicionar o middleware em cada uma, pode ser usado assim:
router.use(authMiddleware);

// Rota para gerar um novo simulado com base nos critérios do usuário
router.post('/gerar', listaController.gerarLista);

// Rota para receber as respostas, corrigir e salvar no histórico
router.post('/corrigir', listaController.corrigirLista);

// Export default para exportar o valor principal do arquivo.
export default router;