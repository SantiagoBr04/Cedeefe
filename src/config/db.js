// Importa o mysql2
import mysql from 'mysql2/promise'; 

// Importa o 'dotenv/config' para que ele execute sua configuração.
import 'dotenv/config';

// Apenas para registro no console
console.log('Criando pool de conexões...');

// Usando sistema de pool, que é para mais de uma conexão por vez, cria o link com o BD
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Export default para exportar o valor principal do arquivo.
export default pool;