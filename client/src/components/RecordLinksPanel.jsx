import { useState, useEffect } from 'react';
import api from '../api/client';

/**
 * RecordLinksPanel — reusable component for viewing and managing
 * polymorphic links between any two records.
 *
 * Usage: <RecordLinksPanel recordType="trade" recordId={id} />
 */

const TYPE_LABELS = { asset: 'Asset', trade: 'Trade', idea: 'Idea', note: 'Note', property: 'Property', contact: 'Contact', news: 'News', document: 'Document', market: 'Market' };
const TYPE_BADGE = { asset: 'badge-blue', trade: 'badge-green', idea: 'badge-orange', note: 'badge-gray', property: 'badge-purple', contact: 'badge-yellow', news: 'badge-gray', document: 'badge-gray', market: 'badge-blue' };

export default function RecordLinksPanel({ recordType, recordId }) {
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addMode, setAddMode] = useState(false);
  const [targetType, setTargetType] = useState('asset');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [relationship, setRelationship] = useState('');
  const [searching, setSearching] = useState(false);

  async function loadLinks() {
    try {
      const r = await api.get(`/links?source_type=${recordType}&source_id=${recordId}`);
      setLinks(r.data || []);
    } catch { setLinks([]); }
    setLoading(false);
  }

  useEffect(() => { loadLinks(); }, [recordId]);

  async function search(q) {
    setSearchQ(q);
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const r = await api.get(`/search?q=${encodeURIComponent(q)}`);
    const filtered = (r.data.results || []).filter(x => x.type === targetType);
    setSearchResults(filtered.slice(0, 8));
    setSearching(false);
  }

  async function addLink(target) {
    await api.post('/links', {
      source_type: recordType, source_id: recordId,
      target_type: target.type, target_id: target.id,
      relationship: relationship || undefined,
    });
    setAddMode(false); setSearchQ(''); setSearchResults([]); setRelationship('');
    loadLinks();
  }

  async function removeLink(linkId) {
    await api.delete(`/links/${linkId}`);
    setLinks(l => l.filter(x => x.id !== linkId));
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Linked Records</div>
        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setAddMode(!addMode)}>
          {addMode ? 'Cancel' : '+ Link Record'}
        </button>
      </div>

      {/* Add link form */}
      {addMode && (
        <div style={{ padding: 12, background: 'var(--surface-2)', borderRadius: 8, marginBottom: 10 }}>
          <div className="form-row" style={{ marginBottom: 8 }}>
            <div className="form-group">
              <label className="form-label">Record Type</label>
              <select className="form-select" value={targetType} onChange={e => { setTargetType(e.target.value); setSearchQ(''); setSearchResults([]); }}>
                {Object.entries(TYPE_LABELS).filter(([k]) => !(k === recordType)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Relationship</label>
              <input className="form-input" value={relationship} onChange={e => setRelationship(e.target.value)} placeholder="e.g. supports, contradicts, led to" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Search {TYPE_LABELS[targetType]}s</label>
            <input className="form-input" value={searchQ} onChange={e => search(e.target.value)} placeholder={`Search ${TYPE_LABELS[targetType]}s...`} />
          </div>
          {searching && <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '4px 0' }}>Searching...</div>}
          {searchResults.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', marginTop: 4 }}>
              {searchResults.map(r => (
                <div key={r.id} onClick={() => addLink(r)} style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  className="row-clickable">
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{r.title}</div>
                    {r.subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.subtitle}</div>}
                  </div>
                  <span className={`badge ${TYPE_BADGE[r.type] || 'badge-gray'}`} style={{ fontSize: 10 }}>{r.type}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Existing links */}
      {loading ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading links...</div>
      : links.length ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {links.map(l => {
            const isSource = l.source_type === recordType && l.source_id === recordId;
            const linkedType = isSource ? l.target_type : l.source_type;
            const linkedTitle = isSource ? l.target_title : l.source_title;
            return (
              <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', background: 'var(--surface-2)', borderRadius: 6 }}>
                <span className={`badge ${TYPE_BADGE[linkedType] || 'badge-gray'}`} style={{ fontSize: 10, flexShrink: 0 }}>{TYPE_LABELS[linkedType] || linkedType}</span>
                <div style={{ flex: 1, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{linkedTitle || `${linkedType} record`}</div>
                {l.relationship && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', flexShrink: 0 }}>{l.relationship}</div>}
                <button className="btn-icon" style={{ fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }} onClick={() => removeLink(l.id)}>×</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: 12, fontStyle: 'italic' }}>No linked records yet</div>
      )}
    </div>
  );
}
