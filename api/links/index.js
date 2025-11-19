const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS links (
        id SERIAL PRIMARY KEY,
        code VARCHAR(8) UNIQUE NOT NULL,
        url TEXT NOT NULL,
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_clicked TIMESTAMP
      )
    `);
  } catch (err) {
    console.error('DB init error:', err);
  }
}

let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initDB();
    dbInitialized = true;
  }
}

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function isValidCode(code) {
  return /^[A-Za-z0-9]{6,8}$/.test(code);
}

export default async function handler(req, res) {
  await ensureDB();

  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT code, url, clicks, created_at, last_clicked FROM links ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const { url, code } = req.body;
      
      if (!url || !isValidUrl(url)) {
        return res.status(400).json({ error: 'Invalid URL' });
      }

      let shortCode = code;
      if (shortCode) {
        if (!isValidCode(shortCode)) {
          return res.status(400).json({ error: 'Invalid code format' });
        }
        const existing = await pool.query('SELECT code FROM links WHERE code = $1', [shortCode]);
        if (existing.rows.length > 0) {
          return res.status(409).json({ error: 'Code already exists' });
        }
      } else {
        do {
          shortCode = generateCode();
          const existing = await pool.query('SELECT code FROM links WHERE code = $1', [shortCode]);
          if (existing.rows.length === 0) break;
        } while (true);
      }

      await pool.query('INSERT INTO links (code, url) VALUES ($1, $2)', [shortCode, url]);
      res.status(201).json({ code: shortCode, url });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}