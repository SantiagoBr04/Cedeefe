// Importa o pool de conexões do BD
import db from '../models/index.js';
const { Usuario } = db;

// Cria o middleware para verificar se é admin
const adminMiddleware = async (req, res, next) => {
  try {
    // Neste ponto, o authMiddleware já rodou e deu o req.userId.
    const { userId } = req;

    // Busca o usuário no banco para verificar seu status de admin
    //const [users] = await pool.query('SELECT adm FROM usuario WHERE cod = ?', [userId]);
    const user = await Usuario.findOne({
      where: { cod: userId},
      attributes: ['adm']
    })

    // Verifica se o usuário existe
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Verifica se o campo 'adm' é igual a 1
    if (!user.adm) {
      // O usuário está logado, mas não tem permissão.
      return res.status(403).json({ error: 'Acesso negado. Requer permissão de administrador.' });
    }

    // Se for admin, libera a passagem para o próximo passo (o controller)
    next();

  } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
    console.error('Erro no middleware de admin:', error);
    res.status(500).json({ error: 'Erro interno no servidor.' });
  }
};

// Export default para exportar o valor principal do arquivo.
export default adminMiddleware;