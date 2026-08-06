import { GoogleGenAI } from '@google/genai';
import fs from 'fs';

/**
 * Módulo de serviço para integração nativa com a API do Google Gemini
 * responsável por realizar o parsing estruturado de PDFs de provas e gabaritos.
 */
class GeminiPdfService {
    /**
     * Inicializa a instância da SDK oficial do Gemini.
     */
    getAiClient() {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('A variável GEMINI_API_KEY não foi configurada no arquivo .env. Obtenha uma chave gratuita em https://aistudio.google.com/app/apikey');
        }
        return new GoogleGenAI({ apiKey });
    }

    /**
     * Converte um arquivo local em objeto inlineData (base64) para a API do Gemini.
     */
    fileToGenerativePart(filePath, mimeType) {
        const buffer = fs.readFileSync(filePath);
        console.log(`[ImportPDF Step 1] Arquivo lido (${filePath}): ${buffer.length} bytes.`);
        return {
            inlineData: {
                data: buffer.toString('base64'),
                mimeType
            }
        };
    }

    /**
     * Analisa o PDF da Prova e o PDF do Gabarito utilizando a API oficial do Google Gemini.
     */
    async analisarProvaEGabarito({ pdfProvaPath, pdfGabaritoPath, autorDefault, anoDefault }) {
        const ai = this.getAiClient();
        const startTime = Date.now();

        console.log('[ImportPDF Step 1] Iniciando conversão dos arquivos PDF para base64...');
        const partProva = this.fileToGenerativePart(pdfProvaPath, 'application/pdf');
        const partGabarito = this.fileToGenerativePart(pdfGabaritoPath, 'application/pdf');

        const promptText = `
Você é um assistente especialista em OCR, visão computacional e parsing estruturado de exames e provas de vestibular/concursos/técnicos.
Analise os dois documentos PDF fornecidos:
1. O primeiro documento é o PDF da PROVA (contendo questões, enunciados e opções A, B, C, D, E).
2. O segundo documento é o PDF do GABARITO OFICIAL (respostas por número de questão).

Instruções de Extração e Formatação:
- Extraia todas as questões objetivas contidas na prova.
- Para cada questão, identifique o número, o enunciado completo e todas as suas alternativas (A, B, C, D, E).
- Cruze o número de cada questão com a resposta correspondente no Gabarito Oficial para marcar exatamente UMA alternativa como "correta": true, e as demais como "correta": false.
- Caso haja imagens ou gráficos na questão, faça uma breve descrição no texto do enunciado entre colchetes se útil (ex: "[Gráfico de função do 1º grau]").
- IDENTIFICAÇÃO DA DISCIPLINA SUGERIDA: Identifique a matéria no campo "disciplina_sugerida". As disciplinas oficiais da plataforma são: "Português", "Matemática", "Ciências da Natureza" (para Química, Física e Biologia) e "Ciências Humanas" (para História, Geografia, Filosofia e Sociologia). Para exames específicos, você pode usar "Ciências da Natureza (Química)", "Ciências da Natureza (Física)", "Ciências da Natureza (Biologia)", "Ciências Humanas (História)", "Ciências Humanas (Geografia)", "Português" ou "Matemática".
- FÓRMULAS E EXPRESSÕES MATEMÁTICAS / LATEX: Em enunciados, alternativas e explicações, formate expressões matemáticas com clareza. Para multiplicação use '·' ou '\cdot', para frações use '(a/b)' ou '\frac{a}{b}', para expoentes/potências use tags HTML <sup>...</sup> ou 'x^2' (ex: "5<sup>2</sup>", "x<sup>2</sup>", "10<sup>3</sup>"), para índices/subscritos use <sub>...</sub> ou 'x_1' (ex: "H<sub>2</sub>O", "x<sub>1</sub>") e para símbolos use símbolos legíveis (±, ≤, ≥, ≠, √, π, °).
- FORMATAÇÃO DO ENUNCIADO E FONTES: Formate o texto do enunciado preservando destaques da prova original. Fontes, citações, trechos de livros, poemas ou referências no enunciado DEVEM vir formatadas com tags HTML adequadas, utilizando <i>...</i> para itálico e <b>...</b> para negrito se necessário (ex: "<i>(Fonte: IFC, Prova 2024, adaptado)</i>").
- SEPARAÇÃO DE POEMAS: Ao transcrever poemas no enunciado, separe os versos/linhas utilizando a barra '/' com espaço (ex: "No meio do caminho tinha uma pedra / Tinha uma pedra no meio do caminho").
- TEXTOS COMPARTILHADOS: Quando um texto, poema, tirinha, fábula ou enunciado servir de base para MAIS DE UMA QUESTÃO (ex: "Texto para as questões 1 e 2"), INCLUA O TEXTO COMPLETO no enunciado DE CADA UMA das questões que o utilizam, para que todas as questões fiquem autossuficientes.
- EXPLICAÇÃO E GABARITO COMENTADO: Em cada questão, forneça OBRIGATORIAMENTE uma explicação breve e estruturada no campo "explicacao". DEVE ser iniciado obrigatoriamente com o aviso: "🤖 [Visão da Inteligência Artificial (IA)]", seguido da estrutura dividida nos seguintes passos (usando quebras de linha):
  🤖 [Visão da Inteligência Artificial (IA)]
  1. O que a pergunta pede: ...
  2. Conhecimentos necessários: ...
  3. Interpretação das informações e construção da resposta: ...
  4. Resolução: ...

Retorne a resposta EXCLUSIVAMENTE em formato JSON válido (array de objetos), sem markdown ou texto explicativo extra:
[
  {
    "numero": 1,
    "enunciado": "Texto completo do enunciado com <i>fontes e destaques</i> em HTML...",
    "disciplina_sugerida": "Língua Portuguesa",
    "alternativas": [
      { "letra": "A", "texto": "Texto da alternativa A", "correta": false },
      { "letra": "B", "texto": "Texto da alternativa B", "correta": true },
      { "letra": "C", "texto": "Texto da alternativa C", "correta": false },
      { "letra": "D", "texto": "Texto da alternativa D", "correta": false }
    ],
    "explicacao": "🤖 [Visão da Inteligência Artificial (IA)]\\n\\n1. O que a pergunta pede: ...\\n2. Conhecimentos necessários: ...\\n3. Interpretação das informações e construção da resposta: ...\\n4. Resolução: ..."
  }
]
`;

        const tentarModelo = async (modelName) => {
            console.log(`[ImportPDF Step 2] Enviando payload ao Google Gemini (Modelo: ${modelName})...`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: [partProva, partGabarito, promptText],
                config: {
                    responseMimeType: 'application/json'
                }
            });
            return response.text;
        };

        let responseText = '';
        try {
            responseText = await tentarModelo('gemini-3.6-flash');
        } catch (errPrimario) {
            console.warn('[ImportPDF Step 2] Aviso: Falha no gemini-3.6-flash, tentando fallback gemini-1.5-flash:', errPrimario.message);
            try {
                responseText = await tentarModelo('gemini-1.5-flash');
            } catch (errSecundario) {
                console.error('[ImportPDF Step 2] Erro fatal nos modelos Gemini:', errSecundario);
                throw errPrimario;
            }
        }

        const elapsedTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`[ImportPDF Step 3] Resposta da IA recebida em ${elapsedTime}s. Tamanho da resposta: ${responseText ? responseText.length : 0} caracteres.`);

        if (!responseText) {
            throw new Error('A API do Google Gemini retornou uma resposta vazia.');
        }

        // Step 4: Sanitização do conteúdo JSON retornado
        console.log('[ImportPDF Step 4] Sanitizando e parseando resposta JSON da IA...');
        let jsonCleaned = responseText.trim();
        if (jsonCleaned.startsWith('```json')) {
            jsonCleaned = jsonCleaned.replace(/^```json/, '').replace(/```$/, '').trim();
        } else if (jsonCleaned.startsWith('```')) {
            jsonCleaned = jsonCleaned.replace(/^```/, '').replace(/```$/, '').trim();
        }

        const firstBracket = jsonCleaned.indexOf('[');
        const lastBracket = jsonCleaned.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
            jsonCleaned = jsonCleaned.substring(firstBracket, lastBracket + 1);
        }

        let rawParsed;
        try {
            rawParsed = JSON.parse(jsonCleaned);
        } catch (jsonErr) {
            console.error('[ImportPDF Step 4] Erro ao parsear JSON do Gemini. Conteúdo recebido:', responseText.substring(0, 500));
            throw new Error(`O Gemini não retornou um formato JSON válido: ${jsonErr.message}`);
        }

        let listaArray = Array.isArray(rawParsed)
            ? rawParsed
            : (rawParsed.questoes || rawParsed.data || rawParsed.items || rawParsed.questions || rawParsed.prova || rawParsed.exame || []);

        // Se ainda não encontrou array, procura qualquer propriedade que seja array
        if (!Array.isArray(listaArray) || listaArray.length === 0) {
            if (rawParsed && typeof rawParsed === 'object') {
                for (const value of Object.values(rawParsed)) {
                    if (Array.isArray(value) && value.length > 0) {
                        listaArray = value;
                        break;
                    }
                }
            }
        }

        if (!Array.isArray(listaArray) || listaArray.length === 0) {
            throw new Error('Nenhuma questão válida pôde ser identificada no formato retornado pelo Gemini.');
        }

        console.log(`[ImportPDF Step 5] Sucesso! ${listaArray.length} questões extraídas e estruturadas com sucesso.`);

        return listaArray.map((q, idx) => {
            const numQuestao = q.numero || q.num || (idx + 1);
            const enunciado = q.enunciado || q.questao || q.descricao || q.texto || `Questão ${numQuestao}`;
            const disciplina = typeof q.disciplina_sugerida === 'string'
                ? q.disciplina_sugerida
                : (q.disciplina_sugerida && typeof q.disciplina_sugerida === 'object' ? (q.disciplina_sugerida.nome || q.disciplina_sugerida.descricao || '') : null);
            const explicacao = q.explicacao || '';

            let alternativasBrutas = q.alternativas || q.opcoes || [];
            let alternativas = [];

            if (Array.isArray(alternativasBrutas)) {
                alternativas = alternativasBrutas.map((alt, aIdx) => {
                    if (typeof alt === 'string') {
                        return { texto: alt, correta: aIdx === 0 };
                    }
                    return {
                        texto: alt.texto || alt.opcao || alt.resposta || '',
                        correta: Boolean(alt.correta || alt.isCorreta || alt.gabarito)
                    };
                });
            } else if (alternativasBrutas && typeof alternativasBrutas === 'object') {
                // Suporte caso a IA retorne alternativas como objeto ex: { "A": "texto A", "B": "texto B" }
                alternativas = Object.entries(alternativasBrutas).map(([letra, alt], aIdx) => {
                    const texto = typeof alt === 'string' ? alt : (alt.texto || alt.opcao || '');
                    const correta = typeof alt === 'object' ? Boolean(alt.correta || alt.isCorreta) : (aIdx === 0);
                    return { texto, correta };
                });
            }

            return {
                numero: numQuestao,
                enunciado: enunciado,
                autor: autorDefault || 'IFC',
                ano: anoDefault ? parseInt(anoDefault, 10) : new Date().getFullYear(),
                disciplina_sugerida: disciplina,
                explicacao: explicacao,
                imagem_url: null,
                alternativas: alternativas
            };
        });
    }
}

export default new GeminiPdfService();
