import db from '../models/index.js';

const estatisticasController = {
  // Pega as estatísticas gerais de um usuário específico
  getEstatisticasGerais: async (req, res) => {
    try {
      // O cod do usuário vem do token JWT via authMiddleware
      const usuarioCod = req.userId;

      let estatisticas = await db.Usuario_estatisticas_gerais.findOne({
        where: { usuario_cod: usuarioCod }
      });

      if (!estatisticas) {
        // Criar estatística zerada como fallback para evitar null pointers
        estatisticas = await db.Usuario_estatisticas_gerais.create({
            usuario_cod: usuarioCod,
            total_questoes_respondidas: 0,
            total_acertos: 0,
            total_erros: 0,
            aproveitamento_geral: 0,
            total_listas_finalizadas: 0
        });
      }

      res.status(200).json(estatisticas);
    } catch (error) {
      console.error('Erro ao buscar estatísticas gerais:', error);
      res.status(500).json({ error: 'Erro interno no servidor ao buscar as estatísticas gerais.' });
    }
  },

  // Pega as estatísticas por área de um usuário específico
  getEstatisticasPorArea: async (req, res) => {
    try {
      // O cod do usuário vem do token JWT via authMiddleware
      const usuarioCod = req.userId;

      // Pega todas as disciplinas cadastradas no sistema
      const disciplinas = await db.Disciplina.findAll();

      // Pega as estatísticas que o usuário já tem
      let estatisticas = await db.Usuario_estatisticas_por_area.findAll({
        where: { usuario_cod: usuarioCod },
        include: [{
          model: db.Disciplina,
          as: 'disciplina_area',
          attributes: ['descricao'] // Traz o nome da disciplina para ficar fácil pro frontend
        }]
      });

      // Se o usuário for antigo (criado antes da nossa mudança no registro), 
      // ou se criaram uma matéria nova no sistema, preenchemos para ele não ficar sem ver
      if (estatisticas.length < disciplinas.length) {
        const estatisticasExistentesIds = estatisticas.map(e => e.disciplina_cod);
        
        const novasEstatisticas = [];
        for (const disciplina of disciplinas) {
          if (!estatisticasExistentesIds.includes(disciplina.cod)) {
            // Se não tem, cria zerado no banco para ele
            novasEstatisticas.push({
              usuario_cod: usuarioCod,
              disciplina_cod: disciplina.cod,
              total_questoes_respondidas: 0,
              total_erros: 0,
              total_acertos: 0,
              aproveitamento_area: 0
            });
          }
        }

        // Insere as que faltavam no banco de uma vez
        if (novasEstatisticas.length > 0) {
          await db.Usuario_estatisticas_por_area.bulkCreate(novasEstatisticas);
          
          // Busca de novo agora com tudo certinho e completo
          estatisticas = await db.Usuario_estatisticas_por_area.findAll({
            where: { usuario_cod: usuarioCod },
            include: [{
              model: db.Disciplina,
              as: 'disciplina_area',
              attributes: ['descricao']
            }]
          });
        }
      }

      res.status(200).json(estatisticas);
    } catch (error) {
      console.error('Erro ao buscar estatísticas por área:', error);
      res.status(500).json({ error: 'Erro interno no servidor ao buscar as estatísticas por área.' });
    }
  },

  // Pega o log de resoluções de flashcards agrupados por dia (para o mapa de calor)
  getHeatmapFlashcards: async (req, res) => {
    try {
      const usuarioCod = req.userId;

      // Buscando os registros do usuário
      const historico = await db.HistoricoRevisaoFlashcard.findAll({
        where: { usuario_cod: usuarioCod },
        order: [['data_revisao', 'ASC']],
        attributes: ['data_revisao', 'cartoes_resolvidos']
      });

      return res.status(200).json(historico);

    } catch (error) {
      console.error('Erro ao buscar heatmap de flashcards:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao consolidar o heatmap.' });
    }
  },

  // Pega o histórico de atividades finalizadas (listas e simulados) do usuário para o calendário
  getAtividadesCalendario: async (req, res) => {
    try {
      const usuarioCod = req.userId;

      const resultados = await db.Historico_resultados.findAll({
        include: [{
          model: db.Atividade,
          as: 'atividade',
          where: { usuario_cod: usuarioCod },
          attributes: ['cod', 'nome', 'tipo']
        }],
        attributes: ['cod', 'pontuacao', 'data_finalizacao'],
        order: [['data_finalizacao', 'DESC']]
      });

      return res.status(200).json(resultados);
    } catch (error) {
      console.error('Erro ao buscar atividades para o calendário:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao buscar dados do calendário.' });
    }
  }
};


export default estatisticasController;
