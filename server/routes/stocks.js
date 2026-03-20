const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run } = require('../db/helpers');
const { saveDB } = require('../db/database');

const FINNHUB_KEY = process.env.FINNHUB_API_KEY;
const FH = 'https://finnhub.io/api/v1';

// ─── In-memory cache ─────────────────────────────────────────────
const cache = new Map();
function cached(key, ttlMs, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return Promise.resolve(hit.data);
  return fn().then(data => {
    cache.set(key, { data, ts: Date.now() });
    return data;
  });
}

async function fhFetch(path) {
  if (!FINNHUB_KEY || FINNHUB_KEY === 'your_finnhub_api_key_here') {
    throw new Error('FINNHUB_API_KEY not configured — add your free key from finnhub.io to server/.env');
  }
  const url = `${FH}${path}${path.includes('?') ? '&' : '?'}token=${FINNHUB_KEY}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }, redirect: 'follow' });
  if (!res.ok) throw new Error(`Finnhub ${res.status}: ${res.statusText}`);
  return res.json();
}

// ─── GET /api/stocks/search?q=AAPL ───────────────────────────────
router.get('/search', async (req, res) => {
  const q = req.query.q?.trim();
  if (!q || q.length < 1) return res.json({ result: [] });
  try {
    const data = await cached(`search:${q.toUpperCase()}`, 5 * 60 * 1000, () =>
      fhFetch(`/search?q=${encodeURIComponent(q)}&exchange=US`)
    );
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ─── GET /api/stocks/quote/:symbol ───────────────────────────────
router.get('/quote/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`quote:${sym}`, 30 * 1000, () =>
      fhFetch(`/quote?symbol=${sym}`)
    );
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ─── GET /api/stocks/profile/:symbol ─────────────────────────────
router.get('/profile/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  try {
    const data = await cached(`profile:${sym}`, 24 * 60 * 60 * 1000, () =>
      fhFetch(`/stock/profile2?symbol=${sym}`)
    );
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ─── GET /api/stocks/news/:symbol ────────────────────────────────
router.get('/news/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const today = new Date().toISOString().split('T')[0];
  const from  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  try {
    const data = await cached(`news:${sym}`, 15 * 60 * 1000, () =>
      fhFetch(`/company-news?symbol=${sym}&from=${from}&to=${today}`)
    );
    // Return latest 15 articles
    const articles = Array.isArray(data) ? data.slice(0, 15) : [];
    res.json(articles);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ─── GET /api/stocks/candles/:symbol?resolution=D&count=90 ───────
router.get('/candles/:symbol', async (req, res) => {
  const sym = req.params.symbol.toUpperCase();
  const resolution = req.query.resolution || 'D';
  const count = parseInt(req.query.count || '90');
  const to   = Math.floor(Date.now() / 1000);
  const from = to - count * 24 * 3600;
  try {
    const data = await cached(`candles:${sym}:${resolution}:${count}`, 5 * 60 * 1000, () =>
      fhFetch(`/stock/candle?symbol=${sym}&resolution=${resolution}&from=${from}&to=${to}`)
    );
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ─── Watchlist CRUD ───────────────────────────────────────────────

// GET /api/stocks/watchlist
router.get('/watchlist', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM stock_watchlist ORDER BY added_at DESC`, []);
  res.json(rows);
});

// POST /api/stocks/watchlist
router.post('/watchlist', (req, res) => {
  const db = req.app.locals.db;
  const { symbol, company_name } = req.body;
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  const sym = symbol.toUpperCase();
  const existing = query(db, `SELECT * FROM stock_watchlist WHERE symbol = ?`, [sym]);
  if (existing.length) return res.json(existing[0]); // Already exists — return it
  const id = uuidv4();
  const now = new Date().toISOString();
  run(db, `INSERT INTO stock_watchlist (id, symbol, company_name, notes, rating, added_at, updated_at) VALUES (?,?,?,?,?,?,?)`,
    [id, sym, company_name || '', '', 'watching', now, now]);
  saveDB();
  const row = query(db, `SELECT * FROM stock_watchlist WHERE id = ?`, [id])[0];
  res.status(201).json(row);
});

// PATCH /api/stocks/watchlist/:id
router.patch('/watchlist/:id', (req, res) => {
  const db = req.app.locals.db;
  const { notes, rating, company_name } = req.body;
  const now = new Date().toISOString();
  const updates = []; const vals = [];
  if (notes      !== undefined) { updates.push('notes=?');        vals.push(notes); }
  if (rating     !== undefined) { updates.push('rating=?');       vals.push(rating); }
  if (company_name !== undefined) { updates.push('company_name=?'); vals.push(company_name); }
  updates.push('updated_at=?'); vals.push(now); vals.push(req.params.id);
  run(db, `UPDATE stock_watchlist SET ${updates.join(',')} WHERE id=?`, vals);
  saveDB();
  const row = query(db, `SELECT * FROM stock_watchlist WHERE id = ?`, [req.params.id])[0];
  res.json(row);
});

// DELETE /api/stocks/watchlist/:id
router.delete('/watchlist/:id', (req, res) => {
  const db = req.app.locals.db;
  run(db, `DELETE FROM stock_watchlist WHERE id=?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
