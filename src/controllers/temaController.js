import db from '../models/index.js';

// Lista todos os temas vinculados a uma respectiva disciplina
export const getTemasPorDisciplina = async (req, res) => {
    try {
        const { disciplina_cod } = req.params;
        
        const temas = await db.Tema.findAll({
            where: { disciplina_cod }
        });
        
        res.status(200).json(temas);
    } catch (error) {
        console.error("Erro em getTemasPorDisciplina:", error);
        res.status(500).json({ error: 'Erro ao buscar temas.', detalhes: error.message });
    }
};

// Cria um novo tema (Apenas Admin)
export const criarTema = async (req, res) => {
    try {
        const { descricao, disciplina_cod } = req.body;

        if (!descricao || !disciplina_cod) {
            return res.status(400).json({ error: 'A descrição e o código da disciplina são obrigatórios.' });
        }

        // Verifica se a disciplina informada existe antes de inserir o tema
        const disciplinaExists = await db.Disciplina.findByPk(disciplina_cod);
        if (!disciplinaExists) {
            return res.status(404).json({ error: 'Disciplina informada não foi encontrada.' });
        }

        // Verifica se o tema já existe na mesma disciplina para evitar temas repetidos
        const temaExistente = await db.Tema.findOne({
            where: {
                descricao,
                disciplina_cod
            }
        });

        if (temaExistente) {
            return res.status(409).json({ error: 'Já existe um tema com esse nome nesta disciplina.' });
        }

        const novoTema = await db.Tema.create({ 
            descricao, 
            disciplina_cod 
        });
        
        res.status(201).json({ message: 'Tema adicionado com sucesso!', tema: novoTema });
    } catch (error) {
        console.error("Erro em criarTema:", error);
        res.status(500).json({ error: 'Erro ao criar o tema.', detalhes: error.message });
    }
};

// Edita um tema existente (Apenas Admin)
export const editarTema = async (req, res) => {
    try {
        const { cod } = req.params;
        const { descricao, disciplina_cod } = req.body;

        const tema = await db.Tema.findByPk(cod);
        if (!tema) {
            return res.status(404).json({ error: 'Tema não encontrado.' });
        }

        // Se o admin estiver tentando alterar a disciplina vinculada a este tema
        if (disciplina_cod && disciplina_cod !== tema.disciplina_cod) {
            const disciplinaExists = await db.Disciplina.findByPk(disciplina_cod);
            if (!disciplinaExists) {
                return res.status(404).json({ error: 'Nova disciplina informada não foi encontrada.' });
            }
        }

        // Define quais serão os valores finais após a edição para chegarmos a uma possível duplicata
        const novaDescricao = descricao || tema.descricao;
        const novaDisciplinaCod = disciplina_cod || tema.disciplina_cod;

        // Verifica se a mudança causaria duplicata (mesmo nome na mesma disciplina) em outro registro
        const temaDuplicado = await db.Tema.findOne({
            where: {
                descricao: novaDescricao,
                disciplina_cod: novaDisciplinaCod
            }
        });

        // Se encontrou um nome igual, e o ID é diferente do tema atual, então é duplicata
        if (temaDuplicado && temaDuplicado.cod !== parseInt(cod)) {
            return res.status(409).json({ error: 'Já existe outro tema com este nome nesta disciplina.' });
        }

        await tema.update({
            descricao: novaDescricao,
            disciplina_cod: novaDisciplinaCod
        });

        res.status(200).json({ message: 'Tema atualizado com sucesso!', tema });
    } catch (error) {
        console.error("Erro em editarTema:", error);
        res.status(500).json({ error: 'Erro ao atualizar o tema.', detalhes: error.message });
    }
};

// Exclui um tema (Apenas Admin)
export const excluirTema = async (req, res) => {
    try {
        const { cod } = req.params;

        const tema = await db.Tema.findByPk(cod);
        if (!tema) {
            return res.status(404).json({ error: 'Tema não encontrado.' });
        }

        await tema.destroy();
        
        res.status(200).json({ message: 'Tema excluído com sucesso.' });
    } catch (error) {
        console.error("Erro em excluirTema:", error);
        res.status(500).json({ error: 'Erro ao excluir o tema.', detalhes: error.message });
    }
};