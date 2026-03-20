import { useState, useEffect } from 'react';
import api from '../api/client';
import RecordLinksPanel from './RecordLinksPanel';
import RecordNotesPanel from './RecordNotesPanel';
import QuickAlertButton from './QuickAlertButton';

export default function ContactDetailDrawer({ contactId, onClose, onUpdated }) {
  const [contact, setContact] = useState(null);
  const [subTab, setSubTab] = useState('Overview');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get(`/contacts/${contactId}`);
    setContact(r.data);
    setForm(r.data);
  }
  useEffect(() => { load(); }, [contactId]);

  async function save(e) {
    if (e) e.preventDefault();
    setSaving(true);
    const r = await api.patch(`/contacts/${contactId}`, {
      name: form.name,
      company: form.company,
      contact_type: form.contact_type,
      role: form.role,
      email: form.email,
      phone: form.phone,
      city: form.city,
      state: form.state,
      notes_body: form.notes_body
    });
    setContact({ ...contact, ...r.data });
    if (onUpdated) onUpdated();
    setSaving(false);
  }

  const badgeColor = { broker:'badge-blue', agent:'badge-orange', investor:'badge-green', lender:'badge-purple', analyst:'badge-yellow', other:'badge-gray' }[contact?.contact_type] || 'badge-gray';

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 800 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 600, maxWidth: '100%', background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', zIndex: 850, display: 'flex', flexDirection: 'column', animation: 'slideInRight 180ms ease' }}>
        {!contact ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}><div className="spinner" /></div> : (
          <>
            <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{contact.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {contact.role ? `${contact.role} ` : ''}
                    {contact.company && contact.role ? 'at ' : ''}
                    {contact.company ? contact.company : ''}
                  </div>
                  <div style={{ marginTop: 8 }}><span className={`badge ${badgeColor}`}>{contact.contact_type}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <QuickAlertButton linkedType="contact" linkedId={contactId} />
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
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Name *</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                    <div className="form-group"><label className="form-label">Company</label><input className="form-input" value={form.company || ''} onChange={e => setForm({...form, company: e.target.value})} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Type</label><select className="form-select" value={form.contact_type} onChange={e => setForm({...form, contact_type: e.target.value})}>{['broker','agent','investor','lender','analyst','other'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="form-group"><label className="form-label">Role</label><input className="form-input" value={form.role || ''} onChange={e => setForm({...form, role: e.target.value})} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email || ''} onChange={e => setForm({...form, email: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone || ''} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">City</label><input className="form-input" value={form.city || ''} onChange={e => setForm({...form, city: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">State</label><input className="form-input" value={form.state || ''} onChange={e => setForm({...form, state: e.target.value})} /></div>
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Context Summary</label>
                    <textarea className="form-textarea" rows={4} value={form.notes_body || ''} onChange={e => setForm({...form, notes_body: e.target.value})} placeholder="General overview of this contact..." />
                  </div>
                  <div style={{ marginTop: 20 }}>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Meta Data'}</button>
                  </div>
                </form>
              )}
              {subTab === 'Notes' && <RecordNotesPanel recordType="contact" recordId={contactId} />}
              {subTab === 'Links' && <RecordLinksPanel recordType="contact" recordId={contactId} />}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
}
