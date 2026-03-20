const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

const n = v => v === undefined ? null : v;

const EVENT_FIELDS = ['title','event_type','event_date','event_time','country','importance',
  'description','actual_value','forecast_value','previous_value',
  'category','sector','pre_event_notes','post_event_notes','outcome_notes','status','reviewed'];

// GET /api/events
router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { event_type, importance, country, category, sector, status, from_date, to_date, upcoming, search } = req.query;
  let sql = `SELECT * FROM events WHERE 1=1`;
  const params = [];
  if (event_type)  { sql += ` AND event_type = ?`;   params.push(event_type); }
  if (importance)  { sql += ` AND importance = ?`;   params.push(importance); }
  if (country)     { sql += ` AND country = ?`;       params.push(country); }
  if (category)    { sql += ` AND category = ?`;     params.push(category); }
  if (sector)      { sql += ` AND sector = ?`;       params.push(sector); }
  if (status)      { sql += ` AND status = ?`;        params.push(status); }
  if (from_date)   { sql += ` AND event_date >= ?`;  params.push(from_date); }
  if (to_date)     { sql += ` AND event_date <= ?`;  params.push(to_date); }
  if (upcoming === 'true') {
    const today = new Date().toISOString().split('T')[0];
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    sql += ` AND event_date BETWEEN ? AND ?`;
    params.push(today, future);
  }
  if (search) {
    sql += ` AND (title LIKE ? OR description LIKE ? OR country LIKE ?)`;
    const s = `%${search}%`; params.push(s, s, s);
  }
  sql += ` ORDER BY event_date ASC, event_time ASC`;
  const rows = query(db, sql, params);
  res.json(rows.map(r => ({ ...r, tags: getTagsForRecord(db, 'event', r.id) })));
});

// ─── Forex Factory Calendar helpers ────────────────────────────
const FF_URLS = [
  'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
  'https://nfs.faireconomy.media/ff_calendar_nextweek.json'
];

// Simple in-memory cache — avoids hitting FF more than once per hour
let _ffCache = null;
let _ffCacheAt = 0;
const FF_CACHE_TTL = 60 * 60 * 1000; // 1 hour

async function fetchJSON(url) {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; InvestOS/1.0)',
      'Accept': 'application/json'
    },
    redirect: 'follow'
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

async function fetchAllFF() {
  if (_ffCache && (Date.now() - _ffCacheAt) < FF_CACHE_TTL) {
    console.log('[market-calendar] serving from cache');
    return _ffCache;
  }
  console.log('[market-calendar] fetching fresh from ForexFactory...');
  const week1 = await fetchJSON(FF_URLS[0]);
  // Next week is only published from Sunday — gracefully skip if 404
  let week2 = [];
  try {
    await new Promise(r => setTimeout(r, 800));
    week2 = await fetchJSON(FF_URLS[1]);
  } catch (e) {
    if (!e.message.includes('404')) throw e; // Re-throw non-404 errors
    console.log('[market-calendar] next week not yet published, using this week only');
  }
  _ffCache = [...week1, ...week2];
  _ffCacheAt = Date.now();
  return _ffCache;
}



const IMPACT_MAP = { 'High': 'high', 'Medium': 'medium', 'Low': 'low', 'Holiday': 'low' };

const CATEGORY_MAP = (title) => {
  const t = title.toLowerCase();
  if (t.includes('cpi') || t.includes('inflation') || t.includes('pce') || t.includes('ppi')) return 'inflation';
  if (t.includes('gdp')) return 'gdp';
  if (t.includes('employment') || t.includes('jobs') || t.includes('nfp') || t.includes('unemployment') || t.includes('payroll')) return 'jobs';
  if (t.includes('fed') || t.includes('fomc') || t.includes('ecb') || t.includes('boe') || t.includes('boj') || t.includes('central bank') || t.includes('rate decision') || t.includes('rate statement')) return 'central-bank';
  if (t.includes('housing') || t.includes('home') || t.includes('mortgage') || t.includes('building')) return 'housing';
  if (t.includes('manufacturing') || t.includes('pmi') || t.includes('ism') || t.includes('industrial')) return 'manufacturing';
  if (t.includes('consumer') || t.includes('retail') || t.includes('spending') || t.includes('sentiment')) return 'consumer';
  return 'economic';
};

// Auto-descriptions for common economic indicators
const DESCRIPTIONS = {
  'cpi':                'Consumer Price Index — measures change in the price of goods and services paid by consumers. The primary inflation gauge watched by central banks for rate decisions.',
  'core cpi':           'CPI excluding volatile food and energy prices. Considered the most reliable measure of underlying inflation trends.',
  'ppi':                'Producer Price Index — measures price changes from the perspective of the manufacturer or producer. A leading indicator of consumer inflation.',
  'pce':                'Personal Consumption Expenditures price index — the Fed\'s preferred inflation measure. Core PCE (ex-food & energy) is watched most closely for monetary policy.',
  'core pce':           'Core Personal Consumption Expenditures price index, excluding food and energy. This is the Federal Reserve\'s primary inflation target (2% goal).',
  'gdp':                'Gross Domestic Product — the broadest measure of economic activity and health. Strong growth supports risk assets; contraction signals recession risk.',
  'nonfarm payrolls':   'Non-Farm Payrolls (NFP) — the number of jobs added or lost in the US economy (excluding farming). The most market-moving monthly jobs report.',
  'unemployment':       'Unemployment Rate — percentage of the labor force that is jobless and actively seeking work. A lagging economic indicator watched by central banks.',
  'jolts':              'Job Openings and Labor Turnover Survey — measures job vacancies across the US economy. High readings indicate labor market tightness and wage pressure.',
  'adp':                'ADP National Employment Report — private sector employment estimate released 2 days before NFP. Often used as a preview for the official jobs report.',
  'fomc':               'Federal Open Market Committee — the Fed\'s policy-setting body. Rate decisions and meeting minutes are major market catalysts affecting USD and all asset classes.',
  'fed':                'Federal Reserve communication or decision. Fed decisions set the benchmark interest rate affecting the entire US economy, dollar strength, and global capital flows.',
  'ecb':                'European Central Bank policy decision or communication. Sets interest rates for the Eurozone, directly affecting EUR and European bond markets.',
  'boe':                'Bank of England policy decision or communication. Sets UK interest rates, directly affecting GBP and UK gilt yields.',
  'boj':                'Bank of Japan policy decision or communication. BOJ policy (especially YCC and rate hike timing) is a major driver of JPY and global carry trades.',
  'rba':                'Reserve Bank of Australia rate decision. Directly affects AUD and Australian fixed income markets.',
  'retail sales':       'Measures the total receipts of retail stores — a key gauge of consumer spending which accounts for ~70% of US GDP.',
  'building permits':   'Number of new residential building permits issued. A leading indicator for housing sector activity and construction employment.',
  'housing starts':     'Number of new residential construction projects that began in a given period. Reflects demand for housing and construction sector health.',
  'existing home sales':'Number of previously-owned homes sold. Reflects overall housing market demand and consumer confidence.',
  'durable goods':      'Orders for manufactured goods expected to last 3+ years (aircraft, machinery, electronics). Indicates business investment and manufacturing confidence.',
  'ism manufacturing':  'Institute for Supply Management Manufacturing PMI. A reading above 50 signals expansion; below 50 signals contraction in the manufacturing sector.',
  'ism services':       'ISM Services PMI covering non-manufacturing activity (the larger part of the US economy). Above 50 = expansion.',
  'pmi':                'Purchasing Managers\' Index — a survey of purchasing managers indicating business conditions. Above 50 = expansion; below 50 = contraction.',
  'trade balance':      'The difference between a country\'s exports and imports. A deficit means more is being imported than exported; can indicate currency weakness.',
  'current account':    'Tracks a country\'s transactions with the rest of the world including trade, income, and transfers. Persistent deficits can pressure a currency.',
  'consumer confidence':'Measures how optimistic consumers are about the economy and their financial situation. High confidence typically leads to increased spending.',
  'consumer sentiment': 'University of Michigan Consumer Sentiment Index — measures consumer attitudes on current economic conditions and future expectations.',
  'industrial production': 'Measures the output of factories, mines, and utilities. A key indicator of manufacturing sector health and overall economic activity.',
  'capacity utilization': 'The percentage of productive capacity actually being used. High utilization can signal inflationary pressure; low utilization indicates slack.',
  'crude oil inventories': 'Weekly EIA report on US crude oil stockpiles. A larger-than-expected build is bearish for oil prices; a draw is bullish.',
  'natural gas storage': 'Weekly EIA report on natural gas in underground storage. Affects natural gas prices and energy sector outlook.',
  'initial jobless claims': 'Weekly count of new unemployment insurance claims. A leading labor market indicator — rising claims signal deteriorating employment.',
  'unemployment claims': 'Weekly count of new unemployment insurance claims. A leading labor market indicator — rising claims signal deteriorating employment.',
  'bond auction':       'Government bond sale to investors. Bid-to-cover ratio and yield vs. previous auction indicate demand for government debt.',
  'bank lending':       'Tracks credit growth in the banking sector. Strong lending supports economic activity; weak lending can signal tightening conditions.',
};

function getDescription(title) {
  const t = title.toLowerCase();
  for (const [key, desc] of Object.entries(DESCRIPTIONS)) {
    if (t.includes(key)) return desc;
  }
  return '';
}

// Generates an Investing.com economic calendar search link for the event
function sourceLink(title, country) {
  const query = encodeURIComponent(`${title} ${country || ''}`);
  return `https://www.investing.com/economic-calendar/?utm_source=investos&q=${query}`;
}

function mapFFEvent(ev) {
  const d = new Date(ev.date);
  const datePart = d.toISOString().split('T')[0];
  const hours = String(d.getHours()).padStart(2, '0');
  const mins  = String(d.getMinutes()).padStart(2, '0');
  const timePart = `${hours}:${mins}`;
  return {
    title: ev.title,
    country: ev.country,
    event_date: datePart,
    event_time: timePart === '00:00' ? '' : timePart,
    importance: IMPACT_MAP[ev.impact] || 'low',
    category: CATEGORY_MAP(ev.title),
    event_type: 'economic',
    forecast_value: ev.forecast || '',
    previous_value: ev.previous || '',
    description: getDescription(ev.title),
    pre_event_notes: sourceLink(ev.title, ev.country), // Repurpose as source link
    status: 'upcoming'
  };
}

// GET /api/events/market-calendar — live preview from ForexFactory (no key needed)
router.get('/market-calendar', async (req, res) => {
  try {
    const raw = await fetchAllFF();
    const all = raw.map(mapFFEvent);
    all.sort((a, b) => (a.event_date + a.event_time).localeCompare(b.event_date + b.event_time));
    res.json(all);
  } catch (err) {
    console.error('[market-calendar]', err.message);
    res.status(502).json({ error: 'Failed to fetch market calendar: ' + err.message });
  }
});

// POST /api/events/market-calendar/import — bulk import events into local DB
router.post('/market-calendar/import', async (req, res) => {
  const db = req.app.locals.db;
  try {
    const raw = await fetchAllFF();
    const all = raw.map(mapFFEvent);
    const now = new Date().toISOString();
    let imported = 0, skipped = 0;
    for (const ev of all) {
      // De-duplicate: skip if event with same title + date already exists
      const exists = query(db, `SELECT id FROM events WHERE title = ? AND event_date = ?`, [ev.title, ev.event_date]);
      if (exists.length) { skipped++; continue; }
      const id = uuidv4();
      run(db, `INSERT INTO events (id, title, event_type, event_date, event_time, country, importance, category, forecast_value, previous_value, description, pre_event_notes, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [id, ev.title, ev.event_type, ev.event_date, ev.event_time, ev.country, ev.importance, ev.category, ev.forecast_value, ev.previous_value, ev.description || '', ev.pre_event_notes || '', ev.status, now, now]);
      imported++;
    }
    saveDB();
    res.json({ imported, skipped, total: all.length });
  } catch (err) {
    console.error('[market-calendar/import]', err.message);
    res.status(502).json({ error: 'Failed to import calendar: ' + err.message });
  }
});

// GET /api/events/:id
router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM events WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  res.json({ ...rows[0], tags: getTagsForRecord(db, 'event', rows[0].id) });
});

// POST /api/events
router.post('/', (req, res) => {
  const db = req.app.locals.db;
  if (!req.body.title || !req.body.event_date) return res.status(400).json({ error: 'title and event_date required' });
  const id = uuidv4();
  const now = new Date().toISOString();
  const fields = ['id', ...EVENT_FIELDS, 'created_at', 'updated_at'];
  const vals = [id, ...EVENT_FIELDS.map(f => n(req.body[f])), now, now];
  run(db, `INSERT INTO events (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`, vals);
  if (req.body.tag_ids?.length) setTagsOnRecord(db, 'event', id, req.body.tag_ids);
  logActivity(req.user?.id, 'created', 'event', id, req.body.title);
  saveDB();
  const row = query(db, `SELECT * FROM events WHERE id = ?`, [id])[0];
  res.status(201).json({ ...row, tags: getTagsForRecord(db, 'event', id) });
});

// PATCH /api/events/:id
router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM events WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();
  const updFields = []; const updVals = [];
  EVENT_FIELDS.forEach(f => { if (req.body[f] !== undefined) { updFields.push(`${f}=?`); updVals.push(req.body[f]); } });
  updFields.push('updated_at=?'); updVals.push(now); updVals.push(req.params.id);
  if (updFields.length > 1) run(db, `UPDATE events SET ${updFields.join(',')} WHERE id=?`, updVals);
  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'event', req.params.id, req.body.tag_ids);
  logActivity(req.user?.id, 'updated', 'event', req.params.id, existing[0].title);
  saveDB();
  const row = query(db, `SELECT * FROM events WHERE id = ?`, [req.params.id])[0];
  res.json({ ...row, tags: getTagsForRecord(db, 'event', req.params.id) });
});

// DELETE /api/events/:id
router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM events WHERE id = ?`, [req.params.id]);
  run(db, `DELETE FROM record_tags WHERE record_type='event' AND record_id=?`, [req.params.id]);
  run(db, `DELETE FROM events WHERE id=?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted', 'event', req.params.id, existing[0]?.title);
  saveDB();
  res.json({ success: true });
});

module.exports = router;
