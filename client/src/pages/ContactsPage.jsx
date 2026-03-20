import { useState, useEffect } from 'react';
import api from '../api/client';
import ContactDetailDrawer from '../components/ContactDetailDrawer';

const TYPE_BADGE = { broker: 'badge-blue', agent: 'badge-orange', investor: 'badge-green', lender: 'badge-purple', analyst: 'badge-yellow', other: 'badge-gray' };

export default function ContactsPage({ defaultSector, isWorkspaceView }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false); // only true/false for 'new'
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [filters, setFilters] = useState({ contact_type: '', search: '' });
  const init = { name: '', email: '', phone: '', company: '', contact_type: 'other', role: '', city: '', state: '', notes_body: '', sector: defaultSector || null };
  const [form, setForm] = useState(init);

  async function load() {
    setLoading(true);
    let url = '/contacts';
    if (defaultSector) url += `?sector=${defaultSector}`;
    const r = await api.get(url);
    setContacts(r.data);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(e) {
    e.preventDefault();
    await api.post('/contacts', form);
    setModal(false); load();
  }

  async function del(id) { if (!confirm('Delete contact?')) return; await api.delete(`/contacts/${id}`); setContacts(c => c.filter(x => x.id !== id)); }

  const filtered = contacts.filter(c => (!filters.contact_type || c.contact_type === filters.contact_type) && (!filters.search || c.name.toLowerCase().includes(filters.search.toLowerCase()) || (c.company || '').toLowerCase().includes(filters.search.toLowerCase())));

  return (
    <div>
      {!isWorkspaceView ? (
        <div className="page-header">
          <div><div className="page-title">Contacts</div><div className="page-subtitle">{contacts.length} contacts</div></div>
          <button className="btn btn-primary" onClick={() => { setForm(init); setModal(true); }}>+ New Contact</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm(init); setModal(true); }}>+ New Contact</button>
        </div>
      )}
      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 240 }} placeholder="Search contacts..." value={filters.search} onChange={e => setFilters(f => ({...f, search: e.target.value}))} />
        <select className="filter-select" value={filters.contact_type} onChange={e => setFilters(f => ({...f, contact_type: e.target.value}))}>
          <option value="">All Types</option>
          {['broker','agent','investor','lender','analyst','other'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span className="filter-count">{filtered.length} results</span>
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          : filtered.length ? (
            <table>
              <thead><tr><th>Name</th><th>Company</th><th>Type</th><th>Email</th><th>Phone</th><th>Location</th><th></th></tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setSelectedContactId(c.id)} className="table-row-clickable">
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{c.company || '—'}</td>
                    <td><span className={`badge ${TYPE_BADGE[c.contact_type] || 'badge-gray'}`}>{c.contact_type}</span></td>
                    <td style={{ fontSize: 12 }}>{c.email || '—'}</td>
                    <td style={{ fontSize: 12 }}>{c.phone || '—'}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.city}{c.city && c.state ? ', ' : ''}{c.state}</td>
                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={e => { e.stopPropagation(); del(c.id); }}>Delete</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty-state"><div className="empty-icon">◐</div><div className="empty-title">No contacts yet</div><div className="empty-desc">Add brokers, agents, investors, and other key contacts</div></div>}
        </div>
      </div>
      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">New Contact</div><button className="modal-close btn-icon" onClick={() => setModal(false)}>×</button></div>
            <form onSubmit={save}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} required /></div>
                  <div className="form-group"><label className="form-label">Company</label><input className="form-input" value={form.company || ''} onChange={e => setForm(f => ({...f, company: e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.contact_type} onChange={e => setForm(f => ({...f, contact_type: e.target.value}))}>{['broker','agent','investor','lender','analyst','other'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                  <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={form.role || ''} onChange={e => setForm(f => ({...f, role: e.target.value}))} placeholder="e.g. Senior Analyst" /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email || ''} onChange={e => setForm(f => ({...f, email: e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone || ''} onChange={e => setForm(f => ({...f, phone: e.target.value}))} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city || ''} onChange={e => setForm(f => ({...f, city: e.target.value}))} /></div>
                  <div className="form-group"><label className="form-label">State</label><input className="form-input" value={form.state || ''} onChange={e => setForm(f => ({...f, state: e.target.value}))} /></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes_body || ''} onChange={e => setForm(f => ({...f, notes_body: e.target.value}))} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button><button type="submit" className="btn btn-primary">Save Contact</button></div>
            </form>
          </div>
        </div>
      )}
      {selectedContactId && (
        <ContactDetailDrawer
          contactId={selectedContactId}
          onClose={() => setSelectedContactId(null)}
          onUpdated={load}
        />
      )}
    </div>
  );
}
