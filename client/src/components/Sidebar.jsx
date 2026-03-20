import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  { section: 'Overview', items: [
    { to: '/', label: 'Dashboard', icon: '◈' }
  ]},
  { section: 'Sectors', items: [
    { to: '/sectors/real-estate', label: 'Real Estate', icon: '⬜', perm: 'real-estate' },
    { to: '/sectors/forex', label: 'Forex', icon: '⬡', perm: 'forex' },
    { to: '/sectors/stocks', label: 'Stocks', icon: '◎', perm: 'stocks' },
  ]},
  { section: 'Shared Systems', items: [
    { to: '/portfolio', label: 'Portfolio', icon: '▦', perm: 'portfolio' },
    { to: '/global-news', label: 'Global News', icon: '◉', perm: 'news' },
    { to: '/research-library', label: 'Research Library', icon: '📚', perm: 'knowledge' },
    { to: '/documents', label: 'Documents', icon: '▪', perm: 'documents' },
    { to: '/contacts', label: 'Contacts', icon: '◐', perm: 'contacts' },
    { to: '/alerts', label: 'Alerts', icon: '◆', perm: 'alerts' },
    { to: '/events', label: 'Macro Calendar', icon: '▩', perm: 'events' },
    { to: '/reports', label: 'Reports', icon: '📊', perm: 'reports' },
    { to: '/activity', label: 'Activity Log', icon: '⚡', perm: 'activity' },
  ]},
  { section: 'Admin', items: [
    { to: '/admin/marketing', label: 'Marketing', icon: 'megaphone', perm: 'marketing' },
    { to: '/admin/users', label: 'Users', icon: 'users', perm: 'users' }
  ]}
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, hasPermission } = useAuth();
  const [isLight, setIsLight] = useState(() => {
    return localStorage.getItem('theme') === 'light';
  });

  useEffect(() => {
    if (isLight) {
      document.documentElement.classList.add('light-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.remove('light-theme');
      localStorage.setItem('theme', 'dark');
    }
  }, [isLight]);

  const toggleTheme = () => setIsLight(prev => !prev);

  return (
    <nav className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark">IV</div>
        <div className="sidebar-logo-text" style={{ flex: 1 }}>
          <div>InvestOS</div>
          <div className="sidebar-logo-sub">Investment Platform</div>
        </div>
        {/* Mobile close button visible only when open inside menu */}
        <button 
          className="btn-icon d-mobile-only" 
          onClick={onClose}
          style={{ padding: '4px', display: 'none' }} // we will hide it on desktop in css or inline, but maybe better not needed because overlay handles it
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="sidebar-nav">
        {NAV.map(section => {
          const visibleItems = section.items.filter(item => !item.perm || hasPermission(item.perm));
          if (visibleItems.length === 0) return null;

          return (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {visibleItems.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </div>

      <div className="sidebar-footer">
        <button className="nav-item" style={{ width: '100%', paddingLeft: 16 }} onClick={toggleTheme}>
          {isLight ? 'Dark Mode' : 'Light Mode'}
        </button>
        <button className="nav-item" style={{ width: '100%', paddingLeft: 16 }} onClick={logout}>
          Sign Out
        </button>
      </div>
    </nav>
  );
}
