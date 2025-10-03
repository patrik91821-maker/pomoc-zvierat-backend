require('dotenv').config();
const knex = require('knex')({
  client: 'pg',
  connection: process.env.DATABASE_URL,
  pool: { min: 0, max: 10 }, // aby sa nestalo "unable to acquire a connection"
});

module.exports = knex;
