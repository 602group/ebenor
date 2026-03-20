const express = require('express');
const router = express.Router();
const { query, run } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { v4: uuidv4 } = require('uuid');
const { saveDB } = require('../db/database');

const n = v => v === undefined || v === '' ? null : v;

// ─── DASHBOARD ───────────────────────────────────────────────────────────────

router.get('/dashboard', (req, res) => {
  const db = req.app.locals.db;
  
  // Newsletter Stats
  const subsRow = query(db, `SELECT COUNT(*) as count FROM newsletter_subscribers WHERE status = 'active'`)[0] || {count: 0};
  const recentSubs = query(db, `SELECT * FROM newsletter_subscribers ORDER BY created_at DESC LIMIT 5`);
  
  // Blog Stats
  const publishedRow = query(db, `SELECT COUNT(*) as count FROM blog_posts WHERE status = 'Published'`)[0] || {count: 0};
  const draftRow = query(db, `SELECT COUNT(*) as count FROM blog_posts WHERE status = 'Draft'`)[0] || {count: 0};
  const recentBlogs = query(db, `SELECT id, title, status, updated_at FROM blog_posts ORDER BY updated_at DESC LIMIT 5`);

  res.json({
    stats: {
      total_subscribers: subsRow.count,
      published_posts: publishedRow.count,
      draft_posts: draftRow.count,
      total_posts: publishedRow.count + draftRow.count
    },
    recent_subscribers: recentSubs,
    recent_blogs: recentBlogs
  });
});

// ─── NEWSLETTER ──────────────────────────────────────────────────────────────

router.get('/newsletter', (req, res) => {
  const db = req.app.locals.db;
  const subs = query(db, `SELECT * FROM newsletter_subscribers ORDER BY created_at DESC`);
  res.json(subs);
});

router.delete('/newsletter/:id', (req, res) => {
  const db = req.app.locals.db;
  run(db, `DELETE FROM newsletter_subscribers WHERE id = ?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

// ─── BLOG POSTS ──────────────────────────────────────────────────────────────

router.get('/blog', (req, res) => {
  const db = req.app.locals.db;
  const posts = query(db, `SELECT id, slug, title, status, excerpt, published_at, created_at, updated_at FROM blog_posts ORDER BY updated_at DESC`);
  res.json(posts);
});

router.get('/blog/:id', (req, res) => {
  const db = req.app.locals.db;
  const row = query(db, `SELECT * FROM blog_posts WHERE id = ?`, [req.params.id])[0];
  if (!row) return res.status(404).json({ error: 'Post not found' });
  res.json(row);
});

router.post('/blog', (req, res) => {
  const db = req.app.locals.db;
  const { title, slug, excerpt, content, status } = req.body;
  if (!title || !slug) return res.status(400).json({ error: 'Title and Slug required' });
  
  const id = uuidv4();
  const now = new Date().toISOString();
  const pubDate = status === 'Published' ? now : null;

  run(db, `INSERT INTO blog_posts (id, slug, title, excerpt, content, status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, slug, title, n(excerpt), n(content), status || 'Draft', pubDate, now, now]);

  logActivity(req.user?.id, 'created', 'blog', id, title);
  saveDB();
  
  res.status(201).json(query(db, `SELECT * FROM blog_posts WHERE id = ?`, [id])[0]);
});

router.patch('/blog/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM blog_posts WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  const { title, slug, excerpt, content, status } = req.body;
  const now = new Date().toISOString();
  let pubDate = existing[0].published_at;
  
  if (status === 'Published' && existing[0].status !== 'Published') {
    pubDate = now;
  }

  run(db, `UPDATE blog_posts SET title=?, slug=?, excerpt=?, content=?, status=?, published_at=?, updated_at=? WHERE id=?`,
    [title ?? existing[0].title, slug ?? existing[0].slug, n(excerpt) ?? existing[0].excerpt, n(content) ?? existing[0].content, status ?? existing[0].status, pubDate, now, req.params.id]);

  logActivity(req.user?.id, 'updated', 'blog', req.params.id, title ?? existing[0].title);
  saveDB();
  
  res.json(query(db, `SELECT * FROM blog_posts WHERE id = ?`, [req.params.id])[0]);
});

router.delete('/blog/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM blog_posts WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  run(db, `DELETE FROM blog_posts WHERE id = ?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted', 'blog', req.params.id, existing[0].title);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
