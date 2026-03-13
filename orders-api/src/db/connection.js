require('dotenv').config();

const knex = require('knex');

const db = knex({
  client: 'mysql2',
  connection: {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'appuser',
    password: process.env.DB_PASSWORD || 'secret',
    database: process.env.DB_NAME     || 'ecommerce',
  },
  pool: { min: 2, max: 10 },
});

module.exports = db;