import sequelize from '../config/database.js';

try {
  await sequelize.authenticate();
  console.log('Conexão com PostgreSQL realizada com sucesso.');
} catch (error) {
  console.error('Não foi possível conectar ao PostgreSQL:', error.message);
  process.exitCode = 1;
} finally {
  await sequelize.close();
}
