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
     * Monta o prompt dinamicamente usando a árvore de taxonomia
     */
    montarPrompt(arvore) {
        let taxonomiaTexto = '### TAXONOMIA OFICIAL\n';
        for (const disc of arvore) {
            taxonomiaTexto += `\n#### ${disc.descricao || disc.nome}\n`;
            if (disc.temas && disc.temas.length > 0) {
                for (const tema of disc.temas) {
                    taxonomiaTexto += `- Tema: ${tema.descricao}\n`;
                    if (tema.subtemas && tema.subtemas.length > 0) {
                        for (const sub of tema.subtemas) {
                            taxonomiaTexto += `  - ${sub.descricao}\n`;
                        }
                    }
                }
            }
        }

        return `Você é um assistente especialista em OCR, visão computacional e parsing estruturado de exames e provas de vestibular/concursos/técnicos.
Você receberá anexados os arquivos da avaliação. Se estiver usando a plataforma, anexaremos dois PDFs:
1. O primeiro documento é o PDF da PROVA (contendo questões, enunciados e opções A, B, C, D, E).
2. O segundo documento é o PDF do GABARITO OFICIAL (respostas por número de questão).

Instruções de Extração e Formatação:
- Extraia todas as questões objetivas contidas na prova.
- Para cada questão, identifique o número, o enunciado completo e todas as suas alternativas.
- IDENTIFICAÇÃO DA DISCIPLINA, TEMA E SUBTEMAS: Use EXATAMENTE os nomes da taxonomia abaixo. Se não encontrar uma correspondência adequada, deixe o tema e os subtemas nulos. 
  - O \`tema_sugerido\` deve pertencer à \`disciplina_sugerida\`.
  - A lista \`subtemas_sugeridos\` deve conter de 1 a 2 itens, obrigatoriamente filhos do tema escolhido.

${taxonomiaTexto}

- FÓRMULAS E EXPRESSÕES MATEMÁTICAS / LATEX: Em enunciados, alternativas e explicações, formate expressões matemáticas com clareza. Para multiplicação use '·' ou '\\cdot', para frações use '(a/b)' ou '\\frac{a}{b}', para expoentes/potências use tags HTML <sup>...</sup> ou 'x^2' (ex: "5<sup>2</sup>", "x<sup>2</sup>", "10<sup>3</sup>"), para índices/subscritos use <sub>...</sub> ou 'x_1' (ex: "H<sub>2</sub>O", "x<sub>1</sub>") e para símbolos use símbolos legíveis (±, ≤, ≥, ≠, √, π, °).
- FORMATAÇÃO DO ENUNCIADO E FONTES: Formate o texto do enunciado preservando destaques da prova original. Fontes, citações, trechos de livros, poemas ou referências no enunciado DEVEM vir formatadas com tags HTML adequadas, utilizando <i>...</i> para itálico e <b>...</b> para negrito se necessário (ex: "<i>(Fonte: IFC, Prova 2024, adaptado)</i>").
- SEPARAÇÃO DE POEMAS: Ao transcrever poemas no enunciado, separe os versos/linhas utilizando a barra '/' com espaço.
- TEXTOS COMPARTILHADOS: Quando um texto, poema, tirinha, fábula ou enunciado servir de base para MAIS DE UMA QUESTÃO (ex: "Texto para as questões 1 e 2"), INCLUA O TEXTO COMPLETO no enunciado DE CADA UMA das questões que o utilizam, para que todas as questões fiquem autossuficientes.
- EXPLICAÇÃO E GABARITO COMENTADO: Em cada questão, forneça OBRIGATORIAMENTE uma explicação breve e estruturada no campo "explicacao". DEVE ser iniciado obrigatoriamente com o aviso: "🤖 [Visão da Inteligência Artificial (IA)]", seguido da estrutura usando quebras de linha reais (\\n):
🤖 [Visão da Inteligência Artificial (IA)]
1. O que a pergunta pede: ...
2. Conhecimentos necessários: ...
3. Interpretação das informações e construção da resposta: ...
4. Resolução: ...

Responda SOMENTE com um bloco de código \`\`\`json contendo o seguinte formato exato, sem markdown extra ou explicações antes/depois. ATENÇÃO MÁXIMA: Revise a sintaxe do seu JSON antes de entregar. Certifique-se de que todas as chaves e valores estejam entre aspas duplas, separados corretamente por dois-pontos (:) e vírgulas (,), sem propriedades "soltas" ou aspas não fechadas:
\`\`\`json
{
  "questoes": [
    {
      "numero": 1,
      "enunciado": "Texto completo...",
      "disciplina_sugerida": "Língua Portuguesa",
      "tema_sugerido": "Compreensão e Análise Textual",
      "subtemas_sugeridos": ["Interpretação Direta e Inferência"],
      "gabarito": "B",
      "alternativas": [
        { "letra": "A", "texto": "Texto A", "correta": false },
        { "letra": "B", "texto": "Texto B", "correta": true }
      ],
      "explicacao": "🤖 [Visão da Inteligência Artificial (IA)]\\n1. O que a pergunta pede: ...\\n2. Conhecimentos necessários: ...\\n3. Interpretação: ...\\n4. Resolução: ..."
    }
  ]
}
\`\`\`
`;
    }

    /**
     * Extrai o JSON de uma string de texto qualquer
     */
    extrairJson(texto) {
        if (!texto) return null;
        let jsonCleaned = texto.trim();
        
        // Remove blocos de markdown ```json
        const matchRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
        const match = jsonCleaned.match(matchRegex);
        if (match && match[1]) {
            jsonCleaned = match[1].trim();
        } else if (jsonCleaned.startsWith('\`\`\`')) {
            jsonCleaned = jsonCleaned.replace(/^\`\`\`(json)?/, '').replace(/\`\`\`$/, '').trim();
        }

        // Se não conseguiu limpar com regex, tenta pegar a primeira { ou [
        if (!jsonCleaned.startsWith('{') && !jsonCleaned.startsWith('[')) {
            const firstBrace = jsonCleaned.indexOf('{');
            const firstBracket = jsonCleaned.indexOf('[');
            let startIdx = -1;
            if (firstBrace !== -1 && firstBracket !== -1) {
                startIdx = Math.min(firstBrace, firstBracket);
            } else {
                startIdx = Math.max(firstBrace, firstBracket);
            }
            
            if (startIdx !== -1) {
                jsonCleaned = jsonCleaned.substring(startIdx);
            }
        }
        
        if (!jsonCleaned.endsWith('}') && !jsonCleaned.endsWith(']')) {
            const lastBrace = jsonCleaned.lastIndexOf('}');
            const lastBracket = jsonCleaned.lastIndexOf(']');
            const endIdx = Math.max(lastBrace, lastBracket);
            
            if (endIdx !== -1) {
                jsonCleaned = jsonCleaned.substring(0, endIdx + 1);
            }
        }

        let rawParsed;
        try {
            rawParsed = JSON.parse(jsonCleaned);
        } catch (jsonErr) {
            console.error('[ImportPDF] Erro ao parsear JSON. Conteúdo:', texto.substring(0, 500));
            throw new Error(`O formato JSON recebido é inválido: ${jsonErr.message}`);
        }

        let listaArray = Array.isArray(rawParsed)
            ? rawParsed
            : (rawParsed.questoes || rawParsed.data || rawParsed.items || rawParsed.questions || rawParsed.prova || rawParsed.exame || []);

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
            throw new Error('Nenhuma questão válida pôde ser identificada no formato fornecido.');
        }

        return listaArray;
    }

    /**
     * Normaliza a lista de questões para o formato esperado pelo frontend/backend
     */
    normalizarQuestoes(listaArray, { autorDefault, anoDefault }) {
        return listaArray.map((q, idx) => {
            const numQuestao = q.numero || q.num || (idx + 1);
            const enunciado = q.enunciado || q.questao || q.descricao || q.texto || `Questão ${numQuestao}`;
            const disciplina = typeof q.disciplina_sugerida === 'string'
                ? q.disciplina_sugerida
                : (q.disciplina_sugerida && typeof q.disciplina_sugerida === 'object' ? (q.disciplina_sugerida.nome || q.disciplina_sugerida.descricao || '') : null);
            const explicacao = q.explicacao || '';

            // Tema e subtemas
            const temaSugerido = q.tema_sugerido || q.tema_maior_sugerido || null;
            let subtemasSugeridos = [];
            if (Array.isArray(q.subtemas_sugeridos)) {
                subtemasSugeridos = q.subtemas_sugeridos.filter(s => typeof s === 'string').slice(0, 2);
            }

            let alternativasBrutas = q.alternativas || q.opcoes || [];
            let alternativas = [];
            let gabarito = typeof q.gabarito === 'string' ? q.gabarito.trim().toUpperCase() : null;

            if (Array.isArray(alternativasBrutas)) {
                alternativas = alternativasBrutas.map((alt, aIdx) => {
                    if (typeof alt === 'string') {
                        return { texto: alt, correta: false }; // Será resolvida pelo gabarito
                    }
                    
                    let isCorreta = false;
                    if (alt.correta === true || alt.correta === 'true' || alt.correta === 1) isCorreta = true;
                    if (alt.isCorreta === true || alt.isCorreta === 'true' || alt.isCorreta === 1) isCorreta = true;
                    
                    const letra = (alt.letra || String.fromCharCode(65 + aIdx)).toUpperCase();
                    
                    return {
                        letra: letra,
                        texto: alt.texto || alt.opcao || alt.resposta || '',
                        correta: isCorreta
                    };
                });
            } else if (alternativasBrutas && typeof alternativasBrutas === 'object') {
                alternativas = Object.entries(alternativasBrutas).map(([letra, alt]) => {
                    const texto = typeof alt === 'string' ? alt : (alt.texto || alt.opcao || '');
                    let isCorreta = false;
                    if (typeof alt === 'object') {
                        if (alt.correta === true || alt.correta === 'true' || alt.correta === 1) isCorreta = true;
                        if (alt.isCorreta === true || alt.isCorreta === 'true' || alt.isCorreta === 1) isCorreta = true;
                    }
                    return { letra: letra.toUpperCase(), texto, correta: isCorreta };
                });
            }

            // Normaliza qual é a correta
            let corretaCount = alternativas.filter(a => a.correta).length;
            let avisoGabarito = false;
            
            // Se houver zero ou mais de uma correta, tentamos resolver usando a letra do gabarito
            if (corretaCount !== 1 && gabarito && alternativas.length > 0) {
                alternativas.forEach(a => a.correta = false); // Limpa tudo
                const altCorreta = alternativas.find(a => a.letra === gabarito) || alternativas[0];
                altCorreta.correta = true;
                corretaCount = 1;
            }

            // Se ainda não deu (não tinha gabarito informado, por exemplo), marca a primeira e avisa
            if (corretaCount !== 1 && alternativas.length > 0) {
                alternativas.forEach(a => a.correta = false);
                alternativas[0].correta = true;
                avisoGabarito = true;
            }

            return {
                numero: numQuestao,
                enunciado: enunciado,
                autor: autorDefault || 'IFC',
                ano: anoDefault ? parseInt(anoDefault, 10) : new Date().getFullYear(),
                disciplina_sugerida: disciplina,
                tema_sugerido: temaSugerido,
                subtemas_sugeridos: subtemasSugeridos,
                explicacao: explicacao,
                imagem_url: null,
                alternativas: alternativas.map(a => ({ texto: a.texto, correta: a.correta })), // Limpa a letra extra
                aviso_gabarito: avisoGabarito
            };
        });
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

        // Carrega taxonomia para compor o prompt
        const taxonomiaService = (await import('./taxonomiaService.js')).default;
        const arvoreTaxonomia = await taxonomiaService.obterArvore();
        const promptText = this.montarPrompt(arvoreTaxonomia);
        
        const schemaDisciplinas = arvoreTaxonomia.map(d => d.descricao || d.nome);

        // Schema JSON para o Gemini 2.x
        const responseSchema = {
            type: 'object',
            properties: {
                questoes: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            numero: { type: 'integer' },
                            enunciado: { type: 'string' },
                            disciplina_sugerida: { type: 'string', enum: schemaDisciplinas },
                            tema_sugerido: { type: 'string', nullable: true },
                            subtemas_sugeridos: { type: 'array', items: { type: 'string' } },
                            gabarito: { type: 'string', enum: ['A','B','C','D','E'] },
                            alternativas: { 
                                type: 'array', 
                                items: { 
                                    type: 'object',
                                    properties: { 
                                        letra: { type: 'string' }, 
                                        texto: { type: 'string' }, 
                                        correta: { type: 'boolean' } 
                                    },
                                    required: ['letra', 'texto', 'correta']
                                } 
                            },
                            explicacao: { type: 'string' }
                        },
                        required: ['numero', 'enunciado', 'disciplina_sugerida', 'alternativas', 'explicacao']
                    }
                }
            },
            required: ['questoes']
        };

        const tentarModelo = async (modelName) => {
            console.log(`[ImportPDF Step 2] Enviando payload ao Google Gemini (Modelo: ${modelName})...`);
            const response = await ai.models.generateContent({
                model: modelName,
                contents: [partProva, partGabarito, promptText],
                config: {
                    responseMimeType: 'application/json',
                    responseJsonSchema: responseSchema
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

        console.log('[ImportPDF Step 4] Sanitizando e parseando resposta JSON da IA...');
        const listaBruta = this.extrairJson(responseText);
        
        console.log('[ImportPDF Step 5] Normalizando questões...');
        const questoesNormalizadas = this.normalizarQuestoes(listaBruta, { autorDefault, anoDefault });

        console.log('[ImportPDF Step 6] Resolvendo sugestões de taxonomia...');
        for (const q of questoesNormalizadas) {
            const sugestoesCodigos = taxonomiaService.resolverSugestoes(q, arvoreTaxonomia);
            q.disciplina_cod = sugestoesCodigos.disciplina_cod;
            q.tema_cod = sugestoesCodigos.tema_cod;
            q.subtemas_cods = sugestoesCodigos.subtemas_cods;
        }

        console.log(`[ImportPDF Step 7] Sucesso! ${questoesNormalizadas.length} questões extraídas e estruturadas com sucesso.`);
        return questoesNormalizadas;
    }
}

export default new GeminiPdfService();