const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
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

module.exports = async (req, res) => {
  await ensureDB();
  
  const { url: path } = req;
  const method = req.method;

  // Health check
  if (path === '/healthz') {
    return res.json({ ok: true, version: '1.0' });
  }

  // API Routes
  if (path === '/api/links') {
    if (method === 'GET') {
      const result = await pool.query('SELECT code, url, clicks, created_at, last_clicked FROM links ORDER BY created_at DESC');
      return res.json(result.rows);
    }
    
    if (method === 'POST') {
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
      return res.status(201).json({ code: shortCode, url });
    }
  }

  // Individual link operations
  const linkMatch = path.match(/^\/api\/links\/(.+)$/);
  if (linkMatch) {
    const code = linkMatch[1];
    
    if (method === 'GET') {
      const result = await pool.query('SELECT code, url, clicks, created_at, last_clicked FROM links WHERE code = $1', [code]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Link not found' });
      }
      return res.json(result.rows[0]);
    }
    
    if (method === 'DELETE') {
      const result = await pool.query('DELETE FROM links WHERE code = $1 RETURNING *', [code]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Link not found' });
      }
      return res.json({ message: 'Link deleted' });
    }
  }

  // Redirect handler
  const codeMatch = path.match(/^\/(.+)$/);
  if (codeMatch && method === 'GET') {
    const code = codeMatch[1];
    
    if (!isValidCode(code)) {
      return res.status(404).send('Not found');
    }
    
    const result = await pool.query('UPDATE links SET clicks = clicks + 1, last_clicked = CURRENT_TIMESTAMP WHERE code = $1 RETURNING url', [code]);
    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }
    
    return res.redirect(302, result.rows[0].url);
  }

  res.status(404).json({ error: 'Not found' });
};