// Importa o express, o dotenv para não mandar senhas ao git, 
// e o cors para poder receber requisições de outras fontes, como o frontend
import express from 'express';
import 'dotenv/config';
import cors from 'cors';

// Importa as rotas que existem
import userRoutes from './routes/userRoutes.js'; 
import simuladoRoutes from './routes/simuladoRoutes.js';
import questaoRoutes from './routes/questaoRoutes.js';

// Define o app como o express
const app = express();

// Permite o express receber requisições HTTP de outras fontes, como o frontend
app.use(cors());
app.use(express.json()); // Para o express entender requisições com corpo em JSON

// Diz ao Express para usar a rota certa para qualquer endereço que comece com /api/nome da rota
app.use('/api/users', userRoutes); 
app.use('/api/simulados', simuladoRoutes);
app.use('/api/questoes', questaoRoutes);

// Define a porta do servidor (Vai pegar o primeiro valor que aparecer, então se tiver um no process ali, vai ser aquele ali,
// Porém, ali só vem valor quando se hospeda o server)
const PORT = process.env.PORT || 3000;

// Liga o servidor na porta que ele estiver
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});