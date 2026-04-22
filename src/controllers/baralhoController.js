import db from '../models/index.js';
import fs from 'fs';

const { Baralho, Cartao } = db;

const baralhoController = {
  async criar(req, res) {
    try {
      const { nome } = req.body;
      const usuario_cod = req.userId;

      if (!nome) {
        return res.status(400).json({ error: 'Nome do baralho é obrigatório' });
      }

      const baralhoEncontrado = await Baralho.findOne({ where: { nome, usuario_cod } });
      if (baralhoEncontrado) {
        return res.status(409).json({ error: 'Você já possui um baralho com este nome' });
      }

      const novoBaralho = await Baralho.create({ nome, usuario_cod });
      return res.status(201).json(novoBaralho);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao criar baralho' });
    }
  },

  async listar(req, res) {
    try {
      const usuario_cod = req.userId;
      const baralhos = await Baralho.findAll({ where: { usuario_cod } });
      return res.json(baralhos);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao listar baralhos' });
    }
  },

  async importar(req, res) {
    try {
      const usuario_cod = req.userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado' });
      }

      // Lendo arquivo em memória, multer salva temporariamente
      const content = fs.readFileSync(file.path, 'utf8');

      // Limpar o arquivo apos armazenar em variavel
      fs.unlinkSync(file.path);

      const linhas = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);

      if (linhas.length > 50) {
        return res.status(400).json({ error: 'O limite é de 50 cartões por importação' });
      }

      if (linhas.length === 0) {
        return res.status(400).json({ error: 'Arquivo vazio ou formato inválido' });
      }

      // Pega o nome do baralho (pode vir no body, se nãp usa default)
      const { nomeDaImportacao } = req.body;
      const nomeFinal = nomeDaImportacao || 'Baralho Importado';

      const baralho = await Baralho.create({ nome: nomeFinal, usuario_cod });

      const cartoesParaInserir = linhas.map(linha => {
        const partes = linha.split(';');
        return {
          frente: partes[0] ? partes[0].trim() : '',
          verso: (partes.length > 1) ? partes.splice(1).join(';').trim() : '',
          baralho_id: baralho.id,
          tipo: 'tradicional' // Default
        };
      }).filter(c => c.frente && c.verso); // Ignorar falhas de formatação

      if(cartoesParaInserir.length === 0){
          return res.status(400).json({ error: 'Nenhum cartão válido encontrado no formato esperado (Frente; Verso)'});
      }

      await Cartao.bulkCreate(cartoesParaInserir);

      return res.status(201).json({ message: 'Baralho importado com sucesso', cartoesImportados: cartoesParaInserir.length });

    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao importar baralho' });
    }
  },

  async editar(req, res) {
    try {
      const { id } = req.params;
      const { nome } = req.body;
      const usuario_cod = req.userId;

      if (!nome) {
        return res.status(400).json({ error: 'Nome do baralho é obrigatório' });
      }

      const baralho = await Baralho.findByPk(id);

      if (!baralho || baralho.usuario_cod !== usuario_cod) {
        return res.status(404).json({ error: 'Baralho não encontrado ou não pertence a você' });
      }

      // Verifica se já não existe outro com mesmo nome (exceto ele próprio)
      const baralhoExistente = await Baralho.findOne({ where: { nome, usuario_cod } });
      if (baralhoExistente && baralhoExistente.id !== Number(id)) {
        return res.status(409).json({ error: 'Você já possui um baralho com este nome' });
      }

      baralho.nome = nome;
      await baralho.save();

      return res.json(baralho);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao editar baralho' });
    }
  },

  async deletar(req, res) {
    try {
      const { id } = req.params;
      const usuario_cod = req.userId;

      const baralho = await Baralho.findByPk(id);

      if (!baralho || baralho.usuario_cod !== usuario_cod) {
        return res.status(404).json({ error: 'Baralho não encontrado ou não pertence a você' });
      }

      await baralho.destroy();

      return res.json({ message: 'Baralho deletado com sucesso' });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ error: 'Erro ao deletar baralho' });
    }
  }

};

export default baralhoController;