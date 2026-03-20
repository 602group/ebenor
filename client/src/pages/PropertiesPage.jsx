import { useState, useEffect } from 'react';
import api from '../api/client';
import PropertyDetailDrawer from '../components/PropertyDetailDrawer';

const fmtCur = n => n ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }) : '—';
const fmtPct = n => n ? `${Number(n).toFixed(2)}%` : '—';

const STATUS_COLOR = {
  'researching':'badge-blue','lead-identified':'badge-blue','contacted':'badge-yellow',
  'analyzing':'badge-orange','offer-planned':'badge-purple','offer-submitted':'badge-purple',
  'negotiating':'badge-orange','under-contract':'badge-green',
  'closed':'badge-green','passed':'badge-gray','archived':'badge-gray',
};
const PRIORITY_COLOR = { high: '#ef4444', medium: '#eab308', low: '#64748b' };
const ALL_STATUSES = ['researching','lead-identified','contacted','analyzing','offer-planned','offer-submitted','negotiating','under-contract','closed','passed','archived'];
const PROPERTY_TYPES = ['single-family','multifamily','condo','townhome','short-term-rental','commercial','land','fix-and-flip','development'];
const STRATEGIES = ['buy-and-hold','long-term-rental','short-term-rental','fix-and-flip','value-add','development','land-banking','wholesale','speculative'];
const RE_CATEGORIES = ['city-market','neighborhood','statewide-trend','rental-market','luxury-market','short-term-rental','macro-housing','asset-type-trend','other'];
const TREND_COLOR = { bullish:'var(--green)', bearish:'var(--red)', neutral:'var(--text-muted)', mixed:'var(--yellow)' };

/* ═══════════════════════════════════════════════════════════════
   PROPERTY FORM MODAL
═══════════════════════════════════════════════════════════════ */
function PropertyModal({ prop, onClose, onSaved }) {
  const init = prop || { name:'', address:'', city:'', state:'', zip:'', property_type:'single-family',
    status:'researching', strategy:'', priority:'medium', source:'', bedrooms:'', bathrooms:'',
    asking_price:'', arv:'', estimated_rent:'', description:'', listing_url:'',
    listing_agent_name:'', listing_agent_phone:'', listing_agent_email:'', mls_number:'',
    next_follow_up:'', financing_notes:'' };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      const body = { ...form };
      ['asking_price','arv','estimated_rent','bedrooms','bathrooms'].forEach(k => { if (body[k] === '') body[k] = null; });
      if (prop) await api.patch(`/properties/${prop.id}`, body);
      else await api.post('/properties', body);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <span style={{ fontSize: 18 }}>⬜</span>
          <div className="modal-title">{prop ? `Edit: ${prop.name}` : 'New Property Opportunity'}</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Property Name / Title *</label>
              <input className="form-input" value={form.name} onChange={e => upd('name', e.target.value)} required placeholder="e.g. Phoenix Duplex AZ-001" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Street Address</label>
                <input className="form-input" value={form.address || ''} onChange={e => upd('address', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.city || ''} onChange={e => upd('city', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={form.state || ''} onChange={e => upd('state', e.target.value)} placeholder="AZ" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Property Type</label>
                <select className="form-select" value={form.property_type} onChange={e => upd('property_type', e.target.value)}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => upd('status', e.target.value)}>
                  {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority || 'medium'} onChange={e => upd('priority', e.target.value)}>
                  <option value="high">🔴 High</option>
                  <option value="medium">🟡 Medium</option>
                  <option value="low">⚪ Low</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Strategy</label>
                <select className="form-select" value={form.strategy || ''} onChange={e => upd('strategy', e.target.value)}>
                  <option value="">—</option>
                  {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select className="form-select" value={form.source || ''} onChange={e => upd('source', e.target.value)}>
                  <option value="">—</option>
                  {['MLS','Wholesaler','Direct','Auction','Pocket listing','Network','Other'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">MLS #</label>
                <input className="form-input" value={form.mls_number || ''} onChange={e => upd('mls_number', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Asking Price</label>
                <input className="form-input" type="number" step="any" value={form.asking_price || ''} onChange={e => upd('asking_price', e.target.value)} placeholder="$0" />
              </div>
              <div className="form-group">
                <label className="form-label">Est. Monthly Rent</label>
                <input className="form-input" type="number" step="any" value={form.estimated_rent || ''} onChange={e => upd('estimated_rent', e.target.value)} placeholder="$0/mo" />
              </div>
              <div className="form-group">
                <label className="form-label">ARV</label>
                <input className="form-input" type="number" step="any" value={form.arv || ''} onChange={e => upd('arv', e.target.value)} placeholder="After Repair Value" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Beds</label>
                <input className="form-input" type="number" value={form.bedrooms || ''} onChange={e => upd('bedrooms', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Baths</label>
                <input className="form-input" type="number" step="0.5" value={form.bathrooms || ''} onChange={e => upd('bathrooms', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Next Follow-Up</label>
                <input className="form-input" type="date" value={form.next_follow_up || ''} onChange={e => upd('next_follow_up', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Listing Agent</label>
                <input className="form-input" value={form.listing_agent_name || ''} onChange={e => upd('listing_agent_name', e.target.value)} placeholder="Agent name" />
              </div>
              <div className="form-group">
                <label className="form-label">Agent Phone</label>
                <input className="form-input" value={form.listing_agent_phone || ''} onChange={e => upd('listing_agent_phone', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Agent Email</label>
                <input className="form-input" value={form.listing_agent_email || ''} onChange={e => upd('listing_agent_email', e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Listing URL</label>
              <input className="form-input" value={form.listing_url || ''} onChange={e => upd('listing_url', e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label className="form-label">Description / Notes</label>
              <textarea className="form-textarea" value={form.description || ''} onChange={e => upd('description', e.target.value)} placeholder="Why this deal, initial thoughts..." rows={3} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : prop ? 'Save Changes' : 'Add Property'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MARKET RESEARCH MODAL
═══════════════════════════════════════════════════════════════ */
function MarketModal({ market, onClose, onSaved }) {
  const init = market || { name:'', category:'city-market', region:'', trend:'', status:'watching', description:'', observation_notes:'' };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function save(e) {
    e.preventDefault(); setSaving(true);
    try {
      if (market) await api.patch(`/remarket/${market.id}`, form);
      else await api.post('/remarket', form);
      onSaved();
    } finally { setSaving(false); }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span style={{ fontSize: 18 }}>◉</span>
          <div className="modal-title">{market ? 'Edit Market Research' : 'New Market Research Record'}</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Market Name *</label>
              <input className="form-input" value={form.name} onChange={e => upd('name', e.target.value)} required placeholder="e.g. Phoenix Housing Market" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={form.category || ''} onChange={e => upd('category', e.target.value)}>
                  <option value="">—</option>
                  {RE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Trend</label>
                <select className="form-select" value={form.trend || ''} onChange={e => upd('trend', e.target.value)}>
                  <option value="">—</option>
                  {['bullish','bearish','neutral','mixed'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Location / Region</label>
              <input className="form-input" value={form.region || ''} onChange={e => upd('region', e.target.value)} placeholder="e.g. Phoenix, AZ" />
            </div>
            <div className="form-group">
              <label className="form-label">Summary</label>
              <textarea className="form-textarea" value={form.description || ''} onChange={e => upd('description', e.target.value)} placeholder="Market overview..." rows={3} />
            </div>
            <div className="form-group">
              <label className="form-label">Research Notes</label>
              <textarea className="form-textarea" value={form.observation_notes || ''} onChange={e => upd('observation_notes', e.target.value)} placeholder="Detailed observations, data points..." rows={4} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PIPELINE TAB
═══════════════════════════════════════════════════════════════ */
const PIPELINE_COLS = [
  { key: 'researching', label: 'Researching' },
  { key: 'lead-identified', label: 'Lead' },
  { key: 'analyzing', label: 'Analyzing' },
  { key: 'offer-planned', label: 'Offer Planned' },
  { key: 'under-contract', label: 'Under Contract' },
  { key: 'closed', label: 'Closed' },
];

function PipelineTab({ onSelectProperty }) {
  const [pipeline, setPipeline] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);

  useEffect(() => {
    api.get('/properties/pipeline').then(r => setPipeline(r.data));
  }, []);

  async function handleDrop(e, targetStatus) {
    e.preventDefault();
    setDragOverCol(null);
    const propId = e.dataTransfer.getData('text/plain');
    if (!propId) return;

    // Find the property across all columns
    let movedProp = null;
    let sourceCol = null;
    for (const key of PIPELINE_COLS.map(c => c.key)) {
      if (!pipeline[key]) continue;
      const found = pipeline[key].find(p => p.id === propId);
      if (found) {
        movedProp = { ...found }; // Clone to avoid mutating state directly
        sourceCol = key;
        break;
      }
    }

    if (!movedProp || sourceCol === targetStatus) return;

    // Optimistically update UI
    setPipeline(prev => {
      const p = { ...prev };
      p[sourceCol] = p[sourceCol].filter(x => x.id !== movedProp.id);
      movedProp.status = targetStatus;
      if (!p[targetStatus]) p[targetStatus] = [];
      p[targetStatus] = [movedProp, ...p[targetStatus]];
      return p;
    });

    // Save to backend
    try {
      await api.patch(`/properties/${movedProp.id}`, { status: targetStatus });
    } catch (err) {
      console.error('Failed to update status', err);
      // Revert on error
      api.get('/properties/pipeline').then(r => setPipeline(r.data));
    }
  }

  if (!pipeline) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
      {PIPELINE_COLS.map(col => {
        const items = pipeline[col.key] || [];
        return (
          <div key={col.key} 
            style={{ 
              minWidth: 220, 
              flex: '0 0 220px', 
              background: dragOverCol === col.key ? 'var(--surface-hover)' : 'transparent',
              borderRadius: 8,
              transition: 'background var(--transition)'
            }}
            onDragOver={e => { e.preventDefault(); setDragOverCol(col.key); }}
            onDragLeave={() => setDragOverCol(null)}
            onDrop={e => handleDrop(e, col.key)}
          >
            <div style={{ padding: '6px 10px', marginBottom: 8, borderRadius: 6, background: 'var(--bg-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{col.label}</span>
              <span style={{ fontSize: 11, background: 'var(--bg-5)', borderRadius: 99, padding: '1px 7px', color: 'var(--text-muted)' }}>{items.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 100 }}>
              {items.map(p => (
                <div key={p.id} 
                  draggable
                  onDragStart={e => e.dataTransfer.setData('text/plain', p.id.toString())}
                  onClick={() => onSelectProperty(p)}
                  style={{ padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: `3px solid ${PRIORITY_COLOR[p.priority] || 'var(--border)'}`, borderRadius: 8, cursor: 'grab', transition: 'box-shadow var(--transition)' }}
                  className="row-clickable">
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.city}{p.city && p.state ? ', ' : ''}{p.state}</div>
                  {p.asking_price && <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', marginTop: 4 }}>{fmtCur(p.asking_price)}</div>}
                  {p.strategy && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{p.strategy}</div>}
                </div>
              ))}
              {!items.length && <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 11, color: 'var(--text-disabled)' }}>Drop here</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   PROPERTIES TABLE TAB  
═══════════════════════════════════════════════════════════════ */
function PropertiesTableTab({ onSelectProperty }) {
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', property_type: '', strategy: '', priority: '', search: '' });
  const [modal, setModal] = useState(null);

  async function load() {
    setLoading(true);
    const r = await api.get('/properties');
    setProps(r.data); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = props.filter(p =>
    (!filters.status || p.status === filters.status) &&
    (!filters.property_type || p.property_type === filters.property_type) &&
    (!filters.strategy || p.strategy === filters.strategy) &&
    (!filters.priority || p.priority === filters.priority) &&
    (!filters.search || p.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      (p.city || '').toLowerCase().includes(filters.search.toLowerCase()) ||
      (p.address || '').toLowerCase().includes(filters.search.toLowerCase()))
  );

  return (
    <>
      <div className="filters-bar">
        <input className="form-input" style={{ maxWidth: 220 }} placeholder="Search..." value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
        <select className="filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
          <option value="">All Statuses</option>
          {ALL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filters.property_type} onChange={e => setFilters(f => ({ ...f, property_type: e.target.value }))}>
          <option value="">All Types</option>
          {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="filter-select" value={filters.strategy} onChange={e => setFilters(f => ({ ...f, strategy: e.target.value }))}>
          <option value="">All Strategies</option>
          {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="filter-select" value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          <option value="high">🔴 High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">⚪ Low</option>
        </select>
        <span className="filter-count">{filtered.length} properties</span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setModal('new')}>+ Add Property</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
          : filtered.length ? (
            <table>
              <thead><tr><th>Property</th><th>Location</th><th>Type</th><th>Strategy</th><th>Status</th><th>Asking</th><th>Est. Rent</th><th>Cap Rate</th><th>Priority</th><th>Follow-Up</th></tr></thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id} onClick={() => onSelectProperty(p)}>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                      {p.mls_number && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>MLS #{p.mls_number}</div>}
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.city}{p.city && p.state ? ', ' : ''}{p.state}</td>
                    <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{p.property_type}</span></td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.strategy || '—'}</td>
                    <td><span className={`badge ${STATUS_COLOR[p.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{p.status}</span></td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{fmtCur(p.asking_price)}</td>
                    <td style={{ fontSize: 12, fontFamily: 'monospace' }}>{p.estimated_rent ? fmtCur(p.estimated_rent) + '/mo' : '—'}</td>
                    <td style={{ fontSize: 12 }}>{fmtPct(p.cap_rate)}</td>
                    <td style={{ fontSize: 11 }}>
                      <span style={{ color: PRIORITY_COLOR[p.priority], fontWeight: 600 }}>
                        {p.priority === 'high' ? '🔴' : p.priority === 'medium' ? '🟡' : '⚪'} {p.priority}
                      </span>
                    </td>
                    <td style={{ fontSize: 11, color: p.next_follow_up && new Date(p.next_follow_up) < new Date() ? 'var(--red)' : 'var(--text-muted)' }}>
                      {p.next_follow_up || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state"><div className="empty-icon">⬜</div><div className="empty-title">No properties yet</div><div className="empty-desc">Add your first property opportunity above</div></div>
          )}
        </div>
      </div>
      {modal && <PropertyModal prop={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MARKET RESEARCH TAB
═══════════════════════════════════════════════════════════════ */
function MarketResearchTab() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [catFilter, setCatFilter] = useState('');

  async function load() {
    setLoading(true);
    const r = await api.get('/remarket');
    setMarkets(r.data); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function del(id) {
    if (!confirm('Delete this market record?')) return;
    await api.delete(`/remarket/${id}`);
    setMarkets(m => m.filter(x => x.id !== id));
  }

  const filtered = markets.filter(m => !catFilter || m.category === catFilter);

  return (
    <>
      <div className="filters-bar">
        <select className="filter-select" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {RE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="filter-count">{filtered.length} market records</span>
        <button className="btn btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setModal('new')}>+ New Market Record</button>
      </div>
      {loading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
      : filtered.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {filtered.map(m => (
            <div key={m.id} className="card" style={{ borderLeft: `3px solid ${TREND_COLOR[m.trend] || 'var(--border)'}` }}>
              <div className="card-header" style={{ gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div className="card-title" style={{ marginBottom: 2 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.region} {m.category && `· ${m.category}`}</div>
                </div>
                {m.trend && <span className="badge badge-gray" style={{ fontSize: 10, color: TREND_COLOR[m.trend] }}>{m.trend}</span>}
              </div>
              <div className="card-body">
                {m.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>{m.description}</p>}
                {m.observation_notes && (
                  <div style={{ background: 'var(--bg-3)', borderRadius: 6, padding: '8px 10px', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {m.observation_notes.slice(0, 200)}{m.observation_notes.length > 200 ? '...' : ''}
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-disabled)' }}>Updated {new Date(m.updated_at).toLocaleDateString()}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setModal(m)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={() => del(m.id)}>Delete</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div className="empty-icon">◉</div><div className="empty-title">No market research yet</div><div className="empty-desc">Track housing markets, rental trends, and macro observations</div></div>
      )}
      {modal && <MarketModal market={modal === 'new' ? null : modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); }} />}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════
   RE DASHBOARD TAB
═══════════════════════════════════════════════════════════════ */
function REDashboardTab({ onSelectProperty, onNewProperty }) {
  const [data, setData] = useState(null);

  useEffect(() => { api.get('/re/dashboard').then(r => setData(r.data)); }, []);

  if (!data) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  const { stats, by_status, high_priority, upcoming_followups, recent_activity, recent_markets } = data;
  const today = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Stat Row */}
      <div className="stats-grid">
        {[
          { label: 'Active Deals', value: stats.active || 0, color: 'var(--accent)' },
          { label: 'High Priority', value: stats.high_priority || 0, color: 'var(--red)' },
          { label: 'Under Contract', value: stats.under_contract || 0, color: 'var(--green)' },
          { label: 'Closed', value: stats.closed_count || 0, color: 'var(--text-muted)' },
          { label: 'Pipeline Value', value: stats.active_pipeline_value ? fmtCur(stats.active_pipeline_value) : '$0', color: 'var(--accent)' },
          { label: 'Avg Cap Rate', value: stats.avg_cap_rate ? fmtPct(stats.avg_cap_rate) : '—', color: 'var(--text-secondary)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-value" style={{ color: s.color, fontSize: 22 }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="two-col" style={{ marginBottom: 16 }}>
        {/* High Priority */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div className="card-title">🔴 High Priority</div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={onNewProperty}>+ Add</button>
          </div>
          <div className="card-body">
            {high_priority.length ? high_priority.map(p => (
              <div key={p.id} onClick={() => onSelectProperty(p)} className="row-clickable"
                style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.city}{p.state ? `, ${p.state}` : ''} · {p.strategy || p.property_type}</div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {p.asking_price && <div style={{ fontSize: 11, fontFamily: 'monospace' }}>{fmtCur(p.asking_price)}</div>}
                  <span className={`badge ${STATUS_COLOR[p.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{p.status}</span>
                </div>
              </div>
            )) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No high priority deals</div>}
          </div>
        </div>

        {/* Upcoming Follow-Ups */}
        <div className="card">
          <div className="card-header"><div className="card-title">📅 Upcoming Follow-Ups</div></div>
          <div className="card-body">
            {upcoming_followups.length ? upcoming_followups.map(p => (
              <div key={p.id} onClick={() => onSelectProperty(p)} className="row-clickable"
                style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                <div style={{ minWidth: 54, fontFamily: 'monospace', fontSize: 11, color: p.next_follow_up < today ? 'var(--red)' : 'var(--accent)', fontWeight: 600 }}>
                  {p.next_follow_up}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                  <span className={`badge ${STATUS_COLOR[p.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{p.status}</span>
                </div>
              </div>
            )) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No follow-ups in next 30 days</div>}
          </div>
        </div>
      </div>

      {/* Recent Markets + Activity */}
      <div className="two-col">
        <div className="card">
          <div className="card-header"><div className="card-title">◉ Recent Market Research</div></div>
          <div className="card-body">
            {recent_markets.length ? recent_markets.map(m => (
              <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{m.region} {m.category && `· ${m.category}`}</div>
                </div>
                {m.trend && <span style={{ fontSize: 11, color: TREND_COLOR[m.trend], fontWeight: 600 }}>{m.trend}</span>}
              </div>
            )) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No market records yet</div>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><div className="card-title">◎ Recent Activity</div></div>
          <div className="card-body" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {recent_activity.length ? recent_activity.map(a => (
              <div key={a.id} style={{ display: 'flex', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0, paddingTop: 1, minWidth: 56 }}>
                  {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div style={{ fontSize: 11 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{a.action} — </span>
                  <span style={{ fontWeight: 500 }}>{a.record_title || a.record_type}</span>
                </div>
              </div>
            )) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '16px 0', textAlign: 'center' }}>No activity yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
const TABS = ['Pipeline', 'Properties', 'Market Research', 'RE Dashboard'];

export default function PropertiesPage({ defaultSector, isWorkspaceView, activeSubTab }) {
  const [tab, setTab] = useState('Properties');
  const [selectedProp, setSelectedProp] = useState(null);
  const [propModal, setPropModal] = useState(null);
  
  // When inside a workspace, the activeSubTab string tells us which component to render
  const currentView = isWorkspaceView ? activeSubTab : tab;

  function handleSelectProperty(p) { setSelectedProp(p); setTab('Properties'); }

  return (
    <div>
      {!isWorkspaceView && (
        <>
          <div className="page-header">
            <div>
              <div className="page-title">Real Estate</div>
              <div className="page-subtitle">Property pipeline, deal analysis, and market research</div>
            </div>
            <button className="btn btn-primary" onClick={() => setPropModal('new')}>+ New Property</button>
          </div>

          <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, background: 'none', color: tab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0, transition: 'all var(--transition)', cursor: 'pointer' }}>
                {t}
              </button>
            ))}
          </div>
        </>
      )}

      {isWorkspaceView && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button className="btn btn-primary btn-sm" onClick={() => setPropModal('new')}>+ New Property</button>
        </div>
      )}

      {/* Tab content */}
      {currentView === 'Pipeline' || currentView === 'pipeline' ? <PipelineTab onSelectProperty={p => { setSelectedProp(p); setTab('Properties'); }} /> : null}
      {currentView === 'Properties' || currentView === 'properties' ? <PropertiesTableTab onSelectProperty={setSelectedProp} /> : null}
      {currentView === 'Market Research' || currentView === 'market' ? <MarketResearchTab /> : null}
      {currentView === 'RE Dashboard' || currentView === 'dashboard' ? <REDashboardTab onSelectProperty={handleSelectProperty} onNewProperty={() => setPropModal('new')} /> : null}

      {/* Property detail drawer */}
      {selectedProp && <PropertyDetailDrawer propId={selectedProp.id} onClose={() => setSelectedProp(null)} onUpdated={(p) => setSelectedProp(p)} />}

      {/* Quick-add modal from header button */}
      {propModal && <PropertyModal prop={null} onClose={() => setPropModal(null)} onSaved={() => setPropModal(null)} />}
    </div>
  );
}
