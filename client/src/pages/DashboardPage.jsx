import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

const fmtCur = n => n ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }) : '$0';
const fmtPnl = n => !n ? '$0' : (n > 0 ? '+' : '') + fmtCur(n);
const pnlClass = n => n > 0 ? 'pnl-positive' : n < 0 ? 'pnl-negative' : '';

const STATUS_BADGE = { open:'badge-green', planned:'badge-blue', closed:'badge-gray', canceled:'badge-red', researching:'badge-blue', watching:'badge-yellow', ready:'badge-orange', entered:'badge-green', high:'badge-red', medium:'badge-yellow', low:'badge-gray' };

const IMP_COLOR = { high: 'var(--red)', medium: 'var(--yellow, #eab308)', low: 'var(--text-muted)' };

function StatCard({ label, value, sub, color = 'var(--accent)', icon, to }) {
  const navigate = useNavigate();
  return (
    <div className="stat-card" style={{ cursor: to ? 'pointer' : 'default' }} onClick={() => to && navigate(to)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-value" style={{ color }}>{value}</div>
          <div className="stat-label">{label}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: 22, opacity: 0.5 }}>{icon}</div>}
      </div>
    </div>
  );
}

function SectionCard({ title, icon, children, to, count }) {
  const navigate = useNavigate();
  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {icon && <span>{icon}</span>}
          {title}
          {count !== undefined && <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 4 }}>({count})</span>}
        </div>
        {to && <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => navigate(to)}>View all →</button>}
      </div>
      <div className="card-body" style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/dashboard').then(r => { setData(r.data); setLoading(false); });
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px' }} />
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading command center...</div>
      </div>
    </div>
  );

  const { counts, pnl, portfolio, recent_trades, recent_ideas, upcoming_events, pinned_notes, recent_news, watchlists_summary, watchlist_high_priority, open_properties, recent_documents, recent_activity, pnl_by_strategy } = data;

  const winRate = pnl.closed > 0 ? Math.round((pnl.wins / pnl.closed) * 100) : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Command Center</div>
          <div className="page-subtitle">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      {/* ── Stat Row ──────────────────────────────────────────── */}
      <div className="stats-grid">
        <StatCard label="Portfolio Value" value={fmtCur(portfolio.total_value)} sub={<span className={pnlClass(portfolio.total_unrealized)}>{fmtPnl(portfolio.total_unrealized)} unrealized</span>} color="var(--accent)" icon="◎" to="/portfolio" />
        <StatCard label="Total P&L" value={<span className={pnlClass(pnl.total)}>{fmtPnl(pnl.total)}</span>} sub={`${winRate}% win rate · ${pnl.closed} closed`} color={pnl.total >= 0 ? 'var(--green)' : 'var(--red)'} icon="▲" to="/trades" />
        <StatCard label="Open Trades" value={counts.trades_open} sub={`${counts.trades_total} total logged`} icon="▲" to="/trades" />
        <StatCard label="Active Ideas" value={counts.ideas_active} sub="Not rejected/archived" icon="◈" to="/ideas" />
        <StatCard label="Watchlist" value={counts.watchlist_items} sub={`${counts.assets} tracked assets`} icon="◎" to="/watchlists" />
        <StatCard label="Research Notes" value={counts.notes} icon="▩" to="/notes" />
        <StatCard label="Active Alerts" value={counts.alerts_active} color={counts.alerts_active > 0 ? 'var(--red)' : 'var(--text-muted)'} icon="◆" to="/alerts" />
        <StatCard label="Properties" value={counts.properties} sub={`${counts.markets} market obs.`} icon="⬜" to="/real-estate" />
      </div>

      {/* ── Row 1: Trades + Ideas ─────────────────────────────── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <SectionCard title="Recent Trades" icon="▲" to="/trades" count={recent_trades.length}>
          {recent_trades.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent_trades.map(t => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }} onClick={() => navigate('/trades')} className="row-clickable">
                  <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                    {(t.asset_symbol || '?').slice(0, 4)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.strategy || t.trade_type}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div className={pnlClass(t.pnl)} style={{ fontSize: 12, fontWeight: 600 }}>{t.pnl ? fmtPnl(t.pnl) : '—'}</div>
                    <span className={`badge ${STATUS_BADGE[t.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{t.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No trades yet</div>}
        </SectionCard>

        <SectionCard title="Investment Ideas" icon="◈" to="/ideas" count={recent_ideas.length}>
          {recent_ideas.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent_ideas.map(i => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => navigate('/ideas')}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.title}</div>
                    {i.asset_symbol && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{i.asset_symbol}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <span className={`badge ${STATUS_BADGE[i.conviction] || 'badge-gray'}`} style={{ fontSize: 10 }}>{i.conviction}</span>
                    <span className={`badge ${STATUS_BADGE[i.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{i.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No active ideas</div>}
        </SectionCard>
      </div>

      {/* ── Row 2: Watchlist High Priority + Recent News ────── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <SectionCard title="High Priority Watchlist" icon="◎" to="/watchlists" count={watchlist_high_priority.length}>
          {watchlist_high_priority.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {watchlist_high_priority.map(i => (
                <div key={i.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer' }} onClick={() => navigate('/watchlists')}>
                  <div style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--accent-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                    {(i.symbol || i.asset_name?.slice(0, 3) || '?').slice(0, 4).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{i.asset_name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i.watchlist_name}</div>
                  </div>
                  <span className="badge badge-red" style={{ fontSize: 10 }}>HIGH</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>
              No high priority watchlist items
              <div style={{ marginTop: 8 }}><button className="btn btn-ghost btn-sm" onClick={() => navigate('/watchlists')}>Manage Watchlists →</button></div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent News" icon="◉" to="/news" count={recent_news.length}>
          {recent_news.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {recent_news.map(n => (
                <div key={n.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, flex: 1 }}>{n.title}</div>
                    {n.sentiment && <span className={`badge ${n.sentiment === 'bullish' ? 'badge-green' : n.sentiment === 'bearish' ? 'badge-red' : 'badge-gray'}`} style={{ fontSize: 10, flexShrink: 0 }}>{n.sentiment}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.source} · {n.category}</div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No news articles saved yet</div>}
        </SectionCard>
      </div>

      {/* ── Row 3: Upcoming Events + Open Real Estate ────────── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <SectionCard title="Macro Calendar" icon="▦" to="/events" count={upcoming_events.length}>
          {upcoming_events.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {upcoming_events.map(e => (
                <div key={e.id} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'flex-start' }}>
                  <div style={{ minWidth: 54, textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--accent)', fontWeight: 600 }}>{e.event_date?.slice(5)}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.country} · {e.event_type}</div>
                  </div>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: IMP_COLOR[e.importance] || 'var(--text-muted)', marginTop: 4, flexShrink: 0 }} />
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No upcoming events in next 21 days</div>}
        </SectionCard>

        <SectionCard title="Open Real Estate" icon="⬜" to="/real-estate" count={open_properties.length}>
          {open_properties.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {open_properties.map(p => (
                <div key={p.id} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid var(--border-subtle)', alignItems: 'center' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.city}{p.city && p.state ? ', ' : ''}{p.state} · {p.property_type}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {p.asking_price && <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{fmtCur(p.asking_price)}</div>}
                    <span className={`badge ${STATUS_BADGE[p.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No open properties being tracked</div>}
        </SectionCard>
      </div>

      {/* ── Row 4: Pinned Notes + Activity Feed ──────────────── */}
      <div className="two-col" style={{ marginBottom: 16 }}>
        <SectionCard title="Pinned Notes" icon="▩" to="/notes" count={pinned_notes.length}>
          {pinned_notes.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pinned_notes.map(n => (
                <div key={n.id} style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 6, cursor: 'pointer' }} onClick={() => navigate('/notes')}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 3 }}>📌 {n.title}</div>
                  {n.body && <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</div>}
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>{n.category}</div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No pinned notes</div>}
        </SectionCard>

        <SectionCard title="Recent Activity" icon="◎">
          {recent_activity.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 260, overflowY: 'auto' }}>
              {recent_activity.slice(0, 12).map(a => (
                <div key={a.id} className="activity-item" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace', flexShrink: 0, paddingTop: 1, minWidth: 60 }}>
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{a.action} </span>
                    <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{a.record_title || a.record_type}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}> · {a.record_type}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: 'var(--text-muted)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No activity yet</div>}
        </SectionCard>
      </div>

      {/* ── Row 5: P&L by Strategy ───────────────────────────── */}
      {pnl_by_strategy.length > 0 && (
        <SectionCard title="P&L by Strategy" icon="▲" to="/trades">
          <div className="stats-grid">
            {pnl_by_strategy.map(s => (
              <div key={s.strategy} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8, borderLeft: `3px solid ${s.total_pnl >= 0 ? 'var(--green)' : 'var(--red)'}` }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>{s.strategy}</div>
                <div className={pnlClass(s.total_pnl)} style={{ fontSize: 15, fontWeight: 700 }}>{fmtPnl(s.total_pnl)}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                  {s.trade_count} trades · {s.trade_count > 0 ? Math.round((s.wins / s.trade_count) * 100) : 0}% win rate
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}
