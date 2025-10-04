require('dotenv').config();
const knex = require('./db');

async function init() {
  console.log('Inicializujem DB...');
  // users
  if (!(await knex.schema.hasTable('users'))) {
    await knex.schema.createTable('users', (t) => {
      t.increments('id').primary();
      t.string('email').unique().notNullable();
      t.string('password_hash');
      t.string('name');
      t.string('phone');
      t.string('role').defaultTo('user');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    console.log('Created users');
  }

  // requests
  if (!(await knex.schema.hasTable('requests'))) {
    await knex.schema.createTable('requests', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      t.string('title').notNullable();
      t.text('description');
      t.string('status').defaultTo('open'); // open, in_progress, closed, cancelled
      t.decimal('latitude', 9,6).nullable();
      t.decimal('longitude', 9,6).nullable();
      t.string('address');
      t.string('contact_phone');
      t.string('priority').defaultTo('normal');
      t.timestamp('created_at').defaultTo(knex.fn.now());
      t.timestamp('updated_at').defaultTo(knex.fn.now());
    });
    console.log('Created requests');
  }

  // attachments
  if (!(await knex.schema.hasTable('attachments'))) {
    await knex.schema.createTable('attachments', (t) => {
      t.increments('id').primary();
      t.integer('request_id').unsigned().references('id').inTable('requests').onDelete('CASCADE');
      t.string('url').notNullable();
      t.string('filename');
      t.timestamp('uploaded_at').defaultTo(knex.fn.now());
    });
    console.log('Created attachments');
  }

  // payments
  if (!(await knex.schema.hasTable('payments'))) {
    await knex.schema.createTable('payments', (t) => {
      t.increments('id').primary();
      t.integer('request_id').unsigned().references('id').inTable('requests').onDelete('SET NULL');
      t.integer('user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      t.string('provider'); // stripe, paypal...
      t.string('provider_payment_id');
      t.integer('amount_cents').notNullable();
      t.string('currency').defaultTo('EUR');
      t.string('status'); // pending, succeeded, failed
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    console.log('Created payments');
  }

  // messages (voliteľné)
  if (!(await knex.schema.hasTable('messages'))) {
    await knex.schema.createTable('messages', (t) => {
      t.increments('id').primary();
      t.integer('request_id').unsigned().references('id').inTable('requests').onDelete('CASCADE');
      t.integer('sender_user_id').unsigned().references('id').inTable('users').onDelete('SET NULL');
      t.text('body');
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    console.log('Created messages');
  }

  // notifications (voliteľné)
  if (!(await knex.schema.hasTable('notifications'))) {
    await knex.schema.createTable('notifications', (t) => {
      t.increments('id').primary();
      t.integer('user_id').unsigned().references('id').inTable('users').onDelete('CASCADE');
      t.string('type');
      t.json('payload');
      t.boolean('read').defaultTo(false);
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    console.log('Created notifications');
  }

  console.log('DB inited');
  process.exit(0);
}

init().catch((err) => {
  console.error(err);
  process.exit(1);
});
