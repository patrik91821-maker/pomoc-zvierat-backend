require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const requestsRoutes = require('./routes/requests');
const paymentsRoutes = require('./routes/payments');

const app = express();
const PORT = process.env.PORT || 4000;

// Serve uploads statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Caution: payments webhook expects raw body — mount it before body-parser for /payments/webhook
app.use((req, res, next) => {
  // allow raw body for specific path (handled in payments route with express.raw)
  next();
});

// Body parsers
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/auth', authRoutes);
app.use('/requests', requestsRoutes);
app.use('/payments', paymentsRoutes);

// Simple root
app.get('/', (req, res) => res.json({ ok: true, version: '1.0' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
