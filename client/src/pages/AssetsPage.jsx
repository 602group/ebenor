import { useState, useEffect } from 'react';
import api from '../api/client';

import QuickAlertButton from '../components/QuickAlertButton';

const STATUS_COLOR = { active: 'badge-green', inactive: 'badge-gray', archived: 'badge-gray', watchlist: 'badge-blue' };
const CLASS_COLOR = { stock: 'badge-blue', forex: 'badge-purple', 'real-estate': 'badge-orange', crypto: 'badge-yellow', commodity: 'badge-gray' };

function AssetModal({ asset, defaultSector, onClose, onSaved }) {
  const initClass = defaultSector === 'stocks' ? 'stock' : defaultSector === 'forex' ? 'forex' : defaultSector === 'real-estate' ? 'real-estate' : 'stock';
  const [form, setForm] = useState(asset || { name: '', symbol: '', asset_class: initClass, status: 'active', description: '', sector: defaultSector || '', exchange: '', currency: '' });
  const [loading, setLoading] = useState(false);

  async function save(e) {
    e.preventDefault(); setLoading(true);
    try {
      if (asset) await api.patch(`/assets/${asset.id}`, form);
      else await api.post('/assets', form);
      onSaved();
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{asset ? 'Edit Asset' : 'New Asset'}</div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', marginRight: 12 }}>
            {asset && <QuickAlertButton linkedType="asset" linkedId={asset.id} />}
          </div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="e.g. Apple Inc" />
              </div>
              <div className="form-group">
                <label className="form-label">Symbol / Ticker</label>
                <input className="form-input" value={form.symbol || ''} onChange={e => setForm(f => ({...f, symbol: e.target.value}))} placeholder="e.g. AAPL" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Asset Class</label>
                <select className="form-select" value={form.asset_class} onChange={e => setForm(f => ({...f, asset_class: e.target.value}))}>
                  <option value="stock">Stock</option>
                  <option value="forex">Forex</option>
                  <option value="real-estate">Real Estate</option>
                  <option value="crypto">Crypto</option>
                  <option value="commodity">Commodity</option>
                  <option value="etf">ETF</option>
                  <option value="index">Index</option>
                  <option value="sector">Sector / Theme</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                  <option value="active">Active</option>
                  <option value="watchlist">Watchlist</option>
                  <option value="inactive">Inactive</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Sector</label>
                <input className="form-input" value={form.sector || ''} onChange={e => setForm(f => ({...f, sector: e.target.value}))} placeholder="e.g. Technology" />
              </div>
              <div className="form-group">
                <label className="form-label">Exchange</label>
                <input className="form-input" value={form.exchange || ''} onChange={e => setForm(f => ({...f, exchange: e.target.value}))} placeholder="e.g. NASDAQ" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Brief description..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Asset'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AssetsPage({ defaultSector, isWorkspaceView }) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ asset_class: '', status: '', search: '' });
  const [modal, setModal] = useState(null); // null | 'new' | asset object

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.asset_class) params.set('asset_class', filters.asset_class);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (defaultSector) params.set('sector', defaultSector);
    const r = await api.get(`/assets?${params}`);
    setAssets(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [filters.asset_class, filters.status]);

  async function deleteAsset(id) {
    if (!confirm('Delete this asset?')) return;
    await api.delete(`/assets/${id}`);
    setAssets(a => a.filter(x => x.id !== id));
  }

  const filtered = assets.filter(a => !filters.search || a.name.toLowerCase().includes(filters.search.toLowerCase()) || (a.symbol || '').toLowerCase().includes(filters.search.toLowerCase()));

  return (
    <div>
      {!isWorkspaceView ? (
        <div className="page-header">
          <div>
            <div className="page-title">Assets & Markets</div>
            <div className="page-subtitle">{assets.length} assets tracked across stocks, forex, and real estate</div>
          </div>
          <div className="page-header-actions">
            <button className="btn btn-primary" onClick={() => setModal('new')}>+ New Asset</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>+ New Asset</button>
        </div>
      )}

      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search assets..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="filter-select" value={filters.asset_class} onChange={e => setFilters(f => ({...f, asset_class: e.target.value}))}>
          <option value="">All Classes</option>
          <option value="stock">Stock</option>
          <option value="forex">Forex</option>
          <option value="real-estate">Real Estate</option>
          <option value="crypto">Crypto</option>
          <option value="etf">ETF</option>
        </select>
        <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="watchlist">Watchlist</option>
          <option value="inactive">Inactive</option>
          <option value="archived">Archived</option>
        </select>
        <span className="filter-count">{filtered.length} results</span>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          ) : filtered.length ? (
            <table>
              <thead>
                <tr><th>Name</th><th>Symbol</th><th>Class</th><th>Status</th><th>Sector</th><th>Tags</th><th></th></tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id} onClick={() => setModal(a)}>
                    <td><div style={{ fontWeight: 500 }}>{a.name}</div></td>
                    <td><span className="font-mono" style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{a.symbol || '—'}</span></td>
                    <td><span className={`badge ${CLASS_COLOR[a.asset_class] || 'badge-gray'}`}>{a.asset_class}</span></td>
                    <td><span className={`badge ${STATUS_COLOR[a.status] || 'badge-gray'}`}><span className="badge-dot" />  {a.status}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{a.sector || '—'}</td>
                    <td>
                      {(a.tags || []).map(t => (
                        <span key={t.id} className="tag-chip" style={{ color: t.color, background: `${t.color}18` }}>{t.name}</span>
                      ))}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); deleteAsset(a.id); }} style={{ color: 'var(--red)' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">⬡</div>
              <div className="empty-title">No assets found</div>
              <div className="empty-desc">Add your first asset to start tracking markets</div>
            </div>
          )}
        </div>
      </div>

      {modal && (
        <AssetModal
          asset={modal === 'new' ? null : modal}
          defaultSector={defaultSector}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
