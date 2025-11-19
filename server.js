const express = require('express');
const { Pool } = require('pg');
const path = require('path');
const serverless = require('serverless-http');
require('dotenv').config();

const app = express();

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Utility functions
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

// ---------------------- ROUTES ----------------------

// Health check
app.get('/healthz', (req, res) => {
  res.json({ ok: true, version: '1.0' });
});

// Dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Stats page
app.get('/code/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// Create link
app.post('/api/links', async (req, res) => {
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

    await pool.query(
      'INSERT INTO links (code, url) VALUES ($1, $2)',
      [shortCode, url]
    );

    res.status(201).json({ code: shortCode, url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// List all links
app.get('/api/links', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT code, url, clicks, created_at, last_clicked FROM links ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get stats for one code
app.get('/api/links/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      'SELECT code, url, clicks, created_at, last_clicked FROM links WHERE code = $1',
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete link
app.delete('/api/links/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query('DELETE FROM links WHERE code = $1 RETURNING *', [code]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Link not found' });
    }

    res.json({ message: 'Link deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Redirect
app.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    if (!isValidCode(code)) {
      return res.status(404).send('Not found');
    }

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
});

// Export App as Vercel Serverless Function
module.exports = app;
module.exports.handler = serverless(app);
