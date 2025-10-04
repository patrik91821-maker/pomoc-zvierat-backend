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
// Bezpečne konvertuje hodnotu na integer, spracováva aj objekty { id: '16' }
function parseId(value) {
  if (typeof value === 'number') return value;
  
  let idString = value;
  
  if (typeof value === 'object' && value !== null && 'id' in value) {
    idString = value.id;
  }
  
  if (typeof idString === 'string') {
    const parsed = parseInt(idString, 10);
    if (!isNaN(parsed)) return parsed;
  }
  return null; // fallback, ak sa nedá premeniť
}

// ------------------------------------------

// POST /requests - Vytvorenie novej žiadosti
router.post('/', upload.none(), async (req, res) => {
  const { title, description, latitude, longitude, address, contact_phone, user_id } = req.body;

  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const userIdInt = parseId(user_id);

    // Krok 1: Vloženie žiadosti do DB
    // Metóda .returning('id') vráti pole, napr. [{ id: 16 }] alebo len [16]
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
      
    // Krok 2: Bezpečné získanie čistého číselného ID
    // Použitím parseId na insertResult[0] sa zaručí, že newId bude čisté číslo (integer)
    const newId = parseId(insertResult[0]);
    
    if (!newId) {
        console.error("Failed to retrieve new request ID from DB response:", insertResult);
        return res.status(500).json({ error: 'Internal server error: Failed to get new ID.' });
    }

    // Krok 3: Načítajte celú žiadosť pomocou čistého ID
    // Hľadanie cez { id: newId } funguje len, ak newId je čisté číslo
    const reqRow = await knex('requests').where({ id: newId }).first();
    
    // Ak by sa nenašiel (málo pravdepodobné)
    if (!reqRow) {
        return res.status(404).json({ error: 'New request not found.' });
    }
    
    res.json(reqRow);
  } catch (err) {
    console.error('Error creating request:', err);
    res.status(500).json({ error: 'Cannot create request' });
  }
});

---

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