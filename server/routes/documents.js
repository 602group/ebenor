const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// GET /api/documents
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, category, search, sector, sort = 'created_at', order = 'desc' } = req.query;
  let sql = `SELECT * FROM documents WHERE 1=1`;
  const params = [];
  if (status) { sql += ` AND status = ?`; params.push(status); }
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (sector) { sql += ` AND sector = ?`; params.push(sector); }
  if (search) { sql += ` AND (title LIKE ? OR description LIKE ?)`; const s=`%${search}%`; params.push(s,s); }
  sql += ` ORDER BY ${['created_at','title','category'].includes(sort) ? sort : 'created_at'} ${order === 'asc' ? 'ASC' : 'DESC'}`;
  const rows = query(db, sql, params);
  const result = rows.map(d => ({ ...d, tags: getTagsForRecord(db, 'document', d.id) }));
  res.json(result);
});

// GET /api/documents/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM documents WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const doc = rows[0];
  doc.tags = getTagsForRecord(db, 'document', doc.id);
  doc.notes = getNotesForRecord(db, 'document', doc.id);
  doc.links = query(db, `SELECT * FROM record_links WHERE source_type = 'document' AND source_id = ? OR target_type = 'document' AND target_id = ?`, [doc.id, doc.id]);
  res.json(doc);
});

// POST /api/documents (with file upload)
router.post('/', upload.single('file'), (req, res) => {
  const db = req.app.locals.db;
  const { title, category = 'general', sector = null, description, status = 'active', tag_ids } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  
  const file_path = req.file ? `/uploads/${req.file.filename}` : null;
  const file_name = req.file ? req.file.originalname : null;
  const file_type = req.file ? req.file.mimetype : null;
  const file_size = req.file ? req.file.size : null;
  
  run(db, `INSERT INTO documents (id, title, file_path, file_name, file_type, file_size, status, category, sector, description, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, title, file_path, file_name, file_type, file_size, status, category, sector, description, now, now]);
  
  const tagIds = tag_ids ? (Array.isArray(tag_ids) ? tag_ids : [tag_ids]) : [];
  if (tagIds.length) setTagsOnRecord(db, 'document', id, tagIds);
  logActivity(req.user?.id, 'created', 'document', id, title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM documents WHERE id = ?`, [id]);
  res.status(201).json({ ...rows[0], tags: getTagsForRecord(db, 'document', id) });
});

// PATCH /api/documents/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM documents WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const fields = []; const vals = [];
  for (const key of ['title','category','sector','description','status']) {
    if (req.body[key] !== undefined) { fields.push(`${key}=?`); vals.push(req.body[key]); }
  }
  fields.push('updated_at=?'); vals.push(new Date().toISOString()); vals.push(req.params.id);
  if (fields.length > 1) run(db, `UPDATE documents SET ${fields.join(',')} WHERE id=?`, vals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'document', req.params.id, req.body.tag_ids);
  logActivity(req.user?.id, 'updated', 'document', req.params.id, existing[0].title);
  saveDB();
  const rows = query(db, `SELECT * FROM documents WHERE id = ?`, [req.params.id]);
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'document', req.params.id) });
});

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM documents WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  // Delete file from disk
  if (existing[0].file_path) {
    const fullPath = path.join(__dirname, '..', existing[0].file_path);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
  run(db, `DELETE FROM record_tags WHERE record_type = 'document' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM documents WHERE id = ?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted', 'document', req.params.id, existing[0].title);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
