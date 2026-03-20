const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// GET /api/strategies
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { category, status, search, sector, sort = 'updated_at', order = 'desc' } = req.query;
  
  let sql = `SELECT id, name, category, sector, description, asset_classes, status, created_at, updated_at FROM strategies WHERE 1=1`;
  const params = [];
  
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (sector) { sql += ` AND sector = ?`; params.push(sector); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  if (search) { sql += ` AND (name LIKE ? OR description LIKE ?)`; const s=`%${search}%`; params.push(s,s); }
  
  const allowed = ['created_at','updated_at','name','category'];
  const col = allowed.includes(sort) ? sort : 'updated_at';
  sql += ` ORDER BY ${col} ${order === 'asc' ? 'ASC' : 'DESC'}`;
  
  const records = query(db, sql, params);
  const result = records.map(r => ({ ...r, tags: getTagsForRecord(db, 'strategy', r.id) }));
  res.json(result);
});

// GET /api/strategies/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM strategies WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const record = rows[0];
  record.tags = getTagsForRecord(db, 'strategy', record.id);
  record.notes = getNotesForRecord(db, 'strategy', record.id);
  
  // Get linked records where this strategy is either source or target
  record.links = query(db, `SELECT * FROM record_links WHERE source_type = 'strategy' AND source_id = ? OR target_type = 'strategy' AND target_id = ?`, [record.id, record.id]);
  
  res.json(record);
});

// POST /api/strategies
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, category = 'general', sector = null, description, rules_framework, entry_criteria, exit_criteria, risk_considerations, asset_classes, status = 'active', tag_ids = [] } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO strategies (id, name, category, sector, description, rules_framework, entry_criteria, exit_criteria, risk_considerations, asset_classes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, category, sector, description, rules_framework, entry_criteria, exit_criteria, risk_considerations, asset_classes, status, now, now]);
  
  if (tag_ids.length) setTagsOnRecord(db, 'strategy', id, tag_ids);
  logActivity(req.user?.id, 'created', 'strategy', id, name);
  saveDB();
  
  const rows = query(db, `SELECT * FROM strategies WHERE id = ?`, [id]);
  res.status(201).json({ ...rows[0], tags: getTagsForRecord(db, 'strategy', id) });
});

// PATCH /api/strategies/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM strategies WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  
  const updatable = ['name','category','sector','description','rules_framework','entry_criteria','exit_criteria','risk_considerations','asset_classes','status'];
  const fields = []; const vals = [];
  for (const key of updatable) {
    if (req.body[key] !== undefined) {
      fields.push(`${key}=?`);
      vals.push(req.body[key]);
    }
  }
  fields.push('updated_at=?'); vals.push(now); vals.push(req.params.id);
  
  if (fields.length > 1) run(db, `UPDATE strategies SET ${fields.join(',')} WHERE id=?`, vals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'strategy', req.params.id, req.body.tag_ids);
  logActivity(req.user?.id, 'updated', 'strategy', req.params.id, existing[0].name);
  saveDB();
  
  const rows = query(db, `SELECT * FROM strategies WHERE id = ?`, [req.params.id]);
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'strategy', req.params.id) });
});

// DELETE /api/strategies/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM strategies WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  run(db, `DELETE FROM record_links WHERE (source_type='strategy' AND source_id=?) OR (target_type='strategy' AND target_id=?)`, [req.params.id, req.params.id]);
  run(db, `DELETE FROM record_notes WHERE record_type = 'strategy' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM record_tags WHERE record_type = 'strategy' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM strategies WHERE id = ?`, [req.params.id]);
  
  logActivity(req.user?.id, 'deleted', 'strategy', req.params.id, existing[0].name);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
