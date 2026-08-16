import { Sequelize } from 'sequelize';
import 'dotenv/config'; // Garante que as variáveis do .env sejam lidas neste arquivo

const isRemoteHost = process.env.DB_HOST && process.env.DB_HOST !== '127.0.0.1' && process.env.DB_HOST !== 'localhost';

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        dialect: 'postgres',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        timezone: '-03:00', // Força o fuso horário do Brasil 
        logging: false,     // Define como 'false' para não poluir o terminal com logs de SQL puro
        dialectOptions: isRemoteHost ? {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        } : {}
    }
);

export default sequelize;