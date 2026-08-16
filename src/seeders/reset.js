import db from '../models/index.js';

async function resetDatabase() {
    try {
        console.log("⚠️ REINICIANDO E RECRIANDO BANCO DE DADOS COMPLETO...");
        await db.sequelize.authenticate();

        // DELETA todas as tabelas e recria a estrutura do zero
        await db.sequelize.sync({ force: true });
        console.log("✅ Todas as tabelas foram deletadas e recriadas com sucesso!");

        // Ajusta tipos de colunas de texto longo
        try {
            await db.sequelize.query('ALTER TABLE "questoes" ALTER COLUMN "descricao" TYPE TEXT;');
            await db.sequelize.query('ALTER TABLE "questoes" ALTER COLUMN "explicacao" TYPE TEXT;');
            await db.sequelize.query('ALTER TABLE "alternativas" ALTER COLUMN "texto" TYPE TEXT;');
            await db.sequelize.query('ALTER TABLE "usuario" ALTER COLUMN "nome_completo" DROP NOT NULL;');
            await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "email_verificado" BOOLEAN DEFAULT false;');
            await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "token_verificacao" VARCHAR(255);');
            await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "token_verificacao_expiracao" TIMESTAMP WITH TIME ZONE;');
            await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "token_recuperacao" VARCHAR(255);');
            await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "token_recuperacao_expiracao" TIMESTAMP WITH TIME ZONE;');
        } catch (eAlter) {
            console.warn("Aviso na atualização de colunas:", eAlter.message);
        }

        console.log("Inserindo disciplinas padrão...");
        const disciplinas = ['Português', 'Matemática', 'Ciências da Natureza', 'Ciências Humanas'];
        for (const desc of disciplinas) {
            await db.Disciplina.findOrCreate({ where: { descricao: desc } });
        }

        console.log("\n==================================================");
        console.log("🎉 BANCO DE DADOS RECRIADO E LIMPO COM SUCESSO!");
        console.log("==================================================\n");
        process.exit(0);

    } catch (error) {
        console.error("❌ Erro ao recriar banco de dados:", error);
        process.exit(1);
    }
}

resetDatabase();
