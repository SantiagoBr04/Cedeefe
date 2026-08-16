import db from '../models/index.js';

// Controller para gerenciar o progresso do usuário nos roadmaps
const roadmapController = {
    // Retorna o progresso de todos os roadmaps do usuário (resumo por disciplina)
    async obterProgressoGeral(req, res) {
        try {
            const usuario_cod = req.userId;

            const todosItens = await db.Usuario_progresso_roadmap.findAll({
                where: {
                    usuario_cod,
                    concluido: true
                },
                attributes: ['roadmap_slug', 'topico_id']
            });

            const progressoGeral = {};
            todosItens.forEach(item => {
                if (!progressoGeral[item.roadmap_slug]) {
                    progressoGeral[item.roadmap_slug] = [];
                }
                progressoGeral[item.roadmap_slug].push(item.topico_id);
            });

            return res.status(200).json(progressoGeral);
        } catch (error) {
            console.error('Erro ao obter progresso geral dos roadmaps:', error);
            return res.status(500).json({ error: 'Erro interno ao carregar progresso dos roadmaps.' });
        }
    },

    // Retorna a lista de tópicos concluídos pelo usuário para uma determinada disciplina
    async obterProgresso(req, res) {
        try {
            const { disciplina } = req.params;
            const usuario_cod = req.userId;

            if (!disciplina) {
                return res.status(400).json({ error: 'Disciplina é obrigatória.' });
            }

            const itensConcluidos = await db.Usuario_progresso_roadmap.findAll({
                where: {
                    usuario_cod,
                    roadmap_slug: disciplina,
                    concluido: true
                },
                attributes: ['topico_id']
            });

            const topicosConcluidos = itensConcluidos.map(item => item.topico_id);

            return res.status(200).json({
                disciplina,
                progresso: topicosConcluidos
            });
        } catch (error) {
            console.error('Erro ao obter progresso do roadmap:', error);
            return res.status(500).json({ error: 'Erro interno ao carregar progresso do roadmap.' });
        }
    },

    // Salva ou atualiza a marcação de um tópico do roadmap
    async salvarProgresso(req, res) {
        try {
            const { disciplina } = req.params;
            const { topico_id, concluido } = req.body;
            const usuario_cod = req.userId;

            if (!disciplina || !topico_id || typeof concluido !== 'boolean') {
                return res.status(400).json({ error: 'Dados inválidos. Parâmetros disciplina, topico_id e concluido são obrigatórios.' });
            }

            // Upsert do progresso do tópico
            const [registro, created] = await db.Usuario_progresso_roadmap.findOrCreate({
                where: {
                    usuario_cod,
                    roadmap_slug: disciplina,
                    topico_id
                },
                defaults: {
                    concluido
                }
            });

            if (!created) {
                registro.concluido = concluido;
                await registro.save();
            }

            return res.status(200).json({
                message: 'Progresso do roadmap atualizado com sucesso!',
                topico_id,
                concluido
            });
        } catch (error) {
            console.error('Erro ao salvar progresso do roadmap:', error);
            return res.status(500).json({ error: 'Erro interno ao salvar progresso do roadmap.' });
        }
    }
};

export default roadmapController;
