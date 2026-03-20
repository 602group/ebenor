import { useState, useEffect } from 'react';
import api from '../api/client';

export default function SectorNewsPage({ defaultSector, isWorkspaceView }) {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  
  // Provide a clean sector mapping string
  const activeSector = defaultSector === 'stocks' ? 'stocks' 
                     : defaultSector === 'forex' ? 'forex' 
                     : defaultSector === 'real-estate' ? 'real-estate' : 'stocks';

  const [form, setForm] = useState({ title: '', url: '', description: '', sector: activeSector, resource_type: 'website', is_featured: false, status: 'active' });

  async function load() {
    setLoading(true);
    // When rendered inside a sector workspace, filter exactly to that sector.
    let url = `/news-resources`;
    if (defaultSector) url += `?sector=${activeSector}`;
    
    const r = await api.get(url);
    setResources(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, [defaultSector]);

  async function save(e) {
    e.preventDefault();
    if (modal && modal !== 'new') {
      await api.patch(`/news-resources/${modal.id}`, form);
    } else {
      await api.post('/news-resources', form);
    }
    setModal(null);
    load();
  }

  async function del(id) {
    if (!confirm('Archive this resource?')) return;
    await api.delete(`/news-resources/${id}`);
    setResources(n => n.filter(x => x.id !== id));
  }

  const pageTitle = defaultSector === 'stocks' ? 'Equities Resources' : defaultSector === 'forex' ? 'FX Market Feeds' : 'Real Estate Portals';
  const pageSub = 'Curated news, data, and research for this sector';

  return (
    <div>
      {!isWorkspaceView ? (
        <div className="page-header" style={{ marginBottom: 24 }}>
          <div>
            <div className="page-title">{pageTitle}</div>
            <div className="page-subtitle">{pageSub}</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setForm({ ...form, sector: activeSector }); setModal('new'); }}>+ Add Resource</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm({ ...form, sector: activeSector }); setModal('new'); }}>+ Add Resource</button>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      ) : resources.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {resources.map(r => (
            <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="card-body" style={{ flexGrow: 1, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                  <span className={`badge ${r.resource_type === 'youtube' ? 'badge-red' : r.resource_type === 'video stream' ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                    {r.resource_type}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.4 }}>
                  {r.description}
                </div>
              </div>
              <div className="card-footer" style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ padding: '4px 12px' }}>
                  Open Link ↗
                </a>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-icon" style={{ fontSize: 14 }} onClick={() => { setForm(r); setModal(r); }}>⚙️</button>
                  <button className="btn-icon" style={{ fontSize: 14, color: 'var(--red)' }} onClick={() => del(r.id)}>×</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">◉</div>
            <div className="empty-title">No resources yet</div>
            <div className="empty-desc">Add trusted external links and research portals to this workspace</div>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">{modal === 'new' ? 'Add Resource' : 'Edit Resource'}</div>
              <button className="modal-close btn-icon" onClick={() => setModal(null)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Resource Name *</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
                <div className="form-group"><label className="form-label">External URL *</label><input className="form-input" value={form.url} onChange={e => setForm(f => ({...f, url: e.target.value}))} required placeholder="https://" /></div>
                
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Sector</label>
                    <select className="form-select" value={form.sector} onChange={e => setForm(f => ({...f, sector: e.target.value}))}>
                      <option value="stocks">Equities</option>
                      <option value="forex">Forex</option>
                      <option value="real-estate">Real Estate</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Resource Type</label>
                    <select className="form-select" value={form.resource_type} onChange={e => setForm(f => ({...f, resource_type: e.target.value}))}>
                      <option value="website">Website</option>
                      <option value="youtube">YouTube</option>
                      <option value="video stream">Video Stream</option>
                      <option value="newsletter">Newsletter</option>
                      <option value="market data">Market Data</option>
                      <option value="blog">Blog</option>
                    </select>
                  </div>
                </div>

                <div className="form-group"><label className="form-label">Short Description</label><textarea className="form-textarea" value={form.description || ''} onChange={e => setForm(f => ({...f, description: e.target.value}))} rows={2} /></div>
                <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={!!form.is_featured} onChange={e => setForm(f => ({...f, is_featured: e.target.checked}))} /> Highlight as Featured
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Resource</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
