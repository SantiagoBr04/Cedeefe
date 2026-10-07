import db from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import geminiPdfService from '../services/geminiPdfService.js';
import { cloudinary } from '../config/cloudinary.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rascunhosDir = path.resolve(__dirname, '..', '..', 'uploads', 'rascunhos');

function getRascunhosDir() {
  if (!fs.existsSync(rascunhosDir)) {
    fs.mkdirSync(rascunhosDir, { recursive: true });
  }
  return rascunhosDir;
}

function gerarESalvarRascunho(payload) {
  const loteId = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const caminhoArquivo = path.join(getRascunhosDir(), `${loteId}.json`);
  const payloadFormatado = {
    loteId,
    revisada: false,
    dataCriacao: new Date().toISOString(),
    ...payload
  };
  fs.writeFileSync(caminhoArquivo, JSON.stringify(payloadFormatado, null, 2), 'utf-8');
  return loteId;
}

// Cria o objeto controller que vai ser exportado
const questaoController = {

  // Cria o metodo addQuestão, assincrono e recebe a requisião e a resposta
  addQuestao: async (req, res) => {
    const t = await db.sequelize.transaction();

    // Lógica da Imagem: Verifica se o Multer processou algum arquivo
    let urlImagem = null;
    if (req.file) {
      urlImagem = req.file.path; // Pega a URL gerada pelo Cloudinary
    }

    try {
      // Recebe todos os dados da questão do corpo da requisição
      const {
        descricao,
        alternativas: alternativasString,
        disciplina_cod,
        explicacao,
        autor,
        ano,
        imagem_url,
        tema_cod
      } = req.body;

      // Conversão das Alternativas 
      // Como o FormData envia objetos como string, precisamos converter de volta
      let alternativas;
      try {
        // Se vier como string (pelo FormData), faz o parse. 
        // Se por acaso vier como objeto, usa direto.
        alternativas = typeof alternativasString === 'string'
          ? JSON.parse(alternativasString)
          : alternativasString;
      } catch (e) {
        await t.rollback();
        return res.status(400).json({ error: "Formato das alternativas inválido." });
      }

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
        tema_cod: tema_cod || null,
        // Aqui usamos a url gerada pelo Cloudinary capturada lá em cima no passo 1
        // Se não tiver imagem, mantemos null ou usamos o que veio no body (caso seja um link externo)
        imagem_url: urlImagem || req.body.imagem_url || null
      }, { transaction: t }); // Passamos a transação 't'

      const alternativasFormatadas = alternativas.map(item => {
        return {
          texto: item.texto,
          correta: item.correta,
          questao_cod: novaQuestao.cod
        }
      })

      await db.Alternativa.bulkCreate(alternativasFormatadas, { transaction: t });

      await t.commit(); // Confirma as alterações no banco

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
      const { cod } = req.params;

      // Buscamos a questão primeiro para saber se ela tem imagem
      const questao = await db.Questao.findByPk(cod);

      if (!questao) {
        return res.status(404).json({ error: 'Questão não encontrada.' });
      }

      // Se tiver imagem, apagamos do Cloudinary ou localmente
      if (questao.imagem_url) {
        if (questao.imagem_url.startsWith('http')) {
          const urlParts = questao.imagem_url.split('/');
          const filename = urlParts[urlParts.length - 1];
          const folder = urlParts[urlParts.length - 2];
          const publicId = `${folder}/${filename.split('.')[0]}`;
          try {
            await cloudinary.uploader.destroy(publicId);
            console.log("Imagem no Cloudinary apagada com sucesso!");
          } catch (erro) {
            console.error("Erro ao apagar imagem do Cloudinary:", erro);
          }
        } else {
          // Monta o caminho completo: Pasta do projeto + uploads + nome da imagem
          const caminhoArquivo = path.resolve('uploads', questao.imagem_url);

          // Função do Node que deleta arquivos
          fs.unlink(caminhoArquivo, (erro) => {
            if (erro) {
              console.error("Erro ao apagar imagem física:", erro);
            } else {
              console.log("Imagem física apagada com sucesso!");
            }
          });
        }
      }

      // Agora apagamos do banco de dados
      await questao.destroy();

      res.status(200).json({ message: `Questão ${cod} e sua imagem, caso tivesse, foram deletadas.` });

    } catch (error) {
      console.error('Erro ao deletar questão:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para analisar PDFs da prova e gabarito via Gemini
  analisarPdf: async (req, res) => {
    try {
      const files = req.files;
      if (!files || !files.pdf_prova || !files.pdf_gabarito) {
        return res.status(400).json({ error: 'É necessário enviar o PDF da prova (pdf_prova) e o PDF do gabarito (pdf_gabarito).' });
      }

      const pdfProvaFile = files.pdf_prova[0];
      const pdfGabaritoFile = files.pdf_gabarito[0];

      const { autor, ano } = req.body;

      try {
        const questoesExtraidas = await geminiPdfService.analisarProvaEGabarito({
          pdfProvaPath: pdfProvaFile.path,
          pdfGabaritoPath: pdfGabaritoFile.path,
          autorDefault: autor,
          anoDefault: ano
        });

        // Limpeza de arquivos temporários de upload após processamento
        try {
          if (fs.existsSync(pdfProvaFile.path)) fs.unlinkSync(pdfProvaFile.path);
          if (fs.existsSync(pdfGabaritoFile.path)) fs.unlinkSync(pdfGabaritoFile.path);
        } catch (e) {
          console.warn('Aviso: Não foi possível deletar arquivos PDF temporários:', e);
        }

        const loteId = gerarESalvarRascunho({
          questoes: questoesExtraidas,
          autor: autor || 'IFC',
          ano: ano || new Date().getFullYear(),
          disciplinaPadraoCod: req.body.disciplina_padrao_cod || ''
        });

        return res.status(200).json({
          sucesso: true,
          loteId,
          questoes: questoesExtraidas
        });

      } catch (geminiError) {
        // Limpeza mesmo em caso de erro no Gemini
        if (fs.existsSync(pdfProvaFile.path)) fs.unlinkSync(pdfProvaFile.path);
        if (fs.existsSync(pdfGabaritoFile.path)) fs.unlinkSync(pdfGabaritoFile.path);

        console.error('Erro ao processar PDF via Gemini:', geminiError);
        return res.status(500).json({ error: geminiError.message || 'Erro ao processar PDF da prova.' });
      }

    } catch (error) {
      console.error('Erro interno na análise de PDF:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao analisar PDF.' });
    }
  },

  // Salva rascunho de importação em servidor sem usar localStorage
  salvarRascunho: async (req, res) => {
    try {
      const payload = req.body;
      if (!payload || !Array.isArray(payload.questoes)) {
        return res.status(400).json({ error: 'Payload inválido para salvamento de rascunho.' });
      }
      const loteId = gerarESalvarRascunho(payload);
      return res.status(201).json({ sucesso: true, loteId });
    } catch (error) {
      console.error('Erro ao salvar rascunho no servidor:', error);
      return res.status(500).json({ error: 'Erro ao salvar rascunho no servidor.' });
    }
  },

  // Lista todos os rascunhos de importação disponíveis no diretório uploads/rascunhos
  listarRascunhos: async (req, res) => {
    try {
      const dir = getRascunhosDir();
      const arquivos = fs.readdirSync(dir);
      const lista = [];

      for (const arq of arquivos) {
        if (arq.endsWith('.json')) {
          const caminho = path.join(dir, arq);
          const loteId = arq.replace('.json', '');
          try {
            const stats = fs.statSync(caminho);
            const conteudo = fs.readFileSync(caminho, 'utf-8');
            const data = JSON.parse(conteudo);
            lista.push({
              loteId,
              autor: data.autor || 'Desconhecido',
              ano: data.ano || '',
              totalQuestoes: Array.isArray(data.questoes) ? data.questoes.length : 0,
              dataCriacao: data.dataCriacao || stats.birthtime || stats.mtime,
              revisada: Boolean(data.revisada),
              dataEnvio: data.dataEnvio || null,
              totalEnviadas: data.totalEnviadas || null
            });
          } catch (errArq) {
            console.warn(`Aviso: Erro ao ler rascunho ${arq}:`, errArq.message);
          }
        }
      }

      lista.sort((a, b) => new Date(b.dataCriacao) - new Date(a.dataCriacao));
      return res.status(200).json(lista);
    } catch (error) {
      console.error('Erro ao listar rascunhos do servidor:', error);
      return res.status(500).json({ error: 'Erro ao listar rascunhos de importação do servidor.' });
    }
  },

  // Lê rascunho de importação em servidor pelo loteId
  obterRascunho: async (req, res) => {
    try {
      const { loteId } = req.params;
      if (!loteId || !/^[0-9_]+$/.test(loteId)) {
        return res.status(400).json({ error: 'Identificador do rascunho inválido.' });
      }
      const caminhoArquivo = path.join(getRascunhosDir(), `${loteId}.json`);
      if (!fs.existsSync(caminhoArquivo)) {
        return res.status(404).json({ error: 'Rascunho não encontrado.' });
      }
      const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
      const payload = JSON.parse(conteudo);
      payload.loteId = loteId;
      payload.revisada = Boolean(payload.revisada);
      return res.status(200).json(payload);
    } catch (error) {
      console.error('Erro ao obter rascunho do servidor:', error);
      return res.status(500).json({ error: 'Erro ao carregar rascunho de importação do servidor.' });
    }
  },

  // Método para salvar o lote de questões revisadas e aprovadas pelo administrador
  confirmarImportacaoLote: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { questoes, loteId } = req.body;

      if (!Array.isArray(questoes) || questoes.length === 0) {
        await t.rollback();
        return res.status(400).json({ error: 'O corpo da requisição deve conter uma lista de questões não vazia.' });
      }

      let questoesCriadas = 0;

      for (const q of questoes) {
        if (!q.descricao || !q.disciplina_cod) {
          await t.rollback();
          return res.status(400).json({ error: 'Todas as questões devem possuir enunciado e disciplina informados.' });
        }

        // Validação da FK de Disciplina
        const disciplina = await db.Disciplina.findByPk(q.disciplina_cod);
        if (!disciplina) {
          await t.rollback();
          return res.status(404).json({ error: `Disciplina com código ${q.disciplina_cod} não foi encontrada.` });
        }

        // Validação da FK de Tema se informada
        if (q.tema_cod) {
          const tema = await db.Tema.findByPk(q.tema_cod);
          if (!tema) {
            await t.rollback();
            return res.status(404).json({ error: `Tema com código ${q.tema_cod} não foi encontrado.` });
          }
        }

        const novaQuestao = await db.Questao.create({
          descricao: q.descricao,
          disciplina_cod: q.disciplina_cod,
          tema_cod: q.tema_cod || null,
          autor: q.autor || null,
          ano: q.ano || null,
          explicacao: q.explicacao || null,
          imagem_url: q.imagem_url || null
        }, { transaction: t });

        if (Array.isArray(q.alternativas) && q.alternativas.length > 0) {
          const alternativasFormatadas = q.alternativas.map(alt => ({
            questao_cod: novaQuestao.cod,
            texto: alt.texto,
            correta: Boolean(alt.correta)
          }));
          await db.Alternativa.bulkCreate(alternativasFormatadas, { transaction: t });
        }

        questoesCriadas++;
      }

      await t.commit();

      // Se o loteId foi informado, marca o rascunho correspondente no servidor como revisado e enviado ao banco
      if (loteId && /^[0-9_]+$/.test(loteId)) {
        try {
          const caminhoArquivo = path.join(getRascunhosDir(), `${loteId}.json`);
          if (fs.existsSync(caminhoArquivo)) {
            const conteudo = fs.readFileSync(caminhoArquivo, 'utf-8');
            const payload = JSON.parse(conteudo);
            payload.revisada = true;
            payload.dataEnvio = new Date().toISOString();
            payload.totalEnviadas = questoesCriadas;
            fs.writeFileSync(caminhoArquivo, JSON.stringify(payload, null, 2), 'utf-8');
          }
        } catch (eRascunho) {
          console.warn('Aviso: Não foi possível atualizar o status do rascunho:', eRascunho.message);
        }
      }

      return res.status(201).json({
        message: 'Importação em lote concluída com sucesso.',
        questoesCriadas
      });

    } catch (error) {
      await t.rollback();
      console.error('Erro na confirmação de importação em lote:', error);
      return res.status(500).json({ error: 'Erro ao salvar o lote de questões no banco de dados.' });
    }
  },

  // Faz upload de imagem individual para associar a uma questão na tela de revisão
  async uploadImagem(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo de imagem foi enviado.' });
      }

      const imagem_url = req.file.path;
      return res.status(200).json({
        message: 'Imagem enviada com sucesso.',
        imagem_url
      });
    } catch (error) {
      console.error('Erro ao realizar upload de imagem da questão:', error);
      return res.status(500).json({ error: 'Erro ao salvar a imagem no servidor.' });
    }
  },

  // Permite que um usuário autenticado reporte um erro em uma questão
  reportarQuestao: async (req, res) => {
    try {
      const { cod } = req.params;
      const usuario_cod = req.userId;
      const { motivo, descricao_detalhada } = req.body;

      if (!motivo || typeof motivo !== 'string' || motivo.trim() === '') {
        return res.status(400).json({ error: 'O motivo do reporte é obrigatório.' });
      }

      if (motivo.toLowerCase().includes('outro') && (!descricao_detalhada || descricao_detalhada.trim() === '')) {
        return res.status(400).json({ error: 'Ao selecionar "Outros", você deve descrever o motivo do reporte.' });
      }

      const questao = await db.Questao.findByPk(cod);
      if (!questao) {
        return res.status(404).json({ error: 'Questão não encontrada.' });
      }

      // Verifica quantos reportes este usuário já realizou para esta mesma questão
      const totalReportesUsuario = await db.QuestaoReportada.count({
        where: {
          questao_cod: cod,
          usuario_cod
        }
      });

      if (totalReportesUsuario >= 2) {
        return res.status(400).json({
          error: 'Você já atingiu o limite máximo de 2 reportes para esta questão.'
        });
      }

      const novoReporte = await db.QuestaoReportada.create({
        questao_cod: cod,
        usuario_cod,
        motivo: motivo.trim(),
        descricao_detalhada: descricao_detalhada ? descricao_detalhada.trim() : null,
        status: 'pendente'
      });

      return res.status(201).json({
        message: 'Reporte registrado com sucesso! Obrigado por colaborar.',
        reporte: novoReporte
      });
    } catch (error) {
      console.error('Erro ao reportar questão:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao registrar o reporte.' });
    }
  },

  // Método para listar questões com filtros dinâmicos por disciplina, tema, ano, autor, texto e status de resposta
  listarQuestoes: async (req, res) => {
    try {
      const { disciplina_cod, tema_cod, ano, autor, busca, status_resposta, pagina = 1, limite = 10 } = req.query;
      const usuario_cod = req.userId;

      const whereClause = {};

      if (disciplina_cod) {
        whereClause.disciplina_cod = parseInt(disciplina_cod);
      }

      if (tema_cod) {
        whereClause.tema_cod = parseInt(tema_cod);
      }

      if (ano) {
        whereClause.ano = parseInt(ano);
      }

      if (autor && autor.trim() !== '') {
        whereClause.autor = autor.trim();
      }

      if (busca && busca.trim() !== '') {
        const Op = db.Sequelize.Op;
        whereClause.descricao = {
          [Op.iLike || Op.like]: `%${busca.trim()}%`
        };
      }

      // Mapeia todas as questões respondidas pelo usuário
      const respostasMap = new Map();
      if (usuario_cod) {
        const atividadesQuestoes = await db.Atividade_questoes.findAll({
          include: [{
            model: db.Atividade,
            as: 'atividade',
            where: { usuario_cod }
          }],
          where: {
            alternativa_selecionada_cod: { [db.Sequelize.Op.ne]: null }
          },
          attributes: ['questao_cod', 'alternativa_selecionada_cod']
        });

        atividadesQuestoes.forEach(aq => {
          respostasMap.set(aq.questao_cod, aq.alternativa_selecionada_cod);
        });
      }

      const Op = db.Sequelize.Op;
      const respondidasIds = Array.from(respostasMap.keys());

      if (status_resposta === 'ja_respondidas') {
        whereClause.cod = { [Op.in]: respondidasIds.length > 0 ? respondidasIds : [-1] };
      } else if (status_resposta === 'nao_respondidas') {
        if (respondidasIds.length > 0) {
          whereClause.cod = { [Op.notIn]: respondidasIds };
        }
      }

      const offset = (parseInt(pagina) - 1) * parseInt(limite);

      const { count, rows } = await db.Questao.findAndCountAll({
        where: whereClause,
        distinct: true,
        limit: parseInt(limite),
        offset: offset,
        order: [['cod', 'DESC']],
        include: [
          { model: db.Disciplina, as: 'disciplina' },
          { model: db.Tema, as: 'tema' },
          { model: db.Alternativa, as: 'alternativas' }
        ]
      });

      // Mapeia o atributo 'descricao' para 'nome' e injeta dados da resposta prévia do usuário
      const meQuestoesFormatadas = rows.map(q => {
        const json = q.toJSON();
        if (json.disciplina) json.disciplina.nome = json.disciplina.descricao || json.disciplina.nome;
        if (json.tema) json.tema.nome = json.tema.descricao || json.tema.nome;

        if (respostasMap.has(json.cod)) {
          const altSelecionadaCod = respostasMap.get(json.cod);
          const altObj = (json.alternativas || []).find(a => a.cod === altSelecionadaCod);
          json.ja_respondida = true;
          json.resposta_usuario = {
            alternativa_cod: altSelecionadaCod,
            correta: altObj ? Boolean(altObj.correta) : false
          };
        } else {
          json.ja_respondida = false;
          json.resposta_usuario = null;
        }

        return json;
      });

      return res.status(200).json({
        total: count,
        paginas: Math.ceil(count / parseInt(limite)),
        paginaAtual: parseInt(pagina),
        questoes: meQuestoesFormatadas
      });
    } catch (error) {
      console.error('Erro ao listar questões:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao listar questões.' });
    }
  },

  // Retorna os valores distintos de anos e autores para os filtros da interface
  obterFiltrosDisponiveis: async (req, res) => {
    try {
      const Op = db.Sequelize.Op;
      const anosRaw = await db.Questao.findAll({
        attributes: ['ano'],
        where: { ano: { [Op.ne]: null } },
        group: ['ano'],
        order: [['ano', 'DESC']],
        raw: true
      });

      const autoresRaw = await db.Questao.findAll({
        attributes: ['autor'],
        where: { autor: { [Op.ne]: null } },
        group: ['autor'],
        order: [['autor', 'ASC']],
        raw: true
      });

      const anos = anosRaw.map(item => item.ano).filter(Boolean);
      const autores = autoresRaw.map(item => item.autor).filter(Boolean);

      return res.status(200).json({ anos, autores });
    } catch (error) {
      console.error('Erro ao obter opções de filtros:', error);
      return res.status(500).json({ error: 'Erro interno ao obter filtros das questões.' });
    }
  },

  // Retorna os detalhes de uma questão por código
  obterQuestaoPorCod: async (req, res) => {
    try {
      const { cod } = req.params;

      if (isNaN(Number(cod))) {
        return res.status(400).json({ error: 'Código de questão inválido.' });
      }

      const questao = await db.Questao.findByPk(cod, {
        include: [
          { model: db.Disciplina, as: 'disciplina' },
          { model: db.Tema, as: 'tema' },
          { model: db.Alternativa, as: 'alternativas' }
        ]
      });

      if (!questao) {
        return res.status(404).json({ error: 'Questão não encontrada.' });
      }

      return res.status(200).json(questao);
    } catch (error) {
      console.error('Erro ao obter questão por código:', error);
      return res.status(500).json({ error: 'Erro interno ao buscar questão.' });
    }
  },

  // Atualiza os dados de uma questão e suas alternativas
  atualizarQuestao: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { cod } = req.params;
      const {
        descricao,
        disciplina_cod,
        tema_cod,
        autor,
        ano,
        explicacao,
        imagem_url,
        alternativas
      } = req.body;

      const questao = await db.Questao.findByPk(cod, { transaction: t });
      if (!questao) {
        await t.rollback();
        return res.status(404).json({ error: 'Questão não encontrada.' });
      }

      if (!descricao || !disciplina_cod) {
        await t.rollback();
        return res.status(400).json({ error: 'Descrição e disciplina são obrigatórias.' });
      }

      // Validar disciplina
      const disciplina = await db.Disciplina.findByPk(disciplina_cod, { transaction: t });
      if (!disciplina) {
        await t.rollback();
        return res.status(404).json({ error: `Disciplina com código ${disciplina_cod} não encontrada.` });
      }

      // Validar tema se informado
      if (tema_cod) {
        const tema = await db.Tema.findByPk(tema_cod, { transaction: t });
        if (!tema) {
          await t.rollback();
          return res.status(404).json({ error: `Tema com código ${tema_cod} não encontrado.` });
        }
      }

      // Atualizar campos da questão
      questao.descricao = descricao;
      questao.disciplina_cod = parseInt(disciplina_cod);
      questao.tema_cod = tema_cod ? parseInt(tema_cod) : null;
      questao.autor = autor !== undefined ? (autor ? String(autor).trim() : null) : questao.autor;
      questao.ano = ano !== undefined ? (ano ? parseInt(ano) : null) : questao.ano;
      questao.explicacao = explicacao !== undefined ? (explicacao ? String(explicacao).trim() : null) : questao.explicacao;
      if (imagem_url !== undefined) {
        questao.imagem_url = imagem_url ? String(imagem_url).trim() : null;
      }

      await questao.save({ transaction: t });

      // Atualizar alternativas se informadas
      if (Array.isArray(alternativas) && alternativas.length > 0) {
        await db.Alternativa.destroy({ where: { questao_cod: cod }, transaction: t });

        const novasAlternativas = alternativas.map(alt => ({
          questao_cod: parseInt(cod),
          texto: alt.texto,
          correta: Boolean(alt.correta)
        }));

        await db.Alternativa.bulkCreate(novasAlternativas, { transaction: t });
      }

      await t.commit();

      const questaoAtualizada = await db.Questao.findByPk(cod, {
        include: [
          { model: db.Disciplina, as: 'disciplina' },
          { model: db.Tema, as: 'tema' },
          { model: db.Alternativa, as: 'alternativas' }
        ]
      });

      return res.status(200).json({
        message: 'Questão atualizada com sucesso!',
        questao: questaoAtualizada
      });

    } catch (error) {
      await t.rollback();
      console.error('Erro ao atualizar questão:', error);
      return res.status(500).json({ error: 'Erro interno no servidor ao atualizar questão.' });
    }
  },

  // Permite ao usuário responder uma questão diretamente no Banco de Questões
  responderQuestaoBanco: async (req, res) => {
    const t = await db.sequelize.transaction();
    try {
      const { cod } = req.params;
      const { alternativa_cod } = req.body;
      const usuario_cod = req.userId;

      if (!cod || !alternativa_cod) {
        await t.rollback();
        return res.status(400).json({ error: 'Código da questão e alternativa selecionada são obrigatórios.' });
      }

      const questao = await db.Questao.findByPk(cod, {
        include: [{ model: db.Alternativa, as: 'alternativas' }],
        transaction: t
      });

      if (!questao) {
        await t.rollback();
        return res.status(404).json({ error: 'Questão não encontrada.' });
      }

      const alternativaEscolhida = questao.alternativas.find(a => a.cod === parseInt(alternativa_cod));
      if (!alternativaEscolhida) {
        await t.rollback();
        return res.status(404).json({ error: 'Alternativa informada não pertence a esta questão.' });
      }

      // Verifica se a questão JÁ FOI respondida pelo usuário em qualquer atividade (Globalmente)
      const jaRespondidaGlobal = await db.Atividade_questoes.count({
        include: [{
          model: db.Atividade,
          as: 'atividade',
          where: { usuario_cod }
        }],
        where: {
          questao_cod: cod,
          alternativa_selecionada_cod: { [db.Sequelize.Op.ne]: null }
        },
        transaction: t
      }) > 0;

      // Localiza ou cria a atividade agregadora "Banco de Questões" para o usuário
      let atividadeBanco = await db.Atividade.findOne({
        where: {
          usuario_cod,
          nome: 'Banco de Questões',
          tipo: 'lista'
        },
        transaction: t
      });

      if (!atividadeBanco) {
        atividadeBanco = await db.Atividade.create({
          usuario_cod,
          nome: 'Banco de Questões',
          descricao: 'Respostas registradas individualmente via Banco de Questões',
          disciplina_cod: questao.disciplina_cod,
          tipo: 'lista',
          status: 'em_andamento'
        }, { transaction: t });
      }

      // Vincula a resposta na tabela atividade_questoes
      let vinculo = await db.Atividade_questoes.findOne({
        where: {
          atividade_cod: atividadeBanco.cod,
          questao_cod: cod
        },
        transaction: t
      });

      if (vinculo) {
        vinculo.alternativa_selecionada_cod = alternativa_cod;
        await vinculo.save({ transaction: t });
      } else {
        await db.Atividade_questoes.create({
          atividade_cod: atividadeBanco.cod,
          questao_cod: cod,
          alternativa_selecionada_cod: alternativa_cod
        }, { transaction: t });
      }

      const respostaCorreta = Boolean(alternativaEscolhida.correta);

      // Atualiza as estatísticas gerais e por área APENAS se for a primeira resposta global
      if (!jaRespondidaGlobal) {
        let [estatisticasGerais] = await db.Usuario_estatisticas_gerais.findOrCreate({
          where: { usuario_cod },
          defaults: {
            total_questoes_respondidas: 0,
            total_acertos: 0,
            total_erros: 0,
            aproveitamento_geral: 0
          },
          transaction: t
        });

        let totalAcertos = estatisticasGerais.total_acertos;
        let totalErros = estatisticasGerais.total_erros;
        let totalRespondidas = estatisticasGerais.total_questoes_respondidas + 1;

        if (respostaCorreta) {
          totalAcertos += 1;
        } else {
          totalErros += 1;
        }

        const aproveitamento = totalRespondidas > 0 ? (totalAcertos / totalRespondidas) * 100 : 0;

        await db.Usuario_estatisticas_gerais.update({
          total_questoes_respondidas: totalRespondidas,
          total_acertos: totalAcertos,
          total_erros: totalErros,
          aproveitamento_geral: aproveitamento
        }, { where: { usuario_cod }, transaction: t });

        if (questao.disciplina_cod) {
          let [estatisticasArea] = await db.Usuario_estatisticas_por_area.findOrCreate({
            where: { usuario_cod, disciplina_cod: questao.disciplina_cod },
            defaults: {
              total_questoes_respondidas: 0,
              total_acertos: 0,
              total_erros: 0,
              aproveitamento_area: 0
            },
            transaction: t
          });

          let areaTotalAcertos = estatisticasArea.total_acertos;
          let areaTotalErros = estatisticasArea.total_erros;
          let areaTotalRespondidas = estatisticasArea.total_questoes_respondidas + 1;

          if (respostaCorreta) {
            areaTotalAcertos += 1;
          } else {
            areaTotalErros += 1;
          }

          const aproveitamentoArea = areaTotalRespondidas > 0 ? (areaTotalAcertos / areaTotalRespondidas) * 100 : 0;

          await db.Usuario_estatisticas_por_area.update({
            total_questoes_respondidas: areaTotalRespondidas,
            total_acertos: areaTotalAcertos,
            total_erros: areaTotalErros,
            aproveitamento_area: aproveitamentoArea
          }, { where: { usuario_cod, disciplina_cod: questao.disciplina_cod }, transaction: t });
        }
      }

      await t.commit();

      const alternativaCorretaObj = questao.alternativas.find(a => a.correta === true || a.correta === 1);

      return res.status(200).json({
        message: respostaCorreta ? 'Resposta correta!' : 'Resposta incorreta.',
        correta: respostaCorreta,
        alternativa_correta_cod: alternativaCorretaObj ? alternativaCorretaObj.cod : null,
        explicacao: questao.explicacao || null,
        ja_respondida_anteriormente: jaRespondidaGlobal
      });

    } catch (error) {
      await t.rollback();
      console.error('Erro ao responder questão no banco:', error);
      return res.status(500).json({ error: 'Erro interno ao registrar resposta da questão.' });
    }
  }

};

// Export default para exportar o valor principal do arquivo.
export default questaoController;