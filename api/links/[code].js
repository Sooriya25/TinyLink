const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
  const { code } = req.query;

  if (req.method === 'GET') {
    try {
      const result = await pool.query('SELECT code, url, clicks, created_at, last_clicked FROM links WHERE code = $1', [code]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Link not found' });
      }
      
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const result = await pool.query('DELETE FROM links WHERE code = $1 RETURNING *', [code]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Link not found' });
      }
      
      res.json({ message: 'Link deleted' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};