import { Router } from 'express';
import disciplinaController from '../controllers/disciplinaController.js';

const router = new Router();

router.get('/', disciplinaController.getAllDisciplinas);

export default router;
// Não tem nenhum segredo, então nem vou comentar :)