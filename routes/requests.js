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

// --- FUNKCIA NA BEZPECNE ZISKANIE ID ---
function parseId(value) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value);
    if (!isNaN(parsed)) return parsed;
  }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    const parsed = parseInt(value.id);
    if (!isNaN(parsed)) return parsed;
  }
  return null; // fallback, ak sa nedá premeniť
}

// POST /requests
router.post('/', async (req, res) => {
  const { title, description, latitude, longitude, address, contact_phone, user_id } = req.body;

  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const userIdInt = parseId(user_id);

    const [id] = await knex('requests')
      .insert({
        title,
        description,
        latitude,
        longitude,
        address,
        contact_phone,
        user_id: userIdInt || null, // vždy integer alebo null
      })
      .returning('id');

    const reqRow = await knex('requests').where({ id }).first();
    res.json(reqRow);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot create request' });
  }
});

// GET /requests
router.get('/', async (req, res) => {
  try {
    const rows = await knex('requests').orderBy('created_at', 'desc');
    res.json({ requests: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cannot fetch requests' });
  }
});

module.exports = router;
