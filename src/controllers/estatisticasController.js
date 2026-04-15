import db from '../models/index.js';

const estatisticasController = {
  // Pega as estatísticas gerais de um usuário específico
  getEstatisticasGerais: async (req, res) => {
    try {
      // O cod do usuário vem do token JWT via authMiddleware
      const usuarioCod = req.userId;

      const estatisticas = await db.Usuario_estatisticas_gerais.findOne({
        where: { usuario_cod: usuarioCod }
      });

      if (!estatisticas) {
        return res.status(404).json({ error: 'Estatísticas não encontradas para este usuário.' });
      }

      res.status(200).json(estatisticas);
    } catch (error) {
      console.error('Erro ao buscar estatísticas gerais:', error);
      res.status(500).json({ error: 'Erro interno no servidor ao buscar as estatísticas gerais.' });
    }
  }
};

export default estatisticasController;
