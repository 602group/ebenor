const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query, run, getTagsForRecord, setTagsOnRecord, getNotesForRecord } = require('../db/helpers');
const { logActivity } = require('../utils/activity');
const { saveDB } = require('../db/database');

const n = v => v === undefined ? null : v;
const num = v => (v === '' || v === undefined) ? null : Number(v);

// ─── Calc helper ────────────────────────────────────────────────────────────
function calcAnalysis(d) {
  const rent = num(d.monthly_rent) || 0;
  const otherInc = num(d.other_income) || 0;
  const grossInc = rent + otherInc;
  const vacancyLoss = grossInc * ((num(d.vacancy_pct) || 5) / 100);
  const effectiveInc = grossInc - vacancyLoss;
  const mgmtCost = effectiveInc * ((num(d.mgmt_pct) || 10) / 100);
  const fixedExp = (num(d.taxes_monthly) || 0) + (num(d.insurance_monthly) || 0) +
    (num(d.hoa_monthly) || 0) + (num(d.utilities_monthly) || 0) +
    (num(d.maintenance_monthly) || 0) + (num(d.other_expenses_monthly) || 0) + mgmtCost;

  // Mortgage
  const price = num(d.purchase_price) || 0;
  const dpPct = (num(d.down_payment_pct) || 20) / 100;
  const loanAmt = price * (1 - dpPct);
  const rate = (num(d.loan_rate) || 7) / 100 / 12;
  const terms = (num(d.loan_term_years) || 30) * 12;
  let mortgage = 0;
  if (rate > 0 && terms > 0 && loanAmt > 0) {
    mortgage = loanAmt * (rate * Math.pow(1 + rate, terms)) / (Math.pow(1 + rate, terms) - 1);
  }

  const totalExp = fixedExp + mortgage;
  const noi = effectiveInc - fixedExp;
  const cashflow = effectiveInc - totalExp;

  const totalInv = price * dpPct + (num(d.rehab_estimate) || 0) + (num(d.closing_costs) || 0);
  const capRate = price > 0 ? (noi * 12 / price) * 100 : 0;
  const coc = totalInv > 0 ? (cashflow * 12 / totalInv) * 100 : 0;
  const gY = price > 0 ? (grossInc * 12 / price) * 100 : 0;

  return {
    monthly_gross_income: Math.round(grossInc * 100) / 100,
    monthly_expenses: Math.round(totalExp * 100) / 100,
    monthly_mortgage: Math.round(mortgage * 100) / 100,
    monthly_noi: Math.round(noi * 100) / 100,
    monthly_cashflow: Math.round(cashflow * 100) / 100,
    annual_cashflow: Math.round(cashflow * 12 * 100) / 100,
    cap_rate: Math.round(capRate * 100) / 100,
    cash_on_cash_return: Math.round(coc * 100) / 100,
    gross_yield: Math.round(gY * 100) / 100,
    total_investment: Math.round(totalInv * 100) / 100,
  };
}

// ─── PROPERTY LIST ───────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const db = req.app.locals.db;
  const { status, city, state, property_type, strategy, priority, search, sort = 'created_at', order = 'desc' } = req.query;

  let sql = `SELECT * FROM properties WHERE 1=1`;
  const params = [];
  if (status)        { sql += ` AND status = ?`;                params.push(status); }
  if (city)          { sql += ` AND city LIKE ?`;               params.push(`%${city}%`); }
  if (state)         { sql += ` AND state = ?`;                 params.push(state); }
  if (property_type) { sql += ` AND property_type = ?`;         params.push(property_type); }
  if (strategy)      { sql += ` AND strategy = ?`;              params.push(strategy); }
  if (priority)      { sql += ` AND priority = ?`;              params.push(priority); }
  if (search) {
    sql += ` AND (name LIKE ? OR address LIKE ? OR city LIKE ? OR description LIKE ? OR mls_number LIKE ?)`;
    const s = `%${search}%`; params.push(s,s,s,s,s);
  }
  const allowed = ['created_at','name','status','city','asking_price','cap_rate','priority','next_follow_up'];
  sql += ` ORDER BY ${allowed.includes(sort) ? sort : 'created_at'} ${order === 'asc' ? 'ASC' : 'DESC'}`;

  const props = query(db, sql, params);
  const result = props.map(p => ({ ...p, tags: getTagsForRecord(db, 'property', p.id) }));
  res.json(result);
});

// Pipeline grouping
router.get('/pipeline', (req, res) => {
  const db = req.app.locals.db;
  const STATUSES = ['researching','lead-identified','contacted','analyzing','offer-planned','offer-submitted','negotiating','under-contract','closed','passed','archived'];
  const all = query(db, `SELECT * FROM properties ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, updated_at DESC`);
  const pipeline = {};
  STATUSES.forEach(s => { pipeline[s] = []; });
  all.forEach(p => {
    const key = p.status in pipeline ? p.status : 'researching';
    pipeline[key].push({ ...p, tags: getTagsForRecord(db, 'property', p.id) });
  });
  res.json(pipeline);
});

// ─── PROPERTY DETAIL ─────────────────────────────────────────────────────────

router.get('/:id', (req, res) => {
  const db = req.app.locals.db;
  const rows = query(db, `SELECT * FROM properties WHERE id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Not found' });
  const prop = rows[0];
  prop.tags = getTagsForRecord(db, 'property', prop.id);
  prop.notes = getNotesForRecord(db, 'property', prop.id);
  prop.analysis = query(db, `SELECT * FROM property_analysis WHERE property_id = ?`, [prop.id])[0] || null;
  res.json(prop);
});

// ─── CREATE ──────────────────────────────────────────────────────────────────

const ALL_FIELDS = ['name','address','city','state','zip','property_type','status','strategy','priority','source',
  'asking_price','arv','rehab_estimate','noi','cap_rate','units','sqft','year_built','bedrooms','bathrooms',
  'estimated_rent','est_monthly_cashflow','gross_yield','down_payment','financing_notes',
  'description','listing_url','agent_name','mls_number','days_on_market','next_follow_up',
  'listing_agent_name','listing_agent_phone','listing_agent_email'];

router.post('/', (req, res) => {
  const db = req.app.locals.db;
  if (!req.body.name) return res.status(400).json({ error: 'Name is required' });
  const id = uuidv4();
  const now = new Date().toISOString();

  const fields = ['id', ...ALL_FIELDS, 'created_at', 'updated_at'];
  const vals = [id, ...ALL_FIELDS.map(f => n(req.body[f])), now, now];
  run(db, `INSERT INTO properties (${fields.join(',')}) VALUES (${fields.map(() => '?').join(',')})`, vals);

  if (req.body.tag_ids?.length) setTagsOnRecord(db, 'property', id, req.body.tag_ids);
  logActivity(req.user?.id, 'created', 'property', id, req.body.name);
  saveDB();
  res.status(201).json({ ...query(db, `SELECT * FROM properties WHERE id = ?`, [id])[0], tags: getTagsForRecord(db, 'property', id) });
});

// ─── UPDATE ──────────────────────────────────────────────────────────────────

router.patch('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM properties WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  const now = new Date().toISOString();

  const updFields = []; const updVals = [];
  ALL_FIELDS.forEach(f => { if (req.body[f] !== undefined) { updFields.push(`${f}=?`); updVals.push(req.body[f]); } });
  updFields.push('updated_at=?'); updVals.push(now); updVals.push(req.params.id);
  if (updFields.length > 1) run(db, `UPDATE properties SET ${updFields.join(',')} WHERE id=?`, updVals);

  if (req.body.tag_ids !== undefined) setTagsOnRecord(db, 'property', req.params.id, req.body.tag_ids);

  // Log status changes specifically
  if (req.body.status && req.body.status !== existing[0].status) {
    logActivity(req.user?.id, `status_changed_to_${req.body.status}`, 'property', req.params.id, existing[0].name);
  } else {
    logActivity(req.user?.id, 'updated', 'property', req.params.id, existing[0].name);
  }
  saveDB();
  res.json({ ...query(db, `SELECT * FROM properties WHERE id = ?`, [req.params.id])[0], tags: getTagsForRecord(db, 'property', req.params.id) });
});

// ─── DELETE ──────────────────────────────────────────────────────────────────

router.delete('/:id', (req, res) => {
  const db = req.app.locals.db;
  const existing = query(db, `SELECT * FROM properties WHERE id = ?`, [req.params.id]);
  if (!existing.length) return res.status(404).json({ error: 'Not found' });
  run(db, `DELETE FROM record_tags WHERE record_type = 'property' AND record_id = ?`, [req.params.id]);
  run(db, `DELETE FROM property_analysis WHERE property_id = ?`, [req.params.id]);
  run(db, `DELETE FROM properties WHERE id = ?`, [req.params.id]);
  logActivity(req.user?.id, 'deleted', 'property', req.params.id, existing[0].name);
  saveDB();
  res.json({ success: true });
});

// ─── DEAL ANALYSIS ───────────────────────────────────────────────────────────

// GET /api/properties/:id/analysis
router.get('/:id/analysis', (req, res) => {
  const db = req.app.locals.db;
  const row = query(db, `SELECT * FROM property_analysis WHERE property_id = ?`, [req.params.id])[0];
  res.json(row || null);
});

// POST or PATCH /api/properties/:id/analysis (upsert)
router.post('/:id/analysis', (req, res) => {
  const db = req.app.locals.db;
  const prop = query(db, `SELECT * FROM properties WHERE id = ?`, [req.params.id]);
  if (!prop.length) return res.status(404).json({ error: 'Property not found' });

  const ANALYSIS_FIELDS = ['purchase_price','arv','rehab_estimate','monthly_rent','other_income','vacancy_pct',
    'mgmt_pct','taxes_monthly','insurance_monthly','hoa_monthly','utilities_monthly','maintenance_monthly',
    'other_expenses_monthly','down_payment_pct','loan_rate','loan_term_years','closing_costs','analysis_notes'];

  const calc = calcAnalysis(req.body);
  const existing = query(db, `SELECT id FROM property_analysis WHERE property_id = ?`, [req.params.id]);
  const now = new Date().toISOString();

  if (existing.length) {
    // Update
    const uFields = []; const uVals = [];
    ANALYSIS_FIELDS.forEach(f => { if (req.body[f] !== undefined) { uFields.push(`${f}=?`); uVals.push(num(req.body[f]) ?? req.body[f]); } });
    Object.entries(calc).forEach(([k, v]) => { uFields.push(`${k}=?`); uVals.push(v); });
    uFields.push('updated_at=?'); uVals.push(now); uVals.push(req.params.id);
    run(db, `UPDATE property_analysis SET ${uFields.join(',')} WHERE property_id=?`, uVals);
  } else {
    // Insert
    const id = uuidv4();
    const insertFields = ['id', 'property_id', ...ANALYSIS_FIELDS, ...Object.keys(calc), 'updated_at'];
    const insertVals = [id, req.params.id,
      ...ANALYSIS_FIELDS.map(f => { const v = req.body[f]; return num(v) ?? v ?? null; }),
      ...Object.values(calc), now];
    run(db, `INSERT INTO property_analysis (${insertFields.join(',')}) VALUES (${insertFields.map(() => '?').join(',')})`, insertVals);
  }

  logActivity(req.user?.id, 'analysis_updated', 'property', req.params.id, prop[0].name);
  saveDB();
  res.json({ ...query(db, `SELECT * FROM property_analysis WHERE property_id = ?`, [req.params.id])[0], ...calc });
});

module.exports = router;
