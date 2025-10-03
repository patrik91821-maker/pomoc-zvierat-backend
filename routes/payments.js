const express = require('express');
const knex = require('../db');
const Stripe = require('stripe');
require('dotenv').config();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const router = express.Router();

// POST /payments/create-session
router.post('/create-session', async (req, res) => {
  const { request_id, amount_cents, currency = 'EUR', user_id } = req.body;
  if (!amount_cents || !request_id) return res.status(400).json({ error: 'Missing amount or request_id' });
  try {
    // Create a checkout session
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
      success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-cancel`,
    });

    // Store payment as pending
    const [id] = await knex('payments').insert({
      request_id,
      user_id: user_id || null,
      provider: 'stripe',
      provider_payment_id: session.id,
      amount_cents,
      currency,
      status: 'pending'
    });

    res.json({ sessionId: session.id, paymentId: id, checkoutUrl: session.url || null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot create session' });
  }
});

// POST /payments/webhook  (raw body)
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;
  try {
    if (webhookSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } else {
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      {
        const session = event.data.object;
        const providerPaymentId = session.id;
        // update payment record
        try {
          await knex('payments').where({ provider_payment_id: providerPaymentId }).update({ status: 'succeeded' });
          console.log('Payment succeeded for session', providerPaymentId);
        } catch (e) {
          console.error('DB update failed', e);
        }
      }
      break;
    case 'payment_intent.succeeded':
      {
        // optional handling
      }
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// GET admin payments
router.get('/admin/list', async (req, res) => {
  // you can protect this with admin middleware
  try {
    const rows = await knex('payments').orderBy('created_at', 'desc');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error' });
  }
});

module.exports = router;
