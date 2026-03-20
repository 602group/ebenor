import { useState, useEffect } from 'react';
import api from '../api/client';

export default function MarketingNewsletterTab() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const r = await api.get('/marketing/newsletter');
    setSubs(r.data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function exportCSV() {
    if (!subs.length) return alert('No subscribers to export.');
    
    // Create CSV rows
    const header = ['Email', 'Signup Date', 'Status'].join(',');
    const rows = subs.map(s => [
      s.email,
      new Date(s.created_at).toISOString().split('T')[0],
      s.status
    ].join(','));
    
    const csvData = [header, ...rows].join('\n');
    
    // Create download link
    const blob = new Blob([csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `ebenor_subscribers_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function deleteSub(id) {
    if (!confirm('Permanently delete this subscriber?')) return;
    await api.delete(`/marketing/newsletter/${id}`);
    setSubs(s => s.filter(x => x.id !== id));
  }

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>;

  return (
    <div>
      <div className="filters-bar" style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>
          {subs.length} Active Subscribers
        </div>
        <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }} onClick={exportCSV}>
          Export CSV
        </button>
      </div>

      <div className="card">
        <div className="table-wrap">
          {subs.length ? (
            <table>
              <thead>
                <tr>
                  <th>Email Address</th>
                  <th>Signup Date</th>
                  <th>Status</th>
                  <th style={{ width: 60, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {subs.map(s => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 500, fontSize: 13 }}>{s.email}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </td>
                    <td><span className="badge badge-green" style={{ fontSize: 10 }}>{s.status}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', padding: '4px 8px' }} onClick={() => deleteSub(s.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">✉️</div>
              <div className="empty-title">No subscribers yet</div>
              <div className="empty-desc">When users sign up via the public footer, they will appear here.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
