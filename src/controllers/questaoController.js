import db from '../models/index.js';
import fs from 'fs';
import path from 'path';

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
  }

};

// Export default para exportar o valor principal do arquivo.
export default questaoController;