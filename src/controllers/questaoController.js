// Importa o pool de conexões do BD
import pool from '../config/db.js';

// Cria o objeto controller que vai ser exportado
const questaoController = {
  
  // Cria o metodo addQuestão, assincrono e recebe a requisião e a resposta
  addQuestao: async (req, res) => {
    const connection = await pool.getConnection(); // Pega uma conexão da pool
    try {
      // Recebe todos os dados da questão do corpo da requisição
      const {
        descricao,
        autor,
        ano,
        explicacao,
        imagem_url,
        disciplina_cod,
        tema_cod,
        alternativas // ex: [{ "texto": "...", "correta": true }, { "texto": "...", "correta": false }]
      } = req.body;

      // Validação dos dados essenciais
      if (!descricao || !disciplina_cod || !alternativas || !Array.isArray(alternativas) || alternativas.length === 0) {
        return res.status(400).json({ error: 'Descrição, disciplina_cod e um array de alternativas são obrigatórios.' });
      }
      
      // Verifica se existe exatamente uma alternativa correta
      const corretas = alternativas.filter(alt => alt.correta === true);
      if (corretas.length !== 1) {
        return res.status(400).json({ error: 'Deve haver exatamente uma alternativa correta.' });
      }

      // Inicia a transação
      await connection.beginTransaction();

      // Insere a questão na tabela 'questoes'
      const sqlQuestao = `
        INSERT INTO questoes 
        (descricao, autor, ano, explicacao, imagem_url, disciplina_cod, tema_cod) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      const [resultQuestao] = await connection.query(sqlQuestao, [
        descricao,
        autor || null,
        ano || null,
        explicacao || null,
        imagem_url || null,
        disciplina_cod,
        tema_cod || null
      ]);

      const questaoId = resultQuestao.insertId;

      // Insere as alternativas na tabela 'alternativas'
      const sqlAlternativas = 'INSERT INTO alternativas (questao_cod, texto, correta) VALUES ?';
      
      const valoresAlternativas = alternativas.map(alt => [
        questaoId,
        alt.texto,
        alt.correta || false
      ]);

      await connection.query(sqlAlternativas, [valoresAlternativas]);

      // Confirma a transação
      await connection.commit();

      // Envia uma resposta de sucesso
      res.status(201).json({ 
        message: 'Questão e alternativas adicionadas com sucesso!',
        questaoId: questaoId 
      });

    } catch (error) { // Resposta de erro caso de um erro na execução do try
      await connection.rollback(); // Desfaz a transação em caso de erro
      console.error('Erro ao adicionar questão:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    } finally {
      connection.release(); // Libera a conexão de volta para a pool
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
  },

  verificarQuestao: async (req, res) => {
  try {
    const { questao_cod, alternativa_cod } = req.body;

    if (!questao_cod || !alternativa_cod) {
      return res.status(400).json({ error: 'Códigos da questão e da alternativa são obrigatórios.' });
    }

    // Busca a alternativa selecionada pelo usuário e a alternativa correta da questão
    const sql = `
      SELECT cod, correta 
      FROM alternativas 
      WHERE questao_cod = ? AND (cod = ? OR correta = TRUE)
    `;
    const [alternativas] = await pool.query(sql, [questao_cod, alternativa_cod]);

    const alternativaSelecionada = alternativas.find(a => a.cod === alternativa_cod);
    const alternativaCorreta = alternativas.find(a => a.correta === 1); // Em MySQL, TRUE é 1

    if (!alternativaSelecionada || !alternativaCorreta) {
      return res.status(404).json({ error: 'Questão ou alternativa não encontrada.' });
    }

    res.status(200).json({
      correta: alternativaSelecionada.correta === 1,
      alternativaCorretaCod: alternativaCorreta.cod
    });

  } catch (error) {
    console.error('Erro ao verificar alternativa:', error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
  },
  
};

// Export default para exportar o valor principal do arquivo.
export default questaoController;