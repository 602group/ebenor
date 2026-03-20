import { useState, useEffect } from 'react';
import api from '../api/client';
import PropertyReportView from '../components/PropertyReportView';

const PROPERTY_TYPES = ['single-family', 'multifamily', 'condo', 'townhome', 'short-term-rental', 'commercial', 'land'];

export default function HomeValueCalculatorTab() {
  const [reports, setReports] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  
  // Form State
  const [form, setForm] = useState({
    address: '', city: '', state: '', zip: '',
    beds: '', baths: '', sqft: '', property_type: 'single-family'
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
      const { data } = await api.get('/property-reports');
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
      const { data } = await api.post('/property-reports/generate', form);
      setActiveReport(data);
      // Reload history to show the newly created item
      loadHistory();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to generate report.');
    } finally {
      setGenerating(false);
    }
  }

  const fmtCur = (n) => n ? Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '—';

  return (
    <div className="home-value-calculator">
      
      {/* ─── SECTION A & B: HEADER & INPUT FORM ─────────────────────────────────── */}
      {!activeReport && (
        <div className="card" style={{ marginBottom: 24, overflow: 'hidden' }}>
          <div className="card-header" style={{ background: 'var(--bg-2)', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div className="card-title" style={{ fontSize: 18, color: 'var(--accent)' }}>Property Intelligence Engine</div>
              <div className="card-subtitle" style={{ marginTop: 4 }}>Generate an investment-grade analysis report from a property address.</div>
            </div>
          </div>
          
          <form className="card-body" onSubmit={handleGenerate} style={{ padding: '24px 32px' }}>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Street Address *</label>
              <input className="form-input" style={{ fontSize: 16, padding: '12px' }} value={form.address} onChange={e => handleInput('address', e.target.value)} required placeholder="e.g. 123 Main St" />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.city} onChange={e => handleInput('city', e.target.value)} placeholder="e.g. Phoenix" />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={form.state} onChange={e => handleInput('state', e.target.value)} placeholder="e.g. AZ" />
              </div>
              <div className="form-group">
                <label className="form-label">Zip Code</label>
                <input className="form-input" value={form.zip} onChange={e => handleInput('zip', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Property Type</label>
                <select className="form-select" value={form.property_type} onChange={e => handleInput('property_type', e.target.value)}>
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            
            <div className="form-row" style={{ marginBottom: 20 }}>
              <div className="form-group">
                <label className="form-label">Beds</label>
                <input className="form-input" type="number" value={form.beds} onChange={e => handleInput('beds', e.target.value)} placeholder="Wait for AI..." />
              </div>
              <div className="form-group">
                <label className="form-label">Baths</label>
                <input className="form-input" type="number" step="0.5" value={form.baths} onChange={e => handleInput('baths', e.target.value)} placeholder="Wait for AI..." />
              </div>
              <div className="form-group">
                <label className="form-label">Square Feet</label>
                <input className="form-input" type="number" value={form.sqft} onChange={e => handleInput('sqft', e.target.value)} placeholder="Wait for AI..." />
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button type="submit" className="btn btn-primary" style={{ padding: '10px 24px', fontSize: 14 }} disabled={generating || !form.address}>
                {generating ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Analyzing Local Markets & Comps...
                  </span>
                ) : (
                  'Generate Deal Analysis'
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
          <PropertyReportView report={activeReport} />
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
                      <th>Address</th>
                      <th>Est. Value</th>
                      <th>Score</th>
                      <th>Strategy</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleDateString()}</td>
                        <td style={{ fontWeight: 500, fontSize: 13 }}>{r.address_snapshot || 'Unknown Address'}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--accent)' }}>{fmtCur(r.estimated_value)}</td>
                        <td>
                          {r.investment_score >= 80 ? <span className="badge badge-green">{r.investment_score}/100</span> :
                           r.investment_score >= 50 ? <span className="badge badge-yellow">{r.investment_score}/100</span> :
                           <span className="badge badge-red">{r.investment_score}/100</span>}
                        </td>
                        <td style={{ fontSize: 12 }}>{r.recommended_strategy}</td>
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
                <span style={{ fontSize: 24 }}>🗂️</span>
                <div style={{ marginTop: 8, fontSize: 14 }}>No historical reports found.</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Generate your first report above.</div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
