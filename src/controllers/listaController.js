// Importa o pool de conexões do BD
import pool from '../config/db.js';

// Cria o objeto simuladoController
const listaController = {

  // Cria o metodo para gerar uma lista de questões
  gerarLista: async (req, res) => {
    try {
      // Receber os criterios
      const { quantidade, disciplinas, } = req.body; // ex: { "quantidade": 20, "disciplinas": [1, 5] }

      // Verifica se os dados obrigatorios estão de acordo, tecnicamente não precisava, pois em teoria
      // é impossivel o aluno colocar um número menor ou igual a zero por exemplo, mas é bom né
      if (!quantidade || !disciplinas || !Array.isArray(disciplinas) || disciplinas.length === 0) {
        return res.status(400).json({ error: 'Quantidade e um array de disciplinas são obrigatórios.' });
      }

      // Construir a query (código sql)
      // A biblioteca mysql2 é inteligente: o `IN (?)` aceita um array diretamente.
      // O ORDER BY RAND faz com que pegue de forma aleatoria, eu quero de forma aleatoria, mas queria que fosse 
      // uma materia primeira, depois outra, dessa forma ta tudo misturado, mas isso eu arrumo depois
      const sql = `
        SELECT cod, descricao, autor, ano, explicacao, imagem_url, disciplina_cod, tema_cod
        FROM questoes 
        WHERE disciplina_cod IN (?) 
        ORDER BY RAND() 
        LIMIT ?
      `;

      // Executa o código sql com os parametros disciplinas e quantidade, que substitui os ?, respectivamente 
      const [questoes] = await pool.query(sql, [disciplinas, quantidade]);

      // Verifica se o banco encontrou questões suficientes (.length é tamanho, se tamanho menor que quantidade for truly, vai dar o erro)
      if (questoes.length < quantidade) {
        return res.status(404).json({ error: `Não foram encontradas ${quantidade} questões para os critérios selecionados. Foram encontradas apenas ${questoes.length}.` });
      }

      // Prepara a resposta sem gabarito para enviar 
      const codigosDasQuestoes = questoes.map(q => q.cod);

      // Busca todas as alternativas para essas questões de uma só vez
      const [alternativas] = await pool.query(
        'SELECT cod, questao_cod, texto FROM alternativas WHERE questao_cod IN (?)',
        [codigosDasQuestoes]
      );

      // Agrupa as alternativas por questão para facilitar o acesso
      const alternativasPorQuestao = alternativas.reduce((acc, alt) => {
        if (!acc[alt.questao_cod]) {
          acc[alt.questao_cod] = [];
        }
        acc[alt.questao_cod].push(alt);
        return acc;
      }, {});

      // Adiciona as alternativas a cada questão
      const questoesComAlternativas = questoes.map(q => {
        return {
          ...q,
          alternativas: alternativasPorQuestao[q.cod] || []
        };
      });

      // Manda as questões com suas alternativas
      res.status(200).json(questoesComAlternativas);

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro ao gerar simulado:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método de corrigir o simulado, tecnicamente ele salva também
  corrigirLista: async (req, res) => {
    try {
      // Recebe os dados
      const { userId } = req;
      const { respostas } = req.body; // ex: { "respostas": [{"questao_cod": 15, "resposta_aluno": "c"}, ...] }

      // Faz a verificação se foram recebidas as respostas
      if (!respostas || !Array.isArray(respostas) || respostas.length === 0) {
        return res.status(400).json({ error: 'Um array de respostas é obrigatório.' });
      }

      // Adiciona o cod da questão a variavel codigosDasQuestoes
      const codigosDasQuestoes = respostas.map(r => r.questao_cod);

      // Busca os gabaritos de todas as questões de uma só vez (muito mais eficiente)
      const [gabaritos] = await pool.query(
        'SELECT cod, gabarito FROM questoes WHERE cod IN (?)',
        [codigosDasQuestoes]
      );

      // Cria um mapa para facilitar a busca do gabarito: { 15: 'c', 22: 'a' }
      // Loucurada que o .reduce é um loop, então só para quando não tiver maia questões pra analisar
      const gabaritosMap = gabaritos.reduce((map, obj) => {
        map[obj.cod] = obj.gabarito;
        return map;
      }, {});

      // Declara a varaivel acertos como 0
      let acertos = 0;
      // Lógica para verificar se acertou (.map também é um loop, tal qual .reduce)
      const resultadoDetalhado = respostas.map(r => {
        const gabaritoCorreto = gabaritosMap[r.questao_cod];
        const acertou = r.resposta_aluno === gabaritoCorreto;
        if (acertou) {
          acertos++;
        }
        return { ...r, gabarito_correto: gabaritoCorreto, acertou: acertou };
      });
      
      // Calcula a porcentagem de acerto, básico
      const pontuacao = (acertos / respostas.length) * 100;

      // Comando sql para salvar no hístorico
      await pool.query(
        'INSERT INTO historico_simulados (usuario_cod, pontuacao, questoes_respondidas) VALUES (?, ?, ?)',
        [userId, pontuacao, JSON.stringify(resultadoDetalhado)]
      );

      // Envia a resposta da questão
      res.status(200).json({
        message: 'Simulado corrigido e salvo com sucesso!',
        pontuacao: pontuacao.toFixed(2),
        acertos: acertos,
        totalQuestoes: respostas.length,
        resultadoDetalhado: resultadoDetalhado
      });

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro ao corrigir simulado:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  }

};

// Export default para exportar o valor principal do arquivo.
export default listaController;