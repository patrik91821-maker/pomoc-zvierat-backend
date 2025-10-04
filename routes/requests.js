const express = require('express');
const knex = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();

// uploads dir (zaistenie existencie)
const uploadsDir = path.join(__dirname, '..', 'uploads');
// POZNÁMKA: Ak sa kód zrúti pri štarte, overte, či je tento blok v poriadku
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// multer storage konfigurácia
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).slice(2,8)}${ext}`;
    cb(null, name);
  }
});
const upload = multer({ storage });

// --- FUNKCIA NA BEZPECNE ZISKANIE/PARSOVANIE ID ---
// Bezpečne konvertuje hodnotu na integer
function parseId(value) {
  if (typeof value === 'number') return value;
  
  let idString = value;
  
  // Spracovanie objektu vráteného Knexom: { id: 16 }
  if (typeof value === 'object' && value !== null && 'id' in value) {
    idString = value.id;
  }
  
  // Spracovanie reťazca
  if (typeof idString === 'string' || typeof idString === 'number') {
    const parsed = parseInt(idString, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return null; 
}

// ------------------------------------------

// POST /requests - Vytvorenie novej žiadosti
// POZNÁMKA: upload.none() bol dočasne odstránený pre testovanie chyby status 1
router.post('/', async (req, res) => {
  const { title, description, latitude, longitude, address, contact_phone, user_id } = req.body;

  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const userIdInt = parseId(user_id);

    // Krok 1: Vloženie žiadosti do DB a získanie ID
    const insertResult = await knex('requests')
      .insert({
        title,
        description,
        latitude,
        longitude,
        address,
        contact_phone,
        user_id: userIdInt || null, 
      })
      .returning('id');
      
    // Krok 2: Bezpečné získanie čistého číselného ID (Oprava chyby syntaxe)
    const newId = parseId(insertResult[0]);
    
    if (!newId) {
        console.error("Failed to retrieve new request ID from DB response:", insertResult);
        return res.status(500).json({ error: 'Internal server error: Failed to get new ID.' });
    }

    // Krok 3: Načítanie celej žiadosti pomocou čistého ID
    const reqRow = await knex('requests').where({ id: newId }).first();
    
    if (!reqRow) {
        return res.status(404).json({ error: 'New request not found after creation.' });
    }
    
    res.json(reqRow);
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).json({ error: 'Cannot create request' });
  }
});

// GET /requests - Načítanie všetkých žiadostí
router.get('/', async (req, res) => {
  try {
    const rows = await knex('requests').orderBy('created_at', 'desc');
    res.json({ requests: rows });
  } catch (err) {
    console.error('Error fetching requests:', err);
    res.status(500).json({ error: 'Cannot fetch requests' });
  }
});

module.exports = router;