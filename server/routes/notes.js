const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// GET /api/notes
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { category, pinned, archived = '0', search, sector, sort = 'updated_at', order = 'desc' } = req.query;
  
  let sql = `SELECT * FROM notes WHERE 1=1`;
  const params = [];
  
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (sector) { sql += ` AND sector = ?`; params.push(sector); }
  if (pinned !== undefined) { sql += ` AND pinned = ?`; params.push(pinned === 'true' || pinned === '1' ? 1 : 0); }
  sql += ` AND archived = ?`; params.push(archived === 'true' || archived === '1' ? 1 : 0);
  if (search) { sql += ` AND (title LIKE ? OR body LIKE ?)`; const s=`%${search}%`; params.push(s,s); }
  
  const allowed = ['created_at','updated_at','title','category'];
  const col = allowed.includes(sort) ? sort : 'updated_at';
  sql += ` ORDER BY pinned DESC, ${col} ${order === 'asc' ? 'ASC' : 'DESC'}`;
  
  const notes = query(db, sql, params);
  const result = notes.map(n => ({ ...n, tags: getTagsForRecord(db, 'note', n.id) }));
  res.json(result);
});

// GET /api/notes/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM notes WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const note = rows[0];
  note.tags = getTagsForRecord(db, 'note', note.id);
  // Get linked records from record_notes
  note.linked_records = query(db, `SELECT record_type, record_id FROM record_notes WHERE note_id = ?`, [note.id]);
  res.json(note);
});

// POST /api/notes
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { title, body, category = 'general', sector = null, pinned = false, archived = false, tag_ids = [], attach_to = null } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO notes (id, title, body, category, sector, pinned, archived, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
    [id, title, body, category, sector, pinned ? 1 : 0, archived ? 1 : 0, now, now]);
  
  // Optionally attach to a record
  if (attach_to?.record_type && attach_to?.record_id) {
    run(db, `INSERT INTO record_notes (id, note_id, record_type, record_id) VALUES (?,?,?,?)`,
      [uuidv4(), id, attach_to.record_type, attach_to.record_id]);
  }
  
  if (tag_ids.length) setTagsOnRecord(db, 'note', id, tag_ids);
  logActivity(req.user?.id, 'created', 'note', id, title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM notes WHERE id = ?`, [id]);
  res.status(201).json({ ...rows[0], tags: getTagsForRecord(db, 'note', id) });
});

// PATCH /api/notes/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM notes WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  
  const updatable = ['title','body','category','sector','pinned','archived'];
  const fields = []; const vals = [];
  for (const key of updatable) {
    if (req.body[key] !== undefined) {
      fields.push(`${key}=?`);
      vals.push(key === 'pinned' || key === 'archived' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  fields.push('updated_at=?'); vals.push(now); vals.push(req.params.id);
  
  if (fields.length > 1) run(db, `UPDATE notes SET ${fields.join(',')} WHERE id=?`, vals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'note', req.params.id, req.body.tag_ids);
  logActivity(req.user?.id, 'updated', 'note', req.params.id, existing[0].title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM notes WHERE id = ?`, [req.params.id]);
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'note', req.params.id) });
});

// DELETE /api/notes/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM notes WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  run(db, `DELETE FROM record_notes WHERE note_id = ?`, [req.params.id]);
  run(db, `DELETE FROM record_tags WHERE record_type = 'note' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM notes WHERE id = ?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted', 'note', req.params.id, existing[0].title);
  saveDB();
  res.json({ success: true });
});

// POST /api/notes/:id/attach
router.post('/:id/attach', (req, res) => {
  const db = req.app.locals.db;
  const { record_type, record_id } = req.body;
  if (!record_type || !record_id) return res.status(400).json({ error: 'record_type and record_id required' });
  const existing = query(db, `SELECT id FROM record_notes WHERE note_id = ? AND record_type = ? AND record_id = ?`,
    [req.params.id, record_type, record_id]);
  if (!existing.length) {
    run(db, `INSERT INTO record_notes (id, note_id, record_type, record_id) VALUES (?,?,?,?)`,
      [uuidv4(), req.params.id, record_type, record_id]);
    saveDB();
  }
  res.json({ success: true });
});

// DELETE /api/notes/:id/attach
router.delete('/:id/attach', (req, res) => {
  const db = req.app.locals.db;
  const { record_type, record_id } = req.body;
  run(db, `DELETE FROM record_notes WHERE note_id = ? AND record_type = ? AND record_id = ?`,
    [req.params.id, record_type, record_id]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
