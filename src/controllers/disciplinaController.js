// import pool from '../config/db.js'; 
import db from '../models/index.js';
const { Disciplina } = db;

const disciplinaController = {
  
  // Método para buscar todas as disciplinas
  getAllDisciplinas: async (req, res) => {
    try {
      const disciplinas = await Disciplina.findAll({
        attributes: ['cod', 'descricao'],
        order: [
          ['descricao', 'ASC']
        ]
      })

      // Envia a lista de disciplinas de volta como uma resposta JSON com status 200 (OK).
      res.status(200).json(disciplinas);

    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  }

};

export default disciplinaController;