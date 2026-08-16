import db from '../models/index.js';
import bcrypt from 'bcryptjs';

async function seedPartiuIF() {
  try {
    console.log("Conectando ao banco de dados e gerando contas do seeder PartiuIF...");
    await db.sequelize.authenticate();

    // Gera o salt e a hash para a senha padrão "aluno01"
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('aluno01', salt);

    // Buscar todas as disciplinas cadastradas para associar estatísticas por área aos alunos
    const disciplinas = await db.Disciplina.findAll();

    let contasCriadas = 0;
    let contasJaExistentes = 0;

    for (let i = 1; i <= 40; i++) {
      const numeroFormatado = String(i).padStart(2, '0');
      const email = `aluno${numeroFormatado}@teste.com`;
      const nomeCompleto = `Aluno Teste ${numeroFormatado}`;

      // Tenta encontrar ou criar o usuário
      const [usuario, created] = await db.Usuario.findOrCreate({
        where: { login: email },
        defaults: {
          senha: hashedPassword,
          nome_completo: nomeCompleto,
          email_verificado: true,
          adm: false
        }
      });

      if (created) {
        contasCriadas++;

        // Inicializa as estatísticas gerais zeradas para o novo aluno
        await db.Usuario_estatisticas_gerais.findOrCreate({
          where: { usuario_cod: usuario.cod }
        });

        // Inicializa as estatísticas por área para cada disciplina
        if (disciplinas.length > 0) {
          const statsPorArea = disciplinas.map(disciplina => ({
            usuario_cod: usuario.cod,
            disciplina_cod: disciplina.cod,
            total_questoes_respondidas: 0,
            total_erros: 0,
            total_acertos: 0,
            aproveitamento_area: 0
          }));
          await db.Usuario_estatisticas_por_area.bulkCreate(statsPorArea, { ignoreDuplicates: true });
        }
      } else {
        contasJaExistentes++;
      }
    }

    console.log(`\n==================================================`);
    console.log(`✅ Seeder 'PartiuIF' concluído com sucesso!`);
    console.log(`📌 Novas contas criadas: ${contasCriadas}`);
    console.log(`📌 Contas já existentes mantidas: ${contasJaExistentes}`);
    console.log(`🔑 Login padrão: aluno01@teste.com ... aluno40@teste.com`);
    console.log(`🔒 Senha padrão: aluno01`);
    console.log(`==================================================\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao executar o seeder PartiuIF:", error);
    process.exit(1);
  }
}

seedPartiuIF();
