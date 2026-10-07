import db from '../models/index.js'; // Importa o db do Sequelize
import { Op } from 'sequelize'; // Importa operadores para comparações (necessário no update)
import bcrypt from 'bcryptjs'; // Para criptografia  
import jwt from 'jsonwebtoken'; // Para usar tokens
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto'; // Para geração de tokens randômicos seguros
import brevoService from '../services/brevoService.js'; // Serviço Brevo para envio de e-mails
import googleAuthService from '../services/googleAuthService.js'; // Serviço para verificação de tokens Google OAuth
import { cloudinary } from '../config/cloudinary.js';
// Cria o objeto userContoller
const userController = {

  // Método para registrar um novo usuário
  register: async (req, res) => {
    try {
      // Pega os dados do corpo da requisição (apenas email e senha no cadastro simplificado)
      const { email, password } = req.body;

      const login = email ? email.trim().toLowerCase() : '';
      const senha = password;

      // Validação básica (verificar se os dados obrigatórios de e-mail e senha vieram)
      if (!login || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      // Verificar se o email já existe no banco
      const existingUser = await db.Usuario.findOne({ where: { login: login } });

      if (existingUser) { // Se ja existe, da erro
        return res.status(409).json({ error: 'Este e-mail já está em uso.' });
      }

      // Criptografar a senha 
      const salt = await bcrypt.genSalt(10); // Gera um tempero para a senha
      const hashedPassword = await bcrypt.hash(senha, salt); // Criptografa

      // Gerar token seguro para verificação de e-mail (válido por 24h)
      const tokenVerificacao = crypto.randomBytes(32).toString('hex');
      const tokenExpiracao = new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Inserir o novo usuário no banco de dados com email_verificado: false
      const newUser = await db.Usuario.create({
        login,
        senha: hashedPassword,
        adm: false,
        email_verificado: false,
        token_verificacao: tokenVerificacao,
        token_verificacao_expiracao: tokenExpiracao
      });

      // Enviar e-mail de verificação via Brevo (assíncrono)
      await brevoService.sendVerificationEmail(login, 'Estudante', tokenVerificacao);

      // Inicializar as estatísticas do usuário (tudo zerado por padrão)
      await db.Usuario_estatisticas_gerais.create({
        usuario_cod: newUser.cod
      });

      // Inicializa as estatísticas por área para todas as disciplinas atuais
      const disciplinas = await db.Disciplina.findAll();
      if (disciplinas.length > 0) {
        const statsPorArea = disciplinas.map(disciplina => ({
          usuario_cod: newUser.cod,
          disciplina_cod: disciplina.cod,
          total_questoes_respondidas: 0,
          total_erros: 0,
          total_acertos: 0,
          aproveitamento_area: 0
        }));
        await db.Usuario_estatisticas_por_area.bulkCreate(statsPorArea);
      }

      // Enviar uma resposta de sucesso
      res.status(201).json({
        message: 'Usuário cadastrado com sucesso!',
        userId: newUser.cod // Sequelize retorna o objeto criado com o ID
      });

    } catch (error) {
      console.error('Erro no registro:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para fazer o login de um usuário
  login: async (req, res) => {
    try {
      // Pega as informações da corpo da requisição
      const { login, senha } = req.body;

      // Validação básica se veio o email e senha
      if (!login || !senha) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const loginNormalizado = login.trim().toLowerCase();

      // Buscar o usuário pelo e-mail no banco (normalizado em minúsculas)
      const user = await db.Usuario.findOne({ where: { login: loginNormalizado } });

      // Se não encontrar o usuário ou a senha está errada (não informar qual dos dois por segurança)
      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      // Comparar a senha enviada com a senha criptografada no banco
      const isPasswordCorrect = await bcrypt.compare(senha, user.senha);

      // Compara a senha pra ver se está certa
      if (!isPasswordCorrect) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      // Verificar se o e-mail do usuário já foi verificado
      if (!user.email_verificado) {
        return res.status(403).json({
          error: 'Seu e-mail ainda não foi verificado. Por favor, confira sua caixa de entrada e clique no link de ativação.',
          unverified: true,
          email: user.login
        });
      }

      // Se a senha estiver correta e e-mail verificado, gerar o token JWT
      const token = jwt.sign(
        { userId: user.cod, login: user.login }, // Informações que devem estar no token
        process.env.JWT_SECRET,             // Segredo para "assinar" o token
        { expiresIn: '8h' }                 // Tempo para o token expirar
      );

      // Enviar o token de volta para o cliente
      res.status(200).json({
        message: 'Login bem-sucedido!',
        token: token,
        user: { id: user.cod, email: user.login, adm: user.adm }
      });

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para pegar um usuário
  getProfile: async (req, res) => {
    try {
      // Pega os dados do usuário autenticado
      const user = await db.Usuario.findByPk(req.userId, {
        attributes: ['cod', 'login', 'nome_completo', 'data_nasc', 'motivo', 'escola', 'genero_cod', 'foto', 'adm'],
        include: [{
          model: db.Genero,
          as: 'genero',
          attributes: ['descricao']
        }]
      });

      // Compara se o cod existe (ele não pode ser igual a 0)
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Normaliza a resposta para o frontend
      res.status(200).json({
        cod: user.cod,
        login: user.login,
        nomeCompleto: user.nome_completo,
        dataNascimento: user.data_nasc,
        motivacao: user.motivo,
        escola: user.escola,
        genero: user.genero?.descricao || null,
        foto: user.foto || null,
        adm: user.adm
      });

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro ao buscar perfil:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para atualizar um perfil
  updateProfile: async (req, res) => {
    try {
      // Pega o ID do usuário do token (anexado pelo middleware)
      const { userId } = req; // Supondo que venha do middleware de auth

      // Pega os dados que o usuário pode querer alterar
      const { login, nomeCompleto, dataNascimento, genero, escola, motivacao, oldPassword, newPassword } = req.body;

      // Se nenhum dado foi enviado para atualização, retorna um erro.
      if (!login && !nomeCompleto && !dataNascimento && !genero && !escola && !motivacao && !oldPassword && !newPassword) {
        return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
      }

      // Lógica para atualizar os dados do perfil (LOGIN/EMAIL)
      if (login) {
        const loginNormalizado = login.trim().toLowerCase();
        // Verifica se o novo 'login' (email) já está sendo usado por outro usuário
        // Sequelize: Usa Op.ne (Not Equal) para verificar se ID é diferente
        const existingUser = await db.Usuario.findOne({
          where: {
            login: loginNormalizado,
            cod: { [Op.ne]: userId } // login igual E cod diferente do meu
          }
        });

        // Se o cod existir, vai ser maior que 1, portanto vai dar erro aqui
        if (existingUser) {
          return res.status(409).json({ error: 'Este e-mail já está em uso por outra conta.' });
        }

        // Atualiza o login no banco de dados
        await db.Usuario.update({ login: loginNormalizado }, { where: { cod: userId } });
      }

      const dadosAtualizacao = {};

      if (nomeCompleto) {
        dadosAtualizacao.nome_completo = nomeCompleto;
      }

      if (dataNascimento) {
        dadosAtualizacao.data_nasc = dataNascimento;
      }

      if (escola !== undefined) {
        dadosAtualizacao.escola = escola;
      }

      if (motivacao !== undefined) {
        dadosAtualizacao.motivo = motivacao;
      }

      if (genero) {
        const [generoRecord] = await db.Genero.findOrCreate({ where: { descricao: genero } });
        dadosAtualizacao.genero_cod = generoRecord.cod;
      }

      if (login && !oldPassword && !newPassword) {
        const usuarioAtual = await db.Usuario.findByPk(userId, { attributes: ['senha'] });
        if (!usuarioAtual) {
          return res.status(404).json({ error: 'Usuário não encontrado.' });
        }
      }

      if (Object.keys(dadosAtualizacao).length > 0) {
        await db.Usuario.update(dadosAtualizacao, { where: { cod: userId } });
      }

      // Lógia para atualizar a senha
      if (newPassword && oldPassword) {
        // Busca o usuário no banco para pegar a senha atual
        const user = await db.Usuario.findByPk(userId, { attributes: ['senha'] });

        // Compara a "senha antiga" enviada com a que está no banco
        const isPasswordCorrect = await bcrypt.compare(oldPassword, user.senha);
        if (!isPasswordCorrect) {
          return res.status(401).json({ error: 'A senha antiga está incorreta.' });
        }

        // Criptografa a nova senha
        const salt = await bcrypt.genSalt(10);
        const hashedNewPassword = await bcrypt.hash(newPassword, salt);

        // Atualiza a senha no banco de dados
        await db.Usuario.update({ senha: hashedNewPassword }, { where: { cod: userId } });

      } else if (newPassword && !oldPassword) {
        return res.status(400).json({ error: 'Para definir uma nova senha, a senha antiga é obrigatória.' });
      }

      // Envia a resposta de sucesso
      res.status(200).json({ message: 'Perfil atualizado com sucesso!' });

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro ao atualizar perfil:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para deletar um perfil
  deleteProfile: async (req, res) => {
    try {
      // Pega os userId e a senha
      const { userId } = req;
      const { senha } = req.body;

      // Verifica se colocou a senha
      if (!senha) {
        return res.status(400).json({ error: 'A senha é obrigatória para confirmar a exclusão.' });
      }

      // Pega senha
      const user = await db.Usuario.findByPk(userId, { attributes: ['senha'] });

      // Verifica se veio alguma coisa quando o BD tentou pegar a senha
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Analisa se a senha ta certa
      const isPasswordCorrect = await bcrypt.compare(senha, user.senha);

      // Se a senha estiver errada na verificação acima, da o erro
      if (!isPasswordCorrect) {
        return res.status(401).json({ error: 'Senha incorreta. A exclusão foi cancelada.' });
      }

      // Se chegou até aqui, todos os dados foram prenchidos, portanto vai deletar o usuário
      await db.Usuario.destroy({ where: { cod: userId } });

      // Da a mensagem de sucesso
      res.status(200).json({ message: 'Conta deletada com sucesso.' });

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro ao deletar perfil:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para atualizar a foto de perfil do usuário
  updatePhoto: async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo de foto foi enviado.' });
      }

      const user = await db.Usuario.findByPk(req.userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      // Se o usuário já tiver uma foto salva anteriormente, remove
      if (user.foto) {
        try {
          if (user.foto.startsWith('http')) {
            const urlParts = user.foto.split('/');
            const filename = urlParts[urlParts.length - 1];
            const folder = urlParts[urlParts.length - 2];
            const publicId = `${folder}/${filename.split('.')[0]}`;
            await cloudinary.uploader.destroy(publicId);
          } else {
            const oldFileName = path.basename(user.foto);
            const oldFilePath = path.join(process.cwd(), 'uploads', oldFileName);
            await fs.unlink(oldFilePath);
          }
        } catch (error) {
          console.error('Erro ao deletar foto de perfil antiga:', error);
        }
      }

      const fotoUrl = req.file.path;
      user.foto = fotoUrl;
      await user.save();

      res.status(200).json({
        message: 'Foto de perfil atualizada com sucesso!',
        foto: fotoUrl
      });

    } catch (error) {
      console.error('Erro ao atualizar foto de perfil:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para confirmar/verificar o e-mail do usuário via token
  verifyEmail: async (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token de verificação não fornecido.' });
      }

      const user = await db.Usuario.findOne({ where: { token_verificacao: token } });

      if (!user) {
        return res.status(400).json({ error: 'Token de verificação inválido ou já utilizado.' });
      }

      if (user.token_verificacao_expiracao && new Date() > new Date(user.token_verificacao_expiracao)) {
        return res.status(400).json({
          error: 'O link de verificação expirou. Solicite um novo e-mail de verificação.',
          expired: true,
          email: user.login
        });
      }

      // Ativar conta do usuário e limpar o token
      await user.update({
        email_verificado: true,
        token_verificacao: null,
        token_verificacao_expiracao: null
      });

      // Gerar o JWT Token para permitir a conclusão imediata do perfil
      const tokenSessao = jwt.sign(
        { userId: user.cod, login: user.login },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      const precisaCompletarPerfil = (!user.nome_completo || !user.data_nasc || !user.genero_cod);

      res.status(200).json({
        message: 'E-mail verificado com sucesso!',
        token: tokenSessao,
        precisaCompletarPerfil: precisaCompletarPerfil,
        user: { id: user.cod, email: user.login, adm: user.adm }
      });
    } catch (error) {
      console.error('Erro na verificação de e-mail:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para reenviar o e-mail de verificação
  resendVerificationEmail: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'E-mail é obrigatório.' });
      }

      const emailNormalizado = email.trim().toLowerCase();
      const user = await db.Usuario.findOne({ where: { login: emailNormalizado } });

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado com este e-mail.' });
      }

      if (user.email_verificado) {
        return res.status(400).json({ error: 'Este e-mail já foi verificado anteriormente.' });
      }

      // Gerar novo token de verificação (válido por 24h)
      const tokenVerificacao = crypto.randomBytes(32).toString('hex');
      const tokenExpiracao = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await user.update({
        token_verificacao: tokenVerificacao,
        token_verificacao_expiracao: tokenExpiracao
      });

      // Dispara envio do e-mail via Brevo
      await brevoService.sendVerificationEmail(user.login, user.nome_completo, tokenVerificacao);

      res.status(200).json({ message: 'E-mail de verificação reenviado com sucesso! Verifique sua caixa de entrada.' });
    } catch (error) {
      console.error('Erro ao reenviar e-mail de verificação:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para solicitar a recuperação de senha (Forgot Password)
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Por favor, informe seu e-mail.' });
      }

      const emailNormalizado = email.trim().toLowerCase();
      const user = await db.Usuario.findOne({ where: { login: emailNormalizado } });

      // Se o usuário não existir, por questões de segurança responde mensagem genérica
      if (user) {
        // Gerar token de recuperação (válido por 1 hora)
        const resetToken = crypto.randomBytes(32).toString('hex');
        const tokenExpiracao = new Date(Date.now() + 1 * 60 * 60 * 1000);

        await user.update({
          token_recuperacao: resetToken,
          token_recuperacao_expiracao: tokenExpiracao
        });

        // Enviar e-mail com link de redefinição via Brevo
        await brevoService.sendPasswordResetEmail(user.login, user.nome_completo, resetToken);
      }

      res.status(200).json({
        message: 'Se o e-mail estiver cadastrado em nosso sistema, você receberá um link para redefinir sua senha.'
      });
    } catch (error) {
      console.error('Erro na solicitação de recuperação de senha:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para redefinir a senha com o token (Reset Password)
  resetPassword: async (req, res) => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        return res.status(400).json({ error: 'Token e nova senha são obrigatórios.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'A nova senha deve ter no mínimo 6 caracteres.' });
      }

      const user = await db.Usuario.findOne({ where: { token_recuperacao: token } });

      if (!user) {
        return res.status(400).json({ error: 'Token de redefinição de senha inválido ou já utilizado.' });
      }

      if (user.token_recuperacao_expiracao && new Date() > new Date(user.token_recuperacao_expiracao)) {
        return res.status(400).json({ error: 'O link de redefinição de senha expirou. Solicite um novo link.' });
      }

      // Criptografar a nova senha
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Atualizar a senha e limpar os tokens de recuperação
      await user.update({
        senha: hashedPassword,
        token_recuperacao: null,
        token_recuperacao_expiracao: null
      });

      res.status(200).json({ message: 'Senha redefinida com sucesso! Você já pode realizar o login com a nova senha.' });
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para autenticação / cadastro automático via Google Sign-In
  googleLogin: async (req, res) => {
    try {
      const { credentialToken } = req.body;

      if (!credentialToken) {
        return res.status(400).json({ error: 'Token de credencial do Google não fornecido.' });
      }

      // Validar token com o Google
      const googleUser = await googleAuthService.verifyIdToken(credentialToken);
      const emailNormalizado = googleUser.email.trim().toLowerCase();

      // Buscar se o usuário já existe no banco
      let user = await db.Usuario.findOne({ where: { login: emailNormalizado } });

      if (!user) {
        // Se não existir, gera uma senha aleatória segura
        const randomPassword = crypto.randomBytes(16).toString('hex');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(randomPassword, salt);

        // Cria o usuário com e-mail verificado automaticamente
        user = await db.Usuario.create({
          login: emailNormalizado,
          nome_completo: googleUser.name,
          senha: hashedPassword,
          adm: false,
          foto: googleUser.picture,
          email_verificado: true
        });

        // Inicializar as estatísticas gerais do usuário zeradas
        await db.Usuario_estatisticas_gerais.create({
          usuario_cod: user.cod
        });

        // Inicializa as estatísticas por área para todas as disciplinas atuais
        const disciplinas = await db.Disciplina.findAll();
        if (disciplinas.length > 0) {
          const statsPorArea = disciplinas.map(disciplina => ({
            usuario_cod: user.cod,
            disciplina_cod: disciplina.cod,
            total_questoes_respondidas: 0,
            total_erros: 0,
            total_acertos: 0,
            aproveitamento_area: 0
          }));
          await db.Usuario_estatisticas_por_area.bulkCreate(statsPorArea);
        }
      } else {
        // Se o usuário já existe, atualiza email_verificado = true e a foto se vazia
        const updates = {};
        if (!user.email_verificado) updates.email_verificado = true;
        if (!user.foto && googleUser.picture) updates.foto = googleUser.picture;

        if (Object.keys(updates).length > 0) {
          await user.update(updates);
        }
      }

      // Gerar o JWT Token de sessão do Cedeefe
      const token = jwt.sign(
        { userId: user.cod, login: user.login },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      const precisaCompletarPerfil = (!user.data_nasc || !user.genero_cod || !user.nome_completo);

      res.status(200).json({
        message: 'Login com Google realizado com sucesso!',
        token: token,
        precisaCompletarPerfil: precisaCompletarPerfil,
        user: { id: user.cod, email: user.login, adm: user.adm }
      });
    } catch (error) {
      console.error('Erro no login com Google:', error);
      res.status(500).json({ error: 'Erro ao realizar login com o Google.' });
    }
  }

};

// Export default para exportar o valor principal do arquivo.
export default userController;