import db from '../models/index.js'

// Cria o objeto simuladoController
const listaController = {

  // Cria o metodo para gerar um simulado
  gerarLista: async (req, res) => {
    try {
      // Receber os criterios
      const { quantidade, disciplinas } = req.body; // ex: { "quantidade": 20, "disciplinas": [1, 5] }

      // Verifica se os dados obrigatorios estão de acordo, tecnicamente não precisava, pois em teoria
      // é impossivel o aluno colocar um número menor ou igual a zero por exemplo, mas é bom né
      if (!quantidade || !disciplinas || !Array.isArray(disciplinas) || disciplinas.length === 0) {
        return res.status(400).json({ error: 'Quantidade e um array de disciplinas são obrigatórios.' });
      }

      const questoes = await db.Questao.findAll({
        attributes: ['cod', 'descricao', 'imagem_url', 'explicacao', 'tema_cod', 'disciplina_cod', 'autor', 'ano'], 
        where: { disciplina_cod: disciplinas },
        order: db.sequelize.random(),
        limit: parseInt(quantidade),
        
        include: [
            {
                model: db.Alternativa,
                as: 'alternativas', // O apelido definido no associate
                attributes: ['cod', 'texto', 'correta'] // O que você quer trazer da alternativa
            }
        ]
      });

      // Verifica se o banco encontrou questões suficientes (.length é tamanho, se tamanho menor que quantidade for truly, vai dar o erro)
      if (questoes.length < quantidade) {
        return res.status(404).json({ error: `Não foram encontradas ${quantidade} questões para os critérios selecionados. Foram encontradas apenas ${questoes.length}.` });
      }

      // Prepara a resposta sem gabarito para enviar, o .map mapeia o array questões, e executa a arrow function
      // com q de parametro, o ...restoDaQuestão é onde tudo acontece, os ... é um operador que pega o resto do array
      // tirando o que está citado anteriormente, nesse caso o gabarito, e coloca dentro de q, depois o return
      const questoesSemGabarito = questoes.map(q => {
        const questaoPura = q.get({ plain: true }); 
        const { gabarito, ...restoDaQuestao } = questaoPura;
        return restoDaQuestao;
      });

      // Manda as resposta sem gabarito
      res.status(200).json(questoesSemGabarito);

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro ao gerar simulado:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  }
}

// Export default para exportar o valor principal do arquivo.
export default listaController;