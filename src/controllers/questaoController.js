// Importa o pool de conexões do BD
// import pool from '../config/db.js';
import db from '../models/index.js';

// Cria o objeto controller que vai ser exportado
const questaoController = {
  
  // Cria o metodo addQuestão, assincrono e recebe a requisião e a resposta
  addQuestao: async (req, res) => {
    // Tente, um codigo que pode dar errado, mas se der não quebra toda a exucução do site
    try {
      // Recebe todos os dados da questão do corpo da requisição
      const {
        descricao,
        alternativas,     
        disciplina_cod,
        explicacao,
        autor,
        ano,
        imagem_url,
        tema_cod
      } = req.body;

      // Validação dos dados essenciais
      if (!descricao || !alternativas || !disciplina_cod) {
        return res.status(400).json({ error: 'Descrição, alternativas, gabarito e disciplina são obrigatórios.' });
      }

      // Cria o comando para adicionar a questão
      const novaQuestao = await db.Questao.create({
        descricao: descricao,
        disciplina_cod: disciplina_cod,
        explicacao: explicacao || null,
        autor: autor || null,
        ano: ano || null,
        imagem_url: imagem_url || null,
        tema_cod: tema_cod || null
      })

      const alternativasFormatadas = alternativas.map(item => {
        return {
          texto: item.texto,
          correta: item.correta,
          questao_cod: novaQuestao.cod
        }
      })

      await db.Alternativa.bulkCreate(alternativasFormatadas);

      const questaoCompleta = await db.Questao.findByPk(novaQuestao.cod, {
        include: [{ model: db.Alternativa, as: 'alternativas' }]
      })

      res.status(201).json(questaoCompleta);

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro ao adicionar questão:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Metodo para deletar questões
  deleteQuestao: async (req, res) => {
    try {
      // Pega o código na url, que vem no item params da requisição, então
      // se o cod for 15, vai excluir a questão com cod 15
      const { cod } = req.params;

      // Verifica se a questão existe
      const questoes = await db.Questao.findOne({
        where: {cod: cod},
        attributes: [cod]
      })
      // const [questoes] = await pool.query('SELECT cod FROM questoes WHERE cod = ?', [cod]);
      if (questoes.length === 0) {
        return res.status(404).json({ error: 'Questão não encontrada com o código fornecido.' });
      }

      // Executa a exclusão da questão de fato
      await db.Questao.destroy({
        where: {cod: cod}
      })
      //await pool.query('DELETE FROM questoes WHERE cod = ?', [cod]);

      // Envia a resposta de sucesso
      res.status(200).json({ message: `Questão com código ${cod} foi deletada com sucesso.` });

    } catch (error) { // 
      console.error('Erro ao deletar questão:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  }

};

// Export default para exportar o valor principal do arquivo.
export default questaoController;