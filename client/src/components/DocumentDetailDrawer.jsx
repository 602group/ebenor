import { useState, useEffect } from 'react';
import api from '../api/client';
import RecordLinksPanel from './RecordLinksPanel';
import RecordNotesPanel from './RecordNotesPanel';
import QuickAlertButton from './QuickAlertButton';

export default function DocumentDetailDrawer({ docId, onClose, onUpdated }) {
  const [doc, setDoc] = useState(null);
  const [subTab, setSubTab] = useState('Overview');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get(`/documents/${docId}`);
    setDoc(r.data);
    setForm(r.data);
  }
  useEffect(() => { load(); }, [docId]);

  async function save(e) {
    if (e) e.preventDefault();
    setSaving(true);
    const r = await api.patch(`/documents/${docId}`, {
      title: form.title,
      category: form.category,
      description: form.description,
      status: form.status
    });
    setDoc({ ...doc, ...r.data });
    if (onUpdated) onUpdated();
    setSaving(false);
  }

  const fmtSize = b => b ? (b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`) : '—';

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 800 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 500, maxWidth: '100%', background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', zIndex: 850, display: 'flex', flexDirection: 'column', animation: 'slideInRight 180ms ease' }}>
        {!doc ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}><div className="spinner" /></div> : (
          <>
            <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{doc.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{doc.file_name} · {fmtSize(doc.file_size)}</div>
                  <div style={{ marginTop: 8 }}><span className="badge badge-gray">{doc.category}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <QuickAlertButton linkedType="document" linkedId={docId} />
                  {doc.file_path && <a href={doc.file_path} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Download</a>}
                  <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {['Overview', 'Notes', 'Links'].map(t => (
                  <button key={t} onClick={() => setSubTab(t)} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: 'none', color: subTab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: subTab === t ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0, cursor: 'pointer' }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {subTab === 'Overview' && (
                <form onSubmit={save}>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input className="form-input" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                        {['general','research','broker-statement','checklist','report','strategy','legal','property'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        <option value="active">Active</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea className="form-textarea" rows={4} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Meta Data'}</button>
                  </div>
                </form>
              )}
              {subTab === 'Notes' && <RecordNotesPanel recordType="document" recordId={docId} />}
              {subTab === 'Links' && <RecordLinksPanel recordType="document" recordId={docId} />}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
}
