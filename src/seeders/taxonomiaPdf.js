import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import db from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const taxonomia = {
  "Língua Portuguesa": {
    "Compreensão e Análise Textual": [
      "Interpretação Direta e Inferência",
      "Identificação de Gêneros Textuais (Fábulas, Crônicas, Notícias, Poemas, Tirinhas)",
      "Ambiguidade e Efeitos de Sentido (Humor e Ironia)",
      "Intertextualidade e Paródia"
    ],
    "Morfologia e Sintaxe (Gramática Aplicada)": [
      "Conjunções e Valor Semântico (Causa, oposição, adição, etc.)",
      "Classes de Palavras (Substantivos, Adjetivos, Pronomes, Advérbios)",
      "Tempo, Modo e Flexão Verbal",
      "Função Sintática e Sujeito"
    ],
    "Estilística e Variação Linguística": [
      "Figuras de Linguagem (Metáfora, Personificação, Antítese, etc.)",
      "Variação Linguística (Nível Coloquial vs. Norma Culta, Gírias)",
      "Significação das Palavras (Sinônimos, Antônimos e Vocabulário)"
    ]
  },
  "Matemática": {
    "Aritmética e Matemática Básica": [
      "Operações Básicas e Expressões Numéricas",
      "Frações, Razão e Proporção",
      "Múltiplos, Divisores (MMC e MDC) e Padrões Numéricos"
    ],
    "Matemática Financeira e Estatística": [
      "Porcentagem e Descontos",
      "Leitura de Gráficos e Tabelas",
      "Média Aritmética"
    ],
    "Álgebra": [
      "Equações do 1º Grau e Problemas Algébricos",
      "Equações do 2º Grau (Báscara, Soma e Produto)"
    ],
    "Geometria e Medidas": [
      "Área e Perímetro de Figuras Planas",
      "Teorema de Pitágoras",
      "Conversão de Unidades (Tempo, Volume, Comprimento)",
      "Escalas Cartográficas e Plantas Baixas"
    ]
  },
  "Ciências da Natureza": {
    "Física": [
      "Cinemática (Cálculo de Velocidade Média e Tempo)",
      "Dinâmica (As Três Leis de Newton, Trabalho e Potência)",
      "Termodinâmica (Propagação de Calor, Temperatura e Escalas)"
    ],
    "Química": [
      "Transformações e Reações Químicas (Físicas vs. Químicas)",
      "Estrutura Atômica e Tabela Periódica",
      "Propriedades da Matéria (Densidade e Mudanças de Estado)"
    ],
    "Biologia": [
      "Saúde Pública e Doenças (Vírus, Bactérias, Vacinas, Métodos Contraceptivos)",
      "Ecologia (Fotossíntese, Cadeias Alimentares, Impactos Ambientais)",
      "Organização Celular (Diferenças Célula Animal/Vegetal, Organelas)",
      "Classificação dos Seres Vivos (Reinos)"
    ]
  },
  "Ciências Humanas": {
    "História do Brasil": [
      "Brasil Colônia (Sistema Escravista, Exploração, Ciclos Econômicos)",
      "República Velha e Movimentos Sociais (Contestado, Canudos)",
      "Era Vargas e Conquistas Trabalhistas",
      "Ditadura Militar"
    ],
    "História Geral": [
      "Revolução Industrial e Imperialismo (Partilha da África)",
      "Guerras Mundiais e Governos Totalitários (Nazismo, Fascismo)",
      "Guerra Fria",
      "Idade Moderna e Renascimento"
    ],
    "Geografia do Brasil e Santa Catarina": [
      "Biomas Brasileiros e Domínios Morfoclimáticos",
      "Climatologia e Massas de Ar",
      "Urbanização e Problemas Urbanos (Conurbação, Migrações)"
    ],
    "Geografia Mundial e Meio Ambiente": [
      "Globalização, Geopolítica e Blocos Econômicos",
      "Sustentabilidade e Fontes de Energia",
      "Demografia (Pirâmides Etárias e Crescimento Populacional)",
      "Cartografia e Placas Tectônicas"
    ]
  }
};

async function run() {
  console.log("Iniciando Seed de Taxonomia...");
  try {
    await db.sequelize.sync(); // Garante as tabelas (sem force)
    
    const t = await db.sequelize.transaction();
    
    try {
      // 1. Atualiza comprimento da coluna para suportar os nomes grandes
      console.log("Ajustando estrutura da tabela 'tema'...");
      await db.sequelize.query('ALTER TABLE "tema" ALTER COLUMN "descricao" TYPE VARCHAR(255);', { transaction: t });
      // A tabela subtema será criada já com 255 pelo sync se não existir, mas por precaução:
      await db.sequelize.query('ALTER TABLE "subtema" ALTER COLUMN "descricao" TYPE VARCHAR(255);', { transaction: t });
      
      // 2. Renomeia 'Português' para 'Língua Portuguesa'
      console.log("Renomeando disciplina 'Português' para 'Língua Portuguesa' (se necessário)...");
      await db.sequelize.query("UPDATE disciplina SET descricao = 'Língua Portuguesa' WHERE descricao = 'Português'", { transaction: t });

      let contagemTemas = 0;
      let contagemSubtemas = 0;

      for (const [nomeDisciplina, temasObj] of Object.entries(taxonomia)) {
        // Cria ou busca disciplina
        let [disciplina] = await db.Disciplina.findOrCreate({
          where: { descricao: nomeDisciplina },
          transaction: t
        });

        console.log(`[Disciplina] ${disciplina.descricao}`);

        for (const [nomeTema, subtemasArray] of Object.entries(temasObj)) {
          let [tema, temaCreated] = await db.Tema.findOrCreate({
            where: { descricao: nomeTema, disciplina_cod: disciplina.cod },
            transaction: t
          });
          
          if (temaCreated) contagemTemas++;

          for (const nomeSubtema of subtemasArray) {
            let [subtema, subtemaCreated] = await db.Subtema.findOrCreate({
              where: { descricao: nomeSubtema, tema_cod: tema.cod },
              transaction: t
            });
            
            if (subtemaCreated) contagemSubtemas++;
          }
        }
      }

      await t.commit();
      console.log(`Seed concluído com sucesso! Novos temas inseridos: ${contagemTemas}. Novos subtemas inseridos: ${contagemSubtemas}.`);
      process.exit(0);
    } catch (innerErr) {
      await t.rollback();
      throw innerErr;
    }
  } catch (err) {
    console.error("Erro ao rodar seed:", err);
    process.exit(1);
  }
}

run();
