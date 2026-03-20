import React from 'react';

const fmtCur = (n) => n ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—';

export default function PropertyReportView({ report }) {
  if (!report || !report.report_data) return null;
  
  let data = {};
  try {
    data = JSON.parse(report.report_data);
  } catch (err) {
    return <div className="alert alert-error">Failed to parse report data.</div>;
  }

  const {
    section_1_executive_summary: execSum,
    section_2_estimated_value: estVal,
    section_3_comparables: comps,
    section_4_property_snapshot: snapshot,
    section_5_history: history,
    section_6_rent_potential: rentPot,
    section_7_investment_metrics: metrics,
    section_8_strategy_fit: strategy,
    section_9_neighborhood_score: neighborhood,
    section_10_local_market: market,
    section_11_risk_analysis: risk,
    section_12_ai_verdict: verdict,
    section_13_deal_structuring: structuring
  } = data;

  const scoreColor = (score) => {
    if (score >= 80) return 'var(--green)';
    if (score >= 50) return 'var(--yellow)';
    return 'var(--red)';
  };

  return (
    <div className="property-report-view">
      {/* HEADER SECTION */}
      <div className="card" style={{ marginBottom: 24, borderTop: `4px solid ${scoreColor(verdict?.investment_score)}` }}>
        <div className="card-body" style={{ display: 'flex', gap: 24, padding: 32, flexWrap: 'wrap' }}>
          
          {/* Main Info */}
          <div style={{ flex: '1 1 300px' }}>
            <div style={{ display: 'inline-block', padding: '4px 10px', background: 'var(--bg-3)', color: 'var(--text-secondary)', fontSize: 11, borderRadius: 6, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 12 }}>
              AI PROPERTY INTELLIGENCE REPORT
            </div>
            <h1 style={{ fontSize: 26, margin: '0 0 8px 0', letterSpacing: '-0.02em' }}>{report.address_snapshot || 'Target Property'}</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{execSum}</p>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: 120 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Est. Value</div>
              <div style={{ fontSize: 28, fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent)' }}>
                {estVal?.midpoint ? fmtCur(estVal.midpoint) : '—'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                {estVal?.range_low ? fmtCur(estVal.range_low) : ''} - {estVal?.range_high ? fmtCur(estVal.range_high) : ''}
              </div>
            </div>

            <div style={{ textAlign: 'center', minWidth: 100 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Investability</div>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 2 }}>
                <span style={{ fontSize: 32, fontWeight: 800, color: scoreColor(verdict?.investment_score) }}>
                  {verdict?.investment_score || 0}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-disabled)', fontWeight: 600 }}>/100</span>
              </div>
            </div>

            <div style={{ textAlign: 'center', minWidth: 100, borderLeft: '1px solid var(--border-subtle)', paddingLeft: 24 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>AI Verdict</div>
              <div style={{ display: 'inline-flex', padding: '6px 14px', background: `color-mix(in srgb, ${scoreColor(verdict?.investment_score)} 15%, transparent)`, color: scoreColor(verdict?.investment_score), borderRadius: 99, fontSize: 14, fontWeight: 700 }}>
                {verdict?.verdict_title || 'Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
        
        {/* Market & Comps Wrapper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 2: Estimated Value deeply */}
          <div className="card h-100">
            <div className="card-header"><div className="card-title">Valuation Breakdown</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Confidence Score</span>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{estVal?.confidence_score}</span>
              </div>
              <div style={{ height: 8, background: 'var(--bg-3)', borderRadius: 4, overflow: 'hidden', position: 'relative', marginTop: 12, marginBottom: 16 }}>
                <div style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0, background: 'color-mix(in srgb, var(--accent) 30%, transparent)' }} />
                <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 4, background: 'var(--accent)', transform: 'translateX(-50%)' }} />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {snapshot}
              </p>
            </div>
          </div>

          {/* Section 3: Comps */}
          <div className="card h-100">
            <div className="card-header"><div className="card-title">Comparable Sales & Market</div></div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 16px 0' }}>{comps}</p>
              <div style={{ padding: '12px', background: 'var(--bg-2)', borderRadius: 8, borderLeft: '2px solid var(--border)' }}>
                <strong>Local Market Trend:</strong> {market}
              </div>
            </div>
          </div>
        </div>

        {/* Investment & Income Wrapper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 6 & 7: Income / ROI */}
          <div className="card h-100">
            <div className="card-header"><div className="card-title">Rent & Yield Potential</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1, padding: 16, background: 'var(--bg-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Est. Monthly Rent</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--green)', fontFamily: 'monospace' }}>
                    {rentPot?.estimated_monthly_rent ? fmtCur(rentPot.estimated_monthly_rent) : '—'}/mo
                  </div>
                </div>
                <div style={{ flex: 1, padding: 16, background: 'var(--bg-2)', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Annual Gross Rent</div>
                  <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-main)', fontFamily: 'monospace' }}>
                    {rentPot?.annual_gross_rent ? fmtCur(rentPot.annual_gross_rent) : '—'}
                  </div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>{rentPot?.narrative}</p>
              <div style={{ padding: '12px 0 0 0', borderTop: '1px solid var(--border-subtle)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <strong>Investment Metrics:</strong> {metrics}
              </div>
            </div>
          </div>

          {/* Section 8: Strategy Fit */}
          <div className="card h-100">
            <div className="card-header"><div className="card-title">Strategy Fit</div></div>
            <div className="card-body">
              <div style={{ display: 'inline-flex', padding: '4px 12px', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
                🎯 Best Play: {strategy?.recommended_strategy || 'Unknown'}
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                {strategy?.narrative}
              </p>
            </div>
          </div>
        </div>

        {/* Risk & Nuance Wrapper */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Section 9: Neighborhood & History */}
          <div className="card h-100">
            <div className="card-header" style={{ justifyContent: 'space-between' }}>
              <div className="card-title">Location & History</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                AREA SCORE <span style={{ padding: '2px 6px', background: 'var(--bg-2)', borderRadius: 4, color: scoreColor(neighborhood?.score) }}>{neighborhood?.score || 0}</span>
              </div>
            </div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <p style={{ margin: '0 0 12px 0' }}>{neighborhood?.narrative}</p>
              <p style={{ margin: 0, padding: 12, background: 'var(--bg-2)', borderRadius: 6 }}>
                <strong>Property History:</strong> {history}
              </p>
            </div>
          </div>

          {/* Section 11 & 13: Risk & Negotiation */}
          <div className="card h-100">
            <div className="card-header"><div className="card-title">Risk & Deal Structuring</div></div>
            <div className="card-body" style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
               <div style={{ marginBottom: 16 }}>
                 <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Risk Factors</div>
                 <p style={{ margin: 0, color: 'var(--red)' }}>⚠️ {risk}</p>
               </div>
               <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                 <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Deal Structuring</div>
                 <p style={{ margin: 0 }}>{structuring}</p>
               </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* FINAL VERDICT ROW */}
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
