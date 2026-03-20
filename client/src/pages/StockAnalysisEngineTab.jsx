import { useState, useEffect } from 'react';
import api from '../api/client';
import StockReportView from '../components/StockReportView';

const STRATEGIES = ['Long-Term Hold', 'Swing Trade', 'Momentum', 'Value / Undervalued', 'Dividend Income', 'Short Opportunity', 'Other'];
const HORIZONS = ['Short-Term (< 3 months)', 'Medium-Term (3-12 months)', 'Long-Term (1+ years)'];

export default function StockAnalysisEngineTab() {
  const [reports, setReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Form State
  const [form, setForm] = useState({
    ticker: '', company_name: '', horizon: '', strategy: '', notes: ''
  });
  
  // Generation State
  const [generating, setGenerating] = useState(false);
  const [activeReport, setActiveReport] = useState(null);
  
  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    setLoadingHistory(true);
    try {
      const { data } = await api.get('/stock-reports');
      setReports(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  }

  const handleInput = (k, v) => setForm(f => ({ ...f, [k]: v }));

  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setActiveReport(null);
    try {
      const { data } = await api.post('/stock-reports/generate', form);
      setActiveReport(data);
      loadHistory();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate stock report.');
    } finally {
      setGenerating(false);
    }
  }

  const fmtCur = (n) => n ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

  return (
    <div className="stock-analysis-engine">
      
      {/* ─── SECTION A & B: HEADER & INPUT FORM ─────────────────────────────────── */}
      {!activeReport && (
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
          <div className="card-header" style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="card-title" style={{ fontSize: 18, color: 'var(--blue)' }}>AI Equity Research Desk</div>
              <div className="card-subtitle" style={{ marginTop: 4 }}>Generate institutional-grade stock reports natively utilizing multi-model AI logic.</div>
            </div>
          </div>
          
          <form className="card-body" onSubmit={handleGenerate} style={{ padding: '24px 32px' }}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Ticker Symbol *</label>
                <input className="form-input" style={{ fontSize: 16, padding: '12px', textTransform: 'uppercase' }} value={form.ticker} onChange={e => handleInput('ticker', e.target.value.toUpperCase())} required placeholder="e.g. AAPL" />
              </div>
              <div className="form-group">
                <label className="form-label">Company Name (Optional)</label>
                <input className="form-input" style={{ fontSize: 16, padding: '12px' }} value={form.company_name} onChange={e => handleInput('company_name', e.target.value)} placeholder="e.g. Apple Inc." />
              </div>
            </div>
            
            <div className="form-row" style={{ marginTop: 8 }}>
              <div className="form-group">
                <label className="form-label">Investment Horizon</label>
                <select className="form-select" value={form.horizon} onChange={e => handleInput('horizon', e.target.value)}>
                  <option value="">— Select Target Horizon —</option>
                  {HORIZONS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Core Strategy</label>
                <select className="form-select" value={form.strategy} onChange={e => handleInput('strategy', e.target.value)}>
                  <option value="">— Select Strategy Bias —</option>
                  {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Pre-Analysis Notes (Optional Context)</label>
              <textarea className="form-textarea" rows={3} value={form.notes} onChange={e => handleInput('notes', e.target.value)} placeholder="Provide any specific context or hypothesis to guide the AI..." />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: 14, background: 'var(--blue)' }} disabled={generating || !form.ticker}>
                {generating ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Analyzing Markets & Fundamentals...
                  </span>
                ) : (
                  'Generate Stock Report'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ─── SECTION C: ACTIVE REPORT VIEW ──────────────────────────────────────── */}
      {activeReport && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <button className="btn btn-secondary btn-sm" onClick={() => setActiveReport(null)}>← Back to New Search</button>
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>🖨️ Print Report</button>
            </div>
          </div>
          {/* We will build this next component */}
          <StockReportView report={activeReport} />
        </div>
      )}

      {/* ─── SECTION D: REPORT HISTORY TABLE ────────────────────────────────────── */}
      {!activeReport && (
        <div className="card">
          <div className="card-header">
            <div className="card-title">Past Report History</div>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loadingHistory ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner" /></div>
            ) : reports.length > 0 ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Ticker</th>
                      <th>Price</th>
                      <th>Valuation</th>
                      <th>Score</th>
                      <th>AI Verdict</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 600, fontSize: 13 }}>{r.ticker}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-secondary)' }}>{fmtCur(r.price_at_time)}</td>
                        <td>
                          {r.valuation_score >= 80 ? <span className="badge badge-green">{r.valuation_score}</span> :
                           r.valuation_score >= 50 ? <span className="badge badge-yellow">{r.valuation_score}</span> :
                           <span className="badge badge-red">{r.valuation_score}</span>}
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: r.overall_score >= 80 ? 'var(--green)' : r.overall_score >= 50 ? 'var(--yellow)' : 'var(--red)' }}>
                            {r.overall_score} / 100
                          </span>
                        </td>
                        <td style={{ fontSize: 12, fontWeight: 500 }}>
                          {r.recommendation === 'Strong Buy' || r.recommendation === 'Buy' ? <span style={{ color: 'var(--green)' }}>{r.recommendation}</span> :
                           r.recommendation === 'Hold' ? <span style={{ color: 'var(--yellow)' }}>{r.recommendation}</span> :
                           <span style={{ color: 'var(--red)' }}>{r.recommendation}</span>}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setActiveReport(r)}>View Report</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <span style={{ fontSize: 24 }}>📈</span>
                <div style={{ marginTop: 8, fontSize: 14 }}>No historical equity research found.</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Generate your first report above.</div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
