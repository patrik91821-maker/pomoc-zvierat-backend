require('dotenv').config();
const knexConfig = {
  client: 'sqlite3',
  connection: {
    filename: process.env.DATABASE_FILE || './data/db.sqlite'
  },
  useNullAsDefault: true
};
const knex = require('knex')(knexConfig);
module.exports = knex;
