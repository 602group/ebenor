const express = require('express');
const router = express.Router();
const { query } = require('../db/helpers');

// GET /api/re/dashboard — internal Real Estate summary dashboard
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  // ─── Pipeline counts by status ────────────────────────────────────────────
  const PIPELINE_STATUSES = ['researching','lead-identified','contacted','analyzing',
    'offer-planned','offer-submitted','negotiating','under-contract','closed','passed','archived'];

  const statusRows = query(db, `SELECT status, COUNT(*) as count FROM properties GROUP BY status`);
  const byStatus = {};
  PIPELINE_STATUSES.forEach(s => { byStatus[s] = 0; });
  statusRows.forEach(r => { if (r.status in byStatus) byStatus[r.status] = r.count; });

  // ─── Aggregate stats ──────────────────────────────────────────────────────
  const stats = query(db, `
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status NOT IN ('closed','passed','archived') THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high_priority,
      SUM(CASE WHEN status = 'under-contract' THEN 1 ELSE 0 END) as under_contract,
      SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_count,
      SUM(CASE WHEN status NOT IN ('closed','passed','archived') THEN asking_price ELSE 0 END) as active_pipeline_value,
      AVG(CASE WHEN cap_rate > 0 THEN cap_rate END) as avg_cap_rate
    FROM properties
  `)[0] || {};

  // ─── High priority opportunities ──────────────────────────────────────────
  const high_priority = query(db, `
    SELECT id, name, city, state, status, asking_price, cap_rate, strategy, property_type, next_follow_up
    FROM properties WHERE priority = 'high' AND status NOT IN ('closed','passed','archived')
    ORDER BY updated_at DESC LIMIT 8
  `);

  // ─── Upcoming follow-ups ──────────────────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const upcoming_followups = query(db, `
    SELECT id, name, city, state, status, next_follow_up, priority
    FROM properties WHERE next_follow_up BETWEEN ? AND ?
    ORDER BY next_follow_up ASC LIMIT 10
  `, [today, future]);

  // ─── Recent activity ──────────────────────────────────────────────────────
  const recent_activity = query(db, `
    SELECT * FROM activity_log
    WHERE record_type IN ('property','market_research')
    ORDER BY created_at DESC LIMIT 15
  `);

  // ─── Recently updated market research ─────────────────────────────────────
  const recent_markets = query(db, `
    SELECT id, name, region, category, trend, status, updated_at
    FROM market_observations
    WHERE market_type = 'real-estate'
    ORDER BY updated_at DESC LIMIT 6
  `);

  // ─── Recent documents linked to properties ────────────────────────────────
  const recent_docs = query(db, `
    SELECT d.id, d.title, d.category, d.file_type, d.created_at,
           rl.source_id as property_id
    FROM documents d
    JOIN record_links rl ON rl.target_id = d.id AND rl.target_type = 'document' AND rl.source_type = 'property'
    ORDER BY d.created_at DESC LIMIT 5
  `);

  // ─── Recent notes for properties ──────────────────────────────────────────
  const recent_notes = query(db, `
    SELECT n.id, n.title, n.category, n.updated_at,
           rn.record_id as property_id
    FROM notes n
    JOIN record_notes rn ON rn.note_id = n.id AND rn.record_type = 'property'
    WHERE n.archived = 0
    ORDER BY n.updated_at DESC LIMIT 6
  `);

  res.json({
    stats,
    by_status: byStatus,
    high_priority,
    upcoming_followups,
    recent_activity,
    recent_markets,
    recent_docs,
    recent_notes,
  });
});

module.exports = router;
