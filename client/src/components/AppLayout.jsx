import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useState, useEffect } from 'react';
import TopNavUserBadge from './TopNavUserBadge';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/assets': 'Assets & Markets',
  '/trades': 'Trade Journal',
  '/ideas': 'Investment Ideas',
  '/notes': 'Research Notes',
  '/properties': 'Real Estate',
  '/news': 'News',
  '/contacts': 'Contacts',
  '/documents': 'Documents',
  '/portfolio': 'Portfolio',
  '/events': 'Macro Calendar',
  '/alerts': 'Alerts',
  '/tags': 'Tags',
  '/search': 'Search',
};

export default function AppLayout({ children }) {
  const loc = useLocation();
  const title = PAGE_TITLES[loc.pathname] || 'InvestOS';
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Close sidebar on navigation on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [loc.pathname]);

  return (
    <div className="app-layout">
      {/* Mobile Sidebar Overlay */}
      <div 
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <div className="app-main" style={{ position: 'relative' }}>
        <TopNavUserBadge />
        <Topbar title={title} onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="app-content">
          {children}
        </main>
      </div>
    </div>
  );
}
