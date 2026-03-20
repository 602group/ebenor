const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// GET /api/trades
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, trade_type, asset_id, strategy, search, sector, tag, sort = 'created_at', order = 'desc' } = req.query;
  
  let sql = `SELECT t.*, a.name as asset_name, a.symbol as asset_symbol, a.asset_class 
             FROM trades t LEFT JOIN assets a ON t.asset_id = a.id WHERE 1=1`;
  const params = [];
  
  if (status) { sql += ` AND t.status = ?`; params.push(status); }
  if (trade_type) { sql += ` AND t.trade_type = ?`; params.push(trade_type); }
  if (asset_id) { sql += ` AND t.asset_id = ?`; params.push(asset_id); }
  if (strategy) { sql += ` AND t.strategy = ?`; params.push(strategy); }
  if (search) { sql += ` AND (t.title LIKE ? OR t.strategy LIKE ?)`; const s=`%${search}%`; params.push(s,s); }
  if (sector) {
    const ac = sector === 'stocks' ? 'stock' : sector;
    sql += ` AND a.asset_class = ?`; params.push(ac);
  }
  
  const allowed = ['created_at','entry_date','exit_date','pnl','title','status'];
  const col = allowed.includes(sort) ? `t.${sort}` : 't.created_at';
  const dir = order === 'asc' ? 'ASC' : 'DESC';
  sql += ` ORDER BY ${col} ${dir}`;
  
  let trades = query(db, sql, params);
  
  if (tag) {
    trades = trades.filter(t => {
      const tags = getTagsForRecord(db, 'trade', t.id);
      return tags.some(tg => tg.name === tag || tg.id === tag);
    });
  }
  
  const result = trades.map(t => ({ ...t, tags: getTagsForRecord(db, 'trade', t.id) }));
  res.json(result);
});

// GET /api/trades/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `
    SELECT t.*, a.name as asset_name, a.symbol as asset_symbol, a.asset_class
    FROM trades t LEFT JOIN assets a ON t.asset_id = a.id WHERE t.id = ?
  `, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const trade = rows[0];
  trade.tags = getTagsForRecord(db, 'trade', trade.id);
  trade.notes = getNotesForRecord(db, 'trade', trade.id);
  res.json(trade);
});

// POST /api/trades
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  const { title, asset_id, trade_type = 'long', status = 'planned', strategy, timeframe,
    entry_price, exit_price, stop_loss, take_profit, size, pnl, fees,
    entry_date, exit_date, risk_reward, conviction, notes_body, mistakes, lessons, tag_ids = [] } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO trades (id, asset_id, title, trade_type, status, strategy, timeframe,
    entry_price, exit_price, stop_loss, take_profit, size, pnl, fees,
    entry_date, exit_date, risk_reward, conviction, notes_body, mistakes, lessons, created_at, updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [id, asset_id, title, trade_type, status, strategy, timeframe,
     entry_price, exit_price, stop_loss, take_profit, size, pnl, fees,
     entry_date, exit_date, risk_reward, conviction, notes_body, mistakes, lessons, now, now]);
  
  if (tag_ids.length) setTagsOnRecord(db, 'trade', id, tag_ids);
  logActivity(req.user?.id, 'created', 'trade', id, title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM trades WHERE id = ?`, [id]);
  res.status(201).json({ ...rows[0], tags: getTagsForRecord(db, 'trade', id) });
});

// PATCH /api/trades/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM trades WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  
  const fields = [];
  const vals = [];
  const updatable = ['title','asset_id','trade_type','status','strategy','timeframe',
    'entry_price','exit_price','stop_loss','take_profit','size','pnl','fees',
    'entry_date','exit_date','risk_reward','conviction','notes_body','mistakes','lessons'];
  
  for (const key of updatable) {
    if (req.body[key] !== undefined) { fields.push(`${key}=?`); vals.push(req.body[key]); }
  }
  fields.push('updated_at=?'); vals.push(now); vals.push(req.params.id);
  
  if (fields.length > 1) run(db, `UPDATE trades SET ${fields.join(',')} WHERE id=?`, vals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'trade', req.params.id, req.body.tag_ids);
  logActivity(req.user?.id, 'updated', 'trade', req.params.id, existing[0].title);
  saveDB();
  
  const rows = query(db, `SELECT * FROM trades WHERE id = ?`, [req.params.id]);
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'trade', req.params.id) });
});

// DELETE /api/trades/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM trades WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  run(db, `DELETE FROM record_tags WHERE record_type = 'trade' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM trades WHERE id = ?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted', 'trade', req.params.id, existing[0].title);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
