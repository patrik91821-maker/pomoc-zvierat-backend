require('dotenv').config();
const knex = require('knex')({
  client: 'pg', // PostgreSQL
  connection: process.env.DATABASE_URL, // URL z Render PostgreSQL
  searchPath: ['public'], // voliteľné, ale odporúčané
});

module.exports = knex;
