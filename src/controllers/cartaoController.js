import db from '../models/index.js';

const { Cartao, Baralho, HistoricoRevisaoFlashcard } = db;

const cartaoController = {
  async criar(req, res) {
    try {
      const { frente, verso, baralho_id, tipo } = req.body;
      const imagem_url = req.file ? `/imagens/${req.file.filename}` : null;
      const usuario_cod = req.userId;

      if (!frente || !verso || !baralho_id) {
        return res.status(400).json({ error: 'Frente, verso e id do baralho são obrigatórios' });
      }

      // Validar acesso ao baralho (Dono)
      const baralho = await Baralho.findByPk(baralho_id);
      if (!baralho || baralho.usuario_cod !== usuario_cod) {
        return res.status(404).json({ error: 'Baralho não encontrado ou não pertence a você' });
      }

      const novoCartao = await Cartao.create({
        frente,
        verso,
        imagem_url,
        tipo: tipo || 'tradicional',
        baralho_id
      });

      return res.status(201).json(novoCartao);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar cartão' });
    }
  },

  async listarPorBaralho(req, res) {
    try {
      const { baralho_id } = req.params;
      const usuario_cod = req.userId;

      // Validar baralho
      const baralho = await Baralho.findByPk(baralho_id);
      if (!baralho || baralho.usuario_cod !== usuario_cod) {
        return res.status(404).json({ error: 'Baralho não encontrado' });
      }

      const cartoes = await Cartao.findAll({ where: { baralho_id } });
      return res.json(cartoes);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar cartões' });
    }
  },

  async revisarCartao(req, res) {
    try {
      const { id } = req.params;
      const { dificuldade } = req.body; // 1 = Errei, 2 = Dificil, 3 = Medio, 4 = Facil
      const usuario_cod = req.userId;

      if (!dificuldade || ![1, 2, 3, 4].includes(dificuldade)) {
        return res.status(400).json({ error: 'Dificuldade inválida' });
      }

      // Verificar relacionamento
      const cartao = await Cartao.findByPk(id, {
        include: [{ model: Baralho, as: 'baralho' }]
      });

      if (!cartao || cartao.baralho.usuario_cod !== usuario_cod) {
        return res.status(404).json({ error: 'Cartão não encontrado' });
      }

      const hoje = new Date(); // Date.now() em forma de Objeto Date

      // Lógica SRS: Intervalo Real baseado em atraso
      let { fator_facilidade, intervalo_dias, data_ultima_revisao } = cartao;

      if (!data_ultima_revisao) {
          // Primeira vez sendo feito
          data_ultima_revisao = hoje;
      }

      // Calcula a quantidade real de dias que se passaram (se fez no dia é zero ou fração e não entra em loop logico abaixo)
      const tempoDecorridoMS = hoje.getTime() - new Date(data_ultima_revisao).getTime();
      let diasEmAtraso = Math.floor(tempoDecorridoMS / (1000 * 60 * 60 * 24)); // Converter ms pra dias reais
      
      // Se não houver dia decorrido, conta como 1 dia (para que o algoritmo funcione na primeira vez)
      if (diasEmAtraso < 1) diasEmAtraso = 1;

      if (dificuldade === 1) { // Errei
        fator_facilidade = Math.max(1.3, fator_facilidade - 0.2);
        intervalo_dias = 1; // Reseta para rever no rescaldo
      } else if (dificuldade === 2) { // Dificil
        fator_facilidade = Math.max(1.3, fator_facilidade - 0.15);
        intervalo_dias = diasEmAtraso * 1.2;
      } else if (dificuldade === 3) { // Medio
        // Mantém Fato
        intervalo_dias = diasEmAtraso * fator_facilidade;
      } else if (dificuldade === 4) { // Facil
        fator_facilidade += 0.15;
        // Bonús pro fato de usar o dobro de facildiade ja que achou molinho
        intervalo_dias = diasEmAtraso * fator_facilidade * 1.3;
      }

      // Round e atualização do BD
      intervalo_dias = Math.round(intervalo_dias);
      if (intervalo_dias < 1) intervalo_dias = 1; // Nunca menor que 1

      // Nova Data baseado na somatoria da data real em que foi feito a revisao
      const previsaoProximaRevisao = new Date(hoje);
      previsaoProximaRevisao.setDate(previsaoProximaRevisao.getDate() + intervalo_dias);

      cartao.fator_facilidade = fator_facilidade;
      cartao.intervalo_dias = intervalo_dias;
      cartao.data_ultima_revisao = hoje;
      cartao.data_proxima_revisao = previsaoProximaRevisao;
      
      await cartao.save();

      // Registro Historico Revisão Gamificacao Dia Atual (ano/mes/dia sem horas)
      const dataApenasHojeStr = hoje.toISOString().split('T')[0];

      const historicoData = await HistoricoRevisaoFlashcard.findOne({
          where: { usuario_cod, data_revisao: dataApenasHojeStr }
      });

      if(historicoData) {
          historicoData.cartoes_resolvidos += 1;
          await historicoData.save();
      } else {
          await HistoricoRevisaoFlashcard.create({
              usuario_cod,
              data_revisao: dataApenasHojeStr,
              cartoes_resolvidos: 1
          });
      }

      return res.json({ 
          message: 'Cartão revisado', 
          proxima_revisao: previsaoProximaRevisao,
          intervalo_dias: intervalo_dias
      });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao analisar revisão do cartão' });
    }
  },

  async editar(req, res) {
    try {
      const { id } = req.params;
      const { frente, verso, tipo } = req.body;
      const usuario_cod = req.userId;

      const cartao = await Cartao.findByPk(id, {
        include: [{ model: Baralho, as: 'baralho' }]
      });

      if (!cartao || cartao.baralho.usuario_cod !== usuario_cod) {
        return res.status(404).json({ error: 'Cartão não encontrado ou não pertence a você' });
      }

      if (frente) cartao.frente = frente;
      if (verso) cartao.verso = verso;
      if (tipo) cartao.tipo = tipo;

      // Se enviou imagem, atualiza o src
      if (req.file) {
        cartao.imagem_url = `/imagens/${req.file.filename}`;
      }

      await cartao.save();

      return res.json(cartao);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao editar cartão' });
    }
  },

  async deletar(req, res) {
    try {
      const { id } = req.params;
      const usuario_cod = req.userId;

      const cartao = await Cartao.findByPk(id, {
        include: [{ model: Baralho, as: 'baralho' }]
      });

      if (!cartao || cartao.baralho.usuario_cod !== usuario_cod) {
        return res.status(404).json({ error: 'Cartão não encontrado ou não pertence a você' });
      }

      await cartao.destroy();

      return res.json({ message: 'Cartão deletado com sucesso' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao deletar cartão' });
    }
  }

};

export default cartaoController;