import { useState, useEffect } from 'react';
import api from '../api/client';
import QuickAlertButton from '../components/QuickAlertButton';
import RecordLinksPanel from '../components/RecordLinksPanel';

const fmtCur = n => n != null && n !== '' ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }) : '—';
const fmtPct = n => n != null && n !== '' ? `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%` : '—';

const STATUS_OPTIONS = ['active','reduced','exited','closed','archived','monitoring-only','owned','under-contract','sold'];
const POSITION_TYPES = ['long','short','forex-long','forex-short','real-estate-owned','real-estate-active','other'];
const ASSET_CLASSES  = ['stocks','forex','real-estate','cash','other'];
const STATUS_COLOR   = { active:'badge-green', reduced:'badge-yellow', exited:'badge-gray', closed:'badge-gray', archived:'badge-gray', owned:'badge-green', 'under-contract':'badge-orange', sold:'badge-blue', 'monitoring-only':'badge-blue' };

/* ─── Summary metrics strip ─────────────────────────────────── */
function SummaryStrip({ summary }) {
  if (!summary) return null;
  const pnlColor = summary.unrealized_pnl >= 0 ? 'var(--green)' : 'var(--red)';
  return (
    <div className="stats-grid">
      {[
        { label: 'Total Value',      val: fmtCur(summary.total_value),     color: 'var(--accent)' },
        { label: 'Unrealized P&L',   val: fmtCur(summary.unrealized_pnl),  color: pnlColor },
        { label: 'Realized P&L',     val: fmtCur(summary.realized_pnl),    color: summary.realized_pnl >= 0 ? 'var(--green)' : 'var(--red)' },
        { label: 'Active Positions', val: summary.active_positions || 0,   color: 'var(--text-primary)' },
        { label: 'Best Performer',   val: summary.best_performer  ? `${summary.best_performer.asset_name || summary.best_performer.symbol} ${fmtPct((summary.best_performer.unrealized_pnl / summary.best_performer.cost_basis) * 100)}` : '—', color: 'var(--green)' },
        { label: 'Worst Performer',  val: summary.worst_performer ? `${summary.worst_performer.asset_name || summary.worst_performer.symbol} ${fmtPct((summary.worst_performer.unrealized_pnl / summary.worst_performer.cost_basis) * 100)}` : '—', color: 'var(--red)' },
      ].map(s => (
        <div key={s.label} className="stat-card">
          <div className="stat-value" style={{ color: s.color, fontSize: 18 }}>{s.val}</div>
          <div className="stat-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─── Entry modal ───────────────────────────────────────────── */
function EntryModal({ entry, assets, onClose, onSaved }) {
  const init = entry || { asset_id:'', asset_class:'stocks', position_type:'long', status:'active', quantity:'', avg_cost:'', current_price:'', realized_pnl:'0', strategy:'', sector:'', thesis_summary:'', date_opened:'', property_id:'' };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (entry) await api.patch(`/portfolio/${entry.id}`, form);
      else await api.post('/portfolio', form);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize: 16 }}>◈</span>
          <div className="modal-title">{entry ? 'Edit Position' : 'New Portfolio Entry'}</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Asset Class *</label>
                <select className="form-select" value={form.asset_class} onChange={e => upd('asset_class', e.target.value)}>
                  {ASSET_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Link to Asset</label>
                <select className="form-select" value={form.asset_id || ''} onChange={e => upd('asset_id', e.target.value)}>
                  <option value="">— free-form —</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.symbol} — {a.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Position Type</label>
                <select className="form-select" value={form.position_type} onChange={e => upd('position_type', e.target.value)}>
                  {POSITION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => upd('status', e.target.value)}>
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Strategy</label>
                <input className="form-input" value={form.strategy || ''} onChange={e => upd('strategy', e.target.value)} placeholder="e.g. buy-and-hold" />
              </div>
              <div className="form-group">
                <label className="form-label">Sector / Theme</label>
                <input className="form-input" value={form.sector || ''} onChange={e => upd('sector', e.target.value)} placeholder="e.g. tech, energy" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity / Size</label>
                <input className="form-input" type="number" step="any" value={form.quantity} onChange={e => upd('quantity', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Avg Entry Price</label>
                <input className="form-input" type="number" step="any" value={form.avg_cost} onChange={e => upd('avg_cost', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Current Price</label>
                <input className="form-input" type="number" step="any" value={form.current_price || ''} onChange={e => upd('current_price', e.target.value)} placeholder="Optional" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date Opened</label>
                <input className="form-input" type="date" value={form.date_opened || ''} onChange={e => upd('date_opened', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Realized P&L</label>
                <input className="form-input" type="number" step="any" value={form.realized_pnl || ''} onChange={e => upd('realized_pnl', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Linked Property ID</label>
                <input className="form-input" value={form.property_id || ''} onChange={e => upd('property_id', e.target.value)} placeholder="For RE holdings" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Investment Thesis</label>
              <textarea className="form-textarea" rows={3} value={form.thesis_summary || ''} onChange={e => upd('thesis_summary', e.target.value)} placeholder="Why you hold this position, risk/return rationale..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : entry ? 'Save Changes' : 'Add Position'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Holdings table ────────────────────────────────────────── */
function HoldingsTable({ entries, onEdit, onDelete, onQuickPrice }) {
  if (!entries.length) return <div className="empty-state"><div className="empty-icon">◈</div><div className="empty-title">No positions</div><div className="empty-desc">Add portfolio entries using the button above</div></div>;
  return (
    <div className="card">
      <div className="table-wrap">
        <table>
          <thead><tr><th>Asset</th><th>Class</th><th>Type</th><th>Qty</th><th>Avg Cost</th><th>Cur Price</th><th>Market Value</th><th>Unrealized P&L</th><th>Status</th><th>Opened</th><th></th></tr></thead>
          <tbody>
            {entries.map(e => {
              const pnl = parseFloat(e.unrealized_pnl) || 0;
              const pnlPct = e.cost_basis > 0 ? (pnl / e.cost_basis) * 100 : 0;
              return (
                <tr key={e.id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{e.symbol || e.asset_name || '—'}</div>
                    {e.thesis_summary && <div style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.thesis_summary}</div>}
                  </td>
                  <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{e.asset_class}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.position_type}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{Number(e.quantity).toLocaleString()}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{fmtCur(e.avg_cost)}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontFamily: 'monospace', fontSize: 12, padding: '2px 6px' }} onClick={() => onQuickPrice(e)}>
                      {e.current_price ? fmtCur(e.current_price) : '+ price'}
                    </button>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600 }}>{fmtCur(e.market_value)}</td>
                  <td>
                    <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtCur(pnl)}</div>
                    <div style={{ fontSize: 10, color: pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPct(pnlPct)}</div>
                  </td>
                  <td><span className={`badge ${STATUS_COLOR[e.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{e.status}</span></td>
                  <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.date_opened || '—'}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => onEdit(e)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => onDelete(e.id)}>×</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Quick Price Modal ─────────────────────────────────────── */
function QuickPriceModal({ entry, onClose, onSaved }) {
  const [price, setPrice] = useState(entry.current_price || '');
  const [saving, setSaving] = useState(false);
  async function save(e) {
    e.preventDefault(); setSaving(true);
    await api.patch(`/portfolio/${entry.id}`, { current_price: price });
    onSaved(); setSaving(false); onClose();
  }
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 380 }}>
        <div className="modal-header">
          <div className="modal-title">Update Price — {entry.symbol || entry.asset_name}</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Current Price</label>
              <input className="form-input" type="number" step="any" value={price} onChange={e => setPrice(e.target.value)} autoFocus required />
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Quantity: {entry.quantity} · Avg cost: {fmtCur(entry.avg_cost)}
              {price && ` → New value: ${fmtCur(parseFloat(price) * parseFloat(entry.quantity))}`}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
const TABS = ['All Holdings', 'Stocks', 'Forex', 'Real Estate'];

export default function PortfolioPage() {
  const [tab, setTab] = useState('All Holdings');
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState(null);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [priceModal, setPriceModal] = useState(null);
  const [statusFilter, setStatusFilter] = useState('active');
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const [entRes, sumRes, astRes] = await Promise.all([
      api.get('/portfolio'),
      api.get('/portfolio/summary'),
      api.get('/assets'),
    ]);
    setEntries(entRes.data.entries || []);
    setSummary(sumRes.data);
    setAssets(astRes.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!confirm('Remove this position?')) return;
    await api.delete(`/portfolio/${id}`);
    setEntries(e => e.filter(x => x.id !== id));
  }

  const CLASS_MAP = { 'All Holdings': null, 'Stocks': 'stocks', 'Forex': 'forex', 'Real Estate': 'real-estate' };
  const filtered = entries.filter(e =>
    (!CLASS_MAP[tab] || e.asset_class === CLASS_MAP[tab]) &&
    (!statusFilter || e.status === statusFilter) &&
    (!search || (e.asset_name || '').toLowerCase().includes(search.toLowerCase()) || (e.symbol || '').toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Portfolio</div>
          <div className="page-subtitle">Active positions, exposure, and performance across all asset classes</div>
        </div>
        <button className="btn btn-primary" onClick={() => setModal('new')}>+ Add Position</button>
      </div>

      <SummaryStrip summary={summary} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'none', color: tab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0, cursor: 'pointer' }}>
            {t}
          </button>
        ))}
      </div>

      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 200 }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="filter-count">{filtered.length} positions</span>
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : <HoldingsTable entries={filtered} onEdit={setModal} onDelete={del} onQuickPrice={setPriceModal} />
      }

      {modal && <EntryModal entry={modal === 'new' ? null : modal} assets={assets} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
      {priceModal && <QuickPriceModal entry={priceModal} onClose={() => setPriceModal(null)} onSaved={load} />}
    </div>
  );
}
