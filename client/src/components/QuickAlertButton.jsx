import { useState } from 'react';
import api from '../api/client';

const TRIGGER_TYPES = ['date','event','manual','price-watch','status'];
const ALERT_TYPES   = ['price','date-reminder','research-followup','trade-review','property-followup','macro-reminder','general'];

/* ─── QuickAlertButton ──────────────────────────────────────────────────────
   Reusable "+ Reminder" button. Can be embedded in any record drawer.
   Accepts: linkedType, linkedId, label (optional)
   Dynamically sets the appropriate linked_*_id field on POST.
────────────────────────────────────────────────────────────────────────── */
function QuickAlertModal({ linkedType, linkedId, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', trigger_type: 'date',
    alert_type: 'date-reminder', trigger_date: today, status: 'active',
  });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const LINKED_KEY_MAP = {
    idea:     'linked_idea_id',
    property: 'linked_property_id',
    event:    'linked_event_id',
    note:     'linked_note_id',
    trade:    'linked_trade_id',
  };

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      const body = { ...form };
      if (linkedType && linkedId && LINKED_KEY_MAP[linkedType]) {
        body[LINKED_KEY_MAP[linkedType]] = linkedId;
      }
      await api.post('/alerts', body);
      onSaved?.();
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <span style={{ fontSize: 16 }}>🔔</span>
          <div className="modal-title">New Reminder</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            {linkedType && <div style={{ marginBottom: 12, padding: '5px 10px', background: 'var(--surface-2)', borderRadius: 6, fontSize: 11, color: 'var(--text-muted)' }}>Linked to: <strong style={{ color: 'var(--accent)' }}>{linkedType}</strong></div>}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => upd('title', e.target.value)} required placeholder="e.g. Review thesis after CPI" autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.trigger_date} onChange={e => upd('trigger_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => upd('priority', e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Type</label>
              <select className="form-select" value={form.alert_type} onChange={e => upd('alert_type', e.target.value)}>
                {ALERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={2} value={form.description} onChange={e => upd('description', e.target.value)} placeholder="What to look for, what action to take..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : '+ Set Reminder'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function QuickAlertButton({ linkedType, linkedId, label = '+ Reminder', style = {} }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn btn-secondary btn-sm" style={{ fontSize: 12, ...style }} onClick={() => setOpen(true)}>
        🔔 {label}
      </button>
      {open && <QuickAlertModal linkedType={linkedType} linkedId={linkedId} onClose={() => setOpen(false)} />}
    </>
  );
}
