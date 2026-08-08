import db from '../models/index.js';

const adminController = {
  listarUsuarios: async (req, res) => {
    try {
      const usuarios = await db.Usuario.findAll({
        attributes: ['cod', 'login', 'nome_completo', 'adm', 'data_nasc', 'escola'],
        include: [
          {
            model: db.Atividade,
            as: 'Atividades',
            attributes: ['cod', 'nome', 'status', 'tipo', 'data_criacao'],
            where: { tipo: 'lista' },
            required: false,
          },
        ],
        order: [['cod', 'ASC']],
      });

      const usuariosFormatados = usuarios.map(usuario => ({
        cod: usuario.cod,
        login: usuario.login,
        nome_completo: usuario.nome_completo,
        adm: usuario.adm,
        data_nasc: usuario.data_nasc,
        escola: usuario.escola,
        total_listas: usuario.Atividades ? usuario.Atividades.length : 0,
      }));

      return res.status(200).json(usuariosFormatados);
    } catch (error) {
      console.error('Erro ao listar usuários no admin:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao listar usuários.' });
    }
  },

  listarListas: async (req, res) => {
    try {
      const listas = await db.Atividade.findAll({
        where: { tipo: 'lista' },
        attributes: ['cod', 'nome', 'descricao', 'status', 'data_criacao', 'usuario_cod'],
        include: [
          {
            model: db.Usuario,
            as: 'usuario',
            attributes: ['cod', 'login', 'nome_completo'],
          },
          {
            model: db.Atividade_questoes,
            as: 'registroDasQuestoes',
            attributes: ['questao_cod'],
            required: false,
          },
        ],
        order: [['data_criacao', 'DESC']],
      });

      const listasFormatadas = listas.map(lista => ({
        cod: lista.cod,
        nome: lista.nome,
        descricao: lista.descricao,
        status: lista.status,
        data_criacao: lista.data_criacao,
        quantidade_questoes: lista.registroDasQuestoes ? lista.registroDasQuestoes.length : 0,
        usuario: lista.usuario
          ? {
            cod: lista.usuario.cod,
            login: lista.usuario.login,
            nome_completo: lista.usuario.nome_completo,
          }
          : null,
      }));

      return res.status(200).json(listasFormatadas);
    } catch (error) {
      console.error('Erro ao listar listas no admin:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao listar listas.' });
    }
  },

  excluirUsuario: async (req, res) => {
    try {
      const { cod } = req.params;

      const usuario = await db.Usuario.findByPk(cod);

      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      await usuario.destroy();

      return res.status(200).json({ message: 'Usuário excluído com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir usuário no admin:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao excluir usuário.' });
    }
  },

  excluirLista: async (req, res) => {
    try {
      const { cod } = req.params;

      const lista = await db.Atividade.findByPk(cod);

      if (!lista || lista.tipo !== 'lista') {
        return res.status(404).json({ error: 'Lista não encontrada.' });
      }

      await lista.destroy();

      return res.status(200).json({ message: 'Lista excluída com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir lista no admin:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao excluir lista.' });
    }
  },

  listarQuestoesReportadas: async (req, res) => {
    try {
      const reportesPendentes = await db.QuestaoReportada.findAll({
        where: { status: 'pendente' },
        include: [
          {
            model: db.Questao,
            as: 'questao',
            include: [
              { model: db.Disciplina, as: 'disciplina', attributes: ['cod', 'descricao'] },
              { model: db.Tema, as: 'tema', attributes: ['cod', 'descricao'] },
              { model: db.Alternativa, as: 'alternativas' }
            ]
          },
          {
            model: db.Usuario,
            as: 'usuario',
            attributes: ['cod', 'login', 'nome_completo']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const agrupadoMap = new Map();

      for (const rep of reportesPendentes) {
        if (!rep.questao) continue;
        const qCod = rep.questao_cod;

        if (!agrupadoMap.has(qCod)) {
          agrupadoMap.set(qCod, {
            questao: {
              cod: rep.questao.cod,
              descricao: rep.questao.descricao,
              disciplina_cod: rep.questao.disciplina_cod,
              disciplina_nome: rep.questao.disciplina ? rep.questao.disciplina.descricao : 'Geral',
              tema_cod: rep.questao.tema_cod,
              tema_nome: rep.questao.tema ? rep.questao.tema.descricao : '',
              autor: rep.questao.autor || '',
              ano: rep.questao.ano || '',
              explicacao: rep.questao.explicacao || '',
              imagem_url: rep.questao.imagem_url || null,
              alternativas: rep.questao.alternativas ? rep.questao.alternativas.map(a => ({
                cod: a.cod,
                texto: a.texto,
                correta: a.correta
              })) : []
            },
            total_reportes: 0,
            reportes: []
          });
        }

        const item = agrupadoMap.get(qCod);
        item.total_reportes += 1;
        item.reportes.push({
          cod: rep.cod,
          motivo: rep.motivo,
          descricao_detalhada: rep.descricao_detalhada,
          data: rep.createdAt,
          usuario: rep.usuario ? {
            login: rep.usuario.login,
            nome_completo: rep.usuario.nome_completo
          } : null
        });
      }

      const resultado = Array.from(agrupadoMap.values());
      return res.status(200).json(resultado);
    } catch (error) {
      console.error('Erro ao listar questões reportadas no admin:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao listar questões reportadas.' });
    }
  },

  atualizarEEditarQuestaoReportada: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { questaoCod } = req.params;
      const { descricao, alternativas, explicacao, disciplina_cod, tema_cod, autor, ano } = req.body;

      const questao = await db.Questao.findByPk(questaoCod, { transaction: t });
      if (!questao) {
        await t.rollback();
        return res.status(404).json({ error: 'Questão não encontrada.' });
      }

      if (descricao) questao.descricao = descricao;
      if (explicacao !== undefined) questao.explicacao = explicacao;
      if (disciplina_cod) questao.disciplina_cod = parseInt(disciplina_cod);
      if (tema_cod !== undefined) questao.tema_cod = tema_cod ? parseInt(tema_cod) : null;
      if (autor !== undefined) questao.autor = autor ? String(autor).trim() : null;
      if (ano !== undefined) questao.ano = ano ? parseInt(ano) : null;

      await questao.save({ transaction: t });

      if (Array.isArray(alternativas) && alternativas.length > 0) {
        for (const alt of alternativas) {
          if (alt.cod) {
            const altExistente = await db.Alternativa.findByPk(alt.cod, { transaction: t });
            if (altExistente) {
              if (alt.texto !== undefined) altExistente.texto = alt.texto;
              if (alt.correta !== undefined) altExistente.correta = Boolean(alt.correta);
              await altExistente.save({ transaction: t });
            }
          }
        }
      }

      await db.QuestaoReportada.update(
        { status: 'resolvido' },
        { where: { questao_cod: questaoCod, status: 'pendente' }, transaction: t }
      );

      await t.commit();
      return res.status(200).json({ message: 'Questão atualizada e reportes marcados como resolvidos com sucesso.' });
    } catch (error) {
      await t.rollback();
      console.error('Erro ao atualizar questão reportada:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao atualizar questão reportada.' });
    }
  },

  descartarReportesQuestao: async (req, res) => {
    try {
      const { questaoCod } = req.params;
      await db.QuestaoReportada.update(
        { status: 'descartado' },
        { where: { questao_cod: questaoCod, status: 'pendente' } }
      );
      return res.status(200).json({ message: 'Reportes descartados com sucesso.' });
    } catch (error) {
      console.error('Erro ao descartar reportes da questão:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao descartar reportes.' });
    }
  },

  obterDashboardStats: async (req, res) => {
    try {
      // 1. Total de questões reportadas pendentes e últimas 5 reportadas
      const totalReportesPendentes = await db.QuestaoReportada.count({
        where: { status: 'pendente' }
      });

      const reportesPendentes = await db.QuestaoReportada.findAll({
        where: { status: 'pendente' },
        limit: 5,
        include: [
          {
            model: db.Questao,
            as: 'questao',
            include: [
              { model: db.Disciplina, as: 'disciplina', attributes: ['cod', 'descricao'] }
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      const questoesReportadasFormatadas = reportesPendentes
        .filter(rep => rep.questao)
        .map(rep => ({
          cod: rep.questao.cod,
          disciplina: rep.questao.disciplina ? rep.questao.disciplina.descricao : 'Geral',
          motivo: rep.motivo,
          descricao_detalhada: rep.descricao_detalhada || ''
        }));

      // 2. Últimas 5 questões cadastradas na plataforma
      const ultimasQuestoes = await db.Questao.findAll({
        limit: 5,
        order: [['cod', 'DESC']],
        include: [
          { model: db.Disciplina, as: 'disciplina', attributes: ['cod', 'descricao'] },
          { model: db.Tema, as: 'tema', attributes: ['cod', 'descricao'] }
        ]
      });

      const ultimasQuestoesFormatadas = ultimasQuestoes.map(q => ({
        cod: q.cod,
        disciplina: q.disciplina ? q.disciplina.descricao : 'Geral',
        tema: q.tema ? q.tema.descricao : (q.descricao ? q.descricao.replace(/<[^>]*>?/gm, '').substring(0, 40) + '...' : 'Sem tema'),
        data: q.createdAt || null
      }));

      // 3. Disciplinas e estatísticas de estudos por área
      const disciplinas = await db.Disciplina.findAll({
        attributes: ['cod', 'descricao'],
        order: [['cod', 'ASC']]
      });

      const estatisticasAreas = await db.Usuario_estatisticas_por_area.findAll({
        attributes: ['disciplina_cod', 'total_questoes_respondidas']
      });

      // Mapeia o total de respostas acumuladas por disciplina
      const respostasPorDisciplina = {};
      estatisticasAreas.forEach(est => {
        const discCod = est.disciplina_cod;
        const resp = est.total_questoes_respondidas || 0;
        respostasPorDisciplina[discCod] = (respostasPorDisciplina[discCod] || 0) + resp;
      });

      const totalRespostas = Object.values(respostasPorDisciplina).reduce((acc, curr) => acc + curr, 0);

      let disciplinasMaisEstudadas = [];

      if (totalRespostas > 0) {
        disciplinasMaisEstudadas = disciplinas.map(d => ({
          disciplina: d.descricao,
          total: respostasPorDisciplina[d.cod] || 0
        }));
      } else {
        // Fallback: contagem de questões cadastradas por disciplina caso não haja respostas registradas ainda
        for (const d of disciplinas) {
          const totalQuestoesDisc = await db.Questao.count({
            where: { disciplina_cod: d.cod }
          });
          disciplinasMaisEstudadas.push({
            disciplina: d.descricao,
            total: totalQuestoesDisc
          });
        }
      }

      return res.status(200).json({
        totalReportesPendentes,
        questoesReportadas: questoesReportadasFormatadas,
        ultimasQuestoes: ultimasQuestoesFormatadas,
        disciplinasMaisEstudadas
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas do dashboard admin:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao consolidar estatísticas do dashboard.' });
    }
  }
};

export default adminController;