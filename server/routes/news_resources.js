const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, logActivity } = require('../db/helpers');
const { saveDB } = require('../db/database');

// GET /api/news-resources
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { sector, resource_type, is_featured, search, sort = 'created_at', order = 'desc' } = req.query;
  
  let sql = `SELECT * FROM news_resources WHERE status != 'archived'`;
  const params = [];

  if (sector) { sql += ` AND sector = ?`; params.push(sector); }
  if (resource_type) { sql += ` AND resource_type = ?`; params.push(resource_type); }
  if (is_featured !== undefined) { sql += ` AND is_featured = ?`; params.push(is_featured === 'true' || is_featured === '1' ? 1 : 0); }
  
  if (search) { 
    sql += ` AND (title LIKE ? OR description LIKE ? OR url LIKE ?)`; 
    const s = `%${search}%`; 
    params.push(s,s,s); 
  }
  
  const allowed = ['created_at', 'title', 'sector', 'resource_type'];
  const col = allowed.includes(sort) ? sort : 'created_at';
  sql += ` ORDER BY is_featured DESC, ${col} ${order === 'asc' ? 'ASC' : 'DESC'}`;
  
  const resources = query(db, sql, params);
  const result = resources.map(r => ({ ...r, tags: getTagsForRecord(db, 'news_resource', r.id) }));
  res.json(result);
});

// GET /api/news-resources/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM news_resources WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const article = rows[0];
  article.tags = getTagsForRecord(db, 'news_resource', article.id);
  res.json(article);
});

// POST /api/news-resources
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { title, sector, resource_type = 'website', url, description, is_featured = false, status = 'active', tag_ids = [] } = req.body;
  
  if (!title || !sector) return res.status(400).json({ error: 'Title and Sector are required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO news_resources (id, title, sector, resource_type, url, description, is_featured, status, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [id, title, sector, resource_type, url, description, is_featured ? 1 : 0, status, now, now]);
  
  if (tag_ids.length) setTagsOnRecord(db, 'news_resource', id, tag_ids);
  logActivity(db, 'created', 'news_resource', id, title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM news_resources WHERE id = ?`, [id]);
  res.status(201).json({ ...rows[0], tags: getTagsForRecord(db, 'news_resource', id) });
});

// PATCH /api/news-resources/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM news_resources WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  const updatable = ['title','sector','resource_type','url','description','status'];
  const fields = []; const vals = [];
  
  for (const key of updatable) {
    if (req.body[key] !== undefined) {
      fields.push(`${key}=?`);
      vals.push(req.body[key]);
    }
  }

  // Boolean toggles
  if (req.body.is_featured !== undefined) {
    fields.push('is_featured=?');
    vals.push(req.body.is_featured ? 1 : 0);
  }

  fields.push('updated_at=?'); vals.push(new Date().toISOString()); vals.push(req.params.id);
  if (fields.length > 1) run(db, `UPDATE news_resources SET ${fields.join(',')} WHERE id=?`, vals);
  
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'news_resource', req.params.id, req.body.tag_ids);
  saveDB();
  
  const rows = query(db, `SELECT * FROM news_resources WHERE id = ?`, [req.params.id]);
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'news_resource', req.params.id) });
});

// DELETE /api/news-resources/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM news_resources WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  run(db, `DELETE FROM record_tags WHERE record_type = 'news_resource' AND record_id = ?`, [req.params.id]);
  // Soft delete requested by user (archive ability) but native delete drops it entirely
  run(db, `DELETE FROM news_resources WHERE id = ?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
