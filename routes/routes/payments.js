const express = require('express');
const Stripe = require('stripe');
require('dotenv').config();
const knex = require('../db');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

router.post('/create-session', async (req, res) => {
  const { request_id, amount_cents, currency = 'EUR', user_id } = req.body;
  if (!amount_cents || !request_id) return res.status(400).json({ error: 'Missing amount or request_id' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency,
          product_data: { name: `Platba za pomoc (request ${request_id})` },
          unit_amount: amount_cents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
    });

    const [id] = await knex('payments').insert({
      request_id,
      user_id: user_id || null,
      provider: 'stripe',
      provider_payment_id: session.id,
      amount_cents,
      currency,
      status: 'pending'
    }).returning('id');

    res.json({ sessionId: session.id, paymentId: id, checkoutUrl: session.url || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot create session' });
  }
});

module.exports = router;
