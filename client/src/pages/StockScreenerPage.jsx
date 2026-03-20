import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/client';
import StockDetailDrawer from './StockDetailDrawer';

/* ── S&P 500 Static List (symbol, name, sector) ─────────────────── */
const SP500 = [
  { symbol:'AAPL',  name:'Apple Inc.',                  sector:'Technology' },
  { symbol:'MSFT',  name:'Microsoft Corporation',       sector:'Technology' },
  { symbol:'NVDA',  name:'NVIDIA Corporation',          sector:'Technology' },
  { symbol:'AMZN',  name:'Amazon.com Inc.',             sector:'Consumer Disc.' },
  { symbol:'GOOGL', name:'Alphabet Inc. (Class A)',     sector:'Communication' },
  { symbol:'META',  name:'Meta Platforms Inc.',         sector:'Communication' },
  { symbol:'BRK.B', name:'Berkshire Hathaway Inc.',     sector:'Financials' },
  { symbol:'TSLA',  name:'Tesla Inc.',                  sector:'Consumer Disc.' },
  { symbol:'LLY',   name:'Eli Lilly and Company',       sector:'Healthcare' },
  { symbol:'JPM',   name:'JPMorgan Chase & Co.',        sector:'Financials' },
  { symbol:'V',     name:'Visa Inc.',                   sector:'Financials' },
  { symbol:'UNH',   name:'UnitedHealth Group Inc.',     sector:'Healthcare' },
  { symbol:'XOM',   name:'Exxon Mobil Corporation',     sector:'Energy' },
  { symbol:'MA',    name:'Mastercard Inc.',             sector:'Financials' },
  { symbol:'AVGO',  name:'Broadcom Inc.',               sector:'Technology' },
  { symbol:'JNJ',   name:'Johnson & Johnson',           sector:'Healthcare' },
  { symbol:'PG',    name:'Procter & Gamble Co.',        sector:'Consumer Staples' },
  { symbol:'HD',    name:'Home Depot Inc.',             sector:'Consumer Disc.' },
  { symbol:'COST',  name:'Costco Wholesale Corp.',      sector:'Consumer Staples' },
  { symbol:'ABBV',  name:'AbbVie Inc.',                 sector:'Healthcare' },
  { symbol:'MRK',   name:'Merck & Co. Inc.',            sector:'Healthcare' },
  { symbol:'CVX',   name:'Chevron Corporation',         sector:'Energy' },
  { symbol:'CRM',   name:'Salesforce Inc.',             sector:'Technology' },
  { symbol:'BAC',   name:'Bank of America Corp.',       sector:'Financials' },
  { symbol:'NFLX',  name:'Netflix Inc.',                sector:'Communication' },
  { symbol:'ORCL',  name:'Oracle Corporation',          sector:'Technology' },
  { symbol:'WMT',   name:'Walmart Inc.',                sector:'Consumer Staples' },
  { symbol:'AMD',   name:'Advanced Micro Devices',      sector:'Technology' },
  { symbol:'KO',    name:'Coca-Cola Company',           sector:'Consumer Staples' },
  { symbol:'PEP',   name:'PepsiCo Inc.',                sector:'Consumer Staples' },
  { symbol:'TMO',   name:'Thermo Fisher Scientific',    sector:'Healthcare' },
  { symbol:'ACN',   name:'Accenture plc',               sector:'Technology' },
  { symbol:'MCD',   name:"McDonald's Corporation",      sector:'Consumer Disc.' },
  { symbol:'CSCO',  name:'Cisco Systems Inc.',          sector:'Technology' },
  { symbol:'ADBE',  name:'Adobe Inc.',                  sector:'Technology' },
  { symbol:'NOW',   name:'ServiceNow Inc.',             sector:'Technology' },
  { symbol:'ABT',   name:'Abbott Laboratories',         sector:'Healthcare' },
  { symbol:'DHR',   name:'Danaher Corporation',         sector:'Healthcare' },
  { symbol:'WFC',   name:'Wells Fargo & Company',       sector:'Financials' },
  { symbol:'IBM',   name:'IBM Corporation',             sector:'Technology' },
  { symbol:'GE',    name:'GE Aerospace',                sector:'Industrials' },
  { symbol:'CAT',   name:'Caterpillar Inc.',            sector:'Industrials' },
  { symbol:'TXN',   name:'Texas Instruments Inc.',      sector:'Technology' },
  { symbol:'INTU',  name:'Intuit Inc.',                 sector:'Technology' },
  { symbol:'PM',    name:'Philip Morris International', sector:'Consumer Staples' },
  { symbol:'AMGN',  name:'Amgen Inc.',                  sector:'Healthcare' },
  { symbol:'MS',    name:'Morgan Stanley',              sector:'Financials' },
  { symbol:'GS',    name:'Goldman Sachs Group Inc.',    sector:'Financials' },
  { symbol:'ISRG',  name:'Intuitive Surgical Inc.',     sector:'Healthcare' },
  { symbol:'RTX',   name:'RTX Corporation',             sector:'Industrials' },
  { symbol:'SPGI',  name:'S&P Global Inc.',             sector:'Financials' },
  { symbol:'HON',   name:'Honeywell International',     sector:'Industrials' },
  { symbol:'BKNG',  name:'Booking Holdings Inc.',       sector:'Consumer Disc.' },
  { symbol:'T',     name:'AT&T Inc.',                   sector:'Communication' },
  { symbol:'VZ',    name:'Verizon Communications',      sector:'Communication' },
  { symbol:'UBER',  name:'Uber Technologies Inc.',      sector:'Technology' },
  { symbol:'AXP',   name:'American Express Company',    sector:'Financials' },
  { symbol:'PFE',   name:'Pfizer Inc.',                 sector:'Healthcare' },
  { symbol:'QCOM',  name:'QUALCOMM Inc.',               sector:'Technology' },
  { symbol:'LOW',   name:"Lowe's Companies Inc.",       sector:'Consumer Disc.' },
  { symbol:'NEE',   name:'NextEra Energy Inc.',         sector:'Utilities' },
  { symbol:'UNP',   name:'Union Pacific Corporation',   sector:'Industrials' },
  { symbol:'AMAT',  name:'Applied Materials Inc.',      sector:'Technology' },
  { symbol:'ETN',   name:'Eaton Corporation plc',       sector:'Industrials' },
  { symbol:'DE',    name:'Deere & Company',             sector:'Industrials' },
  { symbol:'BX',    name:'Blackstone Inc.',             sector:'Financials' },
  { symbol:'SYK',   name:'Stryker Corporation',         sector:'Healthcare' },
  { symbol:'MDT',   name:'Medtronic plc',               sector:'Healthcare' },
  { symbol:'LMT',   name:'Lockheed Martin Corp.',       sector:'Industrials' },
  { symbol:'VRTX',  name:'Vertex Pharmaceuticals',      sector:'Healthcare' },
  { symbol:'BMY',   name:'Bristol-Myers Squibb Co.',    sector:'Healthcare' },
  { symbol:'MMM',   name:'3M Company',                  sector:'Industrials' },
  { symbol:'AMT',   name:'American Tower Corp.',        sector:'Real Estate' },
  { symbol:'PLD',   name:'Prologis Inc.',               sector:'Real Estate' },
  { symbol:'REGN',  name:'Regeneron Pharmaceuticals',   sector:'Healthcare' },
  { symbol:'SCHW',  name:'Charles Schwab Corp.',        sector:'Financials' },
  { symbol:'TJX',   name:'TJX Companies Inc.',          sector:'Consumer Disc.' },
  { symbol:'BSX',   name:'Boston Scientific Corp.',     sector:'Healthcare' },
  { symbol:'CB',    name:'Chubb Limited',               sector:'Financials' },
  { symbol:'GILD',  name:'Gilead Sciences Inc.',        sector:'Healthcare' },
  { symbol:'C',     name:'Citigroup Inc.',              sector:'Financials' },
  { symbol:'ADI',   name:'Analog Devices Inc.',         sector:'Technology' },
  { symbol:'ADP',   name:'Automatic Data Processing',   sector:'Technology' },
  { symbol:'SO',    name:'Southern Company',            sector:'Utilities' },
  { symbol:'BDX',   name:'Becton Dickinson and Co.',    sector:'Healthcare' },
  { symbol:'LRCX',  name:'Lam Research Corporation',    sector:'Technology' },
  { symbol:'KLAC',  name:'KLA Corporation',             sector:'Technology' },
  { symbol:'DUK',   name:'Duke Energy Corporation',     sector:'Utilities' },
  { symbol:'ZTS',   name:'Zoetis Inc.',                 sector:'Healthcare' },
  { symbol:'MO',    name:'Altria Group Inc.',           sector:'Consumer Staples' },
  { symbol:'SNPS',  name:'Synopsys Inc.',               sector:'Technology' },
  { symbol:'CDNS',  name:'Cadence Design Systems',      sector:'Technology' },
  { symbol:'AON',   name:'Aon plc',                     sector:'Financials' },
  { symbol:'MCO',   name:"Moody's Corporation",         sector:'Financials' },
  { symbol:'ITW',   name:'Illinois Tool Works Inc.',    sector:'Industrials' },
  { symbol:'CME',   name:'CME Group Inc.',              sector:'Financials' },
  { symbol:'PNC',   name:'PNC Financial Services',      sector:'Financials' },
  { symbol:'TGT',   name:'Target Corporation',          sector:'Consumer Disc.' },
  { symbol:'USB',   name:'U.S. Bancorp',                sector:'Financials' },
  { symbol:'ICE',   name:'Intercontinental Exchange',   sector:'Financials' },
  { symbol:'EQIX',  name:'Equinix Inc.',                sector:'Real Estate' },
  { symbol:'EMR',   name:'Emerson Electric Co.',        sector:'Industrials' },
  { symbol:'NSC',   name:'Norfolk Southern Corp.',      sector:'Industrials' },
  { symbol:'FCX',   name:'Freeport-McMoRan Inc.',       sector:'Materials' },
  { symbol:'APH',   name:'Amphenol Corporation',        sector:'Technology' },
  { symbol:'MU',    name:'Micron Technology Inc.',      sector:'Technology' },
  { symbol:'INTC',  name:'Intel Corporation',           sector:'Technology' },
  { symbol:'NOC',   name:'Northrop Grumman Corp.',      sector:'Industrials' },
  { symbol:'MDLZ',  name:'Mondelez International',      sector:'Consumer Staples' },
  { symbol:'MMC',   name:'Marsh & McLennan Cos.',       sector:'Financials' },
  { symbol:'FI',    name:'Fiserv Inc.',                 sector:'Technology' },
  { symbol:'WM',    name:'Waste Management Inc.',       sector:'Industrials' },
  { symbol:'CL',    name:'Colgate-Palmolive Co.',       sector:'Consumer Staples' },
  { symbol:'GD',    name:'General Dynamics Corp.',      sector:'Industrials' },
  { symbol:'TT',    name:'Trane Technologies plc',      sector:'Industrials' },
  { symbol:'CVS',   name:'CVS Health Corporation',      sector:'Healthcare' },
  { symbol:'HCA',   name:'HCA Healthcare Inc.',         sector:'Healthcare' },
  { symbol:'CTAS',  name:'Cintas Corporation',          sector:'Industrials' },
  { symbol:'APD',   name:'Air Products & Chemicals',    sector:'Materials' },
  { symbol:'SHW',   name:'Sherwin-Williams Co.',        sector:'Materials' },
  { symbol:'COIN',  name:'Coinbase Global Inc.',        sector:'Financials' },
  { symbol:'PANW',  name:'Palo Alto Networks Inc.',     sector:'Technology' },
  { symbol:'CRWD',  name:'CrowdStrike Holdings Inc.',   sector:'Technology' },
  { symbol:'ABNB',  name:'Airbnb Inc.',                 sector:'Consumer Disc.' },
  { symbol:'SNOW',  name:'Snowflake Inc.',              sector:'Technology' },
  { symbol:'PLTR',  name:'Palantir Technologies',       sector:'Technology' },
  { symbol:'SQ',    name:'Block Inc.',                  sector:'Technology' },
  { symbol:'SHOP',  name:'Shopify Inc.',                sector:'Technology' },
  { symbol:'NET',   name:'Cloudflare Inc.',             sector:'Technology' },
  { symbol:'ZM',    name:'Zoom Video Communications',   sector:'Technology' },
  { symbol:'DOCU',  name:'DocuSign Inc.',               sector:'Technology' },
  { symbol:'DDOG',  name:'Datadog Inc.',                sector:'Technology' },
  { symbol:'VEEV',  name:'Veeva Systems Inc.',          sector:'Technology' },
  { symbol:'WDAY',  name:'Workday Inc.',                sector:'Technology' },
  { symbol:'TTD',   name:'The Trade Desk Inc.',         sector:'Technology' },
  { symbol:'ANET',  name:'Arista Networks Inc.',        sector:'Technology' },
  { symbol:'MRVL',  name:'Marvell Technology Inc.',     sector:'Technology' },
  { symbol:'ON',    name:'ON Semiconductor Corp.',      sector:'Technology' },
  { symbol:'NXPI',  name:'NXP Semiconductors NV',       sector:'Technology' },
  { symbol:'WDC',   name:'Western Digital Corp.',       sector:'Technology' },
  { symbol:'KEYS',  name:'Keysight Technologies',       sector:'Technology' },
  { symbol:'FTNT',  name:'Fortinet Inc.',               sector:'Technology' },
  { symbol:'ROP',   name:'Roper Technologies Inc.',     sector:'Technology' },
  { symbol:'GPN',   name:'Global Payments Inc.',        sector:'Technology' },
  { symbol:'HPQ',   name:'HP Inc.',                     sector:'Technology' },
  { symbol:'DELL',  name:'Dell Technologies Inc.',      sector:'Technology' },
  { symbol:'HPE',   name:'Hewlett Packard Enterprise',  sector:'Technology' },
  { symbol:'STX',   name:'Seagate Technology Holdings', sector:'Technology' },
  { symbol:'NTAP',  name:'NetApp Inc.',                 sector:'Technology' },
  { symbol:'AKAM',  name:'Akamai Technologies Inc.',    sector:'Technology' },
  { symbol:'WBA',   name:'Walgreens Boots Alliance',    sector:'Healthcare' },
  { symbol:'CI',    name:'The Cigna Group',             sector:'Healthcare' },
  { symbol:'MOH',   name:'Molina Healthcare Inc.',      sector:'Healthcare' },
  { symbol:'HUM',   name:'Humana Inc.',                 sector:'Healthcare' },
  { symbol:'ELV',   name:'Elevance Health Inc.',        sector:'Healthcare' },
  { symbol:'IQV',   name:'IQVIA Holdings Inc.',         sector:'Healthcare' },
  { symbol:'CAH',   name:'Cardinal Health Inc.',        sector:'Healthcare' },
  { symbol:'MCK',   name:'McKesson Corporation',        sector:'Healthcare' },
  { symbol:'GEHC',  name:'GE HealthCare Technologies',  sector:'Healthcare' },
  { symbol:'IDXX',  name:'IDEXX Laboratories Inc.',     sector:'Healthcare' },
  { symbol:'A',     name:'Agilent Technologies Inc.',   sector:'Healthcare' },
  { symbol:'PKG',   name:'Packaging Corp of America',   sector:'Materials' },
  { symbol:'AVB',   name:'AvalonBay Communities Inc.',  sector:'Real Estate' },
  { symbol:'ARE',   name:'Alexandria Real Estate',      sector:'Real Estate' },
  { symbol:'WY',    name:'Weyerhaeuser Company',        sector:'Real Estate' },
  { symbol:'SPG',   name:'Simon Property Group Inc.',   sector:'Real Estate' },
  { symbol:'O',     name:'Realty Income Corporation',   sector:'Real Estate' },
  { symbol:'WELL',  name:'Welltower Inc.',              sector:'Real Estate' },
  { symbol:'DLR',   name:'Digital Realty Trust Inc.',   sector:'Real Estate' },
  { symbol:'KIM',   name:'Kimco Realty Corporation',    sector:'Real Estate' },
  { symbol:'DAL',   name:'Delta Air Lines Inc.',        sector:'Industrials' },
  { symbol:'UAL',   name:'United Airlines Holdings',    sector:'Industrials' },
  { symbol:'AAL',   name:'American Airlines Group',     sector:'Industrials' },
  { symbol:'LUV',   name:'Southwest Airlines Co.',      sector:'Industrials' },
  { symbol:'CCL',   name:'Carnival Corporation & plc',  sector:'Consumer Disc.' },
  { symbol:'RCL',   name:'Royal Caribbean Group',       sector:'Consumer Disc.' },
  { symbol:'MAR',   name:'Marriott International',      sector:'Consumer Disc.' },
  { symbol:'HLT',   name:'Hilton Worldwide Holdings',   sector:'Consumer Disc.' },
  { symbol:'NKE',   name:'NIKE Inc.',                   sector:'Consumer Disc.' },
  { symbol:'SBUX',  name:'Starbucks Corporation',       sector:'Consumer Disc.' },
  { symbol:'YUM',   name:'Yum! Brands Inc.',            sector:'Consumer Disc.' },
  { symbol:'DPZ',   name:"Domino's Pizza Inc.",         sector:'Consumer Disc.' },
  { symbol:'CMG',   name:'Chipotle Mexican Grill',      sector:'Consumer Disc.' },
  { symbol:'ORLY',  name:"O'Reilly Automotive Inc.",    sector:'Consumer Disc.' },
  { symbol:'AZO',   name:'AutoZone Inc.',               sector:'Consumer Disc.' },
  { symbol:'ROST',  name:'Ross Stores Inc.',            sector:'Consumer Disc.' },
  { symbol:'EBAY',  name:'eBay Inc.',                   sector:'Consumer Disc.' },
  { symbol:'F',     name:'Ford Motor Company',          sector:'Consumer Disc.' },
  { symbol:'GM',    name:'General Motors Company',      sector:'Consumer Disc.' },
  { symbol:'RIVN',  name:'Rivian Automotive Inc.',      sector:'Consumer Disc.' },
  { symbol:'LCID',  name:'Lucid Group Inc.',            sector:'Consumer Disc.' },
  { symbol:'KR',    name:'Kroger Co.',                  sector:'Consumer Staples' },
  { symbol:'SYY',   name:'Sysco Corporation',           sector:'Consumer Staples' },
  { symbol:'STZ',   name:'Constellation Brands Inc.',   sector:'Consumer Staples' },
  { symbol:'MKC',   name:'McCormick & Company',         sector:'Consumer Staples' },
  { symbol:'GIS',   name:'General Mills Inc.',          sector:'Consumer Staples' },
  { symbol:'HSY',   name:'The Hershey Company',         sector:'Consumer Staples' },
  { symbol:'K',     name:'Kellanova',                   sector:'Consumer Staples' },
  { symbol:'XEL',   name:'Xcel Energy Inc.',            sector:'Utilities' },
  { symbol:'AEP',   name:'American Electric Power',     sector:'Utilities' },
  { symbol:'D',     name:'Dominion Energy Inc.',        sector:'Utilities' },
  { symbol:'EXC',   name:'Exelon Corporation',          sector:'Utilities' },
  { symbol:'SRE',   name:'Sempra',                      sector:'Utilities' },
  { symbol:'AWK',   name:'American Water Works',        sector:'Utilities' },
  { symbol:'COP',   name:'ConocoPhillips',              sector:'Energy' },
  { symbol:'EOG',   name:'EOG Resources Inc.',          sector:'Energy' },
  { symbol:'SLB',   name:'Schlumberger NV',             sector:'Energy' },
  { symbol:'MPC',   name:'Marathon Petroleum Corp.',    sector:'Energy' },
  { symbol:'PSX',   name:'Phillips 66',                 sector:'Energy' },
  { symbol:'VLO',   name:'Valero Energy Corp.',         sector:'Energy' },
  { symbol:'OXY',   name:'Occidental Petroleum Corp.',  sector:'Energy' },
  { symbol:'HAL',   name:'Halliburton Company',         sector:'Energy' },
  { symbol:'BKR',   name:'Baker Hughes Company',        sector:'Energy' },
  { symbol:'DVN',   name:'Devon Energy Corporation',    sector:'Energy' },
  { symbol:'FANG',  name:'Diamondback Energy Inc.',     sector:'Energy' },
  { symbol:'NEM',   name:'Newmont Corporation',         sector:'Materials' },
  { symbol:'LIN',   name:'Linde plc',                   sector:'Materials' },
  { symbol:'ECL',   name:'Ecolab Inc.',                 sector:'Materials' },
  { symbol:'DD',    name:'DuPont de Nemours Inc.',      sector:'Materials' },
  { symbol:'DOW',   name:'Dow Inc.',                    sector:'Materials' },
  { symbol:'LYB',   name:'LyondellBasell Industries',   sector:'Materials' },
  { symbol:'ALB',   name:'Albemarle Corporation',       sector:'Materials' },
  { symbol:'BAX',   name:'Baxter International Inc.',   sector:'Healthcare' },
  { symbol:'WAT',   name:'Waters Corporation',          sector:'Healthcare' },
  { symbol:'MTD',   name:'Mettler-Toledo International',sector:'Healthcare' },
  { symbol:'COO',   name:'The Cooper Companies Inc.',   sector:'Healthcare' },
  { symbol:'HOLX',  name:'Hologic Inc.',                sector:'Healthcare' },
  { symbol:'CTLT',  name:'Catalent Inc.',               sector:'Healthcare' },
  { symbol:'BIIB',  name:'Biogen Inc.',                 sector:'Healthcare' },
  { symbol:'MRNA',  name:'Moderna Inc.',                sector:'Healthcare' },
  { symbol:'ILMN',  name:'Illumina Inc.',               sector:'Healthcare' },
  { symbol:'EXAS',  name:'Exact Sciences Corp.',        sector:'Healthcare' },
  { symbol:'PODD',  name:'Insulet Corporation',         sector:'Healthcare' },
  { symbol:'RMD',   name:'ResMed Inc.',                 sector:'Healthcare' },
  { symbol:'EW',    name:'Edwards Lifesciences Corp.',  sector:'Healthcare' },
  { symbol:'XTSLA', name:'Placeholder',                 sector:'Technology' },
].filter(s => s.name !== 'Placeholder');

const ALL_SECTORS = ['All', ...['Technology','Financials','Healthcare','Consumer Disc.','Consumer Staples','Industrials','Communication','Energy','Materials','Real Estate','Utilities']];

const RATING_COLORS = {
  bullish:  { bg: 'rgba(34,197,94,0.12)',  text: '#16a34a', border: '#16a34a' },
  bearish:  { bg: 'rgba(239,68,68,0.12)',  text: '#dc2626', border: '#dc2626' },
  neutral:  { bg: 'rgba(148,163,184,0.1)', text: '#64748b', border: '#64748b' },
  watching: { bg: 'rgba(59,130,246,0.1)',  text: '#2563eb', border: '#2563eb' },
};

/* ── Lazy-loaded quote cell ─────────────────────────────────── */
function QuoteCell({ symbol }) {
  const [q, setQ] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        obs.disconnect();
        api.get(`/stocks/quote/${symbol}`).then(r => setQ(r.data)).catch(() => {});
      }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [symbol]);

  if (!q) return <span ref={ref} style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  const pct = q.dp ?? 0;
  const color = pct >= 0 ? '#16a34a' : '#dc2626';
  return (
    <span ref={ref} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
      <span style={{ fontWeight: 700, fontSize: 14 }}>${Number(q.c || 0).toFixed(2)}</span>
      <span style={{ fontSize: 11, color, fontWeight: 600 }}>{pct >= 0 ? '+' : ''}{pct?.toFixed(2)}%</span>
    </span>
  );
}

const PAGE_SIZE = 50;

export default function StockScreenerPage() {
  const [mainTab, setMainTab]     = useState('screener');  // 'screener' | 'watchlist'
  const [watchlist, setWatchlist] = useState([]);
  const [selected, setSelected]   = useState(null);
  const [search, setSearch]       = useState('');
  const [sector, setSector]       = useState('All');
  const [page, setPage]           = useState(0);
  const [apiError, setApiError]   = useState(null);

  // Load watchlist
  useEffect(() => {
    api.get('/stocks/watchlist')
      .then(r => setWatchlist(r.data))
      .catch(e => setApiError(e.response?.data?.error || e.message));
  }, []);

  const addedSymbols = new Set(watchlist.map(w => w.symbol));

  // Filter + paginate S&P 500
  const filtered = SP500.filter(s => {
    const matchSector = sector === 'All' || s.sector === sector;
    const q = search.toLowerCase();
    const matchSearch = !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q);
    return matchSector && matchSearch;
  });
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [search, sector]);

  async function addToWatchlist(symbol, name) {
    try {
      const r = await api.post('/stocks/watchlist', { symbol, company_name: name });
      setWatchlist(wl => wl.find(s => s.id === r.data.id) ? wl : [r.data, ...wl]);
      setApiError(null);
    } catch(e) { setApiError(e.response?.data?.error || e.message); }
  }

  async function removeFromWatchlist(id) {
    await api.delete(`/stocks/watchlist/${id}`);
    setWatchlist(wl => wl.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  const openStock = useCallback((symbol, name) => {
    const wlEntry = watchlist.find(w => w.symbol === symbol);
    if (wlEntry) { setSelected(wlEntry); }
    else { setSelected({ id: null, symbol, company_name: name, notes: '', rating: 'watching', _notSaved: true }); }
  }, [watchlist]);

  const fmtR = r => RATING_COLORS[r] || RATING_COLORS.watching;

  return (
    <div>
      {/* API key error */}
      {apiError && (
        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, fontSize: 13, color: '#dc2626' }}>
          ⚠️ {apiError}
          {apiError.includes('FINNHUB_API_KEY') && <span> — Get your key at <a href="https://finnhub.io" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>finnhub.io</a></span>}
        </div>
      )}

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => setMainTab('screener')}
          style={{ padding: '7px 18px', fontSize: 13, fontWeight: 500, background: 'none', cursor: 'pointer',
            color: mainTab === 'screener' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: mainTab === 'screener' ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0 }}>
          🔍 S&P 500 Screener
        </button>
        <button onClick={() => setMainTab('watchlist')}
          style={{ padding: '7px 18px', fontSize: 13, fontWeight: 500, background: 'none', cursor: 'pointer',
            color: mainTab === 'watchlist' ? 'var(--accent)' : 'var(--text-muted)',
            borderBottom: mainTab === 'watchlist' ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0 }}>
          ⭐ My Watchlist ({watchlist.length})
        </button>
      </div>

      {/* ── S&P 500 SCREENER ── */}
      {mainTab === 'screener' && (
        <div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="form-input" style={{ maxWidth: 240, fontSize: 13 }}
              placeholder="🔍  Filter by name or ticker…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-input" style={{ maxWidth: 180, fontSize: 13 }}
              value={sector} onChange={e => setSector(e.target.value)}>
              {ALL_SECTORS.map(s => <option key={s}>{s}</option>)}
            </select>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {filtered.length} stocks · page {page + 1}/{Math.max(totalPages, 1)}
            </span>
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-wrap">
              <table style={{ tableLayout: 'fixed' }}>
                <thead>
                  <tr>
                    <th style={{ width: 80 }}>Ticker</th>
                    <th>Company</th>
                    <th style={{ width: 130 }}>Sector</th>
                    <th style={{ width: 110, textAlign: 'right' }}>Live Price</th>
                    <th style={{ width: 110 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(s => (
                    <tr key={s.symbol} style={{ cursor: 'pointer' }} onClick={() => openStock(s.symbol, s.name)}>
                      <td style={{ fontWeight: 800, fontSize: 14, color: 'var(--accent)' }}>{s.symbol}</td>
                      <td style={{ fontSize: 13 }}>{s.name}</td>
                      <td>
                        <span style={{ fontSize: 11, padding: '2px 8px', background: 'var(--bg-1)', borderRadius: 4, color: 'var(--text-muted)' }}>
                          {s.sector}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}><QuoteCell symbol={s.symbol} /></td>
                      <td onClick={e => e.stopPropagation()}>
                        {addedSymbols.has(s.symbol) ? (
                          <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>✓ Watchlisted</span>
                        ) : (
                          <button className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: '3px 10px' }}
                            onClick={() => addToWatchlist(s.symbol, s.name)}>
                            + Watchlist
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 14 }}>
              <button className="btn btn-secondary btn-sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Prev</button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button key={i} className={`btn btn-sm ${i === page ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setPage(i)} style={{ minWidth: 34 }}>{i + 1}</button>
              ))}
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}

      {/* ── WATCHLIST ── */}
      {mainTab === 'watchlist' && (
        <div>
          {watchlist.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⭐</div>
              <div className="empty-title">Your watchlist is empty</div>
              <div className="empty-desc">Go to S&P 500 Screener and click "+ Watchlist" on any stock</div>
              <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => setMainTab('screener')}>Browse S&P 500</button>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Symbol</th>
                      <th>Company</th>
                      <th style={{ textAlign: 'right' }}>Live Price</th>
                      <th>Rating</th>
                      <th>Notes</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {watchlist.map(s => (
                      <tr key={s.id} onClick={() => setSelected(s)} style={{ cursor: 'pointer' }}>
                        <td style={{ fontWeight: 800, fontSize: 15, color: 'var(--accent)' }}>{s.symbol}</td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.company_name}</td>
                        <td style={{ textAlign: 'right' }}><QuoteCell symbol={s.symbol} /></td>
                        <td>
                          <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 99, fontWeight: 700, textTransform: 'capitalize',
                            background: fmtR(s.rating).bg, color: fmtR(s.rating).text, border: `1px solid ${fmtR(s.rating).border}` }}>
                            {s.rating}
                          </span>
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {s.notes || '—'}
                        </td>
                        <td onClick={e => e.stopPropagation()}>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)', fontSize: 11 }}
                            onClick={() => removeFromWatchlist(s.id)}>Remove</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <>
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 800 }} onClick={() => setSelected(null)} />
          <StockDetailDrawer
            stock={selected}
            onClose={() => setSelected(null)}
            onUpdated={updated => {
              setWatchlist(wl => wl.map(s => s.id === updated.id ? updated : s));
              setSelected(updated);
            }}
            onRemove={id => { removeFromWatchlist(id); setSelected(null); }}
          />
        </>
      )}
    </div>
  );
}
