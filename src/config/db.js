import { Sequelize } from 'sequelize';
import 'dotenv/config'; // Garante que as variáveis do .env sejam lidas neste arquivo

const sequelize = new Sequelize(
    process.env.DB_DATABASE, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    {
        dialect: 'mysql',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306, 
        
        timezone: '-03:00', // Força o fuso horário do Brasil 
        logging: false      // Define como 'false' para não poluir 0 terminal com logs de SQL puro
    }
);

export default sequelize;