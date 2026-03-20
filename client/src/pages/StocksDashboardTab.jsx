import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

const fmtCur = (n) =>
  Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function StocksDashboardTab() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/sectors/stocks/dashboard').then((r) => setData(r.data));
  }, []);

  if (!data)
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className="spinner" />
      </div>
    );

  const { active_trades, recent_ideas, upcoming_events, news } = data;

  return (
    <div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {data.metrics.open_trades}
          </div>
          <div className="stat-label">Open Trades</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--blue)' }}>
            {data.metrics.active_ideas}
          </div>
          <div className="stat-label">Active Ideas</div>
        </div>
        <div className="stat-card">
          <div className="stat-value" style={{ color: 'var(--text-muted)' }}>
            {data.metrics.assets_tracked}
          </div>
          <div className="stat-label">Equities Tracked</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* ACTIVE TRADES */}
        <div className="card">
          <div className="card-header" style={{ justifyContent: 'space-between' }}>
            <div className="card-title">🟢 Active Trades</div>
          </div>
          <div className="card-body">
            {active_trades.length ? (
              active_trades.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {t.asset_symbol} · {t.strategy || 'No Strategy'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)',
                      }}
                    >
                      {fmtCur(t.pnl)}
                    </div>
                    <span className="badge badge-gray" style={{ fontSize: 10 }}>
                      {t.trade_type}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                No active stock trades
              </div>
            )}
          </div>
        </div>

        {/* TOP IDEAS */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">💡 Top Ideas</div>
          </div>
          <div className="card-body">
            {recent_ideas.length ? (
              recent_ideas.map((i) => (
                <div
                  key={i.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{i.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.asset_symbol}</div>
                  </div>
                  <span
                    className={`badge ${
                      i.conviction === 'high' ? 'badge-red' : i.conviction === 'medium' ? 'badge-yellow' : 'badge-gray'
                    }`}
                  >
                    {i.conviction}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                No active ideas
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* EARNINGS / EVENTS */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📅 Upcoming Catalysts</div>
          </div>
          <div className="card-body">
            {upcoming_events.length ? (
              upcoming_events.map((e) => (
                <div
                  key={e.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                    alignItems: 'center',
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontFamily: 'monospace',
                      color: 'var(--accent)',
                      fontWeight: 600,
                      minWidth: 50,
                    }}
                  >
                    {e.event_date.split('T')[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      Importance: {e.importance}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                No upcoming catalysts
              </div>
            )}
          </div>
        </div>

        {/* SECTOR NEWS */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">📰 Terminal Feed</div>
          </div>
          <div className="card-body">
            {news.length ? (
              news.map((n) => (
                <div
                  key={n.id}
                  style={{
                    padding: '8px 0',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <a
                    href={n.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}
                  >
                    {n.title}
                  </a>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {n.source} · {new Date(n.publish_date).toLocaleDateString()}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
                No recent news
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
