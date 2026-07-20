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
};

export default adminController;