const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// GET /api/knowledge
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { category, status, search, sector, sort = 'updated_at', order = 'desc' } = req.query;
  
  let sql = `SELECT id, title, summary, category, sector, status, created_at, updated_at FROM knowledge_records WHERE 1=1`;
  const params = [];
  
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (sector) { sql += ` AND sector = ?`; params.push(sector); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  if (search) { sql += ` AND (title LIKE ? OR summary LIKE ? OR body LIKE ?)`; const s=`%${search}%`; params.push(s,s,s); }
  
  const allowed = ['created_at','updated_at','title','category'];
  const col = allowed.includes(sort) ? sort : 'updated_at';
  sql += ` ORDER BY ${col} ${order === 'asc' ? 'ASC' : 'DESC'}`;
  
  const records = query(db, sql, params);
  const result = records.map(r => ({ ...r, tags: getTagsForRecord(db, 'knowledge', r.id) }));
  res.json(result);
});

// GET /api/knowledge/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM knowledge_records WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const record = rows[0];
  record.tags = getTagsForRecord(db, 'knowledge', record.id);
  record.notes = getNotesForRecord(db, 'knowledge', record.id);
  
  // Get linked records where this knowledge is either source or target
  record.links = query(db, `SELECT * FROM record_links WHERE source_type = 'knowledge' AND source_id = ? OR target_type = 'knowledge' AND target_id = ?`, [record.id, record.id]);
  
  res.json(record);
});

// POST /api/knowledge
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { title, body, summary, category = 'general', sector = null, status = 'active', tag_ids = [] } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO knowledge_records (id, title, body, summary, category, sector, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, title, body, summary, category, sector, status, now, now]);
  
  if (tag_ids.length) setTagsOnRecord(db, 'knowledge', id, tag_ids);
  logActivity(req.user?.id, 'created', 'knowledge', id, title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM knowledge_records WHERE id = ?`, [id]);
  res.status(201).json({ ...rows[0], tags: getTagsForRecord(db, 'knowledge', id) });
});

// PATCH /api/knowledge/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM knowledge_records WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  
  const updatable = ['title','body','summary','category','sector','status'];
  const fields = []; const vals = [];
  for (const key of updatable) {
    if (req.body[key] !== undefined) {
      fields.push(`${key}=?`);
      vals.push(req.body[key]);
    }
  }
  fields.push('updated_at=?'); vals.push(now); vals.push(req.params.id);
  
  if (fields.length > 1) run(db, `UPDATE knowledge_records SET ${fields.join(',')} WHERE id=?`, vals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'knowledge', req.params.id, req.body.tag_ids);
  logActivity(req.user?.id, 'updated', 'knowledge', req.params.id, existing[0].title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM knowledge_records WHERE id = ?`, [req.params.id]);
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'knowledge', req.params.id) });
});

// DELETE /api/knowledge/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM knowledge_records WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  run(db, `DELETE FROM record_links WHERE (source_type='knowledge' AND source_id=?) OR (target_type='knowledge' AND target_id=?)`, [req.params.id, req.params.id]);
  run(db, `DELETE FROM record_notes WHERE record_type = 'knowledge' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM record_tags WHERE record_type = 'knowledge' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM knowledge_records WHERE id = ?`, [req.params.id]);
  
  logActivity(req.user?.id, 'deleted', 'knowledge', req.params.id, existing[0].title);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
