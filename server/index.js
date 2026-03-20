require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/database');
const authMiddleware = require('./middleware/auth');

const app = express();

// Middleware
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/auth');
const assetsRoutes = require('./routes/assets');
const tradesRoutes = require('./routes/trades');
const ideasRoutes = require('./routes/ideas');
const notesRoutes = require('./routes/notes');
const tagsRoutes = require('./routes/tags');
const propertiesRoutes = require('./routes/properties');
const newsRoutes = require('./routes/news');
const contactsRoutes = require('./routes/contacts');
const documentsRoutes = require('./routes/documents');
const portfolioRoutes = require('./routes/portfolio');
const eventsRoutes = require('./routes/events');
const alertsRoutes = require('./routes/alerts');
const searchRoutes = require('./routes/search');
const dashboardRoutes = require('./routes/dashboard');
const linksRoutes = require('./routes/links');
const watchlistsRoutes = require('./routes/watchlists');
const marketsRoutes = require('./routes/markets');
const remarketRoutes = require('./routes/remarket');
const redashboardRoutes = require('./routes/redashboard');
const knowledgeRoutes = require('./routes/knowledge');
const strategiesRoutes = require('./routes/strategies');
const activityRoutes = require('./routes/activity');
const reportsRoutes = require('./routes/reports');
const propertyReportsRoutes = require('./routes/property_reports');
const sectorsRoutes = require('./routes/sectors');
const newsResourcesRoutes = require('./routes/news_resources');
const marketingRoutes = require('./routes/marketing');
const publicRoutes = require('./routes/public');
const usersRoutes = require('./routes/users');
const stocksRoutes = require('./routes/stocks');
const stockReportsRoutes = require('./routes/stock_reports');

const aiRoutes = require('./routes/ai');

// Auth routes (no middleware)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/assets', authMiddleware, assetsRoutes);
app.use('/api/trades', authMiddleware, tradesRoutes);
app.use('/api/ideas', authMiddleware, ideasRoutes);
app.use('/api/notes', authMiddleware, notesRoutes);
app.use('/api/tags', authMiddleware, tagsRoutes);
app.use('/api/properties', authMiddleware, propertiesRoutes);
app.use('/api/news', authMiddleware, newsRoutes);
app.use('/api/contacts', authMiddleware, contactsRoutes);
app.use('/api/documents', authMiddleware, documentsRoutes);
app.use('/api/portfolio', authMiddleware, portfolioRoutes);
app.use('/api/events', authMiddleware, eventsRoutes);
app.use('/api/alerts', authMiddleware, alertsRoutes);
app.use('/api/search', authMiddleware, searchRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/links', authMiddleware, linksRoutes);
app.use('/api/watchlists', authMiddleware, watchlistsRoutes);
app.use('/api/markets', authMiddleware, marketsRoutes);
app.use('/api/remarket', authMiddleware, remarketRoutes);
app.use('/api/re/dashboard', authMiddleware, redashboardRoutes);
app.use('/api/knowledge', authMiddleware, knowledgeRoutes);
app.use('/api/strategies', authMiddleware, strategiesRoutes);
app.use('/api/activity', authMiddleware, activityRoutes);
app.use('/api/reports', authMiddleware, reportsRoutes);
app.use('/api/property-reports', authMiddleware, propertyReportsRoutes);
app.use('/api/sectors', authMiddleware, sectorsRoutes);
app.use('/api/news-resources', authMiddleware, newsResourcesRoutes);
app.use('/api/marketing', authMiddleware, marketingRoutes);
app.use('/api/users', authMiddleware, usersRoutes);
app.use('/api/stocks', authMiddleware, stocksRoutes);
app.use('/api/stock-reports', authMiddleware, stockReportsRoutes);

// Public API routes (Open CORS, no auth)
app.use('/api/public', publicRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

// Error handler
app.use((err, req, res, next) => {
  const msg = err?.message || String(err) || 'Internal server error';
  const stack = err?.stack || JSON.stringify(err);
  console.error('API ERROR:', msg, '\n', stack);
  res.status(500).json({ error: msg });
});

const PORT = process.env.PORT || 3001;

async function start() {
  const db = await initDB();
  app.locals.db = db;
  
  app.listen(PORT, () => {
    console.log(`\n🚀 Investment Platform API running on http://localhost:${PORT}`);
    console.log(`   Login: POST /api/auth/login`);
    console.log(`   Health: GET /api/health\n`);
  });
}

start().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
