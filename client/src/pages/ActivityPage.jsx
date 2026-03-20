import { useState, useEffect } from 'react';
import api from '../api/client';

export default function ActivityPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchLogs();
  }, [filterType]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/activity', {
        params: { record_type: filterType !== 'all' ? filterType : null }
      });
      setLogs(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getRecordIcon = (type) => {
    const map = {
      trade: '▲', note: '▩', idea: '◈', asset: '◎',
      property: '⬜', document: '▪', contact: '◐',
      event: '▦', knowledge: '📚', strategy: '♟️'
    };
    return map[type] || '⚡';
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Activity Log</h1>
        <p style={{ opacity: 0.7, marginTop: 4 }}>
          Global history of all platform operations.
        </p>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {['all', 'trade', 'idea', 'property', 'note', 'document'].map(t => (
            <button 
              key={t}
              onClick={() => setFilterType(t)}
              className="btn btn-secondary"
              style={{
                background: filterType === t ? 'var(--bg-3)' : 'transparent',
                borderColor: filterType === t ? 'var(--text-1)' : 'var(--border)'
              }}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>Loading...</div>
        ) : logs.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>No activity found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {logs.map(log => (
              <div key={log.id} style={{
                display: 'flex', gap: 16, alignItems: 'flex-start',
                padding: '16px', background: 'var(--bg-1)', 
                border: '1px solid var(--border)', borderRadius: 8
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'var(--bg-3)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, flexShrink: 0
                }}>
                  {getRecordIcon(log.record_type)}
                </div>
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <span style={{ color: 'var(--text-1)', fontWeight: 600 }}>
                        {log.action.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <span style={{ margin: '0 8px', color: 'var(--text-3)' }}>•</span>
                      <span style={{ color: 'var(--text-2)' }}>
                        {log.record_type.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {formatTime(log.created_at)}
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 4, color: 'var(--text-1)', fontSize: 15 }}>
                    {log.record_title}
                  </div>
                  
                  {log.details && (
                    <div style={{ marginTop: 8, fontSize: 13, color: 'var(--text-2)' }}>
                      {log.details}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
