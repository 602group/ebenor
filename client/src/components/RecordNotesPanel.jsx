import { useState, useEffect } from 'react';
import api from '../api/client';

export default function RecordNotesPanel({ recordType, recordId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', body: '' });
  const [adding, setAdding] = useState(false);

  async function load() {
    // We already augmented the backend API for Documents and Contacts to return their attached notes inside their respective GET/:id routes,
    // but the notes themselves are returned as an array on the parent object.
    // Actually, `notes` routes has a query parameter `record_type` and `record_id` but wait!
    // In server/routes/notes.js this is NOT supported via query params natively without joining `record_notes`.
    // Let me check notes.js. Oh, in notes.js I only filter by category, pinned, archived, search.
    // I should get the notes directly via the parent record if possible, OR add support for filtering by record_type/id in notes.js.
    // Let's use the `/api/${recordType}s/${recordId}` route which returns `notes` since we just added that!
    
    // Wait, let's fetch from the parent record.
    try {
      // Pluralize the type (hacky but works for most: document->documents, contact->contacts, strategy->strategies)
      let plural = recordType + 's';
      if (recordType === 'property') plural = 'properties';
      if (recordType === 'strategy') plural = 'strategies';
      if (recordType === 'knowledge') plural = 'knowledge'; // /api/knowledge is uncountable
      
      const r = await api.get(`/${plural}/${recordId}`);
      setNotes(r.data.notes || []);
    } catch (e) {
      console.error('Failed to load notes', e);
      setNotes([]);
    }
    setLoading(false);
  }
  
  useEffect(() => { load(); }, [recordType, recordId]);

  async function addNote(e) {
    e.preventDefault(); setAdding(true);
    await api.post('/notes', { ...form, attach_to: { record_type: recordType, record_id: recordId } });
    setForm({ title: '', body: '' }); load(); setAdding(false);
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 30 }}><div className="spinner" /></div>;

  return (
    <div>
      <form onSubmit={addNote} style={{ marginBottom: 20, padding: 14, background: 'var(--surface-2)', borderRadius: 8 }}>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <input className="form-input" placeholder="Note title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
        </div>
        <div className="form-group" style={{ marginBottom: 8 }}>
          <textarea className="form-textarea" rows={3} placeholder="Note content..." value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={adding}>{adding ? 'Adding...' : '+ Add Note'}</button>
      </form>
      {notes.length ? notes.map(n => (
        <div key={n.id} style={{ padding: '10px 14px', marginBottom: 10, background: 'var(--surface-2)', borderRadius: 8, borderLeft: n.pinned ? '3px solid var(--accent)' : '3px solid transparent' }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{n.pinned ? '📌 ' : ''}{n.title}</div>
          {n.body && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.body}</div>}
          <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString()}</div>
        </div>
      )) : <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No notes yet</div>}
    </div>
  );
}
