const express = require('express');
const router = express.Router();
const { query } = require('../db/helpers');

// GET /api/activity
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { limit = 50, offset = 0, record_type, record_id, user_id, action } = req.query;
  
  let sql = `SELECT * FROM activity_log WHERE 1=1`;
  const params = [];
  
  if (record_type) { sql += ` AND record_type = ?`; params.push(record_type); }
  if (record_id) { sql += ` AND record_id = ?`; params.push(record_id); }
  if (user_id) { sql += ` AND user_id = ?`; params.push(user_id); }
  if (action) { sql += ` AND action = ?`; params.push(action); }
  
  // Always sort newest first
  sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(Number(limit), Number(offset));
  
  try {
    const logs = query(db, sql, params);
    res.json(logs);
  } catch (error) {
    console.error('Failed to fetch activity logs:', error);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

module.exports = router;
