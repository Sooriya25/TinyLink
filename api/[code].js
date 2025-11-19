const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function isValidCode(code) {
  return /^[A-Za-z0-9]{6,8}$/.test(code);
}

export default async function handler(req, res) {
  const { code } = req.query;
  
  if (!isValidCode(code)) {
    return res.status(404).send('Not found');
  }

  try {
    const result = await pool.query(
      'UPDATE links SET clicks = clicks + 1, last_clicked = CURRENT_TIMESTAMP WHERE code = $1 RETURNING url',
      [code]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).send('Not found');
    }
    
    res.redirect(302, result.rows[0].url);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}