import { useState, useEffect } from 'react';
import api from '../api/client';

// Minimal CRUD page factory pattern for simpler sections
function SimplePage({ title, icon, endpoint, emptyMsg, columns, renderRow, renderForm, newDefault }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(newDefault);
  const [saving, setSaving] = useState(false);

  async function load() { setLoading(true); const r = await api.get(endpoint); setItems(r.data); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (modal && modal !== 'new') await api.patch(`${endpoint}/${modal.id}`, form);
      else await api.post(endpoint, form);
      setModal(null); load();
    } finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm('Delete?')) return;
    await api.delete(`${endpoint}/${id}`);
    setItems(i => i.filter(x => x.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{title}</div>
          <div className="page-subtitle">{items.length} records</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(newDefault); setModal('new'); }}>+ New</button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          : items.length ? (
            <table>
              <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}<th></th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} onClick={() => { setForm(item); setModal(item); }}>
                    {renderRow(item)}
                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={e => { e.stopPropagation(); del(item.id); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state"><div className="empty-icon">{icon}</div><div className="empty-title">No records yet</div><div className="empty-desc">{emptyMsg}</div></div>}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'new' ? 'New' : 'Edit'} {title.replace(/s$/, '')}</div>
              <button className="modal-close btn-icon" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">{renderForm(form, upd => setForm(f => ({...f, ...upd})))}</div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export function NewsPage({ defaultSector, isWorkspaceView }) {
  const [news, setNews] = useState([]); const [loading, setLoading] = useState(true); const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ category: '', saved: '', search: '' });
  
  const initClass = defaultSector === 'stocks' ? 'stock' : defaultSector === 'forex' ? 'forex' : defaultSector === 'real-estate' ? 'real-estate' : '';
  const init = { title: '', url: '', source: '', summary: '', category: 'general', asset_class: initClass, saved: false, sentiment: '' };
  const [form, setForm] = useState(init);

  async function load() {
    setLoading(true);
    let url = '/news';
    if (defaultSector) url += `?sector=${defaultSector}`;
    const r = await api.get(url);
    setNews(r.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = news.filter(n => (!filters.category || n.category === filters.category) && (!filters.saved || (filters.saved === '1') === Boolean(n.saved)) && (!filters.search || n.title.toLowerCase().includes(filters.search.toLowerCase())));

  async function save(e) { e.preventDefault(); if (modal && modal !== 'new') { await api.patch(`/news/${modal.id}`, form); } else { await api.post('/news', form); } setModal(null); load(); }
  async function del(id) { if (!confirm('Delete?')) return; await api.delete(`/news/${id}`); setNews(n => n.filter(x => x.id !== id)); }

  return (
    <div>
      {!isWorkspaceView ? (
        <div className="page-header">
          <div><div className="page-title">News</div><div className="page-subtitle">{news.length} articles</div></div>
          <button className="btn btn-primary" onClick={() => { setForm(init); setModal('new'); }}>+ Add Article</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(init); setModal('new'); }}>+ Add Article</button>
        </div>
      )}
      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({...f, category: e.target.value}))}>
          <option value="">All Categories</option>
          {['general','macro','earnings','fed','geopolitical','sector','technical'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filters.saved} onChange={e => setFilters(f => ({...f, saved: e.target.value}))}>
          <option value="">All</option><option value="1">Saved only</option>
        </select>
        <span className="filter-count">{filtered.length} articles</span>
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          : filtered.length ? (
            <table>
              <thead><tr><th>Title</th><th>Source</th><th>Category</th><th>Sentiment</th><th>Saved</th><th></th></tr></thead>
              <tbody>
                {filtered.map(n => (
                  <tr key={n.id} onClick={() => { setForm(n); setModal(n); }}>
                    <td><div style={{ fontWeight: 500 }}>{n.title}</div>{n.url && <a href={n.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--accent)' }} onClick={e => e.stopPropagation()}>Open link ↗</a>}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n.source || '—'}</td>
                    <td><span className="badge badge-gray">{n.category}</span></td>
                    <td>{n.sentiment ? <span className={`badge ${n.sentiment === 'bullish' ? 'badge-green' : n.sentiment === 'bearish' ? 'badge-red' : 'badge-gray'}`}>{n.sentiment}</span> : '—'}</td>
                    <td>{n.saved ? <span className="badge badge-yellow">★ Saved</span> : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>}</td>
                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={e => { e.stopPropagation(); del(n.id); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state"><div className="empty-icon">◉</div><div className="empty-title">No articles yet</div><div className="empty-desc">Save news articles and research for future reference</div></div>}
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-lg">
            <div className="modal-header"><div className="modal-title">{modal === 'new' ? 'Add Article' : 'Edit Article'}</div><button className="modal-close btn-icon" onClick={() => setModal(null)}>×</button></div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">URL</label><input className="form-input" value={form.url || ''} onChange={e => setForm(f => ({...f, url: e.target.value}))} placeholder="https://..." /></div>
                  <div className="form-group"><label className="form-label">Source</label><input className="form-input" value={form.source || ''} onChange={e => setForm(f => ({...f, source: e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category || 'general'} onChange={e => setForm(f => ({...f, category: e.target.value}))}>{['general','macro','earnings','fed','geopolitical','sector','technical'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Sentiment</label><select className="form-select" value={form.sentiment || ''} onChange={e => setForm(f => ({...f, sentiment: e.target.value}))}><option value="">—</option><option value="bullish">Bullish</option><option value="bearish">Bearish</option><option value="neutral">Neutral</option></select></div>
                  <div className="form-group"><label className="form-label">Asset Class</label><select className="form-select" value={form.asset_class || ''} onChange={e => setForm(f => ({...f, asset_class: e.target.value}))}><option value="">—</option>{['stock','forex','real-estate','crypto'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                </div>
                <div className="form-group"><label className="form-label">Summary</label><textarea className="form-textarea" value={form.summary || ''} onChange={e => setForm(f => ({...f, summary: e.target.value}))} /></div>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={!!form.saved} onChange={e => setForm(f => ({...f, saved: e.target.checked}))} /> Save this article</label>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
export default NewsPage;
