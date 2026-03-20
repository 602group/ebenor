import { useState, useEffect } from 'react';
import api from '../api/client';
import KnowledgeDetailDrawer from '../components/KnowledgeDetailDrawer';

export default function KnowledgePage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false); // for 'new'
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [filters, setFilters] = useState({ category: '', search: '' });
  
  const init = { title: '', summary: '', body: '', category: 'general', status: 'active' };
  const [form, setForm] = useState(init);

  async function load() {
    setLoading(true);
    const r = await api.get('/knowledge');
    setRecords(r.data);
    setLoading(false);
  }
  
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    const r = await api.post('/knowledge', form);
    setModal(false);
    load();
    setSelectedRecordId(r.data.id); // Open drawer immediately after creation
  }

  async function del(id) {
    if (!confirm('Delete this knowledge record forever?')) return;
    await api.delete(`/knowledge/${id}`);
    setRecords(c => c.filter(x => x.id !== id));
  }

  const filtered = records.filter(r => 
    (!filters.category || r.category === filters.category) && 
    (!filters.search || r.title.toLowerCase().includes(filters.search.toLowerCase()) || (r.summary || '').toLowerCase().includes(filters.search.toLowerCase()))
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Knowledge Base</div>
          <div className="page-subtitle">Long-term research, thesis frameworks, and institutional memory</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setForm(init); setModal(true); }}>+ New Record</button>
      </div>
      
      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search knowledge..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({...f, category: e.target.value}))}>
          <option value="">All Categories</option>
          {['general','investment-thesis','macro-outlook','post-mortem','how-to','research-deep-dive'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="filter-count">{filtered.length} records</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
        {loading ? (
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        ) : filtered.length ? (
          filtered.map(r => (
            <div key={r.id} className="card" style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column' }} onClick={() => setSelectedRecordId(r.id)}>
              <div style={{ padding: 20, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <span className="badge badge-blue">{r.category}</span>
                  <button className="btn-icon" style={{ padding: 4, color: 'var(--text-muted)' }} onClick={e => { e.stopPropagation(); del(r.id); }}>×</button>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, lineHeight: 1.3 }}>{r.title}</div>
                {r.summary && <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{r.summary}</div>}
              </div>
              <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                <span>{new Date(r.updated_at).toLocaleDateString()}</span>
                {r.status !== 'active' && <span>{r.status}</span>}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">📚</div>
            <div className="empty-title">Knowledge base is empty</div>
            <div className="empty-desc">Document deep research, investment theses, and post-mortems for future reference.</div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <div className="modal-title">New Knowledge Record</div>
              <button className="modal-close btn-icon" onClick={() => setModal(false)}>×</button>
            </div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Title *</label>
                  <input className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select className="form-select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>
                      {['general','investment-thesis','macro-outlook','post-mortem','how-to','research-deep-dive'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))}>
                      <option value="draft">Draft</option>
                      <option value="active">Active/Published</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">TL;DR Summary</label>
                  <textarea className="form-textarea" rows={3} value={form.summary} onChange={e => setForm(f => ({...f, summary: e.target.value}))} placeholder="A short context summary..." />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Record</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedRecordId && (
        <KnowledgeDetailDrawer
          recordId={selectedRecordId}
          onClose={() => setSelectedRecordId(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
