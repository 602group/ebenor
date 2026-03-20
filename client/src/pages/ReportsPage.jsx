import { useState, useEffect } from 'react';
import api from '../api/client';

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState('trades');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/reports/${activeTab}`);
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fmtCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
  const fmtPct = (val) => `${Number(val || 0).toFixed(2)}%`;

  return (
    <div className="page-container">
      <header className="page-header">
        <h1>Platform Reports</h1>
        <p style={{ opacity: 0.7, marginTop: 4 }}>
          Aggregated performance and activity insights.
        </p>
      </header>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8 }}>
          {['trades', 'portfolio', 'real-estate', 'ideas', 'strategies', 'research'].map(t => (
            <button 
              key={t}
              onClick={() => setActiveTab(t)}
              className="btn btn-secondary"
              style={{
                background: activeTab === t ? 'var(--bg-3)' : 'transparent',
                borderColor: activeTab === t ? 'var(--text-1)' : 'var(--border)'
              }}
            >
              {t.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ minHeight: 400 }}>
        {loading ? (
          <div style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>Generating report...</div>
        ) : !data ? (
          <div style={{ padding: 24, textAlign: 'center', opacity: 0.5 }}>Error loading report.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            
            {activeTab === 'trades' && data.overall && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Win Rate</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: data.overall.win_rate > 50 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtPct(data.overall.win_rate)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                      {data.overall.winning_trades} W / {data.overall.losing_trades} L
                    </div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Total P&L</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: data.overall.total_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtCurrency(data.overall.total_pnl)}
                    </div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Profit Factor</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{Number(data.overall.profit_factor).toFixed(2)}</div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Average Win / Loss</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--green)' }}>{fmtCurrency(data.overall.avg_win)}</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--red)' }}>{fmtCurrency(data.overall.avg_loss)}</div>
                  </div>
                </div>

                <div>
                  <h3>Performance By Strategy</h3>
                  <table className="data-table" style={{ marginTop: 16 }}>
                    <thead>
                      <tr>
                        <th>Strategy</th>
                        <th style={{ textAlign: 'right' }}>Trades</th>
                        <th style={{ textAlign: 'right' }}>Win Rate</th>
                        <th style={{ textAlign: 'right' }}>P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_strategy.map((s, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{s.strategy}</td>
                          <td style={{ textAlign: 'right' }}>{s.trade_count}</td>
                          <td style={{ textAlign: 'right' }}>{fmtPct(s.win_rate)}</td>
                          <td style={{ textAlign: 'right', color: s.total_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                            {fmtCurrency(s.total_pnl)}
                          </td>
                        </tr>
                      ))}
                      {data.by_strategy.length === 0 && (
                        <tr><td colSpan="4" style={{ textAlign: 'center', opacity: 0.5 }}>No strategy data</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'portfolio' && data.snapshot && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Total Mkt Value</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{fmtCurrency(data.snapshot.total_value)}</div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Unrealized P&L</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: data.snapshot.total_unrealized_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtCurrency(data.snapshot.total_unrealized_pnl)}
                    </div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Est. Cost Basis</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{fmtCurrency(data.snapshot.total_cost_basis)}</div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Active Positions</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.snapshot.active_positions}</div>
                  </div>
                </div>

                <div>
                  <h3>Allocation by Asset Class</h3>
                  <table className="data-table" style={{ marginTop: 16 }}>
                    <thead>
                      <tr>
                        <th>Asset Class</th>
                        <th style={{ textAlign: 'right' }}>Positions</th>
                        <th style={{ textAlign: 'right' }}>Value</th>
                        <th style={{ textAlign: 'right' }}>% of Portfolio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.allocation.map((a, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{a.asset_class}</td>
                          <td style={{ textAlign: 'right' }}>{a.position_count}</td>
                          <td style={{ textAlign: 'right' }}>{fmtCurrency(a.value)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8 }}>
                              {fmtPct(a.percentage)}
                              <div style={{ width: 60, height: 6, background: 'var(--bg-3)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${a.percentage}%`, height: '100%', background: 'var(--blue)' }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'real-estate' && data.pipeline && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
                  {data.pipeline.map((p, i) => (
                    <div key={i} className="card" style={{ background: 'var(--bg-1)', textAlign: 'center' }}>
                      <div style={{ fontSize: 13, color: 'var(--text-2)', textTransform: 'capitalize' }}>{p.status.replace('-', ' ')}</div>
                      <div style={{ fontSize: 28, fontWeight: 600, marginTop: 8 }}>{p.count}</div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3>Most Active Markets</h3>
                  <table className="data-table" style={{ marginTop: 16 }}>
                    <thead>
                      <tr>
                        <th>Market</th>
                        <th style={{ textAlign: 'right' }}>Properties in Pipeline</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_market.map((m, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600 }}>{m.city}, {m.state}</td>
                          <td style={{ textAlign: 'right' }}>{m.property_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'ideas' && data.stats && (
              <>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Total Generated</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.stats.total_ideas}</div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Currently Active</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--blue)' }}>{data.stats.active_ideas}</div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Converted to Trades</div>
                    <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--green)' }}>{data.stats.converted_ideas}</div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Conversion Rate</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>
                      {data.stats.total_ideas > 0 ? fmtPct((data.stats.converted_ideas / data.stats.total_ideas) * 100) : '0.00%'}
                    </div>
                  </div>
                </div>

                <div>
                  <h3>Ideas by Conviction Level</h3>
                  <table className="data-table" style={{ marginTop: 16 }}>
                    <thead>
                      <tr>
                        <th>Conviction</th>
                        <th style={{ textAlign: 'right' }}>Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.by_conviction.map((c, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{c.conviction}</td>
                          <td style={{ textAlign: 'right' }}>{c.count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {activeTab === 'strategies' && data.performance && (
              <div>
                <h3>Strategy Performance Tracking</h3>
                <p style={{ opacity: 0.7, marginBottom: 16, fontSize: 14 }}>
                  Performance is calculated by correlating closed trades that utilized this strategy framework.
                </p>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Strategy Framework</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Trades Executed</th>
                      <th style={{ textAlign: 'right' }}>Win Rate</th>
                      <th style={{ textAlign: 'right' }}>Total Returns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.performance.map((s, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{s.strategy_name}</td>
                        <td style={{ textTransform: 'capitalize' }}>{s.category}</td>
                        <td style={{ textAlign: 'right' }}>{s.total_trades}</td>
                        <td style={{ textAlign: 'right' }}>{fmtPct(s.win_rate)}</td>
                        <td style={{ textAlign: 'right', color: s.total_pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                          {fmtCurrency(s.total_pnl)}
                        </td>
                      </tr>
                    ))}
                    {data.performance.length === 0 && (
                      <tr><td colSpan="5" style={{ textAlign: 'center', opacity: 0.5 }}>No linked trade data found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'research' && data.counts && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Notes Created</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.counts.total_notes}</div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Knowledge Arc.</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.counts.total_knowledge_records}</div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Documents Vaulted</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.counts.total_documents}</div>
                  </div>
                  <div className="card" style={{ background: 'var(--bg-1)' }}>
                    <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Active Tags</div>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{data.counts.total_tags}</div>
                  </div>
                </div>

                <div>
                  <h3>Platform Activity Density (Last 30 Days)</h3>
                  <table className="data-table" style={{ marginTop: 16 }}>
                    <thead>
                      <tr>
                        <th>Record Type</th>
                        <th>Action</th>
                        <th style={{ textAlign: 'right' }}>Frequency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_activity.map((a, i) => (
                        <tr key={i}>
                          <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{a.record_type}</td>
                          <td style={{ textTransform: 'capitalize' }}>{a.action.replace(/_/g, ' ')}</td>
                          <td style={{ textAlign: 'right' }}>{a.count}</td>
                        </tr>
                      ))}
                      {data.recent_activity.length === 0 && (
                        <tr><td colSpan="3" style={{ textAlign: 'center', opacity: 0.5 }}>No recent activity.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
