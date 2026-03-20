import { useState, useEffect } from 'react';
import api from '../api/client';

import QuickAlertButton from '../components/QuickAlertButton';

const STATUS_COLOR = { planned: 'badge-blue', open: 'badge-green', closed: 'badge-gray', canceled: 'badge-red', reviewed: 'badge-purple' };
const fmtCur = n => n == null ? '—' : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPnl = n => !n ? '—' : (n > 0 ? '+' : '') + fmtCur(n);
const pnlClass = n => n > 0 ? 'pnl-positive' : n < 0 ? 'pnl-negative' : '';

function TradeModal({ trade, assets, onClose, onSaved }) {
  const init = trade || { title: '', asset_id: '', trade_type: 'long', status: 'planned', strategy: '', timeframe: '', entry_price: '', exit_price: '', stop_loss: '', take_profit: '', size: '', pnl: '', entry_date: '', exit_date: '', conviction: '', notes_body: '', mistakes: '', lessons: '' };
  const [form, setForm] = useState(init);
  const [loading, setLoading] = useState(false);
  const upd = (k, v) => setForm(f => ({...f, [k]: v}));

  async function save(e) {
    e.preventDefault(); setLoading(true);
    try {
      const body = {...form};
      ['entry_price','exit_price','stop_loss','take_profit','size','pnl'].forEach(k => { if (body[k] === '') body[k] = null; });
      if (trade) await api.patch(`/trades/${trade.id}`, body);
      else await api.post('/trades', body);
      onSaved();
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize: 16 }}>▲</span>
          <div className="modal-title">{trade ? 'Edit Trade' : 'Log New Trade'}</div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', marginRight: 12 }}>
            {trade && <QuickAlertButton linkedType="trade" linkedId={trade.id} />}
          </div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Trade Title *</label>
              <input className="form-input" value={form.title} onChange={e => upd('title', e.target.value)} required placeholder="e.g. AAPL Long Setup Dec 2025" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Asset</label>
                <select className="form-select" value={form.asset_id || ''} onChange={e => upd('asset_id', e.target.value)}>
                  <option value="">— Select Asset —</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.symbol ? `${a.symbol} · ` : ''}{a.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.trade_type} onChange={e => upd('trade_type', e.target.value)}>
                  <option value="long">Long</option>
                  <option value="short">Short</option>
                  <option value="option">Option</option>
                  <option value="scalp">Scalp</option>
                  <option value="swing">Swing</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => upd('status', e.target.value)}>
                  <option value="planned">Planned</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                  <option value="canceled">Canceled</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Entry Price</label>
                <input className="form-input" type="number" step="any" value={form.entry_price || ''} onChange={e => upd('entry_price', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Exit Price</label>
                <input className="form-input" type="number" step="any" value={form.exit_price || ''} onChange={e => upd('exit_price', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Stop Loss</label>
                <input className="form-input" type="number" step="any" value={form.stop_loss || ''} onChange={e => upd('stop_loss', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Take Profit</label>
                <input className="form-input" type="number" step="any" value={form.take_profit || ''} onChange={e => upd('take_profit', e.target.value)} placeholder="0.00" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Size / Quantity</label>
                <input className="form-input" type="number" step="any" value={form.size || ''} onChange={e => upd('size', e.target.value)} placeholder="0" />
              </div>
              <div className="form-group">
                <label className="form-label">P&L ($)</label>
                <input className="form-input" type="number" step="any" value={form.pnl || ''} onChange={e => upd('pnl', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Strategy</label>
                <input className="form-input" value={form.strategy || ''} onChange={e => upd('strategy', e.target.value)} placeholder="e.g. Breakout, Mean Reversion" />
              </div>
              <div className="form-group">
                <label className="form-label">Timeframe</label>
                <select className="form-select" value={form.timeframe || ''} onChange={e => upd('timeframe', e.target.value)}>
                  <option value="">—</option>
                  <option value="scalp">Scalp</option>
                  <option value="intraday">Intraday</option>
                  <option value="swing">Swing</option>
                  <option value="position">Position</option>
                  <option value="longterm">Long Term</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Entry Date</label>
                <input className="form-input" type="date" value={form.entry_date || ''} onChange={e => upd('entry_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Exit Date</label>
                <input className="form-input" type="date" value={form.exit_date || ''} onChange={e => upd('exit_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Conviction</label>
                <select className="form-select" value={form.conviction || ''} onChange={e => upd('conviction', e.target.value)}>
                  <option value="">—</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Trade Notes / Thesis</label>
              <textarea className="form-textarea" value={form.notes_body || ''} onChange={e => upd('notes_body', e.target.value)} placeholder="Why did you take this trade?" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Mistakes</label>
                <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.mistakes || ''} onChange={e => upd('mistakes', e.target.value)} placeholder="What went wrong?" />
              </div>
              <div className="form-group">
                <label className="form-label">Lessons Learned</label>
                <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.lessons || ''} onChange={e => upd('lessons', e.target.value)} placeholder="Key takeaways..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Trade'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TradesPage({ defaultSector, isWorkspaceView }) {
  const [trades, setTrades] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ status: '', trade_type: '', search: '' });

  async function load() {
    setLoading(true);
    const trUrl = defaultSector ? `/trades?sector=${defaultSector}` : '/trades';
    const asUrl = defaultSector ? `/assets?sector=${defaultSector}` : '/assets';
    const [tr, as] = await Promise.all([api.get(trUrl), api.get(asUrl)]);
    setTrades(tr.data); setAssets(as.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!confirm('Delete this trade?')) return;
    await api.delete(`/trades/${id}`);
    setTrades(t => t.filter(x => x.id !== id));
  }

  const filtered = trades.filter(t =>
    (!filters.status || t.status === filters.status) &&
    (!filters.trade_type || t.trade_type === filters.trade_type) &&
    (!filters.search || t.title.toLowerCase().includes(filters.search.toLowerCase()))
  );

  const totalPnl = filtered.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);

  return (
    <div>
      {!isWorkspaceView ? (
        <div className="page-header">
          <div>
            <div className="page-title">Trade Journal</div>
            <div className="page-subtitle">{trades.length} trades logged · Total P&L: <span className={pnlClass(totalPnl)}>{fmtPnl(totalPnl)}</span></div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('new')}>+ Log Trade</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>Total P&L: <span className={pnlClass(totalPnl)}>{fmtPnl(totalPnl)}</span></div>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>+ Log Trade</button>
        </div>
      )}

      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search trades..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
          <option value="">All Statuses</option>
          {['planned','open','closed','canceled','reviewed'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filters.trade_type} onChange={e => setFilters(f => ({...f, trade_type: e.target.value}))}>
          <option value="">All Types</option>
          {['long','short','option','scalp','swing'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="filter-count">{filtered.length} trades</span>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          : filtered.length ? (
            <table>
              <thead><tr><th>Trade</th><th>Asset</th><th>Type</th><th>Status</th><th>Entry</th><th>Exit</th><th>P&L</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} onClick={() => setModal(t)}>
                    <td><div style={{ fontWeight: 500 }}>{t.title}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.strategy}</div></td>
                    <td><span className="font-mono" style={{ color: 'var(--text-secondary)' }}>{t.asset_symbol || t.asset_name || '—'}</span></td>
                    <td><span className={`badge ${t.trade_type === 'long' ? 'badge-green' : 'badge-red'}`}>{t.trade_type}</span></td>
                    <td><span className={`badge ${STATUS_COLOR[t.status] || 'badge-gray'}`}>{t.status}</span></td>
                    <td className="font-mono" style={{ fontSize: 12 }}>{t.entry_price ? fmtCur(t.entry_price) : '—'}</td>
                    <td className="font-mono" style={{ fontSize: 12 }}>{t.exit_price ? fmtCur(t.exit_price) : '—'}</td>
                    <td><span className={pnlClass(t.pnl)}>{fmtPnl(t.pnl)}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t.entry_date || '—'}</td>
                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={e => { e.stopPropagation(); del(t.id); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state"><div className="empty-icon">▲</div><div className="empty-title">No trades found</div><div className="empty-desc">Log your first trade to start building your journal</div></div>}
        </div>
      </div>

      {modal && <TradeModal trade={modal === 'new' ? null : modal} assets={assets} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}
