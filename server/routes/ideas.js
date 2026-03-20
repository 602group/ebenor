const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// GET /api/ideas
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, conviction, asset_id, idea_type, search, sector, sort = 'created_at', order = 'desc' } = req.query;
  
  let sql = `SELECT i.*, a.name as asset_name, a.symbol as asset_symbol, a.asset_class
             FROM ideas i LEFT JOIN assets a ON i.asset_id = a.id WHERE 1=1`;
  const params = [];
  
  if (status) { sql += ` AND i.status = ?`; params.push(status); }
  if (conviction) { sql += ` AND i.conviction = ?`; params.push(conviction); }
  if (asset_id) { sql += ` AND i.asset_id = ?`; params.push(asset_id); }
  if (idea_type) { sql += ` AND i.idea_type = ?`; params.push(idea_type); }
  if (search) { sql += ` AND (i.title LIKE ? OR i.thesis LIKE ?)`; const s=`%${search}%`; params.push(s,s); }
  if (sector) {
    const ac = sector === 'stocks' ? 'stock' : sector;
    sql += ` AND a.asset_class = ?`; params.push(ac);
  }
  
  const allowed = ['created_at','title','status','conviction'];
  const col = allowed.includes(sort) ? `i.${sort}` : 'i.created_at';
  sql += ` ORDER BY ${col} ${order === 'asc' ? 'ASC' : 'DESC'}`;
  
  const ideas = query(db, sql, params);
  const result = ideas.map(i => ({ ...i, tags: getTagsForRecord(db, 'idea', i.id) }));
  res.json(result);
});

// GET /api/ideas/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `
    SELECT i.*, a.name as asset_name, a.symbol as asset_symbol
    FROM ideas i LEFT JOIN assets a ON i.asset_id = a.id WHERE i.id = ?
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const idea = rows[0];
  idea.tags = getTagsForRecord(db, 'idea', idea.id);
  idea.notes = getNotesForRecord(db, 'idea', idea.id);
  res.json(idea);
});

// POST /api/ideas
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { asset_id, title, status = 'researching', conviction = 'medium', idea_type = 'long',
    timeframe, target_price, stop_price, thesis, risks, catalysts, tag_ids = [] } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO ideas (id, asset_id, title, status, conviction, idea_type, timeframe, target_price, stop_price, thesis, risks, catalysts, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, asset_id, title, status, conviction, idea_type, timeframe, target_price, stop_price, thesis, risks, catalysts, now, now]);
  
  if (tag_ids.length) setTagsOnRecord(db, 'idea', id, tag_ids);
  logActivity(req.user?.id, 'created', 'idea', id, title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM ideas WHERE id = ?`, [id]);
  res.status(201).json({ ...rows[0], tags: getTagsForRecord(db, 'idea', id) });
});

// PATCH /api/ideas/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM ideas WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  
  const updatable = ['asset_id','title','status','conviction','idea_type','timeframe','target_price','stop_price','thesis','risks','catalysts'];
  const fields = []; const vals = [];
  for (const key of updatable) {
    if (req.body[key] !== undefined) { fields.push(`${key}=?`); vals.push(req.body[key]); }
  }
  fields.push('updated_at=?'); vals.push(now); vals.push(req.params.id);
  
  if (fields.length > 1) run(db, `UPDATE ideas SET ${fields.join(',')} WHERE id=?`, vals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'idea', req.params.id, req.body.tag_ids);
  logActivity(req.user?.id, 'updated', 'idea', req.params.id, existing[0].title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM ideas WHERE id = ?`, [req.params.id]);
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'idea', req.params.id) });
});

// DELETE /api/ideas/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM ideas WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  run(db, `DELETE FROM record_tags WHERE record_type = 'idea' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM ideas WHERE id = ?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted', 'idea', req.params.id, existing[0].title);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
