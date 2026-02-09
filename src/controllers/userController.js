import db from '../models/index.js'; // Importa o db do Sequelize
import { Op } from 'sequelize'; // Importa operadores para comparações (necessário no update)
import bcrypt from 'bcryptjs'; // Para criptografia  
import jwt from 'jsonwebtoken'; // Para usar tokens

// Cria o objeto userContoller
const userController = {
  
  // Método para registrar um novo usuário
  register: async (req, res) => {
    try {
      // Pega os dados do corpo da requisição
      const {login, senha, adm, data_nasc, motivo, escola, genero, endereco, estado_civil} = req.body;

      // Validação básica (verificar se os dados vieram)
      if (!login || !senha) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
      }

      // Verificar se o email já existe no banco
      const existingUser = await db.Usuario.findOne({ where: { login: login } }); // Procura um em que o email dado seja igual ao do banco
      
      if (existingUser) { //Se ja existe, da erro
        return res.status(409).json({ error: 'Este e-mail já está em uso.' });
      }

      // Criptografar a senha 
      const salt = await bcrypt.genSalt(10); // Gera um "tempero" para a senha
      const hashedPassword = await bcrypt.hash(senha, salt); // Criptografa

      // Inserir o novo usuário no banco de dados
      const newUser = await db.Usuario.create({ 
          login, 
          senha: hashedPassword, 
          adm, 
          data_nasc, 
          motivo, 
          escola, 
          genero, 
          endereco, 
          estado_civil
      });

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

      // Buscar o usuário pelo e-mail no banco
      const user = await db.Usuario.findOne({ where: { login: login } });
      
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

      // Se a senha estiver correta, gerar o token JWT
      const token = jwt.sign(
        { userId: user.cod, login: user.login }, // Informações que devem estar no token
        process.env.JWT_SECRET,             // Segredo para "assinar" o token
        { expiresIn: '8h' }                 // Tempo para o token expirar
      );

      // Enviar o token de volta para o cliente
      res.status(200).json({
        message: 'Login bem-sucedido!',
        token: token,
        user: { id: user.cod, email: user.login }
      });

    } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
      console.error('Erro no login:', error);
      res.status(500).json({ error: 'Erro interno no servidor.' });
    }
  },

  // Método para pegar um usuário
  getProfile: async (req, res) => {
    try {
      // Pega o cod e o login onde o cod for igual ao da req
      const user = await db.Usuario.findByPk(req.userId, {
          attributes: ['cod', 'login'] // Seleciona apenas colunas específicas
      });

      // Compara se o cod existe (ele não pode ser igual a 0)
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      
      // Devolve o cod do usuário
      res.status(200).json(user);

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
      const { login, oldPassword, newPassword } = req.body;

      // Se nenhum dado foi enviado para atualização, retorna um erro.
      if (!login && !oldPassword && !newPassword) {
        return res.status(400).json({ error: 'Nenhum dado fornecido para atualização.' });
      }

      // Lógica para atualizar os dados do perfil (LOGIN/EMAIL)
      if (login) {
        // Verifica se o novo 'login' (email) já está sendo usado por outro usuário
        // Sequelize: Usa Op.ne (Not Equal) para verificar se ID é diferente
        const existingUser = await db.Usuario.findOne({
            where: {
                login: login,
                cod: { [Op.ne]: userId } // login igual E cod diferente do meu
            }
        });

        // Se o cod existir, vai ser maior que 1, portanto vai dar erro aqui
        if (existingUser) {
          return res.status(409).json({ error: 'Este e-mail já está em uso por outra conta.' });
        }

        // Atualiza o login no banco de dados
        await db.Usuario.update({ login: login }, { where: { cod: userId } });
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
          return res.status(400).json({ error: 'Para definir uma nova senha, a senha antiga é obrigatória.'});
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
    try{
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
    }

  };

// Export default para exportar o valor principal do arquivo.
export default userController;