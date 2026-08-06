import db from '../models/index.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import geminiPdfService from '../services/geminiPdfService.js';

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
    let nomeArquivoImagem = null;
    if (req.file) {
      nomeArquivoImagem = req.file.filename; // Pega o nome gerado pelo Multer
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
        // Aqui usamos o nome do arquivo capturado lá em cima no passo 1
        // Se não tiver imagem, mantemos null ou usamos o que veio no body (caso seja um link externo)
        imagem_url: nomeArquivoImagem || req.body.imagem_url || null 
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

      // Se tiver imagem, apagamos o arquivo físico
      if (questao.imagem_url) {
        // Monta o caminho completo: Pasta do projeto + uploads + nome da imagem
        const caminhoArquivo = path.resolve('uploads', questao.imagem_url);
        
        // Função do Node que deleta arquivos
        fs.unlink(caminhoArquivo, (erro) => {
            if (erro) {
                // Se der erro ao apagar a imagem (ex: arquivo já não existia), 
                // apenas logamos o aviso, mas não paramos o processo.
                console.error("Erro ao apagar imagem física:", erro);
            } else {
                console.log("Imagem física apagada com sucesso!");
            }
        });
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

      const imagem_url = `/imagens/${req.file.filename}`;
      return res.status(200).json({
        message: 'Imagem enviada com sucesso.',
        imagem_url
      });
    } catch (error) {
      console.error('Erro ao realizar upload de imagem da questão:', error);
      return res.status(500).json({ error: 'Erro ao salvar a imagem no servidor.' });
    }
  }

};

// Export default para exportar o valor principal do arquivo.
export default questaoController;