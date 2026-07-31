// Importa o Router para poder criar rotas, o controller e o middleware nescessario também
import { Router } from 'express';
import userController from '../controllers/userController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../config/multer.js';

// Cria o objeto router com a configuração padrão do expressa para receber requisições HTTP
const router = new Router();

// Rota para criar um novo usuário
router.post('/register', userController.register);
// Rota para fazer login do usuario
router.post('/login', userController.login);

// Rotas privadas (precisa de login)
// O authMiddleware é colocado ENTRE a rota e o controller.
// Ele será executado primeiro. Se tudo der certo, ele chama o controller.
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);
router.put('/profile/photo', authMiddleware, upload.single('foto'), userController.updatePhoto);
router.delete('/profile', authMiddleware, userController.deleteProfile);

// Export default para exportar o valor principal do arquivo.
export default router;