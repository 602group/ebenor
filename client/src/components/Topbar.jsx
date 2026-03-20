import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';

export default function Topbar({ title, onMenuClick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef(null);
  const tmr = useRef(null);

  useEffect(() => {
    function handler(e) { if (!ref.current?.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function handleSearch(val) {
    setQ(val);
    clearTimeout(tmr.current);
    if (val.trim().length < 2) { setResults([]); setOpen(false); return; }
    tmr.current = setTimeout(async () => {
      const r = await api.get(`/search?q=${encodeURIComponent(val)}`);
      setResults(r.data.results);
      setOpen(true);
    }, 280);
  }

  const TYPE_ROUTES = {
    asset: '/assets', trade: '/trades', idea: '/ideas',
    note: '/notes', property: '/properties', contact: '/contacts',
    news: '/news', document: '/documents',
  };

  return (
    <header className="topbar">
      {/* Mobile Hamburger Menu */}
      <button 
        className="btn-icon mobile-menu-btn" 
        onClick={onMenuClick}
        style={{ marginRight: 8, padding: 4 }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      <span className="topbar-title">{title}</span>

      <div className="search-wrap" ref={ref} style={{ marginLeft: 16 }}>
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
        <input
          className="search-input"
          placeholder="Search everything... (assets, trades, notes, properties)"
          value={q}
          onChange={e => handleSearch(e.target.value)}
          onFocus={() => q.length >= 2 && setOpen(true)}
        />
        {open && results.length > 0 && (
          <div className="search-results-dropdown">
            {results.map((r, i) => (
              <div key={i} className="search-result-item" onClick={() => {
                navigate(TYPE_ROUTES[r.type] || '/');
                setOpen(false); setQ('');
              }}>
                <span className="search-result-type-badge">{r.type}</span>
                <div>
                  <div className="search-result-title">{r.title}</div>
                  <div className="search-result-sub">{r.subtitle}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {open && results.length === 0 && q.length >= 2 && (
          <div className="search-results-dropdown" style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            No results found for "{q}"
          </div>
        )}
      </div>
    </header>
  );
}
