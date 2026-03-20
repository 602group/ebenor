import { useState, useEffect } from 'react';
import api from '../api/client';
import DocumentDetailDrawer from '../components/DocumentDetailDrawer';

export default function DocumentsPage({ defaultSector, isWorkspaceView }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [filters, setFilters] = useState({ category: '', search: '' });
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ title: '', category: 'general', description: '' });
  const [file, setFile] = useState(null);

  async function load() {
    setLoading(true);
    let url = '/documents';
    if (defaultSector) url += `?sector=${defaultSector}`;
    const r = await api.get(url);
    setDocs(r.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = docs.filter(d => (!filters.category || d.category === filters.category) && (!filters.search || d.title.toLowerCase().includes(filters.search.toLowerCase())));

  async function upload(e) {
    e.preventDefault(); setUploading(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('category', form.category);
      fd.append('description', form.description);
      if (defaultSector) fd.append('sector', defaultSector);
      if (file) fd.append('file', file);
      await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setModal(null); setForm({ title: '', category: 'general', description: '' }); setFile(null); load();
    } finally { setUploading(false); }
  }

  async function del(id) { if (!confirm('Delete document?')) return; await api.delete(`/documents/${id}`); setDocs(d => d.filter(x => x.id !== id)); }

  const fmtSize = b => b ? (b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`) : '—';

  return (
    <div>
      {!isWorkspaceView ? (
        <div className="page-header">
          <div><div className="page-title">Documents</div><div className="page-subtitle">{docs.length} documents stored</div></div>
          <button className="btn btn-primary" onClick={() => setModal('new')}>+ Upload Document</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>+ Upload Document</button>
        </div>
      )}
      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search documents..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({...f, category: e.target.value}))}>
          <option value="">All Categories</option>
          {['general','research','broker-statement','checklist','report','strategy','legal','property'].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="filter-count">{filtered.length} results</span>
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          : filtered.length ? (
            <table>
              <thead><tr><th>Title</th><th>Category</th><th>File</th><th>Size</th><th>Date</th><th></th></tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} onClick={() => setSelectedDoc(d.id)} className="table-row-clickable">
                    <td style={{ fontWeight: 500 }}>{d.title}</td>
                    <td><span className="badge badge-gray">{d.category}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{d.file_name || '—'}{d.file_path && <> · <a href={d.file_path} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ color: 'var(--accent)' }}>Download ↗</a></>}</td>
                    <td style={{ fontSize: 12 }}>{fmtSize(d.file_size)}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString()}</td>
                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={(e) => { e.stopPropagation(); del(d.id); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state"><div className="empty-icon">▪</div><div className="empty-title">No documents yet</div><div className="empty-desc">Upload research PDFs, broker statements, checklists, and reports</div></div>}
        </div>
      </div>
      {modal === 'new' && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Upload Document</div><button className="modal-close btn-icon" onClick={() => setModal(null)}>×</button></div>
            <form onSubmit={upload}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Title *</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({...f, title: e.target.value}))} required /></div>
                <div className="form-group"><label className="form-label">Category</label><select className="form-select" value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}>{['general','research','broker-statement','checklist','report','strategy','legal','property'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div className="form-group"><label className="form-label">File</label><input type="file" className="form-input" onChange={e => setFile(e.target.files[0])} style={{ padding: '6px' }} /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" style={{ minHeight: 70 }} value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary" disabled={uploading}>{uploading ? 'Uploading...' : 'Upload'}</button></div>
            </form>
          </div>
        </div>
      )}
      {selectedDoc && (
        <DocumentDetailDrawer
          docId={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
