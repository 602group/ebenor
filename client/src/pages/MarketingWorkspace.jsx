import { useState } from 'react';
import MarketingDashboardTab from './MarketingDashboardTab';
import MarketingBlogTab from './MarketingBlogTab';
import MarketingNewsletterTab from './MarketingNewsletterTab';

const TABS = ['Dashboard', 'Blog', 'Newsletter'];

export default function MarketingWorkspace() {
  const [activeTab, setActiveTab] = useState('Dashboard');

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 16 }}>
        <div>
          <div className="page-title">Marketing Workspace</div>
          <div className="page-subtitle">Manage public-facing content, outbound assets, and newsletter subscribers from Ebenor Global.</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {TABS.map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t)}
            style={{ 
              padding: '8px 16px', 
              fontSize: 13, 
              fontWeight: 500, 
              background: 'none', 
              color: activeTab === t ? 'var(--accent)' : 'var(--text-muted)', 
              borderBottom: activeTab === t ? '2px solid var(--accent)' : '2px solid transparent', 
              borderRadius: 0, 
              transition: 'all var(--transition)', 
              cursor: 'pointer' 
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="workspace-content">
        {activeTab === 'Dashboard' && <MarketingDashboardTab setTab={setActiveTab} />}
        {activeTab === 'Blog' && <MarketingBlogTab />}
        {activeTab === 'Newsletter' && <MarketingNewsletterTab />}
      </div>
    </div>
  );
}
