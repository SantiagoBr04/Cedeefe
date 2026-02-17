import db from '../models/index.js'

// Cria o objeto simuladoController
const listaController = {

  // Cria o metodo para gerar um simulado
  gerarLista: async (req, res) => {
    const t = await db.sequelize.transaction()
    try {
      // Receber os criterios
      const { quantidade, disciplinas, nome, descricao, disciplina_cod } = req.body; // ex: { "quantidade": 20, "disciplinas": [1, 5] }
      const usuario_cod = req.userId;

      // Verifica se os dados obrigatorios estão de acordo, tecnicamente não precisava, pois em teoria
      // é impossivel o aluno colocar um número menor ou igual a zero por exemplo, mas é bom né
      if (!quantidade || !disciplinas) {
        return res.status(400).json({ error: 'Dados incompletos.' });
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

      // Cria a atividade para o cabeçalho
      const novaAtividade = await db.Atividade.create({
          usuario_cod: usuario_cod, // ID do aluno
          nome: nome || `Lista de Exercícios - ${new Date().toLocaleDateString()}`,
          descricao: descricao,
          disciplina_cod: disciplina_cod,
          tipo: 'lista',
          status: 'em_andamento'
      }, { transaction: t });

      // Vincula as questões (Salva só os cod's na tabela intermediária)
      const vinculos = questoes.map(q => ({
          atividade_cod: novaAtividade.cod,
          questao_cod: q.cod
          // resposta_usuario: null (para possivel implementação)
      }));

      await db.Atividade_questoes.bulkCreate(vinculos, { transaction: t });

      await t.commit(); // Salva tudo no banco

      // Prepara a resposta sem gabarito para enviar, o .map mapeia o array questões, e executa a arrow function
      // com q de parametro, o ...restoDaQuestão é onde tudo acontece, os ... é um operador que pega o resto do array
      // tirando o que está citado anteriormente, nesse caso o gabarito, e coloca dentro de q, depois o return
      const questoesSemGabarito = questoes.map(q => {
        const questaoPura = q.get({ plain: true }); 
        const { gabarito, ...restoDaQuestao } = questaoPura;
        return restoDaQuestao;
      });

      // Manda as resposta sem gabarito
      res.status(200).json({
          atividade_cod: novaAtividade.cod, 
          questoes: questoesSemGabarito
      });

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro ao gerar simulado:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  retomarLista: async (req, res) => {
      try {
          const { id } = req.params;

          // Busca a atividade e inclui a Disciplina 
          const atividade = await db.Atividade.findByPk(id, {
              include: [
                  { 
                      model: db.Disciplina, 
                      as: 'disciplina',
                      attributes: ['descricao'] 
                  },
                  {
                      model: db.Atividade_questoes,
                      as: 'registroDasQuestoes',
                      include: [{
                          model: db.Questao,
                          as: 'questao',
                          include: [{ model: db.Alternativa, as: 'alternativas' }]
                      }]
                  }
              ]
          });

          if (!atividade) return res.status(404).json({ error: "Lista não encontrada" });

          const questoesFormatadas = atividade.registroDasQuestoes.map(r => r.questao);

          res.json({
              atividade_cod: atividade.cod,
              
              // Tudo vem direto do banco 
              nome: atividade.nome,           
              descricao: atividade.descricao, 
              disciplina: atividade.disciplina.descricao, 
              quantidade: questoesFormatadas.length,
              
              questoes: questoesFormatadas
          });

      } catch (error) {
          console.error(error);
          res.status(500).json({ error: "Erro ao buscar lista" });
      }
  },

};

// Export default para exportar o valor principal do arquivo.
export default listaController;