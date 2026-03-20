const express = require('express');
const router = express.Router();
const { query } = require('../db/helpers');

// Will contain /trades, /portfolio, /real-estate, /ideas, /strategies, /research endpoints

// ==========================================
// 1. TRADES REPORTING
// ==========================================
router.get('/trades', (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // Basic overview metrics
    const overall = query(db, `
      SELECT 
        COUNT(id) as total_trades,
        SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as closed_trades,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_trades,
        SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned_trades,
        SUM(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(CASE WHEN status = 'closed' AND pnl < 0 THEN 1 ELSE 0 END) as losing_trades,
        SUM(CASE WHEN status = 'closed' AND pnl = 0 THEN 1 ELSE 0 END) as breakeven_trades,
        SUM(pnl) as total_pnl,
        AVG(CASE WHEN status = 'closed' AND pnl > 0 THEN pnl ELSE NULL END) as avg_win,
        AVG(CASE WHEN status = 'closed' AND pnl < 0 THEN pnl ELSE NULL END) as avg_loss,
        MAX(pnl) as best_trade,
        MIN(pnl) as worst_trade
      FROM trades
    `)[0];

    // Performance by Asset Class
    const byAssetClass = query(db, `
      SELECT a.asset_class, COUNT(t.id) as trade_count, SUM(t.pnl) as total_pnl,
             SUM(CASE WHEN t.status = 'closed' AND t.pnl > 0 THEN 1 ELSE 0 END) as wins
      FROM trades t
      JOIN assets a ON t.asset_id = a.id
      WHERE t.status = 'closed'
      GROUP BY a.asset_class
      ORDER BY total_pnl DESC
    `);

    // Performance by Strategy
    const byStrategy = query(db, `
      SELECT strategy, COUNT(id) as trade_count, SUM(pnl) as total_pnl,
             SUM(CASE WHEN status = 'closed' AND pnl > 0 THEN 1 ELSE 0 END) as wins
      FROM trades
      WHERE status = 'closed' AND strategy IS NOT NULL AND strategy != ''
      GROUP BY strategy
      ORDER BY total_pnl DESC
    `);

    res.json({
      overall: {
        ...overall,
        win_rate: overall.closed_trades > 0 ? (overall.winning_trades / overall.closed_trades) * 100 : 0,
        profit_factor: Math.abs(overall.avg_loss) > 0 ? (overall.avg_win / Math.abs(overall.avg_loss)) : 0
      },
      by_asset_class: byAssetClass.map(a => ({ ...a, win_rate: a.trade_count > 0 ? (a.wins / a.trade_count) * 100 : 0 })),
      by_strategy: byStrategy.map(s => ({ ...s, win_rate: s.trade_count > 0 ? (s.wins / s.trade_count) * 100 : 0 }))
    });
  } catch (error) {
    console.error('Error generating trades report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ==========================================
// 2. PORTFOLIO REPORTING
// ==========================================
router.get('/portfolio', (req, res) => {
  const db = req.app.locals.db;
  
  try {
    // Current allocation and total value
    const snapshot = query(db, `
      SELECT 
        SUM(market_value) as total_value,
        SUM(unrealized_pnl) as total_unrealized_pnl,
        SUM(cost_basis) as total_cost_basis,
        COUNT(id) as active_positions
      FROM portfolio_entries
      WHERE status = 'active'
    `)[0];

    // Allocation by Asset Class
    const allocation = query(db, `
      SELECT asset_class, SUM(market_value) as value, COUNT(id) as position_count
      FROM portfolio_entries
      WHERE status = 'active'
      GROUP BY asset_class
      ORDER BY value DESC
    `);

    // Top performers (Unrealized PNL)
    const topPerformers = query(db, `
      SELECT p.id, a.name, a.symbol, p.asset_class, p.market_value, p.unrealized_pnl
      FROM portfolio_entries p
      JOIN assets a ON p.asset_id = a.id
      WHERE p.status = 'active'
      ORDER BY p.unrealized_pnl DESC
      LIMIT 10
    `);

    res.json({
      snapshot,
      allocation: allocation.map(a => ({
        ...a,
        percentage: snapshot.total_value > 0 ? (a.value / snapshot.total_value) * 100 : 0
      })),
      top_performers: topPerformers
    });
  } catch (error) {
    console.error('Error generating portfolio report:', error);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

// ==========================================
// 3. REAL ESTATE REPORTING
// ==========================================
router.get('/real-estate', (req, res) => {
  const db = req.app.locals.db;
  try {
    const pipeline = query(db, `
      SELECT status, COUNT(id) as count
      FROM properties
      GROUP BY status
    `);
    
    const byMarket = query(db, `
      SELECT city, state, COUNT(id) as property_count
      FROM properties
      WHERE city IS NOT NULL AND city != ''
      GROUP BY city, state
      ORDER BY property_count DESC
      LIMIT 10
    `);

    res.json({ pipeline, by_market: byMarket });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate real estate report' });
  }
});

// ==========================================
// 4. IDEAS REPORTING
// ==========================================
router.get('/ideas', (req, res) => {
  const db = req.app.locals.db;
  try {
    const stats = query(db, `
      SELECT 
        COUNT(id) as total_ideas,
        SUM(CASE WHEN status = 'researching' THEN 1 ELSE 0 END) as active_ideas,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_ideas,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_ideas,
        SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END) as archived_ideas
      FROM ideas
    `)[0];

    const byConviction = query(db, `
      SELECT conviction, COUNT(id) as count
      FROM ideas
      GROUP BY conviction
    `);

    res.json({ stats, by_conviction: byConviction });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate ideas report' });
  }
});

// ==========================================
// 5. STRATEGIES REPORTING
// ==========================================
router.get('/strategies', (req, res) => {
  const db = req.app.locals.db;
  try {
    // Note: This correlates trades back to strategies by string matching the strategy name
    // Future proofing: If strategies get linked via ID, this query would update.
    const performance = query(db, `
      SELECT 
        s.name as strategy_name,
        s.category,
        COUNT(t.id) as total_trades,
        SUM(CASE WHEN t.status = 'closed' AND t.pnl > 0 THEN 1 ELSE 0 END) as winning_trades,
        SUM(t.pnl) as total_pnl
      FROM strategies s
      LEFT JOIN trades t ON t.strategy = s.name AND t.status = 'closed'
      GROUP BY s.id
      ORDER BY total_pnl DESC
    `);

    res.json({ 
      performance: performance.map(p => ({
        ...p,
        win_rate: p.total_trades > 0 ? (p.winning_trades / p.total_trades) * 100 : 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate strategies report' });
  }
});

// ==========================================
// 6. RESEARCH ACTIVITY REPORTING
// ==========================================
router.get('/research', (req, res) => {
  const db = req.app.locals.db;
  try {
    const counts = query(db, `
      SELECT 
        (SELECT COUNT(*) FROM notes) as total_notes,
        (SELECT COUNT(*) FROM knowledge_records) as total_knowledge_records,
        (SELECT COUNT(*) FROM documents) as total_documents,
        (SELECT COUNT(*) FROM tags) as total_tags
    `)[0];

    // Activity over the last 30 days based on the activity_log table
    const recentActivity = query(db, `
      SELECT action, record_type, COUNT(id) as count
      FROM activity_log
      WHERE created_at >= date('now', '-30 days')
      GROUP BY action, record_type
      ORDER BY count DESC
    `);

    res.json({ counts, recent_activity: recentActivity });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate research report' });
  }
});

module.exports = router;
