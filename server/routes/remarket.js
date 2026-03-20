const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord, logActivity } = require('../db/helpers');
const { saveDB } = require('../db/database');

const n = v => v === undefined ? null : v;

// All RE market research records live in market_observations with market_type = 'real-estate'

const RE_CATEGORIES = ['city-market','neighborhood','statewide-trend','rental-market','luxury-market',
  'short-term-rental','macro-housing','asset-type-trend','other'];

// GET /api/remarket — list RE market research records
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { category, status, search } = req.query;
  let sql = `SELECT * FROM market_observations WHERE market_type = 'real-estate'`;
  const params = [];
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (status)   { sql += ` AND status = ?`;   params.push(status); }
  if (search) {
    sql += ` AND (name LIKE ? OR description LIKE ? OR region LIKE ?)`;
    const s = `%${search}%`; params.push(s,s,s);
  }
  sql += ` ORDER BY updated_at DESC`;
  const rows = query(db, sql, params);
  const result = rows.map(r => ({ ...r, tags: getTagsForRecord(db, 'market', r.id) }));
  res.json(result);
});

// GET /api/remarket/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM market_observations WHERE id = ? AND market_type = 'real-estate'`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const m = { ...rows[0], tags: getTagsForRecord(db, 'market', rows[0].id), notes: getNotesForRecord(db, 'market', rows[0].id) };
  res.json(m);
});

// POST /api/remarket — create RE market record
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, category, region, description, observation_notes, trend, status = 'watching', tag_ids = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  run(db, `INSERT INTO market_observations (id, name, market_type, category, region, description, observation_notes, trend, status, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, 'real-estate', n(category), n(region), n(description), n(observation_notes), n(trend), status, now, now]);
  if (tag_ids.length) setTagsOnRecord(db, 'market', id, tag_ids);
  logActivity(db, 'created', 'market_research', id, name);
  saveDB();
  const row = query(db, `SELECT * FROM market_observations WHERE id = ?`, [id])[0];
  res.status(201).json({ ...row, tags: getTagsForRecord(db, 'market', id) });
});

// PATCH /api/remarket/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM market_observations WHERE id = ? AND market_type = 'real-estate'`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const { name, category, region, description, observation_notes, trend, status, tag_ids } = req.body;
  const now = new Date().toISOString();
  const fields = []; const vals = [];
  const map = { name, category, region, description, observation_notes, trend, status };
  Object.entries(map).forEach(([k, v]) => { if (v !== undefined) { fields.push(`${k}=?`); vals.push(v); } });
  fields.push('updated_at=?'); vals.push(now); vals.push(req.params.id);
  if (fields.length > 1) run(db, `UPDATE market_observations SET ${fields.join(',')} WHERE id=?`, vals);
  if (tag_ids !== undefined) setTagsOnRecord(db, 'market', req.params.id, tag_ids);
  saveDB();
  const row = query(db, `SELECT * FROM market_observations WHERE id = ?`, [req.params.id])[0];
  res.json({ ...row, tags: getTagsForRecord(db, 'market', req.params.id) });
});

// DELETE /api/remarket/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  run(db, `DELETE FROM record_tags WHERE record_type = 'market' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM market_observations WHERE id = ?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
