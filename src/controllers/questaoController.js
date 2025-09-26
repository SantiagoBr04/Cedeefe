// Importa o pool de conexões do BD
import pool from '../config/db.js';

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
        gabarito,     
        disciplina_cod,
        explicacao,
        autor,
        ano,
        imagem,
        tema
      } = req.body;

      // Validação dos dados essenciais
      if (!descricao || !alternativas || !gabarito || !disciplina_cod) {
        return res.status(400).json({ error: 'Descrição, alternativas, gabarito e disciplina são obrigatórios.' });
      }

      // Código para inserir a questão no BD, não executado nessa linha, é na próxima
      const sql = `
        INSERT INTO questoes 
        (descricao, alternativas, gabarito, disciplina_cod, explicacao, autor, ano, imagem, tema) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      // Executa o código para inserir questões no BD, com seus respectivos valores
      const [result] = await pool.query(sql, [
        descricao,
        JSON.stringify(alternativas), // Garante que o objeto seja salvo como uma string JSON
        gabarito,
        disciplina_cod,
        explicacao || null, // Usa o valor ou NULL se não for fornecido, pois não é obrigatorio
        autor || null,
        ano || null,
        imagem || null,
        tema || null
      ]);

      // Envia uma resposta de sucesso
      res.status(201).json({ 
        message: 'Questão adicionada com sucesso!',
        questaoId: result.insertId 
      });

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
      const [questoes] = await pool.query('SELECT cod FROM questoes WHERE cod = ?', [cod]);
      if (questoes.length === 0) {
        return res.status(404).json({ error: 'Questão não encontrada com o código fornecido.' });
      }

      // Executa a exclusão da questão de fato
      await pool.query('DELETE FROM questoes WHERE cod = ?', [cod]);

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