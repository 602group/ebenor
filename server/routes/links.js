const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run } = require('../db/helpers');
const { saveDB } = require('../db/database');

// Helper: resolve a record's display title from its type + id
function resolveTitle(db, type, id) {
  try {
    const TABLE_MAP = {
      asset: { table: 'assets', col: 'name' },
      trade: { table: 'trades', col: 'title' },
      idea:  { table: 'ideas',  col: 'title' },
      note:  { table: 'notes',  col: 'title' },
      property: { table: 'properties', col: 'name' },
      contact:  { table: 'contacts',   col: 'name' },
      news:     { table: 'news_articles', col: 'title' },
      document: { table: 'documents',  col: 'title' },
      market:   { table: 'market_observations', col: 'name' },
    };
    const m = TABLE_MAP[type];
    if (!m) return null;
    const rows = query(db, `SELECT ${m.col} as title FROM ${m.table} WHERE id = ?`, [id]);
    return rows[0]?.title || null;
  } catch { return null; }
}

// GET /api/links?source_type=X&source_id=Y — get all links for a record (both directions)
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { source_type, source_id } = req.query;
  if (!source_type || !source_id) return res.status(400).json({ error: 'source_type and source_id required' });

  const outgoing = query(db, `SELECT * FROM record_links WHERE source_type = ? AND source_id = ?`, [source_type, source_id]);
  const incoming = query(db, `SELECT * FROM record_links WHERE target_type = ? AND target_id = ?`, [source_type, source_id]);

  const all = [
    ...outgoing.map(l => ({ ...l, direction: 'outgoing', target_title: resolveTitle(db, l.target_type, l.target_id) })),
    ...incoming.map(l => ({ ...l, direction: 'incoming', source_title: resolveTitle(db, l.source_type, l.source_id) })),
  ];

  res.json(all);
});

// GET /api/links/:type/:id — legacy path, returns combined outgoing+incoming
router.get('/:type/:id', (req, res) => {
  const db = req.app.locals.db;
  const { type, id } = req.params;
  const outgoing = query(db, `SELECT * FROM record_links WHERE source_type = ? AND source_id = ?`, [type, id]);
  const incoming = query(db, `SELECT * FROM record_links WHERE target_type = ? AND target_id = ?`, [type, id]);
  res.json({ outgoing, incoming });
});

// POST /api/links — create bidirectional link between two records
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { source_type, source_id, target_type, target_id, relationship } = req.body;
  if (!source_type || !source_id || !target_type || !target_id) {
    return res.status(400).json({ error: 'All link fields required' });
  }

  const existing = query(db, `SELECT id FROM record_links WHERE source_type=? AND source_id=? AND target_type=? AND target_id=?`,
    [source_type, source_id, target_type, target_id]);
  if (existing.length) return res.json({ ...existing[0], already_exists: true });

  const id = uuidv4();
  run(db, `INSERT INTO record_links (id, source_type, source_id, target_type, target_id, relationship) VALUES (?,?,?,?,?,?)`,
    [id, source_type, source_id, target_type, target_id, relationship || null]);
  saveDB();

  res.status(201).json({ id, source_type, source_id, target_type, target_id, relationship });
});

// DELETE /api/links/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  run(db, `DELETE FROM record_links WHERE id = ?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
