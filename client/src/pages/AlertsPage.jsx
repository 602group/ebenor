import { useState, useEffect } from 'react';
import api from '../api/client';

const PRIORITY_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8' };
const PRIORITY_BG    = { critical: 'rgba(239,68,68,0.1)', high: 'rgba(249,115,22,0.08)', medium: 'rgba(234,179,8,0.08)', low: 'rgba(148,163,184,0.06)' };
const ALERT_TYPES    = ['price','date-reminder','research-followup','trade-review','property-followup','macro-reminder','general'];

/* ─── Alert create/edit modal ───────────────────────────────── */
function AlertModal({ alert, onClose, onSaved }) {
  const today = new Date().toISOString().split('T')[0];
  const init = alert || { title:'', description:'', priority:'medium', alert_type:'date-reminder', trigger_type:'date', trigger_date: today, status:'active' };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (alert) await api.patch(`/alerts/${alert.id}`, form);
      else await api.post('/alerts', form);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span style={{ fontSize: 16 }}>🔔</span>
          <div className="modal-title">{alert ? 'Edit Reminder' : 'New Reminder'}</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input className="form-input" value={form.title} onChange={e => upd('title', e.target.value)} required placeholder="What do you need to remember?" autoFocus />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.trigger_date || ''} onChange={e => upd('trigger_date', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => upd('priority', e.target.value)}>
                  <option value="low">Low</option><option value="medium">Medium</option>
                  <option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.alert_type} onChange={e => upd('alert_type', e.target.value)}>
                  {ALERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" rows={3} value={form.description || ''} onChange={e => upd('description', e.target.value)} placeholder="Context, what to look for, action required..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : alert ? 'Save Changes' : '+ Create Reminder'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Alert row card ────────────────────────────────────────── */
function AlertCard({ alert, onComplete, onDismiss, onSnooze, onEdit }) {
  const [snoozing, setSnoozing] = useState(false);
  const today = new Date().toISOString().split('T')[0];
  const isOverdue = alert.trigger_date && alert.trigger_date < today && alert.status === 'active';
  const isToday   = alert.trigger_date === today;

  const dateColor = isOverdue ? 'var(--red)' : isToday ? 'var(--accent)' : 'var(--text-muted)';

  return (
    <div style={{ display: 'flex', gap: 12, padding: '12px 14px', background: alert.priority === 'critical' ? PRIORITY_BG.critical : alert.priority === 'high' ? PRIORITY_BG.high : 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${PRIORITY_COLOR[alert.priority] || 'var(--border)'}`, borderRadius: 8, marginBottom: 8 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{alert.title}</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: PRIORITY_COLOR[alert.priority], flexShrink: 0 }}>{alert.priority?.toUpperCase()}</span>
          <span className="badge badge-blue" style={{ fontSize: 9 }}>{alert.alert_type}</span>
        </div>
        {alert.description && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, lineHeight: 1.4 }}>{alert.description}</div>}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {alert.trigger_date && <span style={{ fontSize: 11, fontFamily: 'monospace', color: dateColor, fontWeight: isOverdue ? 700 : 400 }}>
            {isOverdue ? '⚠ Overdue: ' : isToday ? '📅 Due today: ' : ''}{alert.trigger_date}
          </span>}
          {alert.asset_name && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>🔗 {alert.asset_name}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', flexShrink: 0 }}>
        {alert.status === 'active' && (
          <>
            <button title="Complete" className="btn btn-ghost btn-sm" style={{ color: 'var(--green)', fontSize: 14, padding: '2px 8px' }} onClick={() => onComplete(alert.id)}>✓</button>
            {!snoozing
              ? <button title="Snooze 1 day" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setSnoozing(true)}>Snooze</button>
              : <div style={{ display: 'flex', gap: 4 }}>
                  {[1, 3, 7].map(d => (
                    <button key={d} className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { onSnooze(alert.id, d); setSnoozing(false); }}>{d}d</button>
                  ))}
                  <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setSnoozing(false)}>✕</button>
                </div>
            }
            <button title="Edit" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => onEdit(alert)}>Edit</button>
            <button title="Dismiss" className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--text-muted)' }} onClick={() => onDismiss(alert.id)}>✕</button>
          </>
        )}
        {alert.status === 'completed' && <span style={{ fontSize: 11, color: 'var(--green)' }}>✓ Done</span>}
        {alert.status === 'dismissed' && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Dismissed</span>}
      </div>
    </div>
  );
}

/* ─── Group section ─────────────────────────────────────────── */
function AlertGroup({ label, alerts, accent, onComplete, onDismiss, onSnooze, onEdit }) {
  if (!alerts.length) return null;
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: accent || 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
        <span style={{ background: accent ? 'rgba(255,255,255,0.1)' : 'var(--bg-3)', color: accent || 'var(--text-muted)', fontSize: 11, fontWeight: 700, borderRadius: 99, padding: '1px 8px' }}>{alerts.length}</span>
      </div>
      {alerts.map(a => <AlertCard key={a.id} alert={a} onComplete={onComplete} onDismiss={onDismiss} onSnooze={onSnooze} onEdit={onEdit} />)}
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function AlertsPage({ defaultSector, isWorkspaceView }) {
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [filters, setFilters] = useState({ priority: '', alert_type: '', showCompleted: false, search: '' });

  const today = new Date().toISOString().split('T')[0];
  const in7   = new Date(Date.now() + 7  * 86400000).toISOString().split('T')[0];

  async function load() {
    setLoading(true);
    let alUrl = '/alerts';
    let sumUrl = '/alerts/summary';
    if (defaultSector) {
      alUrl += `?sector=${defaultSector}`;
      sumUrl += `?sector=${defaultSector}`;
    }
    const [alRes, sumRes] = await Promise.all([
      api.get(alUrl),
      api.get(sumUrl),
    ]);
    setAlerts(alRes.data); setSummary(sumRes.data); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function complete(id)         { await api.post(`/alerts/${id}/complete`); load(); }
  async function dismiss(id)          { await api.post(`/alerts/${id}/dismiss`);  load(); }
  async function snooze(id, days)     { await api.post(`/alerts/${id}/snooze`, { days }); load(); }
  async function del(id)              { if (!confirm('Delete?')) return; await api.delete(`/alerts/${id}`); load(); }

  const filtered = alerts.filter(a =>
    (!filters.priority   || a.priority === filters.priority) &&
    (!filters.alert_type || a.alert_type === filters.alert_type) &&
    (!filters.search     || a.title.toLowerCase().includes(filters.search.toLowerCase()) || (a.description || '').toLowerCase().includes(filters.search.toLowerCase()))
  );

  const activeAlerts    = filtered.filter(a => a.status === 'active');
  const completedAlerts = filtered.filter(a => ['completed','dismissed'].includes(a.status)).slice(0, 10);

  const overdueAlerts   = activeAlerts.filter(a => a.trigger_date && a.trigger_date < today);
  const todayAlerts     = activeAlerts.filter(a => a.trigger_date === today);
  const upcomingAlerts  = activeAlerts.filter(a => !a.trigger_date || (a.trigger_date > today && a.trigger_date <= in7));
  const laterAlerts     = activeAlerts.filter(a => a.trigger_date > in7);
  const noDateAlerts    = activeAlerts.filter(a => !a.trigger_date);

  return (
    <div>
      {!isWorkspaceView ? (
        <div className="page-header">
          <div>
            <div className="page-title">Alerts & Reminders</div>
            <div className="page-subtitle">Platform-wide reminder engine — track what to review, act on, or revisit</div>
          </div>
          <button className="btn btn-primary" onClick={() => setModal('new')}>+ New Reminder</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>+ New Reminder</button>
        </div>
      )}

      {/* Summary ribbon */}
      {summary && (
        <div className="stats-grid">
          {[
            { label: 'Overdue',      val: summary.overdue,       color: 'var(--red)' },
            { label: 'Due Today',    val: summary.due_today,     color: 'var(--accent)' },
            { label: 'Next 7 Days',  val: summary.upcoming_7d,   color: 'var(--yellow)' },
            { label: 'High Priority',val: summary.high_priority, color: 'var(--orange)' },
            { label: 'Total Active', val: summary.total_active,  color: 'var(--text-primary)' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{ borderTop: `2px solid ${s.color}` }}>
              <div className="stat-value" style={{ color: s.color, fontSize: 24 }}>{s.val}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="filters-bar" style={{ marginBottom: 20 }}>
        <input className="form-input" style={{ maxWidth: 220 }} placeholder="Search reminders..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        <select className="filter-select" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          <option value="critical">🔴 Critical</option><option value="high">🟠 High</option>
          <option value="medium">🟡 Medium</option><option value="low">⚪ Low</option>
        </select>
        <select className="filter-select" value={filters.alert_type} onChange={e => setFilters(f => ({ ...f, alert_type: e.target.value }))}>
          <option value="">All Types</option>
          {ALERT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.showCompleted} onChange={e => setFilters(f => ({ ...f, showCompleted: e.target.checked }))} /> Show completed
        </label>
        <span className="filter-count">{activeAlerts.length} active</span>
      </div>

      {loading
        ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        : (
          <div>
            <AlertGroup label="⚠ Overdue"         alerts={overdueAlerts}  accent="var(--red)"    onComplete={complete} onDismiss={dismiss} onSnooze={snooze} onEdit={setModal} />
            <AlertGroup label="📅 Due Today"       alerts={todayAlerts}    accent="var(--accent)" onComplete={complete} onDismiss={dismiss} onSnooze={snooze} onEdit={setModal} />
            <AlertGroup label="⏳ Next 7 Days"     alerts={upcomingAlerts} accent="var(--yellow)" onComplete={complete} onDismiss={dismiss} onSnooze={snooze} onEdit={setModal} />
            <AlertGroup label="📌 Later"           alerts={laterAlerts}    accent={null}          onComplete={complete} onDismiss={dismiss} onSnooze={snooze} onEdit={setModal} />
            <AlertGroup label="🔔 No Date Set"     alerts={noDateAlerts}   accent={null}          onComplete={complete} onDismiss={dismiss} onSnooze={snooze} onEdit={setModal} />
            {filters.showCompleted && <AlertGroup label="✓ Recently Completed / Dismissed" alerts={completedAlerts} onComplete={complete} onDismiss={dismiss} onSnooze={snooze} onEdit={setModal} />}
            {!activeAlerts.length && !loading && (
              <div className="empty-state">
                <div className="empty-icon">🔔</div>
                <div className="empty-title">No active reminders</div>
                <div className="empty-desc">Create reminders from here or from any record drawer across the platform</div>
              </div>
            )}
          </div>
        )
      }

      {modal && <AlertModal alert={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}
