const express = require('express');
const router = express.Router();
const { query } = require('../db/helpers');

// GET /api/dashboard — command center data
router.get('/', (req, res) => {
  const db = req.app.locals.db;

  // ─── COUNTS ───────────────────────────────────────────────
  const counts = {
    assets:          query(db, `SELECT COUNT(*) as n FROM assets`)[0]?.n || 0,
    trades_open:     query(db, `SELECT COUNT(*) as n FROM trades WHERE status = 'open'`)[0]?.n || 0,
    trades_total:    query(db, `SELECT COUNT(*) as n FROM trades`)[0]?.n || 0,
    ideas_active:    query(db, `SELECT COUNT(*) as n FROM ideas WHERE status NOT IN ('rejected','archived')`)[0]?.n || 0,
    notes:           query(db, `SELECT COUNT(*) as n FROM notes WHERE archived = 0`)[0]?.n || 0,
    properties:      query(db, `SELECT COUNT(*) as n FROM properties`)[0]?.n || 0,
    contacts:        query(db, `SELECT COUNT(*) as n FROM contacts`)[0]?.n || 0,
    documents:       query(db, `SELECT COUNT(*) as n FROM documents WHERE status = 'active'`)[0]?.n || 0,
    alerts_active:   query(db, `SELECT COUNT(*) as n FROM alerts WHERE status = 'active'`)[0]?.n || 0,
    watchlist_items: query(db, `SELECT COUNT(*) as n FROM watchlist_items`)[0]?.n || 0,
    markets:         query(db, `SELECT COUNT(*) as n FROM market_observations`)[0]?.n || 0,
    news_saved:      query(db, `SELECT COUNT(*) as n FROM news_articles WHERE saved = 1`)[0]?.n || 0,
  };

  // ─── P&L ──────────────────────────────────────────────────
  const pnl = query(db, `
    SELECT SUM(pnl) as total_pnl, 
           SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
           COUNT(CASE WHEN status = 'closed' THEN 1 END) as closed
    FROM trades
  `)[0] || {};

  // ─── PORTFOLIO ────────────────────────────────────────────
  const portfolio = query(db, `
    SELECT SUM(market_value) as total_value, SUM(unrealized_pnl) as total_unrealized
    FROM portfolio_entries
  `)[0] || {};

  // ─── RECENT TRADES ────────────────────────────────────────
  const recent_trades = query(db, `
    SELECT t.id, t.title, t.status, t.trade_type, t.pnl, t.entry_date, t.strategy,
           a.name as asset_name, a.symbol as asset_symbol
    FROM trades t LEFT JOIN assets a ON t.asset_id = a.id
    ORDER BY t.created_at DESC LIMIT 6
  `);

  // ─── RECENT IDEAS ─────────────────────────────────────────
  const recent_ideas = query(db, `
    SELECT i.id, i.title, i.status, i.conviction, i.idea_type, i.thesis,
           a.name as asset_name, a.symbol as asset_symbol
    FROM ideas i LEFT JOIN assets a ON i.asset_id = a.id
    WHERE i.status NOT IN ('rejected', 'archived')
    ORDER BY CASE i.conviction WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, i.created_at DESC LIMIT 6
  `);

  // ─── UPCOMING EVENTS ──────────────────────────────────────
  const today = new Date().toISOString().split('T')[0];
  const future = new Date(Date.now() + 21 * 86400000).toISOString().split('T')[0];
  const upcoming_events = query(db, `
    SELECT * FROM events 
    WHERE event_date >= ? AND event_date <= ?
    ORDER BY event_date ASC LIMIT 8
  `, [today, future]);

  // ─── PINNED NOTES ─────────────────────────────────────────
  const pinned_notes = query(db, `
    SELECT id, title, category, body, updated_at 
    FROM notes WHERE pinned = 1 AND archived = 0 
    ORDER BY updated_at DESC LIMIT 6
  `);

  // ─── RECENT NEWS (saved only, most recent) ────────────────
  const recent_news = query(db, `
    SELECT id, title, source, url, category, sentiment, publish_date, summary
    FROM news_articles 
    ORDER BY created_at DESC LIMIT 6
  `);

  // ─── WATCHLISTS SUMMARY ───────────────────────────────────
  const watchlists_summary = query(db, `
    SELECT w.id, w.name, w.asset_class, COUNT(wi.id) as item_count,
           SUM(CASE WHEN wi.priority = 'high' THEN 1 ELSE 0 END) as high_priority_count
    FROM watchlists w
    LEFT JOIN watchlist_items wi ON wi.watchlist_id = w.id
    GROUP BY w.id
    ORDER BY w.created_at DESC LIMIT 6
  `);

  // ─── WATCHLIST HIGH PRIORITY ITEMS ───────────────────────
  const watchlist_high_priority = query(db, `
    SELECT wi.id, wi.priority, wi.status, wi.notes,
           a.name as asset_name, a.symbol, a.asset_class,
           w.name as watchlist_name
    FROM watchlist_items wi
    JOIN assets a ON wi.asset_id = a.id
    JOIN watchlists w ON wi.watchlist_id = w.id
    WHERE wi.priority = 'high'
    ORDER BY wi.added_at DESC LIMIT 8
  `);

  // ─── OPEN REAL ESTATE OPPORTUNITIES ──────────────────────
  const open_properties = query(db, `
    SELECT id, name, city, state, property_type, status, asking_price, cap_rate, strategy
    FROM properties
    WHERE status NOT IN ('closed', 'archived')
    ORDER BY created_at DESC LIMIT 5
  `);

  // ─── RECENT DOCUMENTS ─────────────────────────────────────
  const recent_documents = query(db, `
    SELECT id, title, category, file_name, file_type, created_at
    FROM documents WHERE status = 'active'
    ORDER BY created_at DESC LIMIT 5
  `);

  // ─── RECENT ACTIVITY ──────────────────────────────────────
  const recent_activity = query(db, `
    SELECT * FROM activity_log ORDER BY created_at DESC LIMIT 20
  `);

  // ─── P&L BY STRATEGY ──────────────────────────────────────
  const pnl_by_strategy = query(db, `
    SELECT strategy, 
           COUNT(*) as trade_count,
           SUM(pnl) as total_pnl,
           SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
           AVG(pnl) as avg_pnl
    FROM trades 
    WHERE strategy IS NOT NULL AND status = 'closed'
    GROUP BY strategy 
    ORDER BY total_pnl DESC LIMIT 8
  `);

  res.json({
    counts,
    pnl: { total: pnl.total_pnl || 0, wins: pnl.wins || 0, closed: pnl.closed || 0 },
    portfolio: { total_value: portfolio.total_value || 0, total_unrealized: portfolio.total_unrealized || 0 },
    recent_trades,
    recent_ideas,
    upcoming_events,
    pinned_notes,
    recent_news,
    watchlists_summary,
    watchlist_high_priority,
    open_properties,
    recent_documents,
    recent_activity,
    pnl_by_strategy,
  });
});

module.exports = router;
