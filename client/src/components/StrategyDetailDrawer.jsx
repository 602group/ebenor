import { useState, useEffect } from 'react';
import api from '../api/client';
import RecordLinksPanel from './RecordLinksPanel';
import RecordNotesPanel from './RecordNotesPanel';
import QuickAlertButton from './QuickAlertButton';

export default function StrategyDetailDrawer({ strategyId, onClose, onUpdated }) {
  const [strategy, setStrategy] = useState(null);
  const [subTab, setSubTab] = useState('Framework');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api.get(`/strategies/${strategyId}`);
    setStrategy(r.data);
    setForm(r.data);
  }
  useEffect(() => { load(); }, [strategyId]);

  async function save(e) {
    if (e) e.preventDefault();
    setSaving(true);
    const r = await api.patch(`/strategies/${strategyId}`, {
      name: form.name,
      category: form.category,
      description: form.description,
      rules_framework: form.rules_framework,
      entry_criteria: form.entry_criteria,
      exit_criteria: form.exit_criteria,
      risk_considerations: form.risk_considerations,
      asset_classes: form.asset_classes,
      status: form.status
    });
    setStrategy({ ...strategy, ...r.data });
    if (onUpdated) onUpdated();
    setSaving(false);
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 800 }} onClick={onClose} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 720, maxWidth: '100%', background: 'var(--bg-2)', borderLeft: '1px solid var(--border)', zIndex: 850, display: 'flex', flexDirection: 'column', animation: 'slideInRight 180ms ease' }}>
        {!strategy ? <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}><div className="spinner" /></div> : (
          <>
            <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{strategy.name}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{strategy.asset_classes}</div>
                  <div style={{ marginTop: 8 }}><span className="badge badge-purple">{strategy.category}</span></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <QuickAlertButton linkedType="strategy" linkedId={strategyId} />
                  <button className="btn btn-ghost btn-sm" onClick={onClose}>×</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 2 }}>
                {['Framework', 'Criteria & Risk', 'Notes', 'Links'].map(t => (
                  <button key={t} onClick={() => setSubTab(t)} style={{ padding: '6px 12px', fontSize: 12, fontWeight: 500, background: 'none', color: subTab === t ? 'var(--accent)' : 'var(--text-muted)', borderBottom: subTab === t ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0, cursor: 'pointer' }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {subTab === 'Framework' && (
                <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Strategy Name</label>
                    <input className="form-input" value={form.name} style={{ fontSize: '1.2rem', fontWeight: 600 }} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Category</label>
                      <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                        {['general','day-trading','swing-trading','value-investing','real-estate','options','arbitrage'].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                        <option value="draft">Draft / Research</option>
                        <option value="active">Active / Deployed</option>
                        <option value="archived">Archived / Retired</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Target Asset Classes</label>
                    <input className="form-input" value={form.asset_classes || ''} onChange={e => setForm({...form, asset_classes: e.target.value})} placeholder="e.g. Equities, Forex, Multi-Family Real Estate" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">High-Level Description</label>
                    <textarea className="form-textarea" rows={3} value={form.description || ''} onChange={e => setForm({...form, description: e.target.value})} placeholder="What is this strategy trying to achieve?" />
                  </div>

                  <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <label className="form-label">Core Rules Framework</label>
                    <textarea className="form-textarea" style={{ minHeight: 150, fontFamily: 'monospace' }} value={form.rules_framework || ''} onChange={e => setForm({...form, rules_framework: e.target.value})} placeholder="The 1-2-3 step process or overarching rules..." />
                  </div>
                  
                  <div>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Framework'}</button>
                  </div>
                </form>
              )}
              
              {subTab === 'Criteria & Risk' && (
                <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div className="form-group">
                    <label className="form-label">Entry Criteria (Checklist / Conditions)</label>
                    <textarea className="form-textarea" style={{ minHeight: 120, fontFamily: 'monospace' }} value={form.entry_criteria || ''} onChange={e => setForm({...form, entry_criteria: e.target.value})} placeholder="- Price crosses 200 SMA&#10;- Volume is > 1.5x average..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Exit Criteria (Take Profit & Stop Loss Logic)</label>
                    <textarea className="form-textarea" style={{ minHeight: 120, fontFamily: 'monospace' }} value={form.exit_criteria || ''} onChange={e => setForm({...form, exit_criteria: e.target.value})} placeholder="- Stop loss at recent swing low&#10;- Take profit at 2R..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Risk Management Considerations</label>
                    <textarea className="form-textarea" style={{ minHeight: 120, fontFamily: 'monospace' }} value={form.risk_considerations || ''} onChange={e => setForm({...form, risk_considerations: e.target.value})} placeholder="- Max 1% portfolio risk per trade&#10;- Avoid during earnings week..." />
                  </div>
                  <div>
                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Criteria'}</button>
                  </div>
                </form>
              )}
              
              {subTab === 'Notes' && <RecordNotesPanel recordType="strategy" recordId={strategyId} />}
              {subTab === 'Links' && <RecordLinksPanel recordType="strategy" recordId={strategyId} />}
            </div>
          </>
        )}
      </div>
      <style>{`@keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </>
  );
}
