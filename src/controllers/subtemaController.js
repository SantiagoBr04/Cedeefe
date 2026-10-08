import db from '../models/index.js';

const subtemaController = {
  listarSubtemas: async (req, res) => {
    try {
      const { tema_cod } = req.query;
      let where = {};
      
      if (tema_cod) {
        where.tema_cod = tema_cod;
      }

      const subtemas = await db.Subtema.findAll({
        where,
        order: [['descricao', 'ASC']]
      });

      return res.status(200).json(subtemas);
    } catch (error) {
      console.error('Erro ao listar subtemas:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao listar subtemas.' });
    }
  }
};

export default subtemaController;
