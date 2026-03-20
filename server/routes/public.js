const express = require('express');
const router = express.Router();
const { query, run } = require('../db/helpers');
const { v4: uuidv4 } = require('uuid');
const { saveDB } = require('../db/database');

// ─── SYSTEM-LEVEL OPEN CORS SUPPORT ───
// These endpoints will be fetched by the static Ebenor Global Javascript.
// The main `server/index.js` CORS rules currently block non-origin requests.
// Ensure these routes manually inject wide-open CORS.
router.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  // Intercept OPTIONS method for preflight
  if ('OPTIONS' === req.method) {
    return res.status(200).end();
  }
  next();
});


// ─── SUBMIT NEWSLETTER ───────────────────────────────────────────────────────

router.post('/newsletter/subscribe', (req, res) => {
  const db = req.app.locals.db;
  const { email } = req.body;
  
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Idempotent signup
  const existing = query(db, `SELECT id FROM newsletter_subscribers WHERE email = ?`, [email]);
  if (existing.length) {
    return res.json({ success: true, message: 'Already subscribed' });
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO newsletter_subscribers (id, email, status, created_at, updated_at) VALUES (?, ?, 'active', ?, ?)`,
    [id, email, now, now]);

  saveDB();
  res.json({ success: true });
});

// ─── PUBLIC BLOG FEED ────────────────────────────────────────────────────────

router.get('/blog', (req, res) => {
  const db = req.app.locals.db;
  // Return only essential metadata for published posts so payload stays tiny. No html content.
  const posts = query(db, `SELECT slug, title, excerpt, published_at FROM blog_posts WHERE status = 'Published' ORDER BY published_at DESC`);
  res.json(posts);
});

// ─── PUBLIC SINGLE BLOG ARTICLE ──────────────────────────────────────────────

router.get('/blog/:slug', (req, res) => {
  const db = req.app.locals.db;
  const row = query(db, `SELECT title, content, published_at FROM blog_posts WHERE status = 'Published' AND slug = ?`, [req.params.slug])[0];
  
  if (!row) return res.status(404).json({ error: 'Article not found' });
  
  res.json(row);
});

module.exports = router;
