import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function GlobalNewsDashboard() {
  const [resources, setResources] = useState({ 'real-estate': [], 'forex': [], 'stocks': [] });
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  async function load() {
    setLoading(true);
    // Fetch all resources at once and bucket them to avoid 3 API calls
    const r = await api.get('/news-resources');
    const bucketed = { 'real-estate': [], 'forex': [], 'stocks': [] };
    
    r.data.forEach(res => {
      if (bucketed[res.sector]) {
        bucketed[res.sector].push(res);
      }
    });
    
    setResources(bucketed);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const renderSectorBlock = (title, sectorKey, path) => {
    const items = resources[sectorKey].slice(0, 4); // Only show top 4 featured
    
    return (
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 16, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 8 }}>
          <div style={{ fontSize: 20, fontWeight: 600 }}>{title}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(path)}>View All →</button>
        </div>
        
        {items.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {items.map(r => (
              <div key={r.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card-body" style={{ flexGrow: 1, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{r.title}</div>
                    <span className={`badge ${r.resource_type === 'youtube' ? 'badge-red' : r.resource_type === 'video stream' ? 'badge-yellow' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                      {r.resource_type}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.4 }}>
                    {r.description}
                  </div>
                </div>
                <div className="card-footer" style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
                  <a href={r.url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm" style={{ width: '100%', display: 'block', textAlign: 'center' }}>
                    Open Resource ↗
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-title">No {title} resources yet</div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 100 }}><div className="spinner" /></div>;
  }

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div>
          <div className="page-title">Global News & Research</div>
          <div className="page-subtitle">Curated external market intelligence portals</div>
        </div>
      </div>

      {renderSectorBlock('Real Estate Intelligence', 'real-estate', '/global-news/real-estate')}
      {renderSectorBlock('Forex & Macro Markets', 'forex', '/global-news/forex')}
      {renderSectorBlock('Equities & Earnings', 'stocks', '/global-news/stocks')}

    </div>
  );
}
