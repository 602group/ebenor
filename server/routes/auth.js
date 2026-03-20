const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/helpers');

// POST /api/auth/login
router.post('/login', (req, res) => {
  console.log(`[AUTH DEBUG] Login request received for username: ${req.body.username}`);
  const { username, password } = req.body;
  const db = req.app.locals.db;
  
  console.log(`[AUTH DEBUG] Executing SQLite query...`);
  const users = query(db, `SELECT * FROM users WHERE username = ?`, [username]);
  console.log(`[AUTH DEBUG] Query completed. Found ${users.length} users.`);
  if (!users.length) return res.status(401).json({ error: 'Invalid credentials' });
  
  const user = users[0];
  console.log(`[AUTH DEBUG] Comparing bcrypt hash...`);
  const valid = bcrypt.compareSync(password, user.password_hash);
  console.log(`[AUTH DEBUG] Bcrypt validation returned: ${valid}`);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  
  let perms = [];
  try {
    perms = user.permissions ? JSON.parse(user.permissions) : [];
  } catch (err) {
    console.error('Failed to parse user permissions on login', err);
  }
  
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name, avatar_url: user.avatar_url, permissions: perms },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );
  
  res.json({ token, user: { id: user.id, username: user.username, role: user.role, name: user.name, avatar_url: user.avatar_url, permissions: perms } });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token' });
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Always fetch fresh truth from DB to ensure revoked permissions/suspensions take effect instantly
    const db = req.app.locals.db;
    const users = query(db, `SELECT * FROM users WHERE id = ?`, [decoded.id]);
    
    if (!users.length) return res.status(401).json({ error: 'User no longer exists' });
    const u = users[0];
    
    if (u.status !== 'active') return res.status(401).json({ error: 'Account suspended' });
    
    let perms = [];
    try {
      perms = u.permissions ? JSON.parse(u.permissions) : [];
    } catch {}
    
    res.json({ user: { id: u.id, username: u.username, role: u.role, name: u.name, avatar_url: u.avatar_url, permissions: perms } });
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
