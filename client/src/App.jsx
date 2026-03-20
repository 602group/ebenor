import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import SectorWorkspace from './pages/SectorWorkspace';
import AssetsPage from './pages/AssetsPage';
import TradesPage from './pages/TradesPage';
import IdeasPage from './pages/IdeasPage';
import NotesPage from './pages/NotesPage';
import PropertiesPage from './pages/PropertiesPage';
import GlobalNewsDashboard from './pages/GlobalNewsDashboard';
import SectorNewsPage from './pages/SectorNewsPage';
import MarketingWorkspace from './pages/MarketingWorkspace';
import UsersWorkspace from './pages/UsersWorkspace';
import ContactsPage from './pages/ContactsPage';
import DocumentsPage from './pages/DocumentsPage';
import PortfolioPage from './pages/PortfolioPage';
import EventsPage from './pages/EventsPage';
import AlertsPage from './pages/AlertsPage';
import TagsPage from './pages/TagsPage';
import SearchPage from './pages/SearchPage';
import MarketsPage from './pages/MarketsPage';
import WatchlistsPage from './pages/WatchlistsPage';
import KnowledgePage from './pages/KnowledgePage';
import StrategiesPage from './pages/StrategiesPage';
import ActivityPage from './pages/ActivityPage';
import ReportsPage from './pages/ReportsPage';
import StockScreenerPage from './pages/StockScreenerPage';
import FloatingAssistant from './components/AIAssistant/FloatingAssistant';
import './index.css';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /> Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen"><div className="spinner" /> Loading...</div>;
  
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route path="/*" element={
        <ProtectedRoute>
          <AppLayout>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/sectors/:sectorPath" element={<SectorWorkspace />} />
              <Route path="/admin/marketing" element={<MarketingWorkspace />} />
              <Route path="/admin/users" element={<UsersWorkspace />} />
              <Route path="/stocks/screener" element={<StockScreenerPage />} />
              
              {/* Legacy / Direct-Access Routes (Can still be used globally) */}
              <Route path="/assets" element={<AssetsPage />} />
              <Route path="/markets" element={<MarketsPage />} />
              <Route path="/watchlists" element={<WatchlistsPage />} />
              <Route path="/trades" element={<TradesPage />} />
              <Route path="/ideas" element={<IdeasPage />} />
              <Route path="/notes" element={<NotesPage />} />
              <Route path="/global-news" element={<GlobalNewsDashboard />} />
              <Route path="/global-news/real-estate" element={<SectorNewsPage defaultSector="real-estate" />} />
              <Route path="/global-news/forex" element={<SectorNewsPage defaultSector="forex" />} />
              <Route path="/global-news/stocks" element={<SectorNewsPage defaultSector="stocks" />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/knowledge" element={<KnowledgePage />} />
              <Route path="/research-library" element={<KnowledgePage />} />
              <Route path="/strategies" element={<StrategiesPage />} />
              <Route path="/portfolio" element={<PortfolioPage />} />
              <Route path="/activity" element={<ActivityPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/tags" element={<TagsPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            <FloatingAssistant />
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
