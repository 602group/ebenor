const initSqlJs = require('./node_modules/sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'db/investment_platform.db');

async function migrate() {
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(fileBuffer);
  
  // Add updated_at without a DEFAULT function (SQLite ALTER TABLE limitation)
  // The application code will set this explicitly
  try {
    db.run(`ALTER TABLE users ADD COLUMN updated_at TEXT`);
    console.log('OK: added updated_at column');
  } catch(e) {
    if (e.message?.includes('duplicate column') || e.message?.includes('already exists')) {
      console.log('EXISTS: updated_at already there');
    } else {
      console.warn('WARN:', e.message);
    }
  }
  
  // Verify 
  const cols = db.exec("PRAGMA table_info(users)")[0];
  console.log('Users table columns now:', cols.values.map(r => r[1]).join(', '));
  
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  console.log('Done!');
}

migrate().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
