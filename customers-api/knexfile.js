require('dotenv').config();

module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host:     process.env.DB_HOST     || 'localhost',
      port:     Number(process.env.DB_PORT) || 3306,
      user:     process.env.DB_USER     || 'appuser',
      password: process.env.DB_PASSWORD || 'secret',
      database: process.env.DB_NAME     || 'ecommerce',
    },
    pool: { min: 2, max: 10 },
  },
  production: {
    client: 'mysql2',
    connection: {
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT),
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    },
    pool: { min: 2, max: 10 },
  },
};