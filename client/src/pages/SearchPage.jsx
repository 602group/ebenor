import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const TYPE_ROUTES = { asset: '/assets', trade: '/trades', idea: '/ideas', note: '/notes', property: '/properties', contact: '/contacts', news: '/news', document: '/documents' };

export default function SearchPage() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function search(e) {
    e.preventDefault();
    if (!q.trim()) return;
    setLoading(true);
    const r = await api.get(`/search?q=${encodeURIComponent(q)}`);
    setResults(r.data);
    setLoading(false);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Global Search</div>
          <div className="page-subtitle">Search across all records: assets, trades, ideas, notes, properties, contacts, and more</div>
        </div>
      </div>

      <div style={{ maxWidth: 620, marginBottom: 24 }}>
        <form onSubmit={search} style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search everything..."
            style={{ fontSize: 15, padding: '12px 16px' }}
            autoFocus
          />
          <button className="btn btn-primary" type="submit" disabled={loading || !q.trim()} style={{ padding: '12px 24px' }}>
            {loading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : 'Search'}
          </button>
        </form>
      </div>

      {results && (
        <div>
          <div style={{ marginBottom: 16, color: 'var(--text-muted)', fontSize: 13 }}>
            {results.count} result{results.count !== 1 ? 's' : ''} for "<strong style={{ color: 'var(--text-primary)' }}>{q}</strong>"
          </div>
          {results.count === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <div className="empty-title">No results found</div>
              <div className="empty-desc">Try different keywords or check spelling</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.results.map((r, i) => (
              <div key={i} className="card" style={{ cursor: 'pointer', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14 }} onClick={() => navigate(TYPE_ROUTES[r.type] || '/')}>
                <span className="search-result-type-badge" style={{ background: 'var(--accent-dim)', color: 'var(--accent)', minWidth: 80, textAlign: 'center' }}>{r.type}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14, color: 'var(--text-primary)' }}>{r.title}</div>
                  {r.subtitle && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{r.subtitle}</div>}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>→</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!results && !loading && (
        <div className="empty-state" style={{ marginTop: 40 }}>
          <div className="empty-icon">🔍</div>
          <div className="empty-title">Search your platform</div>
          <div className="empty-desc">Enter a keyword to search across assets, trades, ideas, notes, properties, contacts, news, and documents</div>
        </div>
      )}
    </div>
  );
}
