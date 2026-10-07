import db from './src/models/index.js';

async function checkQuestions() {
    try {
        const questoes = await db.Questao.findAll({
            order: [['cod', 'DESC']],
            limit: 3
        });

        for (const q of questoes) {
            console.log(`\n\n--- QUESTAO ${q.cod} ---`);
            console.log("imagem_url:", q.imagem_url);
            console.log("descricao:\n", q.descricao);
        }
    } catch (e) {
        console.error("Erro:", e);
    } finally {
        process.exit(0);
    }
}

checkQuestions();
