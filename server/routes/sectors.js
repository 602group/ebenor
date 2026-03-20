const express = require('express');
const router = express.Router();
const { query } = require('../db/helpers');

// Helper to generate the JSON for a specific sector mapping
function buildSectorDashboard(db, assetSector, tableSectorKeyword) {
  // ─── COUNTS ───────────────────────────────────────────────
  const metrics = {
    open_trades: query(db, `
      SELECT COUNT(t.id) as n
      FROM trades t JOIN assets a ON t.asset_id = a.id
      WHERE t.status = 'open' AND a.asset_class = ?`, [assetSector])[0]?.n || 0,
    active_ideas: query(db, `
      SELECT COUNT(i.id) as n 
      FROM ideas i JOIN assets a ON i.asset_id = a.id
      WHERE i.status NOT IN ('rejected','archived') AND a.asset_class = ?`, [assetSector])[0]?.n || 0,
    assets_tracked: query(db, `
      SELECT COUNT(id) as n FROM assets WHERE asset_class = ?`, [assetSector])[0]?.n || 0,
  };

  // ─── ACTIVE TRADES ────────────────────────────────────────
  const active_trades = query(db, `
    SELECT t.id, t.title, t.status, t.trade_type, t.pnl, t.strategy,
           a.name as asset_name, a.symbol as asset_symbol
    FROM trades t JOIN assets a ON t.asset_id = a.id
    WHERE t.status = 'open' AND a.asset_class = ?
    ORDER BY t.created_at DESC LIMIT 6
  `, [assetSector]);

  // ─── RECENT IDEAS ─────────────────────────────────────────
  const recent_ideas = query(db, `
    SELECT i.id, i.title, i.status, i.conviction, i.idea_type,
           a.name as asset_name, a.symbol as asset_symbol
    FROM ideas i JOIN assets a ON i.asset_id = a.id
    WHERE i.status NOT IN ('rejected', 'archived') AND a.asset_class = ?
    ORDER BY CASE i.conviction WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, i.created_at DESC LIMIT 6
  `, [assetSector]);

  // ─── UPCOMING EVENTS ──────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const upcoming_events = query(db, `
    SELECT id, title, event_date, importance
    FROM events 
    WHERE event_date >= ? AND event_date <= ? AND sector = ?
    ORDER BY event_date ASC LIMIT 6
  `, [today, future, tableSectorKeyword]);

  // ─── SECTOR NEWS ────────────────────────────────────────
  const news = query(db, `
    SELECT id, title, source, url, publish_date
    FROM news_articles 
    WHERE asset_class = ?
    ORDER BY created_at DESC LIMIT 6
  `, [assetSector]);

  return { metrics, active_trades, recent_ideas, upcoming_events, news };
}

router.get('/stocks/dashboard', (req, res) => {
  const db = req.app.locals.db;
  res.json(buildSectorDashboard(db, 'stock', 'stocks'));
});

router.get('/forex/dashboard', (req, res) => {
  const db = req.app.locals.db;
  res.json(buildSectorDashboard(db, 'forex', 'forex'));
});

module.exports = router;
