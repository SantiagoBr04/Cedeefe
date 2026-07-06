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

export default router;