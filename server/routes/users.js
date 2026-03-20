const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, run } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

// Ensure only 'owner' or explicit 'users' permission can manage users
const requireUserAdmin = (req, res, next) => {
  if (req.user?.role === 'owner') return next();
  
  // Custom permissions check fallback
  const perms = req.user?.permissions || [];
  if (perms.includes('users')) return next();
  
  return res.status(403).json({ error: 'Unauthorized to manage users' });
};

// GET /api/users
router.get('/', requireUserAdmin, (req, res) => {
  const db = req.app.locals.db;
  const users = query(db, `SELECT id, username, role, name, email, avatar_url, status, permissions, created_at, updated_at FROM users ORDER BY created_at ASC`);
  
  // Parse JSON permissions before sending to frontend
  const parsed = users.map(u => ({
    ...u,
    permissions: u.permissions ? JSON.parse(u.permissions) : []
  }));
  
  res.json(parsed);
});

// POST /api/users
router.post('/', requireUserAdmin, (req, res) => {
  const db = req.app.locals.db;
  const { username, password, role = 'viewer', name, email, avatar_url, status = 'active', permissions = [] } = req.body;
  
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  
  const existing = query(db, `SELECT id FROM users WHERE username = ? OR (email = ? AND email IS NOT NULL)`, [username, email]);
  if (existing.length) return res.status(400).json({ error: 'Username or email already exists' });
  
  const id = uuidv4();
  const hash = bcrypt.hashSync(password, 10);
  const permsStr = JSON.stringify(permissions);
  const now = new Date().toISOString();
  
  run(db, `INSERT INTO users (id, username, password_hash, role, name, email, avatar_url, status, permissions, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, username, hash, role, name || null, email || null, avatar_url || null, status, permsStr, now, now]);
    
  logActivity(req.user?.id, 'created_user', 'user', id, name || username);
  saveDB();
  
  // Return without hash
  const created = query(db, `SELECT id, username, role, name, email, avatar_url, status, permissions, created_at, updated_at FROM users WHERE id = ?`, [id])[0];
  created.permissions = JSON.parse(created.permissions);
  
  res.status(201).json(created);
});

// PATCH /api/users/:id
router.patch('/:id', requireUserAdmin, (req, res) => {
  const db = req.app.locals.db;
  const target = query(db, `SELECT * FROM users WHERE id = ?`, [req.params.id])[0];
  
  if (!target) return res.status(404).json({ error: 'User not found' });
  
  // Prevent non-owners from editing the primary owner, to prevent accidental lockout
  if (target.role === 'owner' && req.user?.role !== 'owner') {
    return res.status(403).json({ error: 'Only an owner can modify another owner' });
  }
  
  const { username, password, role, name, email, avatar_url, status, permissions } = req.body;
  const now = new Date().toISOString();
  
  let hash = target.password_hash;
  if (password && password.trim() !== '') {
    hash = bcrypt.hashSync(password, 10);
  }
  
  const permsStr = permissions ? JSON.stringify(permissions) : target.permissions;
  
  run(db, `UPDATE users SET username=?, password_hash=?, role=?, name=?, email=?, avatar_url=?, status=?, permissions=?, updated_at=? WHERE id=?`,
    [
      username ?? target.username,
      hash,
      role ?? target.role,
      name !== undefined ? name : target.name,
      email !== undefined ? email : target.email,
      avatar_url !== undefined ? avatar_url : target.avatar_url,
      status ?? target.status,
      permsStr,
      now,
      req.params.id
    ]);
    
  logActivity(req.user?.id, 'updated_user', 'user', req.params.id, name ?? target.name ?? username ?? target.username);
  saveDB();
  
  const updated = query(db, `SELECT id, username, role, name, email, avatar_url, status, permissions, created_at, updated_at FROM users WHERE id = ?`, [req.params.id])[0];
  updated.permissions = JSON.parse(updated.permissions);
  
  res.json(updated);
});

// DELETE /api/users/:id
router.delete('/:id', requireUserAdmin, (req, res) => {
  const db = req.app.locals.db;
  const target = query(db, `SELECT * FROM users WHERE id = ?`, [req.params.id])[0];
  
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.role === 'owner' && req.user?.role !== 'owner') return res.status(403).json({ error: 'Cannot delete an owner unless you are an owner' });
  if (req.user?.id === req.params.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  
  run(db, `DELETE FROM users WHERE id = ?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted_user', 'user', req.params.id, target.name || target.username);
  saveDB();
  
  res.json({ success: true });
});

module.exports = router;
