import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const TABS = [
  { key: 'stocks',       label: '📈 Stocks',          asset_class: 'stock',    market_type: null },
  { key: 'forex',        label: '💱 Forex',            asset_class: 'forex',    market_type: null },
  { key: 're_markets',   label: '🏘 RE Markets',       asset_class: null,       market_type: 'real-estate' },
  { key: 'macro',        label: '🌐 Macro Indicators', asset_class: null,       market_type: 'macro' },
];

const TREND_BADGE = { bullish: 'badge-green', bearish: 'badge-red', neutral: 'badge-gray', sideways: 'badge-yellow' };

// ── Asset row for Stocks / Forex tabs ─────────────────────────────────────────
function AssetRow({ asset, watchlists, onAddToWatchlist, onClick }) {
  const [adding, setAdding] = useState(false);
  const [selectedWL, setSelectedWL] = useState('');

  async function add(e) {
    e.stopPropagation();
    if (!selectedWL) return;
    setAdding(true);
    try {
      await api.post(`/watchlists/${selectedWL}/items`, { asset_id: asset.id });
      setSelectedWL('');
      setAdding(false);
    } catch (err) {
      setAdding(false);
    }
  }

  return (
    <tr onClick={onClick} style={{ cursor: 'pointer' }}>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12, color: 'var(--accent)', flexShrink: 0 }}>
            {(asset.symbol || asset.name.slice(0, 3)).slice(0, 4).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{asset.symbol || asset.name}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{asset.name}</div>
          </div>
        </div>
      </td>
      <td><span className={`badge ${asset.asset_class === 'stock' ? 'badge-blue' : asset.asset_class === 'forex' ? 'badge-purple' : 'badge-gray'}`}>{asset.asset_class}</span></td>
      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{asset.sector || '—'}</td>
      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{asset.exchange || '—'}</td>
      <td><span className={`badge ${asset.status === 'active' ? 'badge-green' : 'badge-gray'}`}>{asset.status}</span></td>
      <td onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {watchlists.length > 0 && (
            <select className="filter-select" style={{ fontSize: 11, padding: '3px 6px' }} value={selectedWL} onChange={e => setSelectedWL(e.target.value)}>
              <option value="">+ Watchlist</option>
              {watchlists.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          )}
          {selectedWL && <button className="btn btn-primary btn-sm" style={{ fontSize: 11, padding: '3px 10px' }} onClick={add} disabled={adding}>Add</button>}
        </div>
      </td>
    </tr>
  );
}

// ── Market Observation row for RE Markets / Macro tabs ────────────────────────
function MarketObsModal({ obs, onClose, onSaved }) {
  const init = obs || { name: '', market_type: 'macro', ticker: '', region: '', description: '', observation_notes: '', trend: '', status: 'watching' };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (obs) await api.patch(`/markets/${obs.id}`, form);
      else await api.post('/markets', form);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <div className="modal-title">{obs ? 'Edit Market Observation' : 'New Market Observation'}</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e => upd('name', e.target.value)} required placeholder="e.g. Phoenix Housing Market, DXY, S&P 500 Trend" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Market Type</label>
                <select className="form-select" value={form.market_type} onChange={e => upd('market_type', e.target.value)}>
                  <option value="stocks">Stocks</option>
                  <option value="forex">Forex</option>
                  <option value="real-estate">Real Estate Markets</option>
                  <option value="macro">Macro Indicators</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Ticker / Symbol</label>
                <input className="form-input" value={form.ticker || ''} onChange={e => upd('ticker', e.target.value)} placeholder="e.g. DXY, ^VIX, USHOUSS" />
              </div>
              <div className="form-group">
                <label className="form-label">Region</label>
                <input className="form-input" value={form.region || ''} onChange={e => upd('region', e.target.value)} placeholder="e.g. Phoenix AZ, US South, EU" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Trend</label>
                <select className="form-select" value={form.trend || ''} onChange={e => upd('trend', e.target.value)}>
                  <option value="">—</option>
                  <option value="bullish">Bullish</option>
                  <option value="bearish">Bearish</option>
                  <option value="neutral">Neutral</option>
                  <option value="sideways">Sideways</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => upd('status', e.target.value)}>
                  <option value="watching">Watching</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" style={{ minHeight: 70 }} value={form.description || ''} onChange={e => upd('description', e.target.value)} placeholder="What does this market/indicator represent?" />
            </div>
            <div className="form-group">
              <label className="form-label">Research Notes</label>
              <textarea className="form-textarea" value={form.observation_notes || ''} onChange={e => upd('observation_notes', e.target.value)} placeholder="Current market observations, thesis, signals..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MarketsPage() {
  const [activeTab, setActiveTab] = useState('stocks');
  const [assets, setAssets] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [watchlists, setWatchlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const currentTab = TABS.find(t => t.key === activeTab);
  const isAssetTab = activeTab === 'stocks' || activeTab === 'forex';

  const load = useCallback(async () => {
    setLoading(true);
    const [wl] = await Promise.all([api.get('/watchlists')]);
    setWatchlists(wl.data);

    if (isAssetTab) {
      const r = await api.get(`/assets?asset_class=${currentTab.asset_class}`);
      setAssets(r.data);
    } else {
      const r = await api.get(`/markets?market_type=${currentTab.market_type}`);
      setMarkets(r.data);
    }
    setLoading(false);
  }, [activeTab]);

  useEffect(() => { load(); setSearch(''); }, [activeTab]);

  async function delMarket(id) {
    if (!confirm('Delete this market observation?')) return;
    await api.delete(`/markets/${id}`);
    setMarkets(m => m.filter(x => x.id !== id));
  }

  const filteredAssets = assets.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.symbol || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredMarkets = markets.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || (m.ticker || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Markets</div>
          <div className="page-subtitle">Monitor stocks, forex, real estate markets, and macro indicators</div>
        </div>
        {!isAssetTab && (
          <button className="btn btn-primary" onClick={() => setModal({ market_type: currentTab.market_type })}>+ Add Observation</button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 18px',
            fontSize: 13, fontWeight: activeTab === t.key ? 600 : 400,
            color: activeTab === t.key ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: activeTab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 280 }} placeholder={`Search ${currentTab.label}...`} value={search} onChange={e => setSearch(e.target.value)} />
        <span className="filter-count">{isAssetTab ? filteredAssets.length : filteredMarkets.length} records</span>
      </div>

      {/* Stocks & Forex — asset table */}
      {isAssetTab && (
        <div className="card">
          <div className="table-wrap">
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : filteredAssets.length ? (
              <table>
                <thead>
                  <tr><th>Asset</th><th>Class</th><th>Sector</th><th>Exchange</th><th>Status</th><th>Watchlist</th></tr>
                </thead>
                <tbody>
                  {filteredAssets.map(a => (
                    <AssetRow key={a.id} asset={a} watchlists={watchlists} onAddToWatchlist={() => {}} onClick={() => {}} />
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">{activeTab === 'stocks' ? '📈' : '💱'}</div>
                <div className="empty-title">No {currentTab.label} tracked</div>
                <div className="empty-desc">Add {activeTab === 'stocks' ? 'stock' : 'forex'} assets from the Assets & Markets section</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RE Markets & Macro — market observations */}
      {!isAssetTab && (
        <div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
          ) : filteredMarkets.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
              {filteredMarkets.map(m => (
                <div key={m.id} className="card" style={{ cursor: 'pointer', borderLeft: m.trend ? `4px solid ${m.trend === 'bullish' ? 'var(--green)' : m.trend === 'bearish' ? 'var(--red)' : 'var(--accent)'}` : '1px solid var(--border)' }} onClick={() => setModal(m)}>
                  <div style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                        {m.ticker && <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', marginTop: 2 }}>{m.ticker}</div>}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        {m.trend && <span className={`badge ${TREND_BADGE[m.trend] || 'badge-gray'}`}>{m.trend}</span>}
                        <span className="badge badge-blue">{m.market_type}</span>
                      </div>
                    </div>
                    {m.region && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>📍 {m.region}</div>}
                    {m.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 8, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.description}</div>}
                    {m.observation_notes && <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.observation_notes}</div>}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                      <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={e => { e.stopPropagation(); delMarket(m.id); }}>Delete</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">{activeTab === 're_markets' ? '🏘' : '🌐'}</div>
              <div className="empty-title">No {currentTab.label} tracked</div>
              <div className="empty-desc">Add market-level observations to track macro trends, housing markets, and economic indicators</div>
              <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setModal({ market_type: currentTab.market_type })}>Add First Observation</button>
            </div>
          )}
        </div>
      )}

      {modal && (
        <MarketObsModal
          obs={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
