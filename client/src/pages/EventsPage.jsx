import { useState, useEffect, useRef } from 'react';
import api from '../api/client';
import QuickAlertButton from '../components/QuickAlertButton';

const IMPORTANCE_COLOR = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#94a3b8' };
const IMPORTANCE_BG    = { critical: 'rgba(239,68,68,0.12)', high: 'rgba(249,115,22,0.1)', medium: 'rgba(234,179,8,0.1)', low: 'rgba(148,163,184,0.08)' };
const EVENT_CATEGORIES = ['inflation','jobs','gdp','central-bank','housing','rates','consumer','manufacturing','internal-review','custom'];
const EVENT_TYPES      = ['economic','earnings','policy','internal','custom'];

/* ─── Event Form Modal ──────────────────────────────────────── */
function EventModal({ ev, defaultSector, onClose, onSaved }) {
  const init = ev || { title:'', event_type:'economic', event_date:'', event_time:'', country:'US', importance:'medium', category:'economic', description:'', pre_event_notes:'', forecast_value:'', previous_value:'', sector: defaultSector || null };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (ev) await api.patch(`/events/${ev.id}`, form);
      else await api.post('/events', form);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize: 16 }}>📅</span>
          <div className="modal-title">{ev ? 'Edit Event' : 'New Macro Event'}</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input className="form-input" value={form.title} onChange={e => upd('title', e.target.value)} required placeholder="e.g. CPI Release — March 2026" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Date *</label>
                <input className="form-input" type="date" value={form.event_date} onChange={e => upd('event_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Time</label>
                <input className="form-input" type="time" value={form.event_time || ''} onChange={e => upd('event_time', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Country / Region</label>
                <input className="form-input" value={form.country || ''} onChange={e => upd('country', e.target.value)} placeholder="US, EU, UK..." />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category || 'economic'} onChange={e => upd('category', e.target.value)}>
                  {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Impact Level</label>
                <select className="form-select" value={form.importance || 'medium'} onChange={e => upd('importance', e.target.value)}>
                  {['low','medium','high','critical'].map(i => <option key={i} value={i}>{i}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-select" value={form.event_type || 'economic'} onChange={e => upd('event_type', e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Forecast</label>
                <input className="form-input" value={form.forecast_value || ''} onChange={e => upd('forecast_value', e.target.value)} placeholder="e.g. 3.1%" />
              </div>
              <div className="form-group">
                <label className="form-label">Previous</label>
                <input className="form-input" value={form.previous_value || ''} onChange={e => upd('previous_value', e.target.value)} placeholder="e.g. 3.0%" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Summary</label>
              <textarea className="form-textarea" rows={2} value={form.description || ''} onChange={e => upd('description', e.target.value)} placeholder="What this event is about..." />
            </div>
            <div className="form-group">
              <label className="form-label">Pre-Event Notes</label>
              <textarea className="form-textarea" rows={3} value={form.pre_event_notes || ''} onChange={e => upd('pre_event_notes', e.target.value)} placeholder="What to watch for, positioning thoughts, risks..." />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : ev ? 'Save' : 'Add Event'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Event Detail Panel ────────────────────────────────────── */
function EventDetailPanel({ ev, onClose, onUpdated }) {
  const [form, setForm] = useState({ post_event_notes: ev.post_event_notes || '', outcome_notes: ev.outcome_notes || '', actual_value: ev.actual_value || '' });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function saveOutcome() {
    setSaving(true);
    const r = await api.patch(`/events/${ev.id}`, { ...form, status: 'completed', reviewed: 1 });
    onUpdated(r.data); setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', zIndex: 850, display: 'flex', flexDirection: 'column', animation: 'slideInRight 180ms ease' }}>
      <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ padding: '2px 8px', background: IMPORTANCE_BG[ev.importance], borderRadius: 4, display: 'inline-block', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: IMPORTANCE_COLOR[ev.importance] }}>{(ev.importance || '').toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{ev.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {ev.event_date} {ev.event_time && `@ ${ev.event_time}`} · {ev.country} · {ev.category}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
        </div>
        <div style={{ display: 'flex', gap: 8, paddingBottom: 12 }}>
          {ev.forecast_value && <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>Forecast:</span> <strong>{ev.forecast_value}</strong></div>}
          {ev.previous_value && <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>Prev:</span> <strong>{ev.previous_value}</strong></div>}
          {ev.actual_value   && <div style={{ fontSize: 12 }}><span style={{ color: 'var(--text-muted)' }}>Actual:</span> <strong style={{ color: 'var(--accent)' }}>{ev.actual_value}</strong></div>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {ev.description && (
          <div style={{ marginBottom: 16, padding: '12px 14px', background: 'rgba(var(--blue-rgb,59,130,246),0.08)', borderRadius: 8, borderLeft: '3px solid var(--blue)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.05em' }}>📖 What is this indicator?</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.65 }}>{ev.description}</div>
          </div>
        )}

        {/* Source links — shown when pre_event_notes contains a URL (from ForexFactory sync) */}
        {ev.pre_event_notes && ev.pre_event_notes.startsWith('http') ? (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <a
              href={ev.pre_event_notes}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            >
              📈 View on Investing.com
            </a>
            <a
              href={`https://news.google.com/search?q=${encodeURIComponent(ev.title + ' ' + (ev.country || ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            >
              📰 Google News
            </a>
            <a
              href={`https://www.forexfactory.com/calendar`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-sm"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}
            >
              🏛 ForexFactory
            </a>
          </div>
        ) : ev.pre_event_notes ? (
          <div style={{ marginBottom: 16, padding: '12px', background: 'var(--surface-2)', borderRadius: 8, borderLeft: '3px solid var(--accent)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Pre-Event Notes</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{ev.pre_event_notes}</div>
          </div>
        ) : null}

        <div style={{ marginBottom: 12 }}>
          <label className="form-label">Post-Event Notes</label>
          <textarea className="form-textarea" rows={4} value={form.post_event_notes} onChange={e => upd('post_event_notes', e.target.value)} placeholder="What happened, market reaction, lessons learned..." />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Actual Value</label>
            <input className="form-input" value={form.actual_value} onChange={e => upd('actual_value', e.target.value)} placeholder="e.g. 3.2%" />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label className="form-label">Outcome / Trade Notes</label>
          <textarea className="form-textarea" rows={3} value={form.outcome_notes} onChange={e => upd('outcome_notes', e.target.value)} placeholder="Trade taken, position adjustments, impact on thesis..." />
        </div>
        <button className="btn btn-primary" style={{ width: '100%', marginBottom: 12 }} onClick={saveOutcome} disabled={saving}>{saving ? 'Saving...' : '✓ Save Outcome & Mark Reviewed'}</button>
        <QuickAlertButton linkedType="event" linkedId={ev.id} label="+ Set Reminder" />
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}

/* ─── Upcoming events grouped by date ──────────────────────── */
function groupByDate(events) {
  const groups = {};
  events.forEach(e => {
    const d = e.event_date;
    if (!groups[d]) groups[d] = [];
    groups[d].push(e);
  });
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

/* ─── Main Page ─────────────────────────────────────────────── */
export default function EventsPage({ defaultSector, isWorkspaceView }) {
  const [tab, setTab] = useState('Upcoming');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({ category: '', importance: '', search: '' });
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  // Maps FF impact strings to platform importance levels
  const toImportance = { High: 'high', Medium: 'medium', Low: 'low', Holiday: 'low' };
  const toCategory = (title) => {
    const t = title.toLowerCase();
    if (t.includes('cpi') || t.includes('inflation') || t.includes('pce') || t.includes('ppi')) return 'inflation';
    if (t.includes('gdp')) return 'gdp';
    if (t.includes('employment') || t.includes('jobs') || t.includes('nfp') || t.includes('unemployment') || t.includes('payroll')) return 'jobs';
    if (t.includes('fed') || t.includes('fomc') || t.includes('ecb') || t.includes('boe') || t.includes('boj') || t.includes('rate decision')) return 'central-bank';
    if (t.includes('housing') || t.includes('home') || t.includes('mortgage') || t.includes('building')) return 'housing';
    if (t.includes('manufacturing') || t.includes('pmi') || t.includes('ism') || t.includes('industrial')) return 'manufacturing';
    if (t.includes('consumer') || t.includes('retail') || t.includes('spending') || t.includes('sentiment')) return 'consumer';
    return 'economic';
  };

  async function syncCalendar() {
    setSyncing(true);
    setSyncResult(null);
    try {
      // Server proxies the ForexFactory request (avoids browser CORS restrictions)
      const r = await api.post('/events/market-calendar/import');
      setSyncResult({ ok: true, ...r.data });
      load();
    } catch (err) {
      setSyncResult({ ok: false, error: err.response?.data?.error || err.message });
    } finally {
      setSyncing(false);
    }
  }

  async function load() {
    setLoading(true);
    const params = tab === 'Upcoming' ? '?upcoming=true' : '?';
    const extra = filters.category ? `&category=${filters.category}` : '';
    const imp   = filters.importance ? `&importance=${filters.importance}` : '';
    const src   = filters.search ? `&search=${encodeURIComponent(filters.search)}` : '';
    const sec   = defaultSector ? `&sector=${defaultSector}` : '';
    const r = await api.get(`/events${params}${extra}${imp}${src}${sec}`);
    setEvents(r.data); setLoading(false);
  }
  useEffect(() => { load(); }, [tab, filters]);

  async function del(id) {
    if (!confirm('Delete this event?')) return;
    await api.delete(`/events/${id}`);
    setEvents(ev => ev.filter(e => e.id !== id));
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      <div style={{ position: 'relative' }}>
        {detail && (
          <>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 800 }} onClick={() => setDetail(null)} />
            <EventDetailPanel ev={detail} onClose={() => setDetail(null)} onUpdated={updated => { setDetail(updated); setEvents(ev => ev.map(e => e.id === updated.id ? updated : e)); }} />
          </>
        )}
      </div>

      {!isWorkspaceView ? (
        <div className="page-header">
          <div>
            <div className="page-title">Macro Calendar</div>
            <div className="page-subtitle">Economic events, rate decisions, and market catalysts</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-secondary"
              onClick={syncCalendar}
              disabled={syncing}
              title="Pull this week + next week from ForexFactory (free, no API key)"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {syncing ? (
                <><span className="spinner" style={{ width: 13, height: 13, borderWidth: 2 }} /> Syncing...</>
              ) : (
                <>🌐 Sync Market Calendar</>
              )}
            </button>
            <button className="btn btn-primary" onClick={() => setModal('new')}>+ Add Event</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 10 }}>
          <button className="btn btn-secondary btn-sm" onClick={syncCalendar} disabled={syncing}>
            {syncing ? 'Syncing...' : '🌐 Sync'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setModal('new')}>+ Add Event</button>
        </div>
      )}

      {syncResult && (
        <div style={{
          marginBottom: 16, padding: '10px 16px', borderRadius: 8, fontSize: 13,
          background: syncResult.ok ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          border: `1px solid ${syncResult.ok ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
          color: syncResult.ok ? '#16a34a' : '#ef4444',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <span>
            {syncResult.ok
              ? `✓ Synced ${syncResult.imported} new events from ForexFactory (${syncResult.skipped} already existed · ${syncResult.total} total pull)`
              : `✗ Sync failed: ${syncResult.error}`
            }
          </span>
          <button onClick={() => setSyncResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}>×</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
        {['Upcoming', 'All Events'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'none', color: tab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0, cursor: 'pointer' }}>
            {t}
          </button>
        ))}
      </div>

      <div className="filters-bar">
        <select className="filter-select" value={filters.category} onChange={e => setFilters(f => ({ ...f, category: e.target.value }))}>
          <option value="">All Categories</option>
          {EVENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-select" value={filters.importance} onChange={e => setFilters(f => ({ ...f, importance: e.target.value }))}>
          <option value="">All Impact Levels</option>
          {['critical','high','medium','low'].map(i => <option key={i} value={i}>{i}</option>)}
        </select>
        <input className="form-input" style={{ maxWidth: 200 }} placeholder="Search..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        <span className="filter-count">{events.length} events</span>
      </div>

      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      : tab === 'Upcoming' ? (
        <div>
          {!events.length
            ? <div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">No upcoming events</div><div className="empty-desc">Add macro events to track economic catalysts</div></div>
            : groupByDate(events).map(([date, dayEvents]) => {
                const isToday = date === today;
                const isPast = date < today;
                return (
                  <div key={date} style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? 'var(--accent)' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      {isToday && <span style={{ background: 'var(--accent)', color: 'white', fontSize: 10, padding: '1px 8px', borderRadius: 99 }}>TODAY</span>}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {dayEvents.map(ev => (
                        <div key={ev.id} onClick={() => setDetail(ev)} className="row-clickable"
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${IMPORTANCE_COLOR[ev.importance] || 'var(--border)'}`, borderRadius: 8, cursor: 'pointer', opacity: isPast ? 0.7 : 1 }}>
                          <div style={{ minWidth: 54, fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{ev.event_time || '--:--'}</div>
                          <div style={{ padding: '2px 7px', background: IMPORTANCE_BG[ev.importance], borderRadius: 4, minWidth: 64, textAlign: 'center' }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: IMPORTANCE_COLOR[ev.importance] }}>{(ev.importance || '').toUpperCase()}</span>
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{ev.title}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ev.country} · {ev.category}</div>
                          </div>
                          {ev.forecast_value && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Forecast: <strong>{ev.forecast_value}</strong></div>}
                          {ev.reviewed ? <span style={{ fontSize: 10, color: 'var(--green)' }}>✓ Reviewed</span> : null}
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={e => { e.stopPropagation(); del(ev.id); }}>×</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
          }
        </div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            {events.length ? (
              <table>
                <thead><tr><th>Event</th><th>Date</th><th>Category</th><th>Impact</th><th>Country</th><th>Forecast</th><th>Actual</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.id} onClick={() => setDetail(ev)}>
                      <td style={{ fontWeight: 600, fontSize: 13 }}>{ev.title}</td>
                      <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{ev.event_date} {ev.event_time && `${ev.event_time}`}</td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{ev.category}</span></td>
                      <td><span style={{ fontSize: 11, fontWeight: 700, color: IMPORTANCE_COLOR[ev.importance] }}>{ev.importance}</span></td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{ev.country}</td>
                      <td style={{ fontSize: 12 }}>{ev.forecast_value || '—'}</td>
                      <td style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>{ev.actual_value || '—'}</td>
                      <td>{ev.reviewed ? <span className="badge badge-green" style={{ fontSize: 10 }}>Reviewed</span> : <span className="badge badge-gray" style={{ fontSize: 10 }}>{ev.status || 'upcoming'}</span>}</td>
                      <td><button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={e => { e.stopPropagation(); del(ev.id); }}>Delete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <div className="empty-state"><div className="empty-icon">📅</div><div className="empty-title">No events found</div></div>}
          </div>
        </div>
      )}

      {modal && <EventModal ev={modal === 'new' ? null : modal} defaultSector={defaultSector} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </div>
  );
}
