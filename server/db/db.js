const { initDB } = require('./db/database');
const fs = require('fs');
const path = require('path');

// Initialize DB on startup
const db = initDB();

// Ensure uploads dir exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

module.exports = db;
