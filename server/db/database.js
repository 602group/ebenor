const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'investment_platform.db');

let db = null;
let SQL = null;

async function initDB() {
  SQL = await initSqlJs();
  
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  createTables();
  runMigrations();
  seedAdmin();
  
  return db;
}

function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function getDB() {
  return db;
}

function createTables() {
  db.run(`PRAGMA journal_mode=WAL;`);
  db.run(`PRAGMA foreign_keys=ON;`);

  // Users
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'owner',
    name TEXT,
    email TEXT UNIQUE,
    avatar_url TEXT,
    status TEXT DEFAULT 'active',
    permissions TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Tags (platform-wide)
  db.run(`CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#6366f1',
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // Assets
  db.run(`CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    symbol TEXT,
    asset_class TEXT NOT NULL DEFAULT 'stock',
    status TEXT DEFAULT 'active',
    description TEXT,
    sector TEXT,
    exchange TEXT,
    currency TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Trades
  db.run(`CREATE TABLE IF NOT EXISTS trades (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    trade_type TEXT NOT NULL DEFAULT 'long',
    status TEXT DEFAULT 'planned',
    strategy TEXT,
    timeframe TEXT,
    entry_price REAL,
    exit_price REAL,
    stop_loss REAL,
    take_profit REAL,
    size REAL,
    pnl REAL,
    fees REAL,
    entry_date TEXT,
    exit_date TEXT,
    risk_reward REAL,
    conviction TEXT,
    notes_body TEXT,
    mistakes TEXT,
    lessons TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Investment Ideas
  db.run(`CREATE TABLE IF NOT EXISTS ideas (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'researching',
    conviction TEXT DEFAULT 'medium',
    idea_type TEXT DEFAULT 'long',
    timeframe TEXT,
    target_price REAL,
    stop_price REAL,
    thesis TEXT,
    risks TEXT,
    catalysts TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Notes (standalone + attachable)
  db.run(`CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    category TEXT DEFAULT 'general',
    pinned INTEGER DEFAULT 0,
    archived INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // News Articles (Legacy scraped feeds)
  db.run(`CREATE TABLE IF NOT EXISTS news_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    url TEXT,
    source TEXT,
    summary TEXT,
    body TEXT,
    category TEXT DEFAULT 'general',
    asset_class TEXT,
    saved INTEGER DEFAULT 0,
    sentiment TEXT,
    publish_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // News Resources (Curated links/channels per sector - Chunk 9)
  db.run(`CREATE TABLE IF NOT EXISTS news_resources (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    sector TEXT NOT NULL,
    resource_type TEXT DEFAULT 'website',
    url TEXT,
    description TEXT,
    is_featured INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Properties
  db.run(`CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    property_type TEXT DEFAULT 'residential',
    status TEXT DEFAULT 'researching',
    strategy TEXT,
    asking_price REAL,
    arv REAL,
    rehab_estimate REAL,
    noi REAL,
    cap_rate REAL,
    units INTEGER,
    sqft INTEGER,
    year_built INTEGER,
    description TEXT,
    listing_url TEXT,
    agent_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Documents
  db.run(`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    file_path TEXT,
    file_name TEXT,
    file_type TEXT,
    file_size INTEGER,
    status TEXT DEFAULT 'active',
    category TEXT DEFAULT 'general',
    description TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Property Reports
  db.run(`CREATE TABLE IF NOT EXISTS property_reports (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
    address_snapshot TEXT,
    estimated_value REAL,
    investment_score INTEGER,
    neighborhood_score INTEGER,
    recommended_strategy TEXT,
    report_data TEXT,
    status TEXT DEFAULT 'completed',
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Stock Reports
  db.run(`CREATE TABLE IF NOT EXISTS stock_reports (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
    ticker TEXT NOT NULL,
    company_name TEXT,
    price_at_time REAL,
    valuation_score INTEGER,
    overall_score INTEGER,
    recommendation TEXT,
    report_data TEXT,
    status TEXT DEFAULT 'completed',
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Contacts
  db.run(`CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    contact_type TEXT DEFAULT 'other',
    role TEXT,
    city TEXT,
    state TEXT,
    notes_body TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Alerts
  db.run(`CREATE TABLE IF NOT EXISTS alerts (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    alert_type TEXT DEFAULT 'price',
    status TEXT DEFAULT 'active',
    asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
    condition_type TEXT,
    condition_value REAL,
    message TEXT,
    triggered_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS stock_watchlist (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    company_name TEXT,
    notes TEXT DEFAULT '',
    rating TEXT DEFAULT 'watching',
    added_at TEXT,
    updated_at TEXT
  )`);

  // Macro Events (Calendar)
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    event_type TEXT DEFAULT 'economic',
    event_date TEXT NOT NULL,
    event_time TEXT,
    country TEXT,
    importance TEXT DEFAULT 'medium',
    description TEXT,
    actual_value TEXT,
    forecast_value TEXT,
    previous_value TEXT,
    category TEXT DEFAULT 'economic',
    pre_event_notes TEXT,
    post_event_notes TEXT,
    outcome_notes TEXT,
    status TEXT DEFAULT 'upcoming',
    reviewed INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Knowledge Records (Chunk 5)
  db.run(`CREATE TABLE IF NOT EXISTS knowledge_records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    summary TEXT,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Strategies (Chunk 5)
  db.run(`CREATE TABLE IF NOT EXISTS strategies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    description TEXT,
    rules_framework TEXT,
    entry_criteria TEXT,
    exit_criteria TEXT,
    risk_considerations TEXT,
    asset_classes TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Portfolio Entries
  db.run(`CREATE TABLE IF NOT EXISTS portfolio_entries (
    id TEXT PRIMARY KEY,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    account_name TEXT,
    quantity REAL NOT NULL DEFAULT 0,
    avg_cost REAL NOT NULL DEFAULT 0,
    current_price REAL,
    market_value REAL,
    unrealized_pnl REAL,
    realized_pnl REAL DEFAULT 0,
    weight REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Watchlists
  db.run(`CREATE TABLE IF NOT EXISTS watchlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    asset_class TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS watchlist_items (
    id TEXT PRIMARY KEY,
    watchlist_id TEXT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    asset_id TEXT NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'watching',
    alert_price REAL,
    next_review_date TEXT,
    notes TEXT,
    added_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Market-level observations (separate from individual assets)
  // Examples: "Phoenix Housing Market", "DXY", "S&P 500 Technical Trend"
  db.run(`CREATE TABLE IF NOT EXISTS market_observations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    market_type TEXT NOT NULL DEFAULT 'stocks',
    ticker TEXT,
    region TEXT,
    description TEXT,
    observation_notes TEXT,
    trend TEXT,
    status TEXT DEFAULT 'watching',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);


  // Newsletter Subscribers (Chunk 13)
  db.run(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Blog Posts (Chunk 13)
  db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT,
    status TEXT DEFAULT 'Draft',
    author TEXT,
    published_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // ---- SHARED PLATFORM TABLES ----

  // record_notes: polymorphic note attachment
  db.run(`CREATE TABLE IF NOT EXISTS record_notes (
    id TEXT PRIMARY KEY,
    note_id TEXT NOT NULL REFERENCES notes(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL,
    record_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // record_tags: polymorphic tag attachment
  db.run(`CREATE TABLE IF NOT EXISTS record_tags (
    id TEXT PRIMARY KEY,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    record_type TEXT NOT NULL,
    record_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // record_links: any record linked to any other
  db.run(`CREATE TABLE IF NOT EXISTS record_links (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    relationship TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  // Activity log
  db.run(`CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    record_type TEXT NOT NULL,
    record_id TEXT,
    record_title TEXT,
    details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )`);

  saveDB();
}

// Migrations: safely add new columns to existing databases
function runMigrations() {
  const alter = (sql) => { try { db.run(sql); } catch(e) {
    if (!e.message?.includes('duplicate column') && !e.message?.includes('already exists')) {
      console.warn('Migration skipped:', e.message?.slice(0, 80));
    }
  }};

  // Chunk 2: watchlist_items new columns
  alter(`ALTER TABLE watchlist_items ADD COLUMN priority TEXT DEFAULT 'medium'`);
  alter(`ALTER TABLE watchlist_items ADD COLUMN status TEXT DEFAULT 'watching'`);
  alter(`ALTER TABLE watchlist_items ADD COLUMN alert_price REAL`);
  alter(`ALTER TABLE watchlist_items ADD COLUMN next_review_date TEXT`);
  alter(`ALTER TABLE watchlist_items ADD COLUMN updated_at TEXT DEFAULT (datetime('now'))`);

  // Chunk 2: market_observations table
  db.run(`CREATE TABLE IF NOT EXISTS market_observations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    market_type TEXT NOT NULL DEFAULT 'stocks',
    ticker TEXT, region TEXT, description TEXT,
    observation_notes TEXT, trend TEXT,
    status TEXT DEFAULT 'watching',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Chunk 3: market_observations category field
  alter(`ALTER TABLE market_observations ADD COLUMN category TEXT`);

  // Chunk 3: expanded properties fields
  alter(`ALTER TABLE properties ADD COLUMN priority TEXT DEFAULT 'medium'`);
  alter(`ALTER TABLE properties ADD COLUMN source TEXT`);
  alter(`ALTER TABLE properties ADD COLUMN bedrooms INTEGER`);
  alter(`ALTER TABLE properties ADD COLUMN bathrooms REAL`);
  alter(`ALTER TABLE properties ADD COLUMN estimated_rent REAL`);
  alter(`ALTER TABLE properties ADD COLUMN est_monthly_cashflow REAL`);
  alter(`ALTER TABLE properties ADD COLUMN gross_yield REAL`);
  alter(`ALTER TABLE properties ADD COLUMN down_payment REAL`);
  alter(`ALTER TABLE properties ADD COLUMN financing_notes TEXT`);
  alter(`ALTER TABLE properties ADD COLUMN next_follow_up TEXT`);
  alter(`ALTER TABLE properties ADD COLUMN listing_agent_name TEXT`);
  alter(`ALTER TABLE properties ADD COLUMN listing_agent_phone TEXT`);
  alter(`ALTER TABLE properties ADD COLUMN listing_agent_email TEXT`);
  alter(`ALTER TABLE properties ADD COLUMN mls_number TEXT`);
  alter(`ALTER TABLE properties ADD COLUMN days_on_market INTEGER`);

  // Chunk 3: property_analysis table (full deal underwriting per property)
  db.run(`CREATE TABLE IF NOT EXISTS property_analysis (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL UNIQUE REFERENCES properties(id) ON DELETE CASCADE,
    purchase_price REAL,
    arv REAL,
    rehab_estimate REAL,
    monthly_rent REAL,
    other_income REAL DEFAULT 0,
    vacancy_pct REAL DEFAULT 5,
    mgmt_pct REAL DEFAULT 10,
    taxes_monthly REAL DEFAULT 0,
    insurance_monthly REAL DEFAULT 0,
    hoa_monthly REAL DEFAULT 0,
    utilities_monthly REAL DEFAULT 0,
    maintenance_monthly REAL DEFAULT 0,
    other_expenses_monthly REAL DEFAULT 0,
    down_payment_pct REAL DEFAULT 20,
    loan_rate REAL DEFAULT 7,
    loan_term_years INTEGER DEFAULT 30,
    closing_costs REAL DEFAULT 0,
    monthly_mortgage REAL,
    monthly_gross_income REAL,
    monthly_expenses REAL,
    monthly_noi REAL,
    monthly_cashflow REAL,
    annual_cashflow REAL,
    cap_rate REAL,
    cash_on_cash_return REAL,
    gross_yield REAL,
    total_investment REAL,
    analysis_notes TEXT,
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Chunk 4: portfolio_entries new columns
  alter(`ALTER TABLE portfolio_entries ADD COLUMN status TEXT DEFAULT 'active'`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN position_type TEXT DEFAULT 'long'`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN asset_class TEXT DEFAULT 'stocks'`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN strategy TEXT`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN sector TEXT`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN thesis_summary TEXT`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN date_opened TEXT`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN date_closed TEXT`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN cost_basis REAL`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN property_id TEXT`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN linked_trade_id TEXT`);
  alter(`ALTER TABLE portfolio_entries ADD COLUMN linked_idea_id TEXT`);

  // Chunk 4: events (macro calendar) new columns
  alter(`ALTER TABLE events ADD COLUMN category TEXT DEFAULT 'economic'`);
  alter(`ALTER TABLE events ADD COLUMN pre_event_notes TEXT`);
  alter(`ALTER TABLE events ADD COLUMN post_event_notes TEXT`);
  alter(`ALTER TABLE events ADD COLUMN outcome_notes TEXT`);
  alter(`ALTER TABLE events ADD COLUMN status TEXT DEFAULT 'upcoming'`);
  alter(`ALTER TABLE events ADD COLUMN reviewed INTEGER DEFAULT 0`);

  // Chunk 4: alerts new columns
  alter(`ALTER TABLE alerts ADD COLUMN priority TEXT DEFAULT 'medium'`);
  alter(`ALTER TABLE alerts ADD COLUMN trigger_type TEXT DEFAULT 'date'`);
  alter(`ALTER TABLE alerts ADD COLUMN trigger_date TEXT`);
  alter(`ALTER TABLE alerts ADD COLUMN description TEXT`);
  alter(`ALTER TABLE alerts ADD COLUMN completed_at TEXT`);
  alter(`ALTER TABLE alerts ADD COLUMN dismissed_at TEXT`);
  alter(`ALTER TABLE alerts ADD COLUMN linked_idea_id TEXT`);
  alter(`ALTER TABLE alerts ADD COLUMN linked_property_id TEXT`);
  alter(`ALTER TABLE alerts ADD COLUMN linked_event_id TEXT`);
  alter(`ALTER TABLE alerts ADD COLUMN linked_note_id TEXT`);
  alter(`ALTER TABLE alerts ADD COLUMN linked_trade_id TEXT`);

  // Chunk 5: Knowledge Records & Strategies tables
  db.run(`CREATE TABLE IF NOT EXISTS knowledge_records (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT,
    summary TEXT,
    category TEXT DEFAULT 'general',
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS strategies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    description TEXT,
    rules_framework TEXT,
    entry_criteria TEXT,
    exit_criteria TEXT,
    risk_considerations TEXT,
    asset_classes TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Chunk 6: Activity Logs
  // Chunk 6: Activity Logs
  alter(`ALTER TABLE activity_log ADD COLUMN user_id TEXT`);

  // Chunk 7: Sector workspaces
  alter(`ALTER TABLE notes ADD COLUMN sector TEXT`);
  alter(`ALTER TABLE documents ADD COLUMN sector TEXT`);
  alter(`ALTER TABLE contacts ADD COLUMN sector TEXT`);
  alter(`ALTER TABLE events ADD COLUMN sector TEXT`);
  alter(`ALTER TABLE strategies ADD COLUMN sector TEXT`);
  alter(`ALTER TABLE knowledge_records ADD COLUMN sector TEXT`);

  // Chunk 9: News Resources
  db.run(`CREATE TABLE IF NOT EXISTS news_resources (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, sector TEXT NOT NULL,
    resource_type TEXT DEFAULT 'website', url TEXT, description TEXT,
    is_featured INTEGER DEFAULT 0, status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Preload Chunk 9 Starter Resources if table is empty
  const resCount = db.exec('SELECT COUNT(*) as c FROM news_resources');
  if (resCount[0]?.values[0][0] === 0) {
    const { v4: uuidv4 } = require('uuid');
    const starters = [
      // Real Estate
      { title: 'HousingWire', sector: 'real-estate', url: 'https://housingwire.com', desc: 'Real estate industry news, mortgage trends, housing market updates' },
      { title: 'Inman', sector: 'real-estate', url: 'https://inman.com', desc: 'Real estate news, brokerage updates, market trends' },
      { title: 'BiggerPockets', sector: 'real-estate', url: 'https://biggerpockets.com', desc: 'Real estate investing education, market commentary, rental insights' },
      { title: 'Realtor.com News and Research', sector: 'real-estate', url: 'https://www.realtor.com/news', desc: 'Housing market trends, consumer housing data, buying and selling insights' },
      { title: 'Redfin News', sector: 'real-estate', url: 'https://redfin.com/news', desc: 'Housing reports, affordability trends, market commentary' },
      { title: 'Zillow Research', sector: 'real-estate', url: 'https://zillow.com/research', desc: 'Housing data, home value trends, market reports' },
      { title: 'Mortgage News Daily', sector: 'real-estate', url: 'https://mortgagenewsdaily.com', desc: 'Mortgage rates, lender news, housing finance updates' },
      { title: 'National Association of Realtors News', sector: 'real-estate', url: 'https://nar.realtor/newsroom', desc: 'Industry updates, housing data, market outlooks' },
      { title: 'Yahoo Finance Real Estate', sector: 'real-estate', url: 'https://finance.yahoo.com/real-estate', desc: 'Broad real estate and housing related finance news' },
      { title: 'CNBC Real Estate', sector: 'real-estate', url: 'https://cnbc.com/real-estate', desc: 'National housing market coverage and real estate investing news' },
      // Forex
      { title: 'Forex Factory', sector: 'forex', url: 'https://forexfactory.com', desc: 'Forex calendar, market news, trader sentiment, event tracking' },
      { title: 'DailyFX', sector: 'forex', url: 'https://dailyfx.com', desc: 'Forex news, technical analysis, macro commentary' },
      { title: 'FXStreet', sector: 'forex', url: 'https://fxstreet.com', desc: 'Forex market updates, live rates, analysis, breaking macro news' },
      { title: 'Investing.com Forex', sector: 'forex', url: 'https://investing.com/currencies', desc: 'Forex quotes, macro calendar, currency market coverage' },
      { title: 'Bloomberg Markets', sector: 'forex', url: 'https://bloomberg.com/markets', desc: 'Global macro and currency market news' },
      { title: 'Reuters Markets', sector: 'forex', url: 'https://reuters.com/markets', desc: 'Institutional market news and macro headlines' },
      { title: 'Yahoo Finance Live', sector: 'forex', url: 'https://finance.yahoo.com/live', type: 'video stream', desc: 'General market coverage and broad economic discussion' },
      { title: 'CNBC Markets', sector: 'forex', url: 'https://cnbc.com/markets', desc: 'Market commentary, rates discussion, macro news' },
      { title: 'TradingView Market News', sector: 'forex', url: 'https://tradingview.com/news', desc: 'Market headlines, chart based updates, technical market coverage' },
      { title: '24/7 Yahoo Finance YouTube Stream', sector: 'forex', url: 'https://www.youtube.com/watch?v=KQp-e_XQnDE', type: 'youtube', desc: 'Continuous market coverage and interviews' },
      // Stocks
      { title: 'Yahoo Finance', sector: 'stocks', url: 'https://finance.yahoo.com', desc: 'Market news, quotes, earnings coverage, live financial commentary' },
      { title: 'CNBC Markets', sector: 'stocks', url: 'https://cnbc.com/markets', desc: 'Breaking market news, equities, economic discussion' },
      { title: 'Bloomberg Markets', sector: 'stocks', url: 'https://bloomberg.com/markets', desc: 'Institutional stock market coverage and macro headlines' },
      { title: 'Reuters Business', sector: 'stocks', url: 'https://reuters.com/business', desc: 'Public markets, company news, economic developments' },
      { title: 'MarketWatch', sector: 'stocks', url: 'https://marketwatch.com', desc: 'Market headlines, investor commentary, public company coverage' },
      { title: 'Seeking Alpha', sector: 'stocks', url: 'https://seekingalpha.com', desc: 'Stock analysis, earnings views, investment research' },
      { title: 'The Wall Street Journal Markets', sector: 'stocks', url: 'https://wsj.com/news/markets', desc: 'Equity market coverage, business news, economic updates' },
      { title: 'Barron’s', sector: 'stocks', url: 'https://barrons.com', desc: 'Investor focused market analysis and stock commentary' },
      { title: 'Finviz', sector: 'stocks', url: 'https://finviz.com', desc: 'Stock market screener, news, and market snapshots' },
      { title: 'TradingView Market News', sector: 'stocks', url: 'https://tradingview.com/news/markets', desc: 'Stock market updates, chart based analysis, sentiment and setups' },
    ];
    for (const r of starters) {
      db.run(`INSERT INTO news_resources (id, title, sector, resource_type, url, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), r.title, r.sector, r.type || 'website', r.url, r.desc, new Date().toISOString(), new Date().toISOString()]);
    }
  }

  // Chunk 13: Marketing Workspace Tables
  db.run(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
    id TEXT PRIMARY KEY, slug TEXT UNIQUE NOT NULL, title TEXT NOT NULL,
    excerpt TEXT, content TEXT, status TEXT DEFAULT 'Draft', author TEXT,
    published_at TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  // Chunk 14: User Management and Permissions
  alter(`ALTER TABLE users ADD COLUMN name TEXT`);
  alter(`ALTER TABLE users ADD COLUMN email TEXT`);
  alter(`ALTER TABLE users ADD COLUMN avatar_url TEXT`);
  alter(`ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'`);
  alter(`ALTER TABLE users ADD COLUMN permissions TEXT`);
  alter(`ALTER TABLE users ADD COLUMN updated_at TEXT`);

  // Chunk 15: Property Intelligence Engine Reports
  db.run(`CREATE TABLE IF NOT EXISTS property_reports (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES properties(id) ON DELETE SET NULL,
    address_snapshot TEXT,
    estimated_value REAL,
    investment_score INTEGER,
    neighborhood_score INTEGER,
    recommended_strategy TEXT,
    report_data TEXT,
    status TEXT DEFAULT 'completed',
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  // Chunk 16: Stock Analysis Engine Reports
  db.run(`CREATE TABLE IF NOT EXISTS stock_reports (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES assets(id) ON DELETE SET NULL,
    ticker TEXT NOT NULL,
    company_name TEXT,
    price_at_time REAL,
    valuation_score INTEGER,
    overall_score INTEGER,
    recommendation TEXT,
    report_data TEXT,
    status TEXT DEFAULT 'completed',
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  )`);

  saveDB();
}

function seedAdmin() {
  const bcrypt = require('bcryptjs');
  const { v4: uuidv4 } = require('uuid');
  
  const existing = db.exec(`SELECT id FROM users WHERE username = 'admin'`);
  if (!existing.length || !existing[0].values.length) {
    const hash = bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10);
    // Give the default admin full access to everything explicitly, though role 'owner' usually bypasses
    const fullPerms = JSON.stringify(['real-estate', 'forex', 'stocks', 'portfolio', 'events', 'alerts', 'notes', 'tags', 'properties', 'news', 'contacts', 'documents', 'search', 'links', 'watchlists', 'markets', 'knowledge', 'strategies', 'activity', 'reports', 'news-resources', 'marketing', 'users', 'settings']);
    
    db.run(`INSERT INTO users (id, username, password_hash, role, name, permissions) VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), 'admin', hash, 'owner', 'System Admin', fullPerms]);
    saveDB();
    console.log('✓ Admin user seeded');
  }
}

module.exports = { initDB, getDB, saveDB };
