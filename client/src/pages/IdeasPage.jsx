import { useState, useEffect } from 'react';
import api from '../api/client';

import QuickAlertButton from '../components/QuickAlertButton';

const STATUS_COLOR = { researching: 'badge-blue', watching: 'badge-yellow', ready: 'badge-orange', entered: 'badge-green', exited: 'badge-gray', rejected: 'badge-red', archived: 'badge-gray' };
const CONV_COLOR = { high: 'badge-green', medium: 'badge-yellow', low: 'badge-gray' };

function IdeaModal({ idea, assets, onClose, onSaved }) {
  const init = idea || { title: '', asset_id: '', status: 'researching', conviction: 'medium', idea_type: 'long', timeframe: '', target_price: '', stop_price: '', thesis: '', risks: '', catalysts: '' };
  const [form, setForm] = useState(init);
  const [loading, setLoading] = useState(false);
  const upd = (k, v) => setForm(f => ({...f, [k]: v}));

  async function save(e) {
    e.preventDefault(); setLoading(true);
    try {
      const body = {...form};
      ['target_price','stop_price'].forEach(k => { if (body[k] === '') body[k] = null; });
      if (idea) await api.patch(`/ideas/${idea.id}`, body);
      else await api.post('/ideas', body);
      onSaved();
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize: 16 }}>◈</span>
          <div className="modal-title">{idea ? 'Edit Idea' : 'New Investment Idea'}</div>
          <div style={{ display: 'flex', gap: 8, marginLeft: 'auto', marginRight: 12 }}>
            {idea && <QuickAlertButton linkedType="idea" linkedId={idea.id} />}
          </div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => upd('title', e.target.value)} required placeholder="e.g. AAPL Breakout Setup Q1 2026" />
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
                <select className="form-select" value={form.idea_type} onChange={e => upd('idea_type', e.target.value)}>
                  <option value="long">Long</option><option value="short">Short</option><option value="neutral">Neutral</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => upd('status', e.target.value)}>
                  {['researching','watching','ready','entered','exited','rejected','archived'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Conviction</label>
                <select className="form-select" value={form.conviction} onChange={e => upd('conviction', e.target.value)}>
                  <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Target Price</label>
                <input className="form-input" type="number" step="any" value={form.target_price || ''} onChange={e => upd('target_price', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Stop Price</label>
                <input className="form-input" type="number" step="any" value={form.stop_price || ''} onChange={e => upd('stop_price', e.target.value)} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="form-label">Timeframe</label>
                <select className="form-select" value={form.timeframe || ''} onChange={e => upd('timeframe', e.target.value)}>
                  <option value="">—</option>
                  {['scalp','swing','position','longterm'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Thesis</label>
              <textarea className="form-textarea" value={form.thesis || ''} onChange={e => upd('thesis', e.target.value)} placeholder="Why is this a good idea? What's the primary thesis?" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Catalysts</label>
                <textarea className="form-textarea" style={{ minHeight: 80 }} value={form.catalysts || ''} onChange={e => upd('catalysts', e.target.value)} placeholder="Key catalysts to watch..." />
              </div>
              <div className="form-group">
                <label className="form-label">Risks</label>
                <textarea className="form-textarea" style={{ minHeight: 80 }} value={form.risks || ''} onChange={e => upd('risks', e.target.value)} placeholder="Main risks to this thesis..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Idea'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function IdeasPage({ defaultSector, isWorkspaceView }) {
  const [ideas, setIdeas] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ status: '', conviction: '', search: '' });

  async function load() {
    setLoading(true);
    const idUrl = defaultSector ? `/ideas?sector=${defaultSector}` : '/ideas';
    const asUrl = defaultSector ? `/assets?sector=${defaultSector}` : '/assets';
    const [id, as] = await Promise.all([api.get(idUrl), api.get(asUrl)]);
    setIdeas(id.data); setAssets(as.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!confirm('Delete this idea?')) return;
    await api.delete(`/ideas/${id}`);
    setIdeas(i => i.filter(x => x.id !== id));
  }

  const filtered = ideas.filter(i =>
    (!filters.status || i.status === filters.status) &&
    (!filters.conviction || i.conviction === filters.conviction) &&
    (!filters.search || i.title.toLowerCase().includes(filters.search.toLowerCase()))
  );

  return (
    <div>
      {!isWorkspaceView ? (
        <div className="page-header">
          <div>
            <div className="page-title">Investment Ideas</div>
            <div className="page-subtitle">{ideas.length} ideas tracked</div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('new')}>+ New Idea</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>+ New Idea</button>
        </div>
      )}

      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search ideas..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({...f, status: e.target.value}))}>
          <option value="">All Statuses</option>
          {['researching','watching','ready','entered','exited','rejected','archived'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filters.conviction} onChange={e => setFilters(f => ({...f, conviction: e.target.value}))}>
          <option value="">All Convictions</option>
          {['high','medium','low'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="filter-count">{filtered.length} ideas</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {loading ? <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        : filtered.length ? filtered.map(idea => (
          <div key={idea.id} className="card" style={{ cursor: 'pointer' }} onClick={() => setModal(idea)}>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{idea.title}</div>
                  {idea.asset_name && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{idea.asset_symbol || idea.asset_name}</div>}
                </div>
                <span className={`badge ${idea.idea_type === 'long' ? 'badge-green' : 'badge-red'}`}>{idea.idea_type}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
                <span className={`badge ${STATUS_COLOR[idea.status] || 'badge-gray'}`}>{idea.status}</span>
                <span className={`badge ${CONV_COLOR[idea.conviction] || 'badge-gray'}`}>{idea.conviction} conv.</span>
              </div>
              {idea.thesis && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{idea.thesis}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: 11 }} onClick={e => { e.stopPropagation(); del(idea.id); }}>Delete</button>
              </div>
            </div>
          </div>
        )) : (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-icon">◈</div>
            <div className="empty-title">No ideas yet</div>
            <div className="empty-desc">Capture your investment thesis and track conviction over time</div>
          </div>
        )}
      </div>

      {modal && <IdeaModal idea={modal === 'new' ? null : modal} assets={assets} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}
