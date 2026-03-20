import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

const RATING_COLORS = {
  bullish:  { bg: 'rgba(34,197,94,0.12)',  text: '#16a34a', border: '#16a34a' },
  bearish:  { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626', border: '#dc2626' },
  neutral:  { bg: 'rgba(148,163,184,0.1)', text: '#64748b', border: '#64748b' },
  watching: { bg: 'rgba(59,130,246,0.1)',  text: '#2563eb', border: '#2563eb' }
};

function QuoteBar({ symbol }) {
  const [q, setQ] = useState(null);
  const [err, setErr] = useState(null);

  useEffect(() => {
    api.get(`/stocks/quote/${symbol}`)
      .then(r => setQ(r.data))
      .catch(e => setErr(e.response?.data?.error || e.message));
  }, [symbol]);

  if (err) return <div style={{ fontSize: 12, color: 'var(--red)', padding: '6px 0' }}>{err}</div>;
  if (!q) return <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading quote…</div>;

  const chg = q.d ?? 0;
  const pct = q.dp ?? 0;
  const color = chg >= 0 ? 'var(--green)' : 'var(--red)';
  const fmt = v => v != null ? `$${Number(v).toFixed(2)}` : '—';

  return (
    <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'baseline' }}>
      <span style={{ fontSize: 26, fontWeight: 700 }}>{fmt(q.c)}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color }}>{chg >= 0 ? '+' : ''}{fmt(chg)} ({pct >= 0 ? '+' : ''}{pct?.toFixed(2)}%)</span>
      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>O {fmt(q.o)} · H {fmt(q.h)} · L {fmt(q.l)} · Prev {fmt(q.pc)}</span>
    </div>
  );
}

function MiniChart({ candles }) {
  if (!candles?.c?.length) return null;
  const arr = candles.c;
  const min = Math.min(...arr);
  const max = Math.max(...arr);
  const range = max - min || 1;
  const W = 400, H = 60;
  const pts = arr.map((v, i) => {
    const x = (i / (arr.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');
  const isUp = arr[arr.length - 1] >= arr[0];
  const color = isUp ? '#16a34a' : '#dc2626';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 60 }} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

export default function StockDetailDrawer({ stock, onClose, onUpdated, onRemove }) {
  const [tab, setTab] = useState('overview');
  const [profile, setProfile] = useState(null);
  const [news, setNews]     = useState([]);
  const [candles, setCandles] = useState(null);
  const [trades, setTrades] = useState([]);
  const [reports, setReports] = useState([]);
  const [form, setForm]     = useState({ notes: stock.notes || '', rating: stock.rating || 'watching' });
  const [saving, setSaving] = useState(false);
  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const sym = stock.symbol;

  useEffect(() => {
    api.get(`/stocks/profile/${sym}`).then(r => setProfile(r.data)).catch(() => {});
    api.get(`/stocks/candles/${sym}?resolution=D&count=90`).then(r => setCandles(r.data)).catch(() => {});
    api.get(`/stocks/news/${sym}`).then(r => setNews(r.data)).catch(() => {});
    // Load trades where ticker matches
    api.get(`/trades?search=${sym}`).then(r => setTrades(r.data.filter(t => t.ticker?.toUpperCase() === sym))).catch(() => {});
    // Load historical AI reports
    api.get(`/stock-reports/asset/${stock.id}`).then(r => setReports(r.data)).catch(() => {});
  }, [sym, stock.id]);

  async function save() {
    setSaving(true);
    const r = await api.patch(`/stocks/watchlist/${stock.id}`, form);
    onUpdated(r.data);
    setSaving(false);
  }

  const TABS = ['overview', 'news', 'trades', 'notes', 'reports'];

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, maxWidth: '100%', background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', zIndex: 850, display: 'flex', flexDirection: 'column', animation: 'slideInRight 180ms ease' }}>
      {/* Header */}
      <div style={{ padding: '18px 20px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              {profile?.logo && <img src={profile.logo} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'contain', background: '#fff', padding: 2 }} onError={e => e.target.style.display = 'none'} />}
              <span style={{ fontSize: 20, fontWeight: 800 }}>{sym}</span>
              <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 400 }}>{profile?.name || stock.company_name}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', background: RATING_COLORS[form.rating]?.bg, color: RATING_COLORS[form.rating]?.text, border: `1px solid ${RATING_COLORS[form.rating]?.border}`, borderRadius: 99, fontWeight: 700, textTransform: 'capitalize' }}>{form.rating}</span>
            </div>
            <QuoteBar symbol={sym} />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ marginTop: 4 }}>×</button>
        </div>

        {/* Mini chart */}
        {candles?.s === 'ok' && (
          <div style={{ margin: '8px 0' }}>
            <MiniChart candles={candles} />
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'right', marginTop: 2 }}>90-day price history</div>
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, marginTop: 8 }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ padding: '7px 16px', fontSize: 12, fontWeight: 500, background: 'none', color: tab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0, textTransform: 'capitalize', cursor: 'pointer' }}>
              {t === 'trades' ? `Trades (${trades.length})` : t === 'news' ? `News (${news.length})` : t === 'reports' ? `AI Reports (${reports.length})` : t}
            </button>
          ))}
        </div>
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '18px 20px' }}>

        {/* ── OVERVIEW ── */}
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {profile ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    ['Exchange',   profile.exchange],
                    ['Sector',     profile.finnhubIndustry],
                    ['Country',    profile.country],
                    ['Currency',   profile.currency],
                    ['IPO Date',   profile.ipo],
                    ['Mkt Cap',    profile.marketCapitalization ? `$${(profile.marketCapitalization / 1000).toFixed(1)}B` : '—'],
                    ['Shares Out', profile.shareOutstanding ? `${(profile.shareOutstanding / 1e6).toFixed(1)}M` : '—'],
                    ['Weburl',     null],
                  ].filter(([,v]) => v).map(([label, val]) => (
                    <div key={label} className="card" style={{ background: 'var(--bg-1)', padding: '10px 12px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>{val}</div>
                    </div>
                  ))}
                </div>
                {profile.weburl && (
                  <a href={profile.weburl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
                    🌐 {profile.weburl.replace(/^https?:\/\//, '')}
                  </a>
                )}
                {profile.description && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, padding: '12px 14px', background: 'var(--bg-1)', borderRadius: 8 }}>
                    {profile.description?.slice(0, 600)}{profile.description?.length > 600 ? '…' : ''}
                  </div>
                )}
              </>
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading company profile…</div>
            )}
            {reports.length > 0 && tab === 'overview' && (
              <div className="card" style={{ background: 'color-mix(in srgb, var(--accent) 5%, transparent)', padding: 16, border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>✅ Latest AI Report</div>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(reports[0].created_at).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: reports[0].overall_score >= 80 ? 'var(--green)' : reports[0].overall_score >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                      {reports[0].overall_score}
                    </div>
                  </div>
                  <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 16, flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{reports[0].recommendation}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Valuation Score: {reports[0].valuation_score}</div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setTab('reports')}>View All</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
               <button className="btn btn-secondary btn-sm" style={{ color: 'var(--red)', flex: 1 }} onClick={() => onRemove(stock.id)}>
                 Remove from Watchlist
               </button>
               <a href={`/sectors/stocks?tab=analysis`} className="btn btn-primary btn-sm" style={{ flex: 1, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  🤖 Run AI Sync
               </a>
            </div>
          </div>
        )}

        {/* ── REPORTS ── */}
        {tab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {reports.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No AI equity reports have been generated for {sym} yet.</div>
            ) : (
              reports.map(r => (
                <div key={r.id} className="card" style={{ padding: 16, background: 'var(--bg-1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{new Date(r.created_at).toLocaleString()}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: 'var(--bg-3)', color: 'var(--accent)' }}>
                       {r.recommendation}
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: '1px solid var(--border-subtle)' }}>
                     <div>
                       <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score</div>
                       <div style={{ fontSize: 20, fontWeight: 800, color: r.overall_score >= 80 ? 'var(--green)' : r.overall_score >= 50 ? 'var(--yellow)' : 'var(--red)' }}>{r.overall_score}</div>
                     </div>
                     <div style={{ textAlign: 'right' }}>
                       <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Price at Time</div>
                       <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'monospace' }}>${r.price_at_time?.toFixed(2)}</div>
                     </div>
                  </div>
                  <div style={{ marginTop: 12, textAlign: 'right' }}>
                     <a href={`/sectors/stocks?tab=analysis`} className="btn btn-secondary btn-sm" style={{ fontSize: 11, textDecoration: 'none' }}>→ Open in AI Engine</a>
                  </div>
                </div>
              ))
            )}
            
            <a href={`/sectors/stocks?tab=analysis`} className="btn btn-primary" style={{ width: '100%', textDecoration: 'none', textAlign: 'center', marginTop: 12 }}>
              ✨ Run New Institutional Analysis
            </a>
          </div>
        )}

        {/* ── NEWS ── */}
        {tab === 'news' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {news.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No recent news found.</div>}
            {news.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', textDecoration: 'none', padding: '12px 14px', background: 'var(--bg-1)', borderRadius: 8, border: '1px solid var(--border)', transition: 'border-color 0.15s' }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 5, lineHeight: 1.4 }}>{n.headline}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 10 }}>
                  <span>{n.source}</span>
                  <span>{new Date(n.datetime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                {n.summary && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 6, lineHeight: 1.5 }}>{n.summary?.slice(0, 180)}…</div>}
              </a>
            ))}
          </div>
        )}

        {/* ── TRADES ── */}
        {tab === 'trades' && (
          <div>
            {trades.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No trades recorded for {sym} yet. Add trades from the Trades page and make sure the ticker matches exactly.</div>
            ) : (
              <table style={{ width: '100%', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                    {['Date', 'Side', 'Qty', 'Price', 'P&L'].map(h => <th key={h} style={{ padding: '6px 8px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {trades.map(t => (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px' }}>{t.entry_date}</td>
                      <td style={{ padding: '8px', color: t.side === 'long' ? 'var(--green)' : 'var(--red)', fontWeight: 600, textTransform: 'uppercase' }}>{t.side}</td>
                      <td style={{ padding: '8px' }}>{t.quantity}</td>
                      <td style={{ padding: '8px' }}>{t.entry_price ? `$${Number(t.entry_price).toFixed(2)}` : '—'}</td>
                      <td style={{ padding: '8px', color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                        {t.pnl != null ? `${t.pnl >= 0 ? '+' : ''}$${Number(t.pnl).toFixed(2)}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── NOTES ── */}
        {tab === 'notes' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">My Rating</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                {Object.keys(RATING_COLORS).map(r => (
                  <button key={r} onClick={() => upd('rating', r)}
                    style={{ padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize',
                      background: form.rating === r ? RATING_COLORS[r].bg : 'transparent',
                      color: form.rating === r ? RATING_COLORS[r].text : 'var(--text-muted)',
                      border: `1px solid ${form.rating === r ? RATING_COLORS[r].border : 'var(--border)'}` }}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Research Notes</label>
              <textarea className="form-textarea" rows={10} value={form.notes}
                onChange={e => upd('notes', e.target.value)}
                placeholder={`Write your research notes for ${sym} here — thesis, catalysts, levels to watch, earnings expectations...`}
                style={{ marginTop: 6 }}
              />
            </div>
            <button className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : '💾 Save Notes'}
            </button>
          </div>
        )}
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
    </div>
  );
}
