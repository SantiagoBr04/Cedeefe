// Importa o express, dotenv, cors, helmet e rate limiter para segurança da aplicação
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import db from './models/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garante a existência dos diretórios de uploads e rascunhos na inicialização do servidor
const diretoriosUpload = [
  path.resolve(__dirname, '..', 'uploads'),
  path.resolve(__dirname, '..', 'uploads', 'rascunhos')
];

diretoriosUpload.forEach(dirPath => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Importa as rotas que existem
import userRoutes from './routes/userRoutes.js';
import listaRoutes from './routes/listaRoutes.js';
import questaoRoutes from './routes/questaoRoutes.js';
import disciplinaRoutes from './routes/disciplinaRoutes.js';
import estatisticasRoutes from './routes/estatisticasRoutes.js';
import temaRoutes from './routes/temaRoutes.js';
import baralhoRoutes from './routes/baralhoRoutes.js';
import cartaoRoutes from './routes/cartaoRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import roadmapRoutes from './routes/roadmapRoutes.js';

// Define o app como o express
const app = express();

// Proteção de Cabeçalhos HTTP com Helmet (desativa restrição de recurso cruzado para servir imagens e estatcos)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false // Permite manter Scripts e Estilos inline da aplicação frontend local
}));

// Configuração restritiva de CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Permite requisições sem origin (como mobile apps ou curl/postman no desenvolvimento) ou dentro da whitelist
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Acesso bloqueado pela política de CORS da aplicação.'));
    }
  },
  credentials: true
}));

app.use(express.json()); // Para o express entender requisições com corpo em JSON

// Configuração de Rate Limiting para proteção contra Força Bruta e DoS
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 30, // Máximo de 30 tentativas por IP por janela nas rotas sensíveis
  message: { error: 'Muitas tentativas a partir deste IP. Por favor, tente novamente após 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false
});

const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 500, // Limite geral de 500 requisições por IP a cada 15 minutos
  standardHeaders: true,
  legacyHeaders: false
});

// Aplica limitação geral na API
app.use('/api/', globalApiLimiter);

// Aplica limitação estrita nas rotas de autenticação/cadastro/recuperação
app.use('/api/users/login', authRateLimiter);
app.use('/api/users/register', authRateLimiter);
app.use('/api/users/forgot-password', authRateLimiter);
app.use('/api/users/resend-verification', authRateLimiter);

// Rotas da API
app.use('/api/users', userRoutes);
app.use('/api/listas', listaRoutes);
app.use('/api/questoes', questaoRoutes);
app.use('/api/disciplinas', disciplinaRoutes);
app.use('/api/estatisticas', estatisticasRoutes);
app.use('/api/temas', temaRoutes);
app.use('/api/baralhos', baralhoRoutes);
app.use('/api/cartoes', cartaoRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/roadmaps', roadmapRoutes);

// Servir APENAS diretórios públicos específicos (bloqueia o acesso direto ao .env, src, node_modules, etc.)
app.use('/imagens', express.static(path.resolve(__dirname, '..', 'uploads')));
app.use('/imagens', express.static(path.resolve(__dirname, '..', 'imagens'))); // Assets estáticos do frontend (blobs SVG, ícones)
app.use('/pages', express.static(path.resolve(__dirname, '..', 'pages')));
app.use('/estilos', express.static(path.resolve(__dirname, '..', 'estilos')));
app.use('/scripts', express.static(path.resolve(__dirname, '..', 'scripts')));
app.use('/componentes', express.static(path.resolve(__dirname, '..', 'componentes')));

// Rota principal para servir o index.html com segurança
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'index.html'));
});

// Define a porta do servidor
const PORT = process.env.PORT || 3000;

// Validação de variáveis críticas de ambiente antes da inicialização
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === '1232142425435636734') {
  console.warn('\x1b[33m%s\x1b[0m', '[AVISO DE SEGURANÇA]: A variável JWT_SECRET não está definida ou está utilizando um valor padrão fraco. Altere para uma chave secreta e aleatória em ambiente de produção!');
}

const RECONSTRUIR_BANCO = false;

db.sequelize.sync({ force: RECONSTRUIR_BANCO })
  .then(async () => {
    // Ajusta as colunas de texto da tabela questoes e alternativas no PostgreSQL para aceitar textos longos (TEXT)
    try {
      await db.sequelize.query('ALTER TABLE "questoes" ALTER COLUMN "descricao" TYPE TEXT;');
      await db.sequelize.query('ALTER TABLE "questoes" ALTER COLUMN "explicacao" TYPE TEXT;');
      await db.sequelize.query('ALTER TABLE "alternativas" ALTER COLUMN "texto" TYPE TEXT;');

      // Garante a existência das novas colunas e flexibilidade de cadastro na tabela usuario
      await db.sequelize.query('ALTER TABLE "usuario" ALTER COLUMN "nome_completo" DROP NOT NULL;');
      await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "email_verificado" BOOLEAN DEFAULT false;');
      await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "token_verificacao" VARCHAR(255);');
      await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "token_verificacao_expiracao" TIMESTAMP WITH TIME ZONE;');
      await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "token_recuperacao" VARCHAR(255);');
      await db.sequelize.query('ALTER TABLE "usuario" ADD COLUMN IF NOT EXISTS "token_recuperacao_expiracao" TIMESTAMP WITH TIME ZONE;');
    } catch (eAlter) {
      console.warn("Aviso na atualização de colunas do banco:", eAlter.message);
    }

    console.log("Banco de dados conectado e sincronizado com sucesso!");

    // Só liga o server se o banco de dados estiver sincronizado corretamente
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    // Se der erro no banco (senha errada, banco fora do ar), o servidor avisa e não sobe "quebrado"
    console.error("Erro fatal ao conectar no banco de dados:", err);
  });