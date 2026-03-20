import { useState, useEffect } from 'react';
import { useParams, Navigate, useLocation, useNavigate } from 'react-router-dom';

// Import all possible sector page components
import PropertiesPage from './PropertiesPage';
import TradesPage from './TradesPage';
import IdeasPage from './IdeasPage';
import NotesPage from './NotesPage';
import SectorNewsPage from './SectorNewsPage';
import AssetsPage from './AssetsPage';
import ContactsPage from './ContactsPage';
import DocumentsPage from './DocumentsPage';
import AlertsPage from './AlertsPage';
import EventsPage from './EventsPage';
import ForexDashboardTab from './ForexDashboardTab';
import StocksDashboardTab from './StocksDashboardTab';
import StockScreenerPage from './StockScreenerPage';
import HomeValueCalculatorTab from './HomeValueCalculatorTab';
import StockAnalysisEngineTab from './StockAnalysisEngineTab';

const SECTOR_CONFIGS = {
  'real-estate': {
    title: 'Real Estate Workspace',
    icon: '⬜',
    tabs: [
      { id: 'dashboard', label: 'RE Dashboard', component: PropertiesPage },
      { id: 'pipeline', label: 'Pipeline', component: PropertiesPage },
      { id: 'properties', label: 'Property DB', component: PropertiesPage },
      { id: 'market', label: 'Market Research', component: PropertiesPage },
      { id: 'calculator', label: 'Home Value Calculator', component: HomeValueCalculatorTab },
      { id: 'news', label: 'News & Research', component: SectorNewsPage },
      { id: 'notes', label: 'Notes', component: NotesPage },
      { id: 'documents', label: 'Documents', component: DocumentsPage },
      { id: 'contacts', label: 'Contacts', component: ContactsPage },
      { id: 'alerts', label: 'Alerts', component: AlertsPage },
    ]
  },
  'forex': {
    title: 'Forex Desk',
    icon: '⬡',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', component: ForexDashboardTab },
      { id: 'journal', label: 'Trade Journal', component: TradesPage },
      { id: 'ideas', label: 'Ideas', component: IdeasPage },
      { id: 'pairs', label: 'Pairs / Assets', component: AssetsPage },
      { id: 'news', label: 'News Engine', component: SectorNewsPage },
      { id: 'notes', label: 'Session Notes', component: NotesPage },
      { id: 'events', label: 'Macro Events', component: EventsPage },
      { id: 'alerts', label: 'Alerts', component: AlertsPage },
      { id: 'documents', label: 'Documents', component: DocumentsPage },
    ]
  },
  'stocks': {
    title: 'Equities Workspace',
    icon: '◎',
    tabs: [
      { id: 'dashboard', label: 'Dashboard', component: StocksDashboardTab },
      { id: 'screener', label: '📈 Stock Screener', component: StockScreenerPage },
      { id: 'analysis', label: 'Stock Analysis', component: StockAnalysisEngineTab },
      { id: 'watchlist', label: 'Assets', component: AssetsPage },
      { id: 'ideas', label: 'Top Ideas', component: IdeasPage },
      { id: 'journal', label: 'Trade Journal', component: TradesPage },
      { id: 'news', label: 'Terminal Feed', component: SectorNewsPage },
      { id: 'notes', label: 'Research Notes', component: NotesPage },
      { id: 'events', label: 'Earnings / Catalysts', component: EventsPage },
      { id: 'alerts', label: 'Alerts', component: AlertsPage },
      { id: 'documents', label: 'Documents', component: DocumentsPage },
    ]
  }
};

export default function SectorWorkspace() {
  const { sectorPath } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const config = SECTOR_CONFIGS[sectorPath];
  
  // Look for a ?tab= query parameter to initialize activeTab
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get('tab') || config?.tabs[0]?.id;
  
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync tab state with URL without triggering full re-render cycles unnecessarily
  useEffect(() => {
    if (!config) return;
    const currentTab = queryParams.get('tab');
    if (currentTab && config.tabs.some(t => t.id === currentTab)) {
      setActiveTab(currentTab);
    } else if (!currentTab) {
      setActiveTab(config.tabs[0].id);
    }
  }, [sectorPath, location.search, config]);

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    navigate(`/sectors/${sectorPath}?tab=${tabId}`, { replace: true });
  };

  if (!config) {
    return <Navigate to="/" replace />;
  }

  const activeConfigTab = config.tabs.find(t => t.id === activeTab) || config.tabs[0];
  const Component = activeConfigTab.component;

  // The 'sector' we pass down maps closely to our backend 'asset_class' where applicable
  const apiSector = sectorPath === 'stocks' ? 'stock' : sectorPath === 'real-estate' ? 'real-estate' : 'forex';

  return (
    <div className="page-container sector-workspace">
      <div className="page-header" style={{ marginBottom: 0, paddingBottom: 16 }}>
        <div>
          <div className="page-title">
            <span style={{ marginRight: 12 }}>{config.icon}</span>
            {config.title}
          </div>
          <div className="page-subtitle" style={{ marginTop: 4 }}>
            Sector-isolated environment for managing {sectorPath} operations.
          </div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 24, padding: '0 32px' }}>
        {config.tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            style={{ fontSize: 13 }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="sector-content-wrapper" style={{ padding: '0 32px' }}>
        {/* Render the specific page component, but heavily instruct it to filter via defaultSector */}
        <Component defaultSector={apiSector} isWorkspaceView={true} activeSubTab={activeTab} />
      </div>
    </div>
  );
}
