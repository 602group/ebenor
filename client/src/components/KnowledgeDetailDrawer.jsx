import { useState, useEffect } from 'react';
import api from '../api/client';
import RecordLinksPanel from './RecordLinksPanel';
import RecordNotesPanel from './RecordNotesPanel';
import QuickAlertButton from './QuickAlertButton';

export default function KnowledgeDetailDrawer({ recordId, onClose, onUpdated }) {
  const [record, setRecord] = useState(null);
  const [subTab, setSubTab] = useState('Overview');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get(`/knowledge/${recordId}`);
    setRecord(r.data);
    setForm(r.data);
  }
  useEffect(() => { load(); }, [recordId]);

  async function save(e) {
    if (e) e.preventDefault();
    setSaving(true);
    const r = await api.patch(`/knowledge/${recordId}`, {
      title: form.title,
      summary: form.summary,
      body: form.body,
      category: form.category,
      status: form.status
    });
    setRecord({ ...record, ...r.data });
    if (onUpdated) onUpdated();
    setSaving(false);
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 800 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 720, maxWidth: '100%', background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', zIndex: 850, display: 'flex', flexDirection: 'column', animation: 'slideInRight 180ms ease' }}>
        {!record ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}><div className="spinner" /></div> : (
          <>
            <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{record.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Created {new Date(record.created_at).toLocaleDateString()}</div>
                  <div style={{ marginTop: 8 }}><span className="badge badge-blue">{record.category}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <QuickAlertButton linkedType="knowledge" linkedId={recordId} />
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
                <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Title</label>
                    <input className="form-input" value={form.title} style={{ fontSize: '1.2rem', fontWeight: 600 }} onChange={e => setForm({...form, title: e.target.value})} required />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                        {['general','investment-thesis','macro-outlook','post-mortem','how-to','research-deep-dive'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        <option value="draft">Draft</option>
                        <option value="active">Active/Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Summary / TL;DR</label>
                    <textarea className="form-textarea" rows={3} value={form.summary || ''} onChange={e => setForm({...form, summary: e.target.value})} placeholder="Brief executive summary..." />
                  </div>

                  <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label className="form-label">Full Body / Content</label>
                    <textarea className="form-textarea" style={{ minHeight: 300, flex: 1, fontFamily: 'monospace' }} value={form.body || ''} onChange={e => setForm({...form, body: e.target.value})} placeholder="Markdown or plain text content..." />
                  </div>
                  
                  <div>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Knowledge Record'}</button>
                  </div>
                </form>
              )}
              {subTab === 'Notes' && <RecordNotesPanel recordType="knowledge" recordId={recordId} />}
              {subTab === 'Links' && <RecordLinksPanel recordType="knowledge" recordId={recordId} />}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
}
