const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord, logActivity } = require('../db/helpers');
const { saveDB } = require('../db/database');

const n = v => v === undefined ? null : v;

// ─── WATCHLISTS ───────────────────────────────────────────────

// GET /api/watchlists — all watchlists with item counts
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const lists = query(db, `
    SELECT w.*, COUNT(wi.id) as item_count
    FROM watchlists w
    LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.id
    GROUP BY w.id
    ORDER BY w.created_at DESC
  `);
  res.json(lists);
});

// GET /api/watchlists/:id — single watchlist with all items + asset details
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const wl = query(db, `SELECT * FROM watchlists WHERE id = ?`, [req.params.id]);
  if (!wl.length) return res.status(404).json({ error: 'Not found' });
  const items = query(db, `
    SELECT wi.*, a.name as asset_name, a.symbol, a.asset_class, a.status as asset_status,
           a.description as asset_description, a.sector, a.exchange
    FROM watchlist_items wi
    JOIN assets a ON wi.asset_id = a.id
    WHERE wi.watchlist_id = ?
    ORDER BY wi.added_at DESC
  `, [req.params.id]);
  res.json({ ...wl[0], items });
});

// POST /api/watchlists — create watchlist
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, description, asset_class } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  run(db, `INSERT INTO watchlists (id, name, description, asset_class, created_at, updated_at) VALUES (?,?,?,?,?,?)`,
    [id, name, n(description), n(asset_class), now, now]);
  logActivity(db, 'created', 'watchlist', id, name);
  saveDB();
  res.status(201).json(query(db, `SELECT * FROM watchlists WHERE id = ?`, [id])[0]);
});

// PATCH /api/watchlists/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { name, description, asset_class } = req.body;
  const existing = query(db, `SELECT * FROM watchlists WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  const fields = []; const vals = [];
  if (name !== undefined) { fields.push('name=?'); vals.push(name); }
  if (description !== undefined) { fields.push('description=?'); vals.push(description); }
  if (asset_class !== undefined) { fields.push('asset_class=?'); vals.push(asset_class); }
  fields.push('updated_at=?'); vals.push(now);
  vals.push(req.params.id);
  run(db, `UPDATE watchlists SET ${fields.join(',')} WHERE id=?`, vals);
  saveDB();
  res.json(query(db, `SELECT * FROM watchlists WHERE id = ?`, [req.params.id])[0]);
});

// DELETE /api/watchlists/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  run(db, `DELETE FROM watchlist_items WHERE watchlist_id = ?`, [req.params.id]);
  run(db, `DELETE FROM watchlists WHERE id = ?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

// ─── WATCHLIST ITEMS ─────────────────────────────────────────

// GET /api/watchlists/:id/items
router.get('/:id/items', (req, res) => {
  const db = req.app.locals.db;
  const items = query(db, `
    SELECT wi.*, a.name as asset_name, a.symbol, a.asset_class, a.sector
    FROM watchlist_items wi
    JOIN assets a ON wi.asset_id = a.id
    WHERE wi.watchlist_id = ?
    ORDER BY CASE wi.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, wi.added_at DESC
  `, [req.params.id]);
  res.json(items);
});

// POST /api/watchlists/:id/items — add asset to watchlist
router.post('/:id/items', (req, res) => {
  const db = req.app.locals.db;
  const { asset_id, priority = 'medium', status = 'watching', notes, alert_price, next_review_date } = req.body;
  if (!asset_id) return res.status(400).json({ error: 'asset_id required' });
  
  // Check watchlist exists
  const wl = query(db, `SELECT * FROM watchlists WHERE id = ?`, [req.params.id]);
  if (!wl.length) return res.status(404).json({ error: 'Watchlist not found' });
  
  // Check asset exists
  const asset = query(db, `SELECT * FROM assets WHERE id = ?`, [asset_id]);
  if (!asset.length) return res.status(404).json({ error: 'Asset not found' });
  
  // Prevent dupes
  const dupe = query(db, `SELECT id FROM watchlist_items WHERE watchlist_id = ? AND asset_id = ?`, [req.params.id, asset_id]);
  if (dupe.length) return res.status(409).json({ error: 'Asset already in this watchlist' });
  
  const id = uuidv4();
  const now = new Date().toISOString();
  run(db, `INSERT INTO watchlist_items (id, watchlist_id, asset_id, priority, status, notes, alert_price, next_review_date, added_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, req.params.id, asset_id, priority, status, n(notes), n(alert_price), n(next_review_date), now, now]);
  logActivity(db, 'added_to_watchlist', 'watchlist_item', id, asset[0].name);
  saveDB();
  
  const item = query(db, `
    SELECT wi.*, a.name as asset_name, a.symbol, a.asset_class, a.sector
    FROM watchlist_items wi JOIN assets a ON wi.asset_id = a.id
    WHERE wi.id = ?
  `, [id]);
  res.status(201).json(item[0]);
});

// PATCH /api/watchlists/:id/items/:itemId
router.patch('/:id/items/:itemId', (req, res) => {
  const db = req.app.locals.db;
  const { priority, status, notes, alert_price, next_review_date } = req.body;
  const now = new Date().toISOString();
  const fields = []; const vals = [];
  if (priority !== undefined) { fields.push('priority=?'); vals.push(priority); }
  if (status !== undefined) { fields.push('status=?'); vals.push(status); }
  if (notes !== undefined) { fields.push('notes=?'); vals.push(notes); }
  if (alert_price !== undefined) { fields.push('alert_price=?'); vals.push(alert_price); }
  if (next_review_date !== undefined) { fields.push('next_review_date=?'); vals.push(next_review_date); }
  fields.push('updated_at=?'); vals.push(now);
  vals.push(req.params.itemId);
  run(db, `UPDATE watchlist_items SET ${fields.join(',')} WHERE id=?`, vals);
  saveDB();
  const item = query(db, `
    SELECT wi.*, a.name as asset_name, a.symbol, a.asset_class
    FROM watchlist_items wi JOIN assets a ON wi.asset_id = a.id
    WHERE wi.id = ?
  `, [req.params.itemId]);
  res.json(item[0] || {});
});

// DELETE /api/watchlists/:id/items/:itemId
router.delete('/:id/items/:itemId', (req, res) => {
  const db = req.app.locals.db;
  run(db, `DELETE FROM watchlist_items WHERE id = ? AND watchlist_id = ?`, [req.params.itemId, req.params.id]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
