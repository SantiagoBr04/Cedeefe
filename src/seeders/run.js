import db from '../models/index.js';

async function runSeeders() {
    try {
        console.log("Conectando ao banco de dados e sincronizando...");
        await db.sequelize.authenticate();
        // Garantindo que as tabelas existam sem deletar as existentes
        await db.sequelize.sync({ force: false });
        
        console.log("Inserindo disciplinas padrões...");
        const disciplinas = [
            'Português', 
            'Matemática', 
            'Ciências da Natureza', 
            'Ciências Humanas'
        ];
        
        for (const desc of disciplinas) {
            await db.Disciplina.findOrCreate({
                where: { descricao: desc }
            });
        }
        console.log("Disciplinas verificadas e inseridas com sucesso.");

        // Buscar a disciplina de matemática para associar as questões
        const matematica = await db.Disciplina.findOne({ 
            where: { descricao: 'Matemática' } 
        });
        
        if (!matematica) {
            throw new Error("Disciplina de Matemática não encontrada. Abortando seeder de questões.");
        }

        console.log("Inserindo 5 questões de Matemática com suas respectivas alternativas...");
        const questoesSeed = [
            {
                descricao: "Se João tem 5 maçãs e come 2, com quantas maçãs João fica?",
                autor: "Seeder Sistema",
                ano: 2024,
                explicacao: "Subtraindo 2 de 5, ficamos com 3 maçãs.",
                disciplina_cod: matematica.cod,
                alternativas: [
                    { texto: "2", correta: false },
                    { texto: "5", correta: false },
                    { texto: "3", correta: true },
                    { texto: "0", correta: false }
                ]
            },
            {
                descricao: "Qual é a raiz quadrada de 144?",
                autor: "Seeder Sistema",
                ano: 2024,
                explicacao: "A raiz quadrada de 144 é 12, pois 12 vezes 12 é 144.",
                disciplina_cod: matematica.cod,
                alternativas: [
                    { texto: "10", correta: false },
                    { texto: "14", correta: false },
                    { texto: "12", correta: true },
                    { texto: "16", correta: false }
                ]
            },
            {
                descricao: "Resolva a equação: 3x - 9 = 0",
                autor: "Seeder Sistema",
                ano: 2024,
                explicacao: "3x = 9, então x = 9 / 3, logo x = 3.",
                disciplina_cod: matematica.cod,
                alternativas: [
                    { texto: "x = 2", correta: false },
                    { texto: "x = 3", correta: true },
                    { texto: "x = -3", correta: false },
                    { texto: "x = 9", correta: false },
                    { texto: "x = 0", correta: false }
                ]
            },
            {
                descricao: "Um triângulo retângulo possui catetos medindo 3 e 4. Qual o valor da hipotenusa?",
                autor: "Seeder Sistema",
                ano: 2024,
                explicacao: "Pelo Teorema de Pitágoras: a² = b² + c², então a² = 3² + 4² = 9 + 16 = 25. A raiz de 25 é 5.",
                disciplina_cod: matematica.cod,
                alternativas: [
                    { texto: "5", correta: true },
                    { texto: "7", correta: false },
                    { texto: "6", correta: false },
                    { texto: "25", correta: false }
                ]
            },
            {
                descricao: "Quantos graus tem a soma dos ângulos internos de um triângulo qualquer?",
                autor: "Seeder Sistema",
                ano: 2024,
                explicacao: "A soma dos ângulos internos de qualquer triângulo na geometria euclidiana é sempre 180°.",
                disciplina_cod: matematica.cod,
                alternativas: [
                    { texto: "90°", correta: false },
                    { texto: "360°", correta: false },
                    { texto: "180°", correta: true },
                    { texto: "270°", correta: false }
                ]
            }
        ];

        let questoesInseridas = 0;

        for (const q of questoesSeed) {
            // Usando findOrCreate para não recriar a questão caso o seeder rode múltiplas vezes
            const [questaoCriada, created] = await db.Questao.findOrCreate({
                where: { descricao: q.descricao },
                defaults: {
                    autor: q.autor,
                    ano: q.ano,
                    explicacao: q.explicacao,
                    disciplina_cod: q.disciplina_cod
                }
            });

            if (created) {
                questoesInseridas++;
                // Inserindo as alternativas da questão criada
                for (const alt of q.alternativas) {
                    await db.Alternativa.create({
                        questao_cod: questaoCriada.cod,
                        texto: alt.texto,
                        correta: alt.correta
                    });
                }
            }
        }
        
        console.log(`Questões inseridas com sucesso: ${questoesInseridas}. (Ignoradas as que já existiam)`);
        console.log("Todos os seeders foram executados com sucesso!");
        process.exit(0);

    } catch (error) {
        console.error("Erro fatal ao rodar os seeders:", error);
        process.exit(1);
    }
}

runSeeders();
