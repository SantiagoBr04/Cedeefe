// Importa o jwt para usar o token
import jwt from 'jsonwebtoken';

// Cria o middleware, que recebe req, res e next(parametro do express para dizer que pode prosseguir para o proximo passo para o routes).
const authMiddleware = (req, res, next) => {
  // Pega o token do cabeçalho da requisição
  const authHeader = req.headers.authorization;

  // Verifica se o token existe
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado. Nenhum token fornecido.' });
  }

  // O token vem no formato "Bearer <token>", então se pega só a parte do token
  const token = authHeader.split(' ')[1];

  try {
    // Verifica se o token é válido usando o 'segredo'
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Se for válido, adiciona o ID do usuário à requisição
    // para que as próximas funções (controllers) saibam quem é o usuário
    req.userId = decoded.userId;
    
    // Chama a próxima função (o controller da rota)
    next();

  } catch (error) { // Resposta de erro caso de um erro na execução do try, seja por qual for o motivo
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};

// Export default para exportar o valor principal do arquivo.
export default authMiddleware;