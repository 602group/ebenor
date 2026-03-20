import { useState, useEffect } from 'react';
import api from '../api/client';
import StrategyDetailDrawer from '../components/StrategyDetailDrawer';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false); // for 'new'
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);
  const [filters, setFilters] = useState({ category: '', search: '' });
  
  const init = { name: '', description: '', category: 'general', status: 'draft' };
  const [form, setForm] = useState(init);

  async function load() {
    setLoading(true);
    const r = await api.get('/strategies');
    setStrategies(r.data);
    setLoading(false);
  }
  
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const r = await api.post('/strategies', form);
    setModal(false);
    load();
    setSelectedStrategyId(r.data.id); // Open drawer immediately after creation
  }

  async function del(id) {
    if (!confirm('Delete this strategy?')) return;
    await api.delete(`/strategies/${id}`);
    setStrategies(c => c.filter(x => x.id !== id));
  }

  const filtered = strategies.filter(r => 
    (!filters.category || r.category === filters.category) && 
    (!filters.search || r.name.toLowerCase().includes(filters.search.toLowerCase()) || (r.description || '').toLowerCase().includes(filters.search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Strategies & Playbooks</div>
          <div className="page-subtitle">Standardize and codify repeating trading and investment frameworks</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(init); setModal(true); }}>+ New Strategy</button>
      </div>
      
      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search strategies..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({...f, category: e.target.value}))}>
          <option value="">All Categories</option>
          {['general','day-trading','swing-trading','value-investing','real-estate','options','arbitrage'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="filter-count">{filtered.length} playbooks</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : filtered.length ? (
          filtered.map(r => (
            <div key={r.id} className="card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => setSelectedStrategyId(r.id)}>
              <div style={{ padding: 20, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span className="badge badge-purple">{r.category}</span>
                  <button className="btn-icon" style={{ padding: 4, color: 'var(--text-muted)' }} onClick={e => { e.stopPropagation(); del(r.id); }}>×</button>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{r.name}</div>
                {r.asset_classes && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Assets: {r.asset_classes}</div>}
                {r.description && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.description}</div>}
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{new Date(r.updated_at).toLocaleDateString()}</span>
                {r.status !== 'active' && <span>{r.status}</span>}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">♟️</div>
            <div className="empty-title">No strategies defined</div>
            <div className="empty-desc">Create your first structured playbook or trading framework.</div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">New Strategy</div>
              <button className="modal-close btn-icon" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Strategy Name *</label>
                  <input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                      {['general','day-trading','swing-trading','value-investing','real-estate','options','arbitrage'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                      <option value="draft">Draft / Research</option>
                      <option value="active">Active / Deployed</option>
                      <option value="archived">Archived / Retired</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">High-Level Description</label>
                  <textarea className="form-textarea" rows={3} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="What is the objective of this playbook?" />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Playbook</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedStrategyId && (
        <StrategyDetailDrawer
          strategyId={selectedStrategyId}
          onClose={() => setSelectedStrategyId(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
