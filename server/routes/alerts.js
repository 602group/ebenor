const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, logActivity } = require('../db/helpers');
const { saveDB } = require('../db/database');

const n = v => v === undefined ? null : v;

const ALERT_FIELDS = ['title','description','alert_type','status','asset_id',
  'condition_type','condition_value','message','priority','trigger_type','trigger_date',
  'linked_idea_id','linked_property_id','linked_event_id','linked_note_id','linked_trade_id'];

// ─── Summary ─────────────────────────────────────────────────────────────────
router.get('/summary', (req, res) => {
  const db = req.app.locals.db;
  const today = new Date().toISOString().split('T')[0];
  const in7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];

  const overdue   = query(db, `SELECT COUNT(*) as c FROM alerts WHERE status='active' AND trigger_date < ?`, [today])[0]?.c || 0;
  const dueToday  = query(db, `SELECT COUNT(*) as c FROM alerts WHERE status='active' AND trigger_date = ?`, [today])[0]?.c || 0;
  const upcoming  = query(db, `SELECT COUNT(*) as c FROM alerts WHERE status='active' AND trigger_date BETWEEN ? AND ?`, [today, in7])[0]?.c || 0;
  const highPri   = query(db, `SELECT COUNT(*) as c FROM alerts WHERE status='active' AND priority IN ('high','critical')`)[0]?.c || 0;
  const totalActive = query(db, `SELECT COUNT(*) as c FROM alerts WHERE status='active'`)[0]?.c || 0;

  res.json({ overdue, due_today: dueToday, upcoming_7d: upcoming, high_priority: highPri, total_active: totalActive });
});

// ─── List ─────────────────────────────────────────────────────────────────────
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, priority, trigger_type, alert_type, asset_id, overdue, search, sector } = req.query;
  const today = new Date().toISOString().split('T')[0];

  let sql = `SELECT al.*, a.name as asset_name, a.symbol FROM alerts al LEFT JOIN assets a ON al.asset_id = a.id WHERE 1=1`;
  const params = [];
  if (status)       { sql += ` AND al.status = ?`;         params.push(status); }
  if (priority)     { sql += ` AND al.priority = ?`;       params.push(priority); }
  if (trigger_type) { sql += ` AND al.trigger_type = ?`;   params.push(trigger_type); }
  if (alert_type)   { sql += ` AND al.alert_type = ?`;     params.push(alert_type); }
  if (asset_id)     { sql += ` AND al.asset_id = ?`;       params.push(asset_id); }
  if (overdue === 'true') { sql += ` AND al.status='active' AND al.trigger_date < ?`; params.push(today); }
  if (search) {
    sql += ` AND (al.title LIKE ? OR al.description LIKE ?)`;
    const s = `%${search}%`; params.push(s, s);
  }
  if (sector) {
    const ac = sector === 'stocks' ? 'stock' : sector;
    sql += ` AND a.asset_class = ?`; params.push(ac);
  }
  sql += ` ORDER BY CASE al.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, al.trigger_date ASC, al.created_at DESC`;

  const rows = query(db, sql, params);
  res.json(rows.map(r => ({ ...r, tags: getTagsForRecord(db, 'alert', r.id) })));
});

// GET /api/alerts/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT al.*, a.name as asset_name FROM alerts al LEFT JOIN assets a ON al.asset_id = a.id WHERE al.id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'alert', rows[0].id) });
});

// POST /api/alerts
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  if (!req.body.title) return res.status(400).json({ error: 'Title required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  const fields = ['id', ...ALERT_FIELDS, 'triggered_at', 'created_at', 'updated_at'];
  const vals = [id, ...ALERT_FIELDS.map(f => n(req.body[f])), null, now, now];
  run(db, `INSERT INTO alerts (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`, vals);
  if (req.body.tag_ids?.length) setTagsOnRecord(db, 'alert', id, req.body.tag_ids);
  logActivity(db, 'created', 'alert', id, req.body.title);
  saveDB();
  const row = query(db, `SELECT * FROM alerts WHERE id = ?`, [id])[0];
  res.status(201).json({ ...row, tags: getTagsForRecord(db, 'alert', id) });
});

// PATCH /api/alerts/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM alerts WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  const updFields = []; const updVals = [];
  [...ALERT_FIELDS, 'triggered_at', 'completed_at', 'dismissed_at'].forEach(f => {
    if (req.body[f] !== undefined) { updFields.push(`${f}=?`); updVals.push(req.body[f]); }
  });
  updFields.push('updated_at=?'); updVals.push(now); updVals.push(req.params.id);
  if (updFields.length > 1) run(db, `UPDATE alerts SET ${updFields.join(',')} WHERE id=?`, updVals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'alert', req.params.id, req.body.tag_ids);
  saveDB();
  const row = query(db, `SELECT * FROM alerts WHERE id = ?`, [req.params.id])[0];
  res.json({ ...row, tags: getTagsForRecord(db, 'alert', req.params.id) });
});

// POST /api/alerts/:id/complete
router.post('/:id/complete', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM alerts WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  run(db, `UPDATE alerts SET status='completed', completed_at=?, updated_at=? WHERE id=?`, [now, now, req.params.id]);
  logActivity(db, 'completed', 'alert', req.params.id, existing[0].title);
  saveDB();
  res.json({ success: true, completed_at: now });
});

// POST /api/alerts/:id/dismiss
router.post('/:id/dismiss', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM alerts WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  run(db, `UPDATE alerts SET status='dismissed', dismissed_at=?, updated_at=? WHERE id=?`, [now, now, req.params.id]);
  saveDB();
  res.json({ success: true });
});

// POST /api/alerts/:id/snooze — extend trigger_date by N days
router.post('/:id/snooze', (req, res) => {
  const db = req.app.locals.db;
  const days = parseInt(req.body.days) || 1;
  const existing = query(db, `SELECT * FROM alerts WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const cur = existing[0].trigger_date || new Date().toISOString().split('T')[0];
  const newDate = new Date(cur);
  newDate.setDate(newDate.getDate() + days);
  const snoozed = newDate.toISOString().split('T')[0];
  run(db, `UPDATE alerts SET trigger_date=?, status='active', updated_at=? WHERE id=?`, [snoozed, new Date().toISOString(), req.params.id]);
  saveDB();
  res.json({ success: true, trigger_date: snoozed });
});

// DELETE /api/alerts/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  run(db, `DELETE FROM record_tags WHERE record_type='alert' AND record_id=?`, [req.params.id]);
  run(db, `DELETE FROM alerts WHERE id=?`, [req.params.id]);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
