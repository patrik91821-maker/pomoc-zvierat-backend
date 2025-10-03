const express = require('express');
const knex = require('../db');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// multer setup (store locally)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// POST /requests  (any user - optional auth)
router.post('/', async (req, res) => {
  // If you want only authenticated users to create requests, add auth middleware here
  const { title, description, latitude, longitude, address, contact_phone, user_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });
  try {
    const [id] = await knex('requests').insert({
      title, description, latitude, longitude, address, contact_phone, user_id: user_id || null
    });
    const reqRow = await knex('requests').where({ id }).first();
    res.json(reqRow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot create request' });
  }
});

// GET /requests/:id
router.get('/:id', authOptional, async (req, res) => {
  const id = req.params.id;
  try {
    const r = await knex('requests').where({ id }).first();
    if (!r) return res.status(404).json({ error: 'Not found' });
    const attachments = await knex('attachments').where({ request_id: id });
    res.json({ ...r, attachments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error' });
  }
});

// Middleware: optional auth (if token present attach user, else continue)
function authOptional(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return next();
  const parts = auth.split(' ');
  if (parts.length === 2 && parts[0] === 'Bearer') {
    try {
      const jwt = require('jsonwebtoken');
      const payload = jwt.verify(parts[1], process.env.JWT_SECRET || 'change_me');
      req.user = payload;
    } catch (e) {
      // ignore invalid token
    }
  }
  next();
}

// POST /requests/:id/attachments  (multipart) - upload images
router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  const id = req.params.id;
  if (!req.file) return res.status(400).json({ error: 'File required' });
  const url = `/uploads/${req.file.filename}`; // served statically
  try {
    const [aid] = await knex('attachments').insert({ request_id: id, url, filename: req.file.originalname });
    const attach = await knex('attachments').where({ id: aid }).first();
    res.json(attach);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// ADMIN: GET /admin/requests  (filtering)
router.get('/admin/list', authAdmin, async (req, res) => {
  try {
    const rows = await knex('requests').orderBy('created_at', 'desc');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error' });
  }
});

// ADMIN: PATCH /admin/requests/:id  (change status)
router.patch('/admin/:id', authAdmin, async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  updates.updated_at = knex.fn.now();
  try {
    await knex('requests').where({ id }).update(updates);
    const r = await knex('requests').where({ id }).first();
    res.json(r);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot update' });
  }
});

function authAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token' });
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return res.status(401).json({ error: 'Bad token format' });
  const token = parts[1];
  try {
    const payload = require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'change_me');
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
    req.user = payload;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = router;
