const express = require('express');
const knex = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// uploads dir
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// --- FUNKCIA NA BEZPECNE EXTRAHOVANIE ID ---
function extractId(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && !isNaN(parseInt(value))) return parseInt(value);
  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'number') {
    return value.id;
  }
  throw new Error('Invalid ID');
}

// ---------------- POST /requests ----------------
router.post('/', async (req, res) => {
  let { title, description, latitude, longitude, address, contact_phone, user_id } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    // zabezpečíme, že user_id je integer alebo null
    user_id = extractId(user_id);

    const [id] = await knex('requests')
      .insert({ title, description, latitude, longitude, address, contact_phone, user_id: user_id || null })
      .returning('id');

    const reqRow = await knex('requests').where({ id }).first();
    res.json(reqRow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot create request' });
  }
});

// ---------------- GET /requests ----------------
router.get('/', async (req, res) => {
  try {
    const rows = await knex('requests').orderBy('created_at', 'desc');
    res.json({ requests: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot fetch requests' });
  }
});

// ---------------- GET /requests/:id ----------------
router.get('/:id', async (req, res) => {
  try {
    const id = extractId(req.params.id);
    const row = await knex('requests').where({ id }).first();
    if (!row) return res.status(404).json({ error: 'Request not found' });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// ---------------- DELETE /requests/:id ----------------
router.delete('/:id', async (req, res) => {
  try {
    const id = extractId(req.params.id);
    const deleted = await knex('requests').where({ id }).del();
    if (!deleted) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Request deleted' });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
