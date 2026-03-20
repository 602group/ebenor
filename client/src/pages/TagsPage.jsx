import { useState, useEffect } from 'react';
import api from '../api/client';

const PRESET_COLORS = ['#6366f1','#22c55e','#ef4444','#eab308','#3b82f6','#a855f7','#f97316','#06b6d4','#ec4899','#64748b'];

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1', description: '' });

  async function load() { setLoading(true); const r = await api.get('/tags'); setTags(r.data); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save(e) { e.preventDefault(); if (modal !== 'new') await api.patch(`/tags/${modal.id}`, form); else await api.post('/tags', form); setModal(null); load(); }
  async function del(id) { if (!confirm('Delete tag?')) return; await api.delete(`/tags/${id}`); setTags(t => t.filter(x => x.id !== id)); }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Tags</div><div className="page-subtitle">{tags.length} tags · Shared across all record types</div></div>
        <button className="btn btn-primary" onClick={() => { setForm({ name: '', color: '#6366f1', description: '' }); setModal('new'); }}>+ New Tag</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
        {loading ? <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        : tags.length ? tags.map(tag => (
          <div key={tag.id} className="card" style={{ cursor: 'pointer', borderLeft: `4px solid ${tag.color || '#6366f1'}` }} onClick={() => { setForm(tag); setModal(tag); }}>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: tag.color, flexShrink: 0 }} />
                <div style={{ fontWeight: 600, fontSize: 14 }}>{tag.name}</div>
                <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--red)' }} onClick={e => { e.stopPropagation(); del(tag.id); }}>×</button>
              </div>
              {tag.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.4 }}>{tag.description}</div>}
            </div>
          </div>
        )) : (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-icon">⬣</div>
            <div className="empty-title">No tags yet</div>
            <div className="empty-desc">Create tags to organize and cross-reference all platform records</div>
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div className="modal modal-sm">
            <div className="modal-header"><div className="modal-title">{modal === 'new' ? 'New Tag' : 'Edit Tag'}</div><button className="modal-close btn-icon" onClick={() => setModal(null)}>×</button></div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required placeholder="e.g. High Conviction, FOMC Watch" /></div>
                <div className="form-group">
                  <label className="form-label">Color</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button" style={{ width: 24, height: 24, borderRadius: 6, background: c, border: form.color === c ? '2px solid white' : '2px solid transparent', cursor: 'pointer' }} onClick={() => setForm(f => ({...f, color: c}))} />
                    ))}
                  </div>
                  <input type="color" value={form.color || '#6366f1'} onChange={e => setForm(f => ({...f, color: e.target.value}))} style={{ width: 40, height: 28, padding: 2, background: 'transparent', border: '1px solid var(--border)', borderRadius: 4 }} />
                </div>
                <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description || ''} onChange={e => setForm(f => ({...f, description: e.target.value}))} placeholder="Optional description..." /></div>
                {form.color && <div style={{ margin: '8px 0' }}><span className="badge" style={{ background: `${form.color}20`, color: form.color }}>{form.name || 'Preview'}</span></div>}
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button><button type="submit" className="btn btn-primary">Save Tag</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
