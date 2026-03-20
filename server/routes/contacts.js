const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// GET /api/contacts
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { contact_type, search, sector, sort = 'name', order = 'asc' } = req.query;
  let sql = `SELECT * FROM contacts WHERE 1=1`;
  const params = [];
  if (contact_type) { sql += ` AND contact_type = ?`; params.push(contact_type); }
  if (sector) { sql += ` AND sector = ?`; params.push(sector); }
  if (search) { sql += ` AND (name LIKE ? OR email LIKE ? OR company LIKE ?)`; const s=`%${search}%`; params.push(s,s,s); }
  sql += ` ORDER BY ${['name','company','created_at'].includes(sort) ? sort : 'name'} ${order === 'desc' ? 'DESC' : 'ASC'}`;
  const rows = query(db, sql, params);
  const result = rows.map(c => ({ ...c, tags: getTagsForRecord(db, 'contact', c.id) }));
  res.json(result);
});

// GET /api/contacts/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM contacts WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const contact = rows[0];
  contact.tags = getTagsForRecord(db, 'contact', contact.id);
  contact.notes = getNotesForRecord(db, 'contact', contact.id);
  contact.links = query(db, `SELECT * FROM record_links WHERE source_type = 'contact' AND source_id = ? OR target_type = 'contact' AND target_id = ?`, [contact.id, contact.id]);
  res.json(contact);
});

// POST /api/contacts
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, email, phone, company, contact_type = 'other', sector = null, role, city, state, notes_body, tag_ids = [] } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  run(db, `INSERT INTO contacts (id, name, email, phone, company, contact_type, sector, role, city, state, notes_body, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, email, phone, company, contact_type, sector, role, city, state, notes_body, now, now]);
  if (tag_ids.length) setTagsOnRecord(db, 'contact', id, tag_ids);
  logActivity(req.user?.id, 'created', 'contact', id, name);
  saveDB();
  const rows = query(db, `SELECT * FROM contacts WHERE id = ?`, [id]);
  res.status(201).json({ ...rows[0], tags: getTagsForRecord(db, 'contact', id) });
});

// PATCH /api/contacts/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM contacts WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const fields = []; const vals = [];
  for (const key of ['name','email','phone','company','contact_type','sector','role','city','state','notes_body']) {
    if (req.body[key] !== undefined) { fields.push(`${key}=?`); vals.push(req.body[key]); }
  }
  fields.push('updated_at=?'); vals.push(new Date().toISOString()); vals.push(req.params.id);
  if (fields.length > 1) run(db, `UPDATE contacts SET ${fields.join(',')} WHERE id=?`, vals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'contact', req.params.id, req.body.tag_ids);
  logActivity(req.user?.id, 'updated', 'contact', req.params.id, existing[0].name);
  saveDB();
  const rows = query(db, `SELECT * FROM contacts WHERE id = ?`, [req.params.id]);
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'contact', req.params.id) });
});

// DELETE /api/contacts/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM contacts WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  run(db, `DELETE FROM record_tags WHERE record_type = 'contact' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM contacts WHERE id = ?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted', 'contact', req.params.id, existing[0].name);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
