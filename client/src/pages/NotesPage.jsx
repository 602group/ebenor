import { useState, useEffect } from 'react';
import api from '../api/client';

import QuickAlertButton from '../components/QuickAlertButton';

function NoteModal({ note, defaultSector, onClose, onSaved }) {
  const [form, setForm] = useState(note || { title: '', body: '', category: 'general', pinned: false, sector: defaultSector || null });
  const [loading, setLoading] = useState(false);
  const upd = (k, v) => setForm(f => ({...f, [k]: v}));

  async function save(e) {
    e.preventDefault(); setLoading(true);
    try {
      if (note) await api.patch(`/notes/${note.id}`, form);
      else await api.post('/notes', form);
      onSaved();
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize: 16 }}>▩</span>
          <div className="modal-title">{note ? 'Edit Note' : 'New Research Note'}</div>
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', marginRight: 12, alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.pinned} onChange={e => upd('pinned', e.target.checked)} />
              Pin note
            </label>
            {note && <QuickAlertButton linkedType="note" linkedId={note.id} />}
          </div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => upd('title', e.target.value)} required placeholder="Note title..." />
            </div>
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-select" value={form.category} onChange={e => upd('category', e.target.value)}>
                {['general','research','macro','sector','technical','fundamental','news','strategy','personal'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Body</label>
              <textarea className="form-textarea" style={{ minHeight: 240 }} value={form.body || ''} onChange={e => upd('body', e.target.value)} placeholder="Write your research note here..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Note'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NotesPage({ defaultSector, isWorkspaceView }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ category: '', search: '', pinned: '' });

  async function load() {
    setLoading(true);
    let url = '/notes?archived=false';
    if (defaultSector) url += `&sector=${defaultSector}`;
    const r = await api.get(url);
    setNotes(r.data); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!confirm('Delete note?')) return;
    await api.delete(`/notes/${id}`);
    setNotes(n => n.filter(x => x.id !== id));
  }

  async function togglePin(note) {
    await api.patch(`/notes/${note.id}`, { pinned: !note.pinned });
    load();
  }

  const filtered = notes.filter(n =>
    (!filters.category || n.category === filters.category) &&
    (filters.pinned === '' || (filters.pinned === '1') === Boolean(n.pinned)) &&
    (!filters.search || n.title.toLowerCase().includes(filters.search.toLowerCase()) || (n.body || '').toLowerCase().includes(filters.search.toLowerCase()))
  );

  const CATS = ['general','research','macro','sector','technical','fundamental','news','strategy','personal'];

  return (
    <div>
      {!isWorkspaceView && (
        <div className="page-header">
          <div>
            <div className="page-title">Research Notes</div>
            <div className="page-subtitle">{notes.length} notes · {notes.filter(n => n.pinned).length} pinned</div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('new')}>+ New Note</button>
        </div>
      )}
      {isWorkspaceView && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>+ New Note</button>
        </div>
      )}

      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 280 }} placeholder="Search notes..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({...f, category: e.target.value}))}>
          <option value="">All Categories</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filters.pinned} onChange={e => setFilters(f => ({...f, pinned: e.target.value}))}>
          <option value="">All Notes</option>
          <option value="1">Pinned only</option>
        </select>
        <span className="filter-count">{filtered.length} notes</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {loading ? <div style={{ gridColumn: '1/-1', display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
        : filtered.length ? filtered.map(n => (
          <div key={n.id} className="card" style={{ cursor: 'pointer', borderColor: n.pinned ? 'var(--accent)' : 'var(--border)' }} onClick={() => setModal(n)}>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{n.pinned && '📌 '}{n.title}</div>
                </div>
                <span className="badge badge-gray">{n.category}</span>
              </div>
              {n.body && <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</div>}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(n.updated_at).toLocaleDateString()}</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={e => { e.stopPropagation(); togglePin(n); }}>{n.pinned ? '📌' : 'Pin'}</button>
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={e => { e.stopPropagation(); del(n.id); }}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        )) : (
          <div className="empty-state" style={{ gridColumn: '1/-1' }}>
            <div className="empty-icon">▩</div>
            <div className="empty-title">No notes yet</div>
            <div className="empty-desc">Capture research, observations, and market thinking</div>
          </div>
        )}
      </div>

      {modal && <NoteModal note={modal === 'new' ? null : modal} defaultSector={defaultSector} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}
