import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const PRIO_COLOR = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray' };
const STATUS_COLOR = { watching: 'badge-blue', researching: 'badge-orange', ready: 'badge-green', passed: 'badge-gray' };

function CreateIdeaFromItem({ item, onCreated }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function create() {
    setLoading(true);
    try {
      const r = await api.post('/ideas', {
        title: `${item.asset_name || item.symbol} — Watchlist Idea`,
        asset_id: item.asset_id,
        status: 'researching',
        conviction: item.priority === 'high' ? 'high' : 'medium',
        thesis: item.notes || '',
      });
      navigate('/ideas');
      onCreated?.();
    } finally { setLoading(false); }
  }

  return (
    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--accent)' }} onClick={e => { e.stopPropagation(); create(); }} disabled={loading}>
      {loading ? '...' : '+ Create Idea'}
    </button>
  );
}

function WatchlistItemRow({ item, watchlistId, onUpdated, onRemoved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ priority: item.priority, status: item.status, notes: item.notes || '', alert_price: item.alert_price || '' });

  async function save() {
    await api.patch(`/watchlists/${watchlistId}/items/${item.id}`, form);
    setEditing(false); onUpdated();
  }

  async function remove() {
    if (!confirm('Remove from watchlist?')) return;
    await api.delete(`/watchlists/${watchlistId}/items/${item.id}`);
    onRemoved();
  }

  return (
    <div className="card" style={{ marginBottom: 8, borderLeft: `3px solid ${item.priority === 'high' ? 'var(--red)' : item.priority === 'medium' ? 'var(--yellow, #eab308)' : 'var(--border)'}` }}>
      <div style={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          {/* Symbol badge */}
          <div style={{ width: 40, height: 40, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>
            {(item.symbol || item.asset_name?.slice(0, 3) || '?').slice(0, 4).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{item.asset_name}</div>
              {item.symbol && <span className="font-mono" style={{ fontSize: 11, color: 'var(--accent)' }}>{item.symbol}</span>}
              <span className={`badge ${PRIO_COLOR[item.priority] || 'badge-gray'}`}>{item.priority}</span>
              <span className={`badge ${STATUS_COLOR[item.status] || 'badge-gray'}`}>{item.status}</span>
            </div>
            {item.notes && !editing && <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.notes}</div>}
            {item.alert_price && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Alert @ ${Number(item.alert_price).toFixed(2)}</div>}
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <CreateIdeaFromItem item={item} />
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: 'var(--red)' }} onClick={remove}>Remove</button>
          </div>
        </div>

        {editing && (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <div className="form-row" style={{ marginBottom: 8 }}>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-select" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {['high', 'medium', 'low'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select className="form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  {['watching', 'researching', 'ready', 'passed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Alert Price</label>
                <input className="form-input" type="number" step="any" value={form.alert_price} onChange={e => setForm(f => ({ ...f, alert_price: e.target.value }))} placeholder="0.00" />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label className="form-label">Notes</label>
              <textarea className="form-textarea" style={{ minHeight: 60 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-sm" onClick={save}>Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewWatchlistModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', description: '', asset_class: '' });
  const [saving, setSaving] = useState(false);

  async function save(e) {
    e.preventDefault(); setSaving(true);
    await api.post('/watchlists', form);
    onSaved();
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <div className="modal-title">New Watchlist</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={save}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Growth Stocks, Swing Setups" />
            </div>
            <div className="form-group">
              <label className="form-label">Asset Class</label>
              <select className="form-select" value={form.asset_class} onChange={e => setForm(f => ({ ...f, asset_class: e.target.value }))}>
                <option value="">Mixed</option>
                <option value="stock">Stocks</option>
                <option value="forex">Forex</option>
                <option value="real-estate">Real Estate</option>
                <option value="crypto">Crypto</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" style={{ minHeight: 60 }} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this watchlist for?" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating...' : 'Create Watchlist'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddAssetModal({ watchlistId, onClose, onSaved }) {
  const [assets, setAssets] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [priority, setPriority] = useState('medium');
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/assets').then(r => setAssets(r.data)); }, []);

  const filtered = assets.filter(a => !search || a.name.toLowerCase().includes(search.toLowerCase()) || (a.symbol || '').toLowerCase().includes(search.toLowerCase()));

  async function add(e) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await api.post(`/watchlists/${watchlistId}/items`, { asset_id: selected, priority });
      onSaved();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add asset');
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <div className="modal-title">Add Asset to Watchlist</div>
          <button className="modal-close btn-icon" onClick={onClose}>×</button>
        </div>
        <form onSubmit={add}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Search Assets</label>
              <input className="form-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or symbol..." />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, marginBottom: 12 }}>
              {filtered.slice(0, 20).map(a => (
                <div key={a.id} onClick={() => setSelected(a.id)} style={{ padding: '8px 12px', cursor: 'pointer', background: selected === a.id ? 'var(--accent-dim)' : 'transparent', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div>
                    <span style={{ fontWeight: 500, fontSize: 13 }}>{a.name}</span>
                    {a.symbol && <span className="font-mono" style={{ marginLeft: 6, fontSize: 11, color: 'var(--accent)' }}>{a.symbol}</span>}
                  </div>
                  <span className="badge badge-gray" style={{ fontSize: 10 }}>{a.asset_class}</span>
                </div>
              ))}
              {!filtered.length && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: 13, textAlign: 'center' }}>No assets found</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={priority} onChange={e => setPriority(e.target.value)}>
                <option value="high">High Priority</option>
                <option value="medium">Watch Closely</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={!selected || saving}>{saving ? 'Adding...' : 'Add to Watchlist'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function WatchlistsPage() {
  const [watchlists, setWatchlists] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedWL, setSelectedWL] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [newModal, setNewModal] = useState(false);
  const [addAssetModal, setAddAssetModal] = useState(false);

  async function loadLists() {
    setLoading(true);
    const r = await api.get('/watchlists');
    setWatchlists(r.data);
    setLoading(false);
    // Auto-select first if none selected
    if (r.data.length && !selectedId) {
      selectWatchlist(r.data[0].id);
    }
  }

  async function selectWatchlist(id) {
    setSelectedId(id);
    setItemsLoading(true);
    const r = await api.get(`/watchlists/${id}`);
    setSelectedWL(r.data);
    setItemsLoading(false);
  }

  async function deleteWatchlist(id) {
    if (!confirm('Delete this watchlist and all its items?')) return;
    await api.delete(`/watchlists/${id}`);
    setWatchlists(w => w.filter(x => x.id !== id));
    if (selectedId === id) { setSelectedId(null); setSelectedWL(null); }
  }

  useEffect(() => { loadLists(); }, []);

  async function refreshSelected() {
    if (selectedId) {
      const r = await api.get(`/watchlists/${selectedId}`);
      setSelectedWL(r.data);
      loadLists();
    }
  }

  const items = selectedWL?.items || [];
  const highItems = items.filter(i => i.priority === 'high');
  const medItems = items.filter(i => i.priority === 'medium');
  const lowItems = items.filter(i => i.priority === 'low');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20, height: 'calc(100vh - 120px)' }}>

      {/* ── Left Sidebar: Watchlist List ────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>Watchlists</div>
          <button className="btn btn-primary btn-sm" style={{ fontSize: 11 }} onClick={() => setNewModal(true)}>+ New</button>
        </div>
        {loading ? <div className="spinner" style={{ width: 20, height: 20 }} /> : watchlists.length ? (
          <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {watchlists.map(wl => (
              <div key={wl.id}
                onClick={() => selectWatchlist(wl.id)}
                style={{
                  padding: '10px 14px', borderRadius: 8, cursor: 'pointer',
                  background: selectedId === wl.id ? 'var(--accent-dim)' : 'var(--surface)',
                  border: `1px solid ${selectedId === wl.id ? 'var(--accent)' : 'var(--border)'}`,
                  transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 13, color: selectedId === wl.id ? 'var(--accent)' : 'var(--text-primary)' }}>{wl.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{wl.item_count || 0} assets</div>
                  </div>
                  <button className="btn-icon" style={{ fontSize: 14, color: 'var(--text-muted)' }} onClick={e => { e.stopPropagation(); deleteWatchlist(wl.id); }}>×</button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>◎</div>
            No watchlists yet.<br />
            <button className="btn btn-primary btn-sm" style={{ marginTop: 10 }} onClick={() => setNewModal(true)}>Create First List</button>
          </div>
        )}
      </div>

      {/* ── Right Panel: Selected Watchlist Items ────────────── */}
      <div style={{ overflowY: 'auto' }}>
        {!selectedWL ? (
          <div className="empty-state" style={{ marginTop: 60 }}>
            <div className="empty-icon">◎</div>
            <div className="empty-title">No watchlist selected</div>
            <div className="empty-desc">Create a watchlist and add assets to track setups and opportunities</div>
          </div>
        ) : (
          <>
            <div className="page-header" style={{ marginBottom: 16 }}>
              <div>
                <div className="page-title" style={{ fontSize: 20 }}>{selectedWL.name}</div>
                {selectedWL.description && <div className="page-subtitle">{selectedWL.description}</div>}
                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{items.length} assets</span>
                  {highItems.length > 0 && <span style={{ fontSize: 12, color: 'var(--red)' }}>● {highItems.length} high priority</span>}
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => setAddAssetModal(true)}>+ Add Asset</button>
            </div>

            {itemsLoading ? <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div> : (
              <>
                {/* High priority */}
                {highItems.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>🔴 High Priority ({highItems.length})</div>
                    {highItems.map(item => <WatchlistItemRow key={item.id} item={item} watchlistId={selectedId} onUpdated={refreshSelected} onRemoved={refreshSelected} />)}
                  </div>
                )}

                {/* Medium priority */}
                {medItems.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--yellow, #eab308)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>🟡 Watch Closely ({medItems.length})</div>
                    {medItems.map(item => <WatchlistItemRow key={item.id} item={item} watchlistId={selectedId} onUpdated={refreshSelected} onRemoved={refreshSelected} />)}
                  </div>
                )}

                {/* Low priority */}
                {lowItems.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>⚪ Low Priority ({lowItems.length})</div>
                    {lowItems.map(item => <WatchlistItemRow key={item.id} item={item} watchlistId={selectedId} onUpdated={refreshSelected} onRemoved={refreshSelected} />)}
                  </div>
                )}

                {items.length === 0 && (
                  <div className="empty-state" style={{ marginTop: 40 }}>
                    <div className="empty-icon">◎</div>
                    <div className="empty-title">Watchlist is empty</div>
                    <div className="empty-desc">Add assets you're monitoring and want to track closely</div>
                    <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setAddAssetModal(true)}>Add First Asset</button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {newModal && <NewWatchlistModal onClose={() => setNewModal(false)} onSaved={() => { setNewModal(false); loadLists(); }} />}
      {addAssetModal && <AddAssetModal watchlistId={selectedId} onClose={() => setAddAssetModal(false)} onSaved={() => { setAddAssetModal(false); refreshSelected(); }} />}
    </div>
  );
}
