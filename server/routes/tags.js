const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, logActivity } = require('../db/helpers');
const { saveDB } = require('../db/database');

// GET /api/tags
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { search } = req.query;
  let sql = `SELECT * FROM tags`;
  const params = [];
  if (search) { sql += ` WHERE name LIKE ?`; params.push(`%${search}%`); }
  sql += ` ORDER BY name ASC`;
  res.json(query(db, sql, params));
});

// POST /api/tags
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, color = '#6366f1' } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const existing = query(db, `SELECT * FROM tags WHERE name = ?`, [name]);
  if (existing.length) return res.json(existing[0]); // return existing tag
  
  const id = uuidv4();
  run(db, `INSERT INTO tags (id, name, color) VALUES (?,?,?)`, [id, name, color]);
  logActivity(db, 'created', 'tag', id, name);
  saveDB();
  
  const rows = query(db, `SELECT * FROM tags WHERE id = ?`, [id]);
  res.status(201).json(rows[0]);
});

// PATCH /api/tags/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { name, color } = req.body;
  const existing = query(db, `SELECT * FROM tags WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  const fields = []; const vals = [];
  if (name !== undefined) { fields.push('name=?'); vals.push(name); }
  if (color !== undefined) { fields.push('color=?'); vals.push(color); }
  if (fields.length) { vals.push(req.params.id); run(db, `UPDATE tags SET ${fields.join(',')} WHERE id=?`, vals); saveDB(); }
  
  const rows = query(db, `SELECT * FROM tags WHERE id = ?`, [req.params.id]);
  res.json(rows[0]);
});

// DELETE /api/tags/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM tags WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  run(db, `DELETE FROM record_tags WHERE tag_id = ?`, [req.params.id]);
  run(db, `DELETE FROM tags WHERE id = ?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

// GET /api/tags/:id/records — get all records with this tag
router.get('/:id/records', (req, res) => {
  const db = req.app.locals.db;
  const records = query(db, `SELECT record_type, record_id FROM record_tags WHERE tag_id = ?`, [req.params.id]);
  res.json(records);
});

module.exports = router;
