import { useState, useEffect } from 'react';
import api from '../api/client';
import RecordLinksPanel from './RecordLinksPanel';
import QuickAlertButton from './QuickAlertButton';
import PropertyReportView from './PropertyReportView';

const fmtCur = n => n ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }) : '—';
const fmtPct = n => n != null && n !== '' ? `${Number(n).toFixed(2)}%` : '—';
const num = v => (v === '' || v == null) ? null : Number(v);

const STATUS_COLOR = {
  'researching':'badge-blue','lead-identified':'badge-blue','contacted':'badge-yellow',
  'analyzing':'badge-orange','offer-planned':'badge-purple','offer-submitted':'badge-purple',
  'negotiating':'badge-orange','under-contract':'badge-green',
  'closed':'badge-green','passed':'badge-gray','archived':'badge-gray',
};
const ALL_STATUSES = ['researching','lead-identified','contacted','analyzing','offer-planned','offer-submitted','negotiating','under-contract','closed','passed','archived'];

/* ─── Deal Analysis Tab ─────────────────────────────────────── */
const ANALYSIS_DEFAULTS = {
  purchase_price:'', arv:'', rehab_estimate:'', monthly_rent:'', other_income:'0', vacancy_pct:'5',
  mgmt_pct:'10', taxes_monthly:'0', insurance_monthly:'0', hoa_monthly:'0', utilities_monthly:'0',
  maintenance_monthly:'0', other_expenses_monthly:'0', down_payment_pct:'20', loan_rate:'7',
  loan_term_years:'30', closing_costs:'0', analysis_notes:'',
};

function AnalysisTab({ propId }) {
  const [form, setForm] = useState(ANALYSIS_DEFAULTS);
  const [calc, setCalc] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    api.get(`/properties/${propId}/analysis`).then(r => {
      if (r.data) setForm({ ...ANALYSIS_DEFAULTS, ...r.data });
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }, [propId]);

  async function save() {
    setSaving(true);
    const r = await api.post(`/properties/${propId}/analysis`, form);
    setCalc(r.data); setSaving(false);
  }

  const F = ({ label, field, type = 'number', prefix = '', suffix = '' }) => (
    <div className="form-group" style={{ marginBottom: 10 }}>
      <label className="form-label">{label}</label>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 13 }}>{prefix}</span>}
        <input className="form-input" type={type} step="any" value={form[field] ?? ''} onChange={e => upd(field, e.target.value)}
          style={{ paddingLeft: prefix ? 24 : undefined, paddingRight: suffix ? 36 : undefined }} />
        {suffix && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 12 }}>{suffix}</span>}
      </div>
    </div>
  );

  if (!loaded) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: Inputs */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Purchase</div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <F label="Purchase Price"   field="purchase_price"    prefix="$" />
            <F label="ARV"              field="arv"               prefix="$" />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <F label="Rehab Estimate"   field="rehab_estimate"    prefix="$" />
            <F label="Closing Costs"    field="closing_costs"     prefix="$" />
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 12px' }}>Income</div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <F label="Monthly Rent"     field="monthly_rent"     prefix="$" />
            <F label="Other Income/mo"  field="other_income"     prefix="$" />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <F label="Vacancy %"        field="vacancy_pct"      suffix="%" />
            <F label="Mgmt %"           field="mgmt_pct"         suffix="%" />
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 12px' }}>Expenses / mo</div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <F label="Taxes"            field="taxes_monthly"         prefix="$" />
            <F label="Insurance"        field="insurance_monthly"     prefix="$" />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <F label="HOA"              field="hoa_monthly"           prefix="$" />
            <F label="Utilities"        field="utilities_monthly"     prefix="$" />
          </div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <F label="Maintenance"      field="maintenance_monthly"   prefix="$" />
            <F label="Other Expenses"   field="other_expenses_monthly" prefix="$" />
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '16px 0 12px' }}>Financing</div>
          <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
            <F label="Down Payment %"   field="down_payment_pct"  suffix="%" />
            <F label="Rate %"           field="loan_rate"         suffix="%" />
            <F label="Term (years)"     field="loan_term_years"             />
          </div>

          <div className="form-group" style={{ marginTop: 6 }}>
            <label className="form-label">Analysis Notes</label>
            <textarea className="form-textarea" rows={3} value={form.analysis_notes || ''} onChange={e => upd('analysis_notes', e.target.value)} placeholder="Financing assumptions, remarks..." />
          </div>

          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ width: '100%', marginTop: 8 }}>
            {saving ? 'Calculating...' : '💾 Save & Calculate'}
          </button>
        </div>

        {/* Right: Calculated outputs */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Deal Output</div>
          {(calc || form.monthly_cashflow != null) && (() => {
            const d = calc || form;
            const cashflow = num(d.monthly_cashflow);
            const coc = num(d.cash_on_cash_return);
            const isGood = cashflow != null && cashflow > 0;
            return (
              <div>
                {[
                  { label: 'Gross Income/mo', val: fmtCur(d.monthly_gross_income) },
                  { label: 'Total Expenses/mo', val: fmtCur(d.monthly_expenses) },
                  { label: 'Est. Mortgage', val: fmtCur(d.monthly_mortgage) },
                  { label: 'NOI/mo', val: fmtCur(d.monthly_noi) },
                  { label: 'Cash Flow/mo', val: fmtCur(d.monthly_cashflow), highlight: cashflow != null, color: isGood ? 'var(--green)' : 'var(--red)' },
                  { label: 'Annual Cash Flow', val: fmtCur(d.annual_cashflow), color: isGood ? 'var(--green)' : 'var(--red)' },
                  { label: 'Cap Rate', val: fmtPct(d.cap_rate) },
                  { label: 'Cash-on-Cash', val: fmtPct(d.cash_on_cash_return), color: coc != null && coc > 0 ? 'var(--green)' : coc != null ? 'var(--red)' : undefined },
                  { label: 'Gross Yield', val: fmtPct(d.gross_yield) },
                  { label: 'Total Investment', val: fmtCur(d.total_investment) },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 12px', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{row.label}</span>
                    <span style={{ fontSize: 14, fontWeight: row.highlight ? 700 : 600, fontFamily: 'monospace', color: row.color || 'var(--text-primary)' }}>{row.val}</span>
                  </div>
                ))}
              </div>
            );
          })()}
          {!calc && form.monthly_cashflow == null && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Fill in the inputs and click Save & Calculate to see deal metrics
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Notes Tab ─────────────────────────────────────────────── */
function NotesTab({ propId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '' });
  const [adding, setAdding] = useState(false);

  async function load() {
    const r = await api.get(`/notes?record_type=property&record_id=${propId}`);
    setNotes(r.data || []); setLoading(false);
  }
  useEffect(() => { load(); }, [propId]);

  async function addNote(e) {
    e.preventDefault(); setAdding(true);
    await api.post('/notes', { ...form, record_type: 'property', record_id: propId });
    setForm({ title: '', body: '' }); load(); setAdding(false);
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><div className="spinner" /></div>;

  return (
    <div>
      <form onSubmit={addNote} style={{ marginBottom: 20, padding: 14, background: 'var(--surface-2)', borderRadius: 8 }}>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <input className="form-input" placeholder="Note title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </div>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <textarea className="form-textarea" rows={3} placeholder="Note content..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>{adding ? 'Adding...' : '+ Add Note'}</button>
      </form>
      {notes.length ? notes.map(n => (
        <div key={n.id} style={{ padding: '10px 14px', marginBottom: 10, background: 'var(--surface-2)', borderRadius: 8, borderLeft: n.pinned ? '3px solid var(--accent)' : '3px solid transparent' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{n.pinned ? '📌 ' : ''}{n.title}</div>
          {n.body && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.body}</div>}
          <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString()}</div>
        </div>
      )) : <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No notes yet</div>}
    </div>
  );
}

/* ─── Docs Tab ──────────────────────────────────────────────── */
function DocsTab({ propId, propName }) {
  const [docs, setDocs] = useState([]);
  useEffect(() => {
    api.get(`/documents?record_type=property&record_id=${propId}`).then(r => setDocs(r.data || []));
  }, [propId]);
  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-muted)' }}>
        Documents linked to <strong style={{ color: 'var(--text-primary)' }}>{propName}</strong> — upload files via the Documents section and link them here.
      </div>
      {docs.length ? docs.map(d => (
        <div key={d.id} style={{ display: 'flex', gap: 12, padding: '8px 12px', marginBottom: 8, background: 'var(--surface-2)', borderRadius: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{d.title}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{d.category} · {d.file_type} · {new Date(d.created_at).toLocaleDateString()}</div>
          </div>
          {d.file_url && <a href={d.file_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }}>↗ Open</a>}
        </div>
      )) : <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>No linked documents</div>}
    </div>
  );
}

/* ─── Reports Tab ───────────────────────────────────────────── */
function ReportsTab({ propId, propName }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeReport, setActiveReport] = useState(null);

  async function load() {
    setLoading(true);
    const r = await api.get(`/property-reports/property/${propId}`);
    setReports(r.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [propId]);

  async function runReport() {
    if (!confirm('Run a new deep analysis AI report for this property?')) return;
    setGenerating(true);
    try {
      const { data } = await api.post('/property-reports/generate', { property_id: propId });
      setActiveReport(data);
      load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  }

  if (activeReport) {
    return (
      <div style={{ animation: 'fadeIn 200ms ease' }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setActiveReport(null)} style={{ marginBottom: 16 }}>← Back to History</button>
        <PropertyReportView report={activeReport} />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>AI-generated deep investment analysis reports.</div>
        <button className="btn btn-primary btn-sm" onClick={runReport} disabled={generating}>
          {generating ? 'Generating...' : '+ Run New Report'}
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><div className="spinner" /></div>
      ) : reports.length ? (
        <div style={{ display: 'grid', gap: 12 }}>
          {reports.map(r => (
            <div key={r.id} onClick={() => setActiveReport(r)} className="row-clickable" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 8, borderLeft: `3px solid ${r.investment_score >= 80 ? 'var(--green)' : r.investment_score >= 50 ? 'var(--yellow)' : 'var(--red)'}` }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>Report: {propName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Est. Val: {fmtCur(r.estimated_value)} · Strategy: {r.recommended_strategy}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: r.investment_score >= 80 ? 'var(--green)' : r.investment_score >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                  {r.investment_score}/100
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 4 }}>
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>
          No reports generated yet. Click above to run the AI engine.
        </div>
      )}
    </div>
  );
}

/* ─── Activity Tab ──────────────────────────────────────────── */
function ActivityTab({ propId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/activity?record_type=property&record_id=${propId}`).then(r => {
      setLogs(r.data || []);
      setLoading(false);
    });
  }, [propId]);

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><div className="spinner" /></div>;

  return (
    <div>
      <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-muted)' }}>Historical timeline of events for this property.</div>
      {logs.length ? (
        <div style={{ position: 'relative', paddingLeft: 12, marginLeft: 8, borderLeft: '2px solid var(--border)' }}>
          {logs.map(log => (
            <div key={log.id} style={{ position: 'relative', paddingBottom: 24 }}>
              <div style={{ position: 'absolute', left: -17, top: 4, width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-2)' }} />
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-main)', marginBottom: 2 }}>{log.action.replace(/_/g, ' ')}</div>
              <div style={{ fontSize: 11, color: 'var(--text-disabled)' }}>{new Date(log.created_at).toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>No activity logged.</div>
      )}
    </div>
  );
}

/* ─── Main Drawer ───────────────────────────────────────────── */
const DRAWER_TABS = ['Overview', 'Deal Analysis', 'Reports', 'Activity', 'Notes', 'Documents', 'Links'];

export default function PropertyDetailDrawer({ propId, onClose, onUpdated }) {
  const [prop, setProp] = useState(null);
  const [subTab, setSubTab] = useState('Overview');
  const [editing, setEditing] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  async function load() {
    const r = await api.get(`/properties/${propId}`);
    setProp(r.data);
  }
  useEffect(() => { if (propId) { setProp(null); load(); } }, [propId]);

  async function quickStatus(status) {
    setStatusSaving(true);
    const r = await api.patch(`/properties/${propId}`, { status });
    setProp(p => ({ ...p, status: r.data.status }));
    onUpdated && onUpdated(r.data);
    setStatusSaving(false);
  }

  const STATUS_COLOR_MAP = { 'under-contract':'var(--green)','closed':'var(--green)','analyzing':'var(--orange)','passed':'var(--text-muted)','archived':'var(--text-muted)' };

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 800 }} onClick={onClose} />
      {/* Drawer */}
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 720, maxWidth: '100%', background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', zIndex: 850, display: 'flex', flexDirection: 'column', animation: 'slideInRight 180ms ease' }}>
        {!prop ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <div className="spinner" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{prop.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {prop.address ? `${prop.address}, ` : ''}{prop.city}{prop.city && prop.state ? ', ' : ''}{prop.state}
                    {prop.zip ? ` ${prop.zip}` : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    <span className="badge badge-blue" style={{ fontSize: 10 }}>{prop.property_type}</span>
                    {prop.strategy && <span className="badge badge-gray" style={{ fontSize: 10 }}>{prop.strategy}</span>}
                    {prop.source && <span className="badge badge-gray" style={{ fontSize: 10 }}>{prop.source}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                  <QuickAlertButton linkedType="property" linkedId={propId} />
                  <button className="btn btn-secondary btn-sm" onClick={() => setEditing(true)}>Edit</button>
                  <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
                </div>
              </div>
              {/* Quick status row */}
              <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 12 }}>
                {ALL_STATUSES.map(s => (
                  <button key={s} disabled={statusSaving}
                    onClick={() => quickStatus(s)}
                    style={{ padding: '3px 10px', fontSize: 10, fontWeight: 600, borderRadius: 99, border: '1px solid', whiteSpace: 'nowrap', cursor: 'pointer',
                      background: prop.status === s ? (STATUS_COLOR_MAP[s] || 'var(--accent)') : 'transparent',
                      color: prop.status === s ? 'white' : 'var(--text-muted)',
                      borderColor: prop.status === s ? 'transparent' : 'var(--border)' }}>
                    {s}
                  </button>
                ))}
              </div>
              {/* Sub-tabs */}
              <div style={{ display: 'flex', gap: 2 }}>
                {DRAWER_TABS.map(t => (
                  <button key={t} onClick={() => setSubTab(t)}
                    style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: 'none', color: subTab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: subTab === t ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0, cursor: 'pointer' }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {subTab === 'Overview' && (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'Asking Price', val: prop.asking_price ? Number(prop.asking_price).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }) : '—' },
                      { label: 'Est. Rent/mo', val: prop.estimated_rent ? `$${Number(prop.estimated_rent).toLocaleString()}` : '—' },
                      { label: 'Cap Rate', val: prop.cap_rate ? `${prop.cap_rate}%` : '—' },
                      { label: 'ARV', val: prop.arv ? Number(prop.arv).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }) : '—' },
                      { label: prop.bedrooms != null ? `${prop.bedrooms}bd / ${prop.bathrooms || '?'}ba` : 'Beds/Baths', val: prop.units ? `${prop.units} units` : prop.sqft ? `${Number(prop.sqft).toLocaleString()} sqft` : '—' },
                      { label: 'Next Follow-Up', val: prop.next_follow_up || '—', color: prop.next_follow_up && new Date(prop.next_follow_up) < new Date() ? 'var(--red)' : undefined },
                    ].map(s => (
                      <div key={s.label} style={{ padding: '12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', color: s.color || 'var(--text-primary)' }}>{s.val}</div>
                      </div>
                    ))}
                  </div>

                  {prop.description && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Description / Notes</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{prop.description}</div>
                    </div>
                  )}

                  {(prop.listing_agent_name || prop.listing_url) && (
                    <div style={{ padding: '14px', background: 'var(--surface-2)', borderRadius: 8, marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Listing Agent</div>
                      {prop.listing_agent_name && <div style={{ fontSize: 13, fontWeight: 500 }}>{prop.listing_agent_name}</div>}
                      {prop.listing_agent_phone && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📞 {prop.listing_agent_phone}</div>}
                      {prop.listing_agent_email && <div style={{ fontSize: 12, color: 'var(--accent)' }}>✉ {prop.listing_agent_email}</div>}
                      {prop.listing_url && <a href={prop.listing_url} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm" style={{ marginTop: 8, fontSize: 11 }}>↗ View Listing</a>}
                    </div>
                  )}

                  {prop.financing_notes && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Financing Notes</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{prop.financing_notes}</div>
                    </div>
                  )}
                </div>
              )}

              {subTab === 'Deal Analysis' && <AnalysisTab propId={propId} />}
              {subTab === 'Reports' && <ReportsTab propId={propId} propName={prop.name} />}
              {subTab === 'Activity' && <ActivityTab propId={propId} />}
              {subTab === 'Notes' && <NotesTab propId={propId} />}
              {subTab === 'Documents' && <DocsTab propId={propId} propName={prop.name} />}
              {subTab === 'Links' && <RecordLinksPanel recordType="property" recordId={propId} />}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>
    </>
  );
}
