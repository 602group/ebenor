const express = require('express');
const router = express.Router();
const { query } = require('../db/helpers');

// GET /api/search?q=term
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { q } = req.query;
  if (!q || q.trim().length < 2) return res.json({ results: [] });
  
  const s = `%${q.trim()}%`;
  const results = [];
  
  // Assets
  const assets = query(db, `SELECT id, name, symbol, asset_class, status FROM assets WHERE name LIKE ? OR symbol LIKE ? OR description LIKE ? LIMIT 10`, [s,s,s]);
  assets.forEach(r => results.push({ type: 'asset', id: r.id, title: r.name, subtitle: `${r.symbol || ''} · ${r.asset_class}`, status: r.status }));
  
  // Trades
  const trades = query(db, `SELECT id, title, status, trade_type FROM trades WHERE title LIKE ? OR strategy LIKE ? OR notes_body LIKE ? LIMIT 10`, [s,s,s]);
  trades.forEach(r => results.push({ type: 'trade', id: r.id, title: r.title, subtitle: `Trade · ${r.trade_type}`, status: r.status }));
  
  // Ideas
  const ideas = query(db, `SELECT id, title, status, conviction FROM ideas WHERE title LIKE ? OR thesis LIKE ? OR catalysts LIKE ? LIMIT 10`, [s,s,s]);
  ideas.forEach(r => results.push({ type: 'idea', id: r.id, title: r.title, subtitle: `Idea · ${r.conviction} conviction`, status: r.status }));
  
  // Notes
  const notes = query(db, `SELECT id, title, category FROM notes WHERE archived = 0 AND (title LIKE ? OR body LIKE ?) LIMIT 10`, [s,s]);
  notes.forEach(r => results.push({ type: 'note', id: r.id, title: r.title, subtitle: `Note · ${r.category}` }));
  
  // Properties
  const props = query(db, `SELECT id, name, city, state, status FROM properties WHERE name LIKE ? OR address LIKE ? OR city LIKE ? OR description LIKE ? LIMIT 10`, [s,s,s,s]);
  props.forEach(r => results.push({ type: 'property', id: r.id, title: r.name, subtitle: `Property · ${r.city || ''}, ${r.state || ''}`, status: r.status }));
  
  // Contacts
  const contacts = query(db, `SELECT id, name, email, company, contact_type FROM contacts WHERE name LIKE ? OR email LIKE ? OR company LIKE ? LIMIT 10`, [s,s,s]);
  contacts.forEach(r => results.push({ type: 'contact', id: r.id, title: r.name, subtitle: `${r.company || ''} · ${r.contact_type}` }));
  
  // News
  const news = query(db, `SELECT id, title, source, category FROM news_articles WHERE title LIKE ? OR summary LIKE ? OR source LIKE ? LIMIT 10`, [s,s,s]);
  news.forEach(r => results.push({ type: 'news', id: r.id, title: r.title, subtitle: `News · ${r.source || r.category}` }));
  
  // Documents
  const docs = query(db, `SELECT id, title, category FROM documents WHERE title LIKE ? OR description LIKE ? LIMIT 10`, [s,s]);
  docs.forEach(r => results.push({ type: 'document', id: r.id, title: r.title, subtitle: `Document · ${r.category}` }));
  
  res.json({ results, query: q, count: results.length });
});

module.exports = router;
