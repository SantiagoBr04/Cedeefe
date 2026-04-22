// Importa o express, o dotenv para não mandar senhas ao git, 
// e o cors para poder receber requisições de outras fontes, como o frontend
import express from 'express';
import 'dotenv/config';
import cors from 'cors';
import path from 'path';
import db from './models/index.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importa as rotas que existem
import userRoutes from './routes/userRoutes.js'; 
import listaRoutes from './routes/listaRoutes.js';
import questaoRoutes from './routes/questaoRoutes.js';
import disciplinaRoutes from './routes/disciplinaRoutes.js';
import estatisticasRoutes from './routes/estatisticasRoutes.js';
import temaRoutes from './routes/temaRoutes.js';
import baralhoRoutes from './routes/baralhoRoutes.js';
import cartaoRoutes from './routes/cartaoRoutes.js';

// Define o app como o express
const app = express();

// Permite o express receber requisições HTTP de outras fontes, como o frontend
app.use(cors());
app.use(express.json()); // Para o express entender requisições com corpo em JSON

// Diz ao Express para usar a rota certa para qualquer endereço que comece com /api/nome da rota
app.use('/api/users', userRoutes); 
app.use('/api/listas', listaRoutes);
app.use('/api/questoes', questaoRoutes);
app.use('/api/disciplinas', disciplinaRoutes);
app.use('/api/estatisticas', estatisticasRoutes);
app.use('/api/temas', temaRoutes);
app.use('/api/baralhos', baralhoRoutes);
app.use('/api/cartoes', cartaoRoutes);
app.use('/imagens', express.static(path.resolve(__dirname, '..', 'uploads')));

// Define a porta do servidor (Vai pegar o primeiro valor que aparecer, então se tiver um no process ali, vai ser aquele ali,
// Porém, ali só vem valor quando se hospeda o server)
const PORT = process.env.PORT || 3000;

const RECONSTRUIR_BANCO = false;

db.sequelize.sync({force: RECONSTRUIR_BANCO})
  .then(async() => {
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