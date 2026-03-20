import React from 'react';

const fmtCur = (n) => n ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

export default function StockReportView({ report }) {
  if (!report || !report.report_data) return null;
  
  let data = {};
  try {
    data = JSON.parse(report.report_data);
  } catch (err) {
    return <div className="alert alert-error">Failed to parse report data.</div>;
  }

  const {
    section_1_executive_summary: execSum,
    section_2_price_data: priceData,
    section_3_valuation: valuation,
    section_4_financial_health: health,
    section_5_growth: growth,
    section_6_technical: technical,
    section_7_sentiment: sentiment,
    section_8_sector_macro: macro,
    section_9_risk_analysis: risks,
    section_10_ai_verdict: verdict,
    section_11_scenarios: scenarios,
    section_12_advanced: advanced
  } = data;

  const scoreColor = (score) => {
    if (score >= 80) return 'var(--green)';
    if (score >= 50) return 'var(--yellow)';
    return 'var(--red)';
  };

  const recColor = (rec) => {
    if (!rec) return 'var(--text-muted)';
    const r = rec.toLowerCase();
    if (r.includes('strong buy')) return 'var(--green)';
    if (r.includes('buy')) return 'var(--green)';
    if (r.includes('hold')) return 'var(--yellow)';
    return 'var(--red)';
  };

  return (
    <div className="stock-report-view">
      {/* ─── HEADER SECTION ─────────────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 24, borderTop: `4px solid ${scoreColor(verdict?.overall_score)}` }}>
        <div className="card-body" style={{ display: 'flex', gap: 24, padding: 32, flexWrap: 'wrap' }}>
          
          {/* Main Info */}
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: 'var(--bg-3)', color: 'var(--text-secondary)', fontSize: 11, borderRadius: 6, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 16 }}>
              <span>◎ INSTITUTIONAL EQUITY REPORT</span>
              <span style={{ color: 'var(--text-disabled)' }}>|</span>
              <span style={{ color: 'var(--accent)' }}>{new Date(report.created_at).toLocaleDateString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
              <h1 style={{ fontSize: 32, margin: 0, letterSpacing: '-0.02em', fontWeight: 800 }}>{report.ticker}</h1>
              <span style={{ fontSize: 20, color: 'var(--text-secondary)', fontWeight: 500 }}>{report.company_name}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, margin: 0 }}>
              {execSum?.key_reasoning}
            </p>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Current Price</div>
              <div style={{ fontSize: 26, fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-main)' }}>
                {fmtCur(report.price_at_time)}
              </div>
            </div>

            <div style={{ textAlign: 'center', minWidth: 100 }}>
               <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>AI Score</div>
               <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                 <span style={{ fontSize: 32, fontWeight: 800, color: scoreColor(verdict?.overall_score) }}>
                   {verdict?.overall_score || 0}
                 </span>
                 <span style={{ fontSize: 14, color: 'var(--text-disabled)', fontWeight: 600 }}>/100</span>
               </div>
            </div>

            <div style={{ textAlign: 'center', minWidth: 120, borderLeft: '1px solid var(--border)', paddingLeft: 32 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Action</div>
              <div style={{ display: 'inline-flex', padding: '6px 16px', background: `color-mix(in srgb, ${recColor(verdict?.recommendation)} 15%, transparent)`, color: recColor(verdict?.recommendation), borderRadius: 99, fontSize: 15, fontWeight: 700 }}>
                {verdict?.recommendation || 'Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── STRENGTHS & RISKS HIGHLIGHT ROW ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24, marginBottom: 24 }}>
        <div style={{ padding: 24, background: 'color-mix(in srgb, var(--green) 5%, var(--bg-1))', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--green) 20%, transparent)' }}>
          <h4 style={{ fontSize: 12, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>📈</span> Key Bull Drivers
          </h4>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {execSum?.strengths?.map((s, i) => <li key={i}>{s}</li>) || <li>No obvious strengths calculated.</li>}
          </ul>
        </div>
        
        <div style={{ padding: 24, background: 'color-mix(in srgb, var(--red) 5%, var(--bg-1))', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--red) 20%, transparent)' }}>
          <h4 style={{ fontSize: 12, color: 'var(--red)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>⚠️</span> Core Bear Risks
          </h4>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {execSum?.risks?.map((r, i) => <li key={i}>{r}</li>) || <li>No obvious risks identified.</li>}
          </ul>
        </div>
      </div>

      {/* ─── MULTI-SCORE MODULE GRID ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        
        {/* Core Financials Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Valuation Details */}
          <div className="card h-100">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div className="card-title">Valuation Model</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: scoreColor(valuation?.score) }}>SCORE: {valuation?.score}/100</div>
            </div>
            <div className="card-body">
              <p style={{ fontSize: 13, color: 'var(--text-main)', lineHeight: 1.6, margin: '0 0 16px 0' }}>{execSum?.fair_value_vs_price}</p>
              
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                 <div style={{ flex: 1, padding: '12px', background: 'var(--bg-2)', borderRadius: 8 }}>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Fair Value Est (Low)</div>
                   <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'monospace' }}>{fmtCur(valuation?.fair_value_estimate_low)}</div>
                 </div>
                 <div style={{ flex: 1, padding: '12px', background: 'var(--bg-2)', borderRadius: 8 }}>
                   <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Fair Value Est (High)</div>
                   <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'monospace' }}>{fmtCur(valuation?.fair_value_estimate_high)}</div>
                 </div>
              </div>
              
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{valuation?.narrative}</p>
            </div>
          </div>

          {/* Health & Growth */}
          <div className="card h-100">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div className="card-title">Health & Growth</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600 }}>H: <span style={{color: scoreColor(health?.score)}}>{health?.score}</span></div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>G: <span style={{color: scoreColor(growth?.score)}}>{growth?.score}</span></div>
              </div>
            </div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
               <div style={{ marginBottom: 16 }}>
                 <strong style={{ color: 'var(--text-main)' }}>Financial Health:</strong> {health?.narrative}
               </div>
               <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                 <strong style={{ color: 'var(--text-main)' }}>Growth Vector:</strong> {growth?.narrative}
               </div>
            </div>
          </div>
        </div>

        {/* Technicals & Setup Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Tech & Sentiment */}
          <div className="card h-100">
             <div className="card-header" style={{ justifyContent: 'space-between' }}>
               <div className="card-title">Technicals & Sentiment</div>
               <div style={{ display: 'flex', gap: 16 }}>
                 <div style={{ fontSize: 11, fontWeight: 600 }}>TECH: <span style={{color: scoreColor(technical?.score)}}>{technical?.score}</span></div>
                 <div style={{ fontSize: 11, fontWeight: 600 }}>SENT: <span style={{color: scoreColor(sentiment?.score)}}>{sentiment?.score}</span></div>
               </div>
             </div>
             <div className="card-body" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <p style={{ margin: '0 0 16px 0' }}>{priceData}</p>
                <div style={{ marginBottom: 16 }}>
                  <strong style={{ color: 'var(--text-main)' }}>Price Action:</strong> {technical?.narrative}
                </div>
                <div style={{ paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
                  <strong style={{ color: 'var(--text-main)' }}>Market Context:</strong> {sentiment?.narrative}
                </div>
             </div>
          </div>

          {/* Scenario Analysis */}
          <div className="card h-100" style={{ background: 'var(--bg-2)' }}>
            <div className="card-header"><div className="card-title">Scenario Projections</div></div>
            <div className="card-body" style={{ fontSize: 13, lineHeight: 1.6 }}>
               <div style={{ marginBottom: 16 }}>
                 <div style={{ color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>📈 Bull Case</div>
                 <div style={{ color: 'var(--text-secondary)' }}>{scenarios?.bull_case}</div>
               </div>
               <div style={{ marginBottom: 16 }}>
                 <div style={{ color: 'var(--blue)', fontWeight: 600, marginBottom: 4 }}>📊 Base Case</div>
                 <div style={{ color: 'var(--text-secondary)' }}>{scenarios?.base_case}</div>
               </div>
               <div>
                 <div style={{ color: 'var(--red)', fontWeight: 600, marginBottom: 4 }}>📉 Bear Case</div>
                 <div style={{ color: 'var(--text-secondary)' }}>{scenarios?.bear_case}</div>
               </div>
            </div>
          </div>
        </div>

        {/* Strategy & Risk Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Detailed Risk */}
          <div className="card h-100">
             <div className="card-header"><div className="card-title">Detailed Risk Matrix</div></div>
             <div className="card-body" style={{ fontSize: 13 }}>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>{macro}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {risks?.map((r, i) => (
                    <li key={i} style={{ background: 'var(--bg-3)', padding: 12, borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <strong style={{ color: 'var(--text-main)' }}>{r.type} Risk</strong>
                        <span style={{ fontSize: 11, color: r.severity?.toLowerCase().includes('high') ? 'var(--red)' : 'var(--yellow)', fontWeight: 700, textTransform: 'uppercase' }}>{r.severity}</span>
                      </div>
                      <div style={{ color: 'var(--text-secondary)', lineHeight: 1.4 }}>{r.description}</div>
                    </li>
                  ))}
                </ul>
             </div>
          </div>

          {/* Execution Targets */}
          <div className="card h-100">
            <div className="card-header"><div className="card-title">Execution Horizons</div></div>
            <div className="card-body">
              <div style={{ display: 'inline-flex', padding: '4px 12px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
                🎯 Strategy Fit: {verdict?.suggested_strategy} ({verdict?.time_horizon})
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px dotted var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Entry Zones</span>
                  <strong style={{ color: 'var(--green)' }}>{advanced?.entry_zones?.join(' / ') || 'None provided'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 8, borderBottom: '1px dotted var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Exit Targets</span>
                  <strong style={{ color: 'var(--blue)' }}>{advanced?.exit_targets?.join(' / ') || 'None provided'}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Hard Stop Loss</span>
                  <strong style={{ color: 'var(--red)' }}>{advanced?.stop_loss_suggestions?.join(' / ') || 'None provided'}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      
      {/* ─── FINAL VERDICT ROW ─────────────────────────────────────────────────── */}
      <div className="card" style={{ marginTop: 24, background: 'var(--bg-2)' }}>
        <div className="card-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Final AI Conclusion</div>
          <p style={{ fontSize: 15, color: 'var(--text-main)', lineHeight: 1.6, maxWidth: 800, margin: '0 auto' }}>
            {verdict?.narrative}
          </p>
        </div>
      </div>
    </div>
  );
}
