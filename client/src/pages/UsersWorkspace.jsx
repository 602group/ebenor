import { useState } from 'react';
import UsersListTab from './UsersListTab';
import RequirePermission from '../components/RequirePermission';

const TABS = ['All Users'];

export default function UsersWorkspace() {
  const [activeTab, setActiveTab] = useState('All Users');

  return (
    <RequirePermission module="users" fallback={<div style={{ padding: 40 }}>You do not have permission to manage users.</div>}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px' }}>
        <div className="page-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 16 }}>
          <div>
            <div className="page-title">User Management</div>
            <div className="page-subtitle">Add, edit, and control backend permissions for all team members.</div>
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
          {activeTab === 'All Users' && <UsersListTab />}
        </div>
      </div>
    </RequirePermission>
  );
}
