const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord, logActivity } = require('../db/helpers');
const { saveDB } = require('../db/database');

const n = v => v === undefined ? null : v;
const num = v => (v === '' || v == null) ? null : Number(v);

const PORTFOLIO_FIELDS = ['asset_id','account_name','quantity','avg_cost','current_price','realized_pnl',
  'status','position_type','asset_class','strategy','sector','thesis_summary',
  'date_opened','date_closed','property_id','linked_trade_id','linked_idea_id'];

function computeValues(body, existing = {}) {
  const qty     = num(body.quantity)      ?? num(existing.quantity)      ?? 0;
  const avgCost = num(body.avg_cost)      ?? num(existing.avg_cost)      ?? 0;
  const curPrice= num(body.current_price) ?? num(existing.current_price) ?? avgCost;
  const cost_basis    = qty * avgCost;
  const market_value  = qty * curPrice;
  const unrealized_pnl= market_value - cost_basis;
  return { cost_basis, market_value, unrealized_pnl };
}

// ─── Summary ─────────────────────────────────────────────────────────────────
router.get('/summary', (req, res) => {
  const db = req.app.locals.db;
  const all = query(db, `
    SELECT pe.*, a.name as asset_name, a.symbol, a.asset_class as asset_asset_class
    FROM portfolio_entries pe LEFT JOIN assets a ON pe.asset_id = a.id
    WHERE pe.status NOT IN ('exited','closed','archived')
  `);

  const totals = all.reduce((acc, r) => {
    acc.market_value   += parseFloat(r.market_value)    || 0;
    acc.cost_basis     += parseFloat(r.cost_basis)      || 0;
    acc.unrealized_pnl += parseFloat(r.unrealized_pnl)  || 0;
    return acc;
  }, { market_value: 0, cost_basis: 0, unrealized_pnl: 0 });

  const realized = query(db, `SELECT SUM(realized_pnl) as total FROM portfolio_entries WHERE status IN ('exited','closed')`)[0]?.total || 0;

  // Allocation by asset_class
  const byClass = {};
  all.forEach(r => {
    const cls = r.asset_class || 'other';
    if (!byClass[cls]) byClass[cls] = { value: 0, count: 0 };
    byClass[cls].value += parseFloat(r.market_value) || 0;
    byClass[cls].count++;
  });

  // Best/worst performers (by unrealized_pnl %)
  const performers = all
    .filter(r => r.cost_basis > 0)
    .map(r => ({ ...r, pnl_pct: ((r.unrealized_pnl / r.cost_basis) * 100).toFixed(2) }))
    .sort((a, b) => b.pnl_pct - a.pnl_pct);

  res.json({
    total_value:     Math.round(totals.market_value * 100) / 100,
    total_cost:      Math.round(totals.cost_basis * 100) / 100,
    unrealized_pnl:  Math.round(totals.unrealized_pnl * 100) / 100,
    realized_pnl:    Math.round(realized * 100) / 100,
    active_positions: all.length,
    by_class: byClass,
    best_performer:  performers[0] || null,
    worst_performer: performers[performers.length - 1] || null,
  });
});

// ─── List ─────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, asset_class, position_type, strategy, search } = req.query;

  let sql = `SELECT pe.*, a.name as asset_name, a.symbol FROM portfolio_entries pe LEFT JOIN assets a ON pe.asset_id = a.id WHERE 1=1`;
  const params = [];
  if (status)        { sql += ` AND pe.status = ?`;         params.push(status); }
  if (asset_class)   { sql += ` AND pe.asset_class = ?`;    params.push(asset_class); }
  if (position_type) { sql += ` AND pe.position_type = ?`;  params.push(position_type); }
  if (strategy)      { sql += ` AND pe.strategy = ?`;       params.push(strategy); }
  if (search) {
    sql += ` AND (a.name LIKE ? OR a.symbol LIKE ? OR pe.thesis_summary LIKE ?)`;
    const s = `%${search}%`; params.push(s, s, s);
  }
  sql += ` ORDER BY pe.asset_class, a.name ASC`;

  const rows = query(db, sql, params);
  const total_value = rows.filter(r => !['exited','closed','archived'].includes(r.status))
    .reduce((s, r) => s + (parseFloat(r.market_value) || 0), 0);
  const result = rows.map(r => ({ ...r, tags: getTagsForRecord(db, 'portfolio', r.id) }));
  res.json({ entries: result, total_value });
});

// ─── Detail ───────────────────────────────────────────────────────────────────
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT pe.*, a.name as asset_name, a.symbol FROM portfolio_entries pe LEFT JOIN assets a ON pe.asset_id = a.id WHERE pe.id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const entry = { ...rows[0], tags: getTagsForRecord(db, 'portfolio', rows[0].id), notes: getNotesForRecord(db, 'portfolio', rows[0].id) };
  res.json(entry);
});

// ─── Create ───────────────────────────────────────────────────────────────────
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  if (!req.body.asset_id && !req.body.asset_name_free) {
    // Allow free-text name for RE / forex entries without an asset record
    if (!req.body.asset_class) return res.status(400).json({ error: 'asset_id or asset_class required' });
  }
  const id = uuidv4();
  const now = new Date().toISOString();
  const computed = computeValues(req.body);

  const fields = ['id', ...PORTFOLIO_FIELDS, 'cost_basis','market_value','unrealized_pnl','realized_pnl','created_at','updated_at'];
  const vals = [id,
    ...PORTFOLIO_FIELDS.map(f => n(req.body[f])),
    computed.cost_basis, computed.market_value, computed.unrealized_pnl,
    num(req.body.realized_pnl) ?? 0, now, now
  ];
  run(db, `INSERT INTO portfolio_entries (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`, vals);

  if (req.body.tag_ids?.length) setTagsOnRecord(db, 'portfolio', id, req.body.tag_ids);
  logActivity(db, 'created', 'portfolio_entry', id, req.body.asset_name_free || 'Portfolio Entry');
  saveDB();
  const row = query(db, `SELECT pe.*, a.name as asset_name, a.symbol FROM portfolio_entries pe LEFT JOIN assets a ON pe.asset_id = a.id WHERE pe.id = ?`, [id])[0];
  res.status(201).json({ ...row, tags: getTagsForRecord(db, 'portfolio', id) });
});

// ─── Update ───────────────────────────────────────────────────────────────────
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM portfolio_entries WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const computed = computeValues(req.body, existing[0]);
  const now = new Date().toISOString();

  const updFields = []; const updVals = [];
  [...PORTFOLIO_FIELDS, 'realized_pnl'].forEach(f => {
    if (req.body[f] !== undefined) { updFields.push(`${f}=?`); updVals.push(req.body[f]); }
  });
  // Always recompute market values if price/qty changes
  if (req.body.current_price !== undefined || req.body.quantity !== undefined || req.body.avg_cost !== undefined) {
    updFields.push('cost_basis=?','market_value=?','unrealized_pnl=?');
    updVals.push(computed.cost_basis, computed.market_value, computed.unrealized_pnl);
  }
  updFields.push('updated_at=?'); updVals.push(now); updVals.push(req.params.id);
  if (updFields.length > 1) run(db, `UPDATE portfolio_entries SET ${updFields.join(',')} WHERE id=?`, updVals);

  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'portfolio', req.params.id, req.body.tag_ids);
  if (req.body.status && req.body.status !== existing[0].status) {
    logActivity(db, `status_to_${req.body.status}`, 'portfolio_entry', req.params.id, existing[0].id);
  }
  saveDB();
  const row = query(db, `SELECT pe.*, a.name as asset_name, a.symbol FROM portfolio_entries pe LEFT JOIN assets a ON pe.asset_id = a.id WHERE pe.id = ?`, [req.params.id])[0];
  res.json({ ...row, tags: getTagsForRecord(db, 'portfolio', req.params.id) });
});

// ─── Delete ───────────────────────────────────────────────────────────────────
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  run(db, `DELETE FROM record_tags WHERE record_type='portfolio' AND record_id=?`, [req.params.id]);
  run(db, `DELETE FROM portfolio_entries WHERE id=?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
