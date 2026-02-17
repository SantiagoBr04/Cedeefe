import fs from 'fs'; // O fs serve para ler arquivos 
import path from 'path'; // O path serve para determinar o caminho de um arquivo
import { Sequelize } from 'sequelize'; // o sequelize
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url); 
const __dirname = path.dirname(__filename);

import sequelize from '../config/db.js'; 

const basename = path.basename(__filename);
const db = {};

// Lê os arquivos da pasta de forma síncrona
const files = fs.readdirSync(__dirname)
  .filter(file => {
    return ( // Retorna os arquivos que seguem as caracteristicas abaixo
      file.indexOf('.') !== 0 && 
      file !== basename && 
      file.slice(-3) === '.js'
    );
  });

for (const file of files) { 
  const fullPath = path.join(__dirname, file);

  const module = await import(pathToFileURL(fullPath).href);
  const model = module.default(sequelize, Sequelize.DataTypes);
  
  db[model.name] = model;
}

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

export default db;