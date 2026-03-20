const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, logActivity } = require('../db/helpers');
const { saveDB } = require('../db/database');

// GET /api/news
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { category, saved, asset_class, sentiment, search, sector, sort = 'created_at', order = 'desc' } = req.query;
  
  let sql = `SELECT * FROM news_articles WHERE 1=1`;
  const params = [];
  if (category) { sql += ` AND category = ?`; params.push(category); }
  if (saved !== undefined) { sql += ` AND saved = ?`; params.push(saved === 'true' || saved === '1' ? 1 : 0); }
  if (asset_class) { sql += ` AND asset_class = ?`; params.push(asset_class); }
  if (sentiment) { sql += ` AND sentiment = ?`; params.push(sentiment); }
  if (search) { sql += ` AND (title LIKE ? OR summary LIKE ? OR source LIKE ?)`; const s=`%${search}%`; params.push(s,s,s); }
  if (sector) {
    const ac = sector === 'stocks' ? 'stock' : sector;
    sql += ` AND asset_class = ?`; params.push(ac);
  }
  
  const allowed = ['created_at','publish_date','title'];
  const col = allowed.includes(sort) ? sort : 'created_at';
  sql += ` ORDER BY ${col} ${order === 'asc' ? 'ASC' : 'DESC'}`;
  
  const articles = query(db, sql, params);
  const result = articles.map(a => ({ ...a, tags: getTagsForRecord(db, 'news', a.id) }));
  res.json(result);
});

// GET /api/news/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM news_articles WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const article = rows[0];
  article.tags = getTagsForRecord(db, 'news', article.id);
  res.json(article);
});

// POST /api/news
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { title, url, source, summary, body, category = 'general', asset_class, saved = false, sentiment, publish_date, tag_ids = [] } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO news_articles (id, title, url, source, summary, body, category, asset_class, saved, sentiment, publish_date, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, title, url, source, summary, body, category, asset_class, saved ? 1 : 0, sentiment, publish_date, now, now]);
  
  if (tag_ids.length) setTagsOnRecord(db, 'news', id, tag_ids);
  logActivity(db, 'created', 'news', id, title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM news_articles WHERE id = ?`, [id]);
  res.status(201).json({ ...rows[0], tags: getTagsForRecord(db, 'news', id) });
});

// PATCH /api/news/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM news_articles WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  const updatable = ['title','url','source','summary','body','category','asset_class','saved','sentiment','publish_date'];
  const fields = []; const vals = [];
  for (const key of updatable) {
    if (req.body[key] !== undefined) {
      fields.push(`${key}=?`);
      vals.push(key === 'saved' ? (req.body[key] ? 1 : 0) : req.body[key]);
    }
  }
  fields.push('updated_at=?'); vals.push(new Date().toISOString()); vals.push(req.params.id);
  if (fields.length > 1) run(db, `UPDATE news_articles SET ${fields.join(',')} WHERE id=?`, vals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'news', req.params.id, req.body.tag_ids);
  saveDB();
  
  const rows = query(db, `SELECT * FROM news_articles WHERE id = ?`, [req.params.id]);
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'news', req.params.id) });
});

// DELETE /api/news/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM news_articles WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  run(db, `DELETE FROM record_tags WHERE record_type = 'news' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM news_articles WHERE id = ?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
