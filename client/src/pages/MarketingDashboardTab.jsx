import { useState, useEffect } from 'react';
import api from '../api/client';

export default function MarketingDashboardTab({ setTab }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/marketing/dashboard').then(r => setData(r.data));
  }, []);

  if (!data) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  const { stats, recent_subscribers, recent_blogs } = data;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent)', fontSize: 24 }}>{stats.total_subscribers}</div>
          <div className="stat-label">Newsletter Subscribers</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text-primary)', fontSize: 24 }}>{stats.total_posts}</div>
          <div className="stat-label">Total Blog Posts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--green)', fontSize: 24 }}>{stats.published_posts}</div>
          <div className="stat-label">Published Posts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text-muted)', fontSize: 24 }}>{stats.draft_posts}</div>
          <div className="stat-label">Drafted Posts</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Recent Subscribers */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div className="card-title">Recent Subscribers</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setTab('Newsletter')}>View All</button>
          </div>
          <div className="card-body">
            {recent_subscribers.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recent_subscribers.map(sub => (
                  <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{sub.email}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(sub.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent subscribers.</div>}
          </div>
        </div>

        {/* Recent Blogs */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div className="card-title">Recent Blog Content</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setTab('Blog')}>Manage Posts</button>
          </div>
          <div className="card-body">
            {recent_blogs.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {recent_blogs.map(post => (
                  <div key={post.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500 }}>{post.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Updated: {new Date(post.updated_at).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <span className={`badge ${post.status === 'Published' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>{post.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent posts.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
