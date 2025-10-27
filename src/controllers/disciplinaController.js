import pool from '../config/db.js'; 

const disciplinaController = {
  
  // Método para buscar todas as disciplinas
  getAllDisciplinas: async (req, res) => {
    try {
      // selecione o código e a descrição de todas as linhas da tabela 'disciplina'.
      // Ordenando elas alfabeticamente
      const sql = 'SELECT cod, descricao FROM disciplina ORDER BY descricao ASC';
      
      // Executa a query no banco de dados.
      const [disciplinas] = await pool.query(sql);

      // Envia a lista de disciplinas de volta como uma resposta JSON com status 200 (OK).
      res.status(200).json(disciplinas);

    } catch (error) {
      console.error('Erro ao buscar disciplinas:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  }

};

export default disciplinaController;