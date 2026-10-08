import db from '../models/index.js';

class TaxonomiaService {
    /**
     * Retorna a árvore completa de taxonomia do banco de dados
     * Estrutura: [{ cod, descricao, temas: [{ cod, descricao, subtemas: [{ cod, descricao }] }] }]
     */
    async obterArvore() {
        const disciplinas = await db.Disciplina.findAll({
            include: [
                {
                    model: db.Tema,
                    as: 'disciplinas_temas',
                    include: [
                        {
                            model: db.Subtema,
                            as: 'subtemas'
                        }
                    ]
                }
            ],
            order: [
                ['descricao', 'ASC'],
                [{ model: db.Tema, as: 'disciplinas_temas' }, 'descricao', 'ASC'],
                [{ model: db.Tema, as: 'disciplinas_temas' }, { model: db.Subtema, as: 'subtemas' }, 'descricao', 'ASC']
            ]
        });

        // Converte para JSON puro e renomeia disciplinas_temas para temas para o restante do código
        return disciplinas.map(d => {
            const json = d.toJSON();
            json.temas = json.disciplinas_temas || [];
            delete json.disciplinas_temas;
            return json;
        });
    }

    /**
     * Normaliza um texto para comparação:
     * - Remove acentos
     * - Converte para minúsculas
     * - Remove pontuação (mantém apenas letras e números)
     * - Remove espaços em branco extras
     */
    normalizarTexto(texto) {
        if (!texto) return '';
        return String(texto)
            .normalize('NFD') // Decompõe os caracteres acentuados
            .replace(/[\u0300-\u036f]/g, '') // Remove as marcas de acento
            .toLowerCase()
            .replace(/[^\w\s]/g, '') // Remove pontuação
            .replace(/\s+/g, ' ') // Substitui múltiplos espaços por um
            .trim();
    }

    /**
     * Verifica se dois textos normalizados têm match por inclusão
     */
    temMatch(textoA, textoB) {
        if (!textoA || !textoB) return false;
        const normA = this.normalizarTexto(textoA);
        const normB = this.normalizarTexto(textoB);
        return normA.includes(normB) || normB.includes(normA);
    }

    /**
     * Tenta inferir a disciplina com base em palavras-chave
     */
    inferirDisciplina(textoSugestao, arvore) {
        if (!textoSugestao) return null;
        const sugClean = this.normalizarTexto(textoSugestao);

        let categoriaAlvo = null;
        if (/quimica|fisica|biologia|natureza/.test(sugClean)) {
            categoriaAlvo = 'ciencias da natureza';
        } else if (/historia|geografia|filosofia|sociologia|humanas/.test(sugClean)) {
            categoriaAlvo = 'ciencias humanas';
        } else if (/portugues|gramatica|literatura|redacao/.test(sugClean)) {
            categoriaAlvo = 'lingua portuguesa';
        } else if (/matematica|geometria|algebra|raciocinio/.test(sugClean)) {
            categoriaAlvo = 'matematica';
        }

        if (categoriaAlvo) {
            const discMapeada = arvore.find(d => this.temMatch(d.descricao || d.nome, categoriaAlvo));
            if (discMapeada) return discMapeada.cod;
        }

        const discDireta = arvore.find(d => this.temMatch(d.descricao || d.nome, sugClean));
        return discDireta ? discDireta.cod : null;
    }

    /**
     * Resolve as sugestões da IA (disciplina, tema, subtemas) para códigos do banco.
     * Retorna um objeto com os códigos (ou null se não encontrar).
     */
    resolverSugestoes(questao, arvore) {
        const resultado = {
            disciplina_cod: null,
            tema_cod: null,
            subtemas_cods: []
        };

        const sugestaoDiscStr = typeof questao.disciplina_sugerida === 'string'
            ? questao.disciplina_sugerida
            : (questao.disciplina_sugerida?.nome || questao.disciplina_sugerida?.descricao || '');

        const sugestaoTemaStr = questao.tema_sugerido || questao.tema_maior_sugerido || '';
        const sugestaoSubtemasArr = Array.isArray(questao.subtemas_sugeridos) ? questao.subtemas_sugeridos : [];

        // 1. Tenta identificar a disciplina primeiro (como dica principal)
        if (sugestaoDiscStr) {
            resultado.disciplina_cod = this.inferirDisciplina(sugestaoDiscStr, arvore);
        }

        // 2. Tenta achar o tema sugerido (buscando em todas as disciplinas ou só na sugerida)
        let temaEncontrado = null;
        if (sugestaoTemaStr) {
            const normTemaSug = this.normalizarTexto(sugestaoTemaStr);
            
            // Busca o tema em todas as disciplinas (dá prioridade à disciplina sugerida se existir)
            for (const disc of arvore) {
                if (resultado.disciplina_cod && disc.cod !== resultado.disciplina_cod) continue;
                
                // Tenta match exato primeiro
                let match = disc.temas?.find(t => this.normalizarTexto(t.descricao) === normTemaSug);
                
                // Se não achar exato, tenta parcial
                if (!match) {
                    match = disc.temas?.find(t => this.temMatch(t.descricao, normTemaSug));
                }

                if (match) {
                    temaEncontrado = { tema: match, disciplina_cod: disc.cod };
                    break; // Pega o primeiro que der match
                }
            }

            // Se ainda não achou, tenta em todas as disciplinas sem restringir (caso a disciplina sugerida esteja errada)
            if (!temaEncontrado && resultado.disciplina_cod) {
                for (const disc of arvore) {
                    if (disc.cod === resultado.disciplina_cod) continue; // Já verificou
                    const match = disc.temas?.find(t => this.temMatch(t.descricao, normTemaSug));
                    if (match) {
                        temaEncontrado = { tema: match, disciplina_cod: disc.cod };
                        break;
                    }
                }
            }
        }

        // 3. Se achou o tema, atualiza disciplina (o tema é mais específico) e busca os subtemas nele
        if (temaEncontrado) {
            resultado.disciplina_cod = temaEncontrado.disciplina_cod;
            resultado.tema_cod = temaEncontrado.tema.cod;

            if (sugestaoSubtemasArr.length > 0) {
                for (const subStr of sugestaoSubtemasArr) {
                    const match = temaEncontrado.tema.subtemas?.find(s => this.temMatch(s.descricao, subStr));
                    if (match && resultado.subtemas_cods.length < 2) {
                        resultado.subtemas_cods.push(match.cod);
                    }
                }
            }
        } 
        // 4. Se NÃO achou o tema, mas temos subtemas sugeridos, tenta achar o subtema na árvore toda para inferir o tema
        else if (sugestaoSubtemasArr.length > 0) {
            let subtemaEncontrado = null;
            
            for (const disc of arvore) {
                if (subtemaEncontrado) break;
                if (resultado.disciplina_cod && disc.cod !== resultado.disciplina_cod) continue;

                for (const tema of disc.temas || []) {
                    if (subtemaEncontrado) break;
                    
                    for (const subStr of sugestaoSubtemasArr) {
                        const match = tema.subtemas?.find(s => this.temMatch(s.descricao, subStr));
                        if (match) {
                            subtemaEncontrado = {
                                subtema: match,
                                tema_cod: tema.cod,
                                disciplina_cod: disc.cod
                            };
                            break;
                        }
                    }
                }
            }

            // Repete a busca em toda a árvore se não achou na disciplina sugerida
            if (!subtemaEncontrado && resultado.disciplina_cod) {
                 for (const disc of arvore) {
                    if (subtemaEncontrado) break;
                    if (disc.cod === resultado.disciplina_cod) continue;
                    
                    for (const tema of disc.temas || []) {
                        if (subtemaEncontrado) break;
                        for (const subStr of sugestaoSubtemasArr) {
                            const match = tema.subtemas?.find(s => this.temMatch(s.descricao, subStr));
                            if (match) {
                                subtemaEncontrado = { subtema: match, tema_cod: tema.cod, disciplina_cod: disc.cod };
                                break;
                            }
                        }
                    }
                 }
            }

            if (subtemaEncontrado) {
                resultado.disciplina_cod = subtemaEncontrado.disciplina_cod;
                resultado.tema_cod = subtemaEncontrado.tema_cod;
                resultado.subtemas_cods.push(subtemaEncontrado.subtema.cod);
                
                // Tenta achar o segundo subtema no mesmo tema
                if (sugestaoSubtemasArr.length > 1) {
                    const temaObj = arvore.find(d => d.cod === resultado.disciplina_cod)?.temas?.find(t => t.cod === resultado.tema_cod);
                    if (temaObj) {
                        for (const subStr of sugestaoSubtemasArr) {
                            if (this.temMatch(subtemaEncontrado.subtema.descricao, subStr)) continue; // Pula o que já achou
                            const match2 = temaObj.subtemas?.find(s => this.temMatch(s.descricao, subStr));
                            if (match2 && !resultado.subtemas_cods.includes(match2.cod) && resultado.subtemas_cods.length < 2) {
                                resultado.subtemas_cods.push(match2.cod);
                            }
                        }
                    }
                }
            }
        }

        return resultado;
    }
}

export default new TaxonomiaService();
