const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// GET /api/assets
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { asset_class, status, search, sector, sort = 'name', order = 'asc' } = req.query;
  
  let sql = `SELECT * FROM assets WHERE 1=1`;
  const params = [];
  
  if (asset_class) { sql += ` AND asset_class = ?`; params.push(asset_class); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  if (search) { sql += ` AND (name LIKE ? OR symbol LIKE ? OR description LIKE ?)`; const s = `%${search}%`; params.push(s,s,s); }
  if (sector) {
    const ac = sector === 'stocks' ? 'stock' : sector;
    sql += ` AND asset_class = ?`; params.push(ac);
  }
  
  const allowed = ['name','symbol','asset_class','status','created_at'];
  const col = allowed.includes(sort) ? sort : 'name';
  const dir = order === 'desc' ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${col} ${dir}`;
  
  const assets = query(db, sql, params);
  const result = assets.map(a => ({ ...a, tags: getTagsForRecord(db, 'asset', a.id) }));
  res.json(result);
});

// GET /api/assets/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM assets WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const asset = rows[0];
  asset.tags = getTagsForRecord(db, 'asset', asset.id);
  asset.notes = getNotesForRecord(db, 'asset', asset.id);
  res.json(asset);
});

const n = v => (v === undefined ? null : v);

// POST /api/assets
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { name, symbol, asset_class = 'stock', status = 'active', description, sector, exchange, currency, tag_ids = [] } = req.body;
  
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO assets (id, name, symbol, asset_class, status, description, sector, exchange, currency, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [id, name, n(symbol), asset_class, status, n(description), n(sector), n(exchange), n(currency), now, now]);
  
  if (tag_ids.length) setTagsOnRecord(db, 'asset', id, tag_ids);
  logActivity(req.user?.id, 'created', 'asset', id, name);
  saveDB();
  
  const rows = query(db, `SELECT * FROM assets WHERE id = ?`, [id]);
  const asset = { ...rows[0], tags: getTagsForRecord(db, 'asset', id) };
  res.status(201).json(asset);
});

// PATCH /api/assets/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const { name, symbol, asset_class, status, description, sector, exchange, currency, tag_ids } = req.body;
  const now = new Date().toISOString();
  
  const existing = query(db, `SELECT * FROM assets WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  const fields = [];
  const vals = [];
  if (name !== undefined) { fields.push('name=?'); vals.push(name); }
  if (symbol !== undefined) { fields.push('symbol=?'); vals.push(symbol); }
  if (asset_class !== undefined) { fields.push('asset_class=?'); vals.push(asset_class); }
  if (status !== undefined) { fields.push('status=?'); vals.push(status); }
  if (description !== undefined) { fields.push('description=?'); vals.push(description); }
  if (sector !== undefined) { fields.push('sector=?'); vals.push(sector); }
  if (exchange !== undefined) { fields.push('exchange=?'); vals.push(exchange); }
  if (currency !== undefined) { fields.push('currency=?'); vals.push(currency); }
  fields.push('updated_at=?'); vals.push(now);
  vals.push(req.params.id);
  
  if (fields.length > 1) run(db, `UPDATE assets SET ${fields.join(',')} WHERE id=?`, vals);
  if (tag_ids !== undefined) setTagsOnRecord(db, 'asset', req.params.id, tag_ids);
  logActivity(req.user?.id, 'updated', 'asset', req.params.id, existing[0].name);
  saveDB();
  
  const rows = query(db, `SELECT * FROM assets WHERE id = ?`, [req.params.id]);
  const asset = { ...rows[0], tags: getTagsForRecord(db, 'asset', req.params.id) };
  res.json(asset);
});

// DELETE /api/assets/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM assets WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  
  run(db, `DELETE FROM record_tags WHERE record_type = 'asset' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM assets WHERE id = ?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted', 'asset', req.params.id, existing[0].name);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
