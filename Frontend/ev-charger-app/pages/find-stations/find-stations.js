/* =============================================================
   FIND STATIONS — page script
   Shared helpers pulled from window.EVShared.
   MapPlaceholder, StationCard, SkeletonCard, EmptyState and App
   are local to this page.
   ============================================================= */

const { useState, useMemo } = React;
const { BrandMark, Ico, BottomNav } = window.EVShared;

/* =============================================================
   MOCK DATA — replace with API call when backend is ready.
   Shape matches what Station Detail, Booking, Manager Dashboard
   and Charger Management will also consume.

   // TODO (backend integration):
   //   const res = await fetch('/api/stations?near=lat,lng');
   //   const stations = await res.json();
   ============================================================= */
const MOCK_STATIONS = [
  {
    id: 'EVC-2041',
    name: 'Green Park Charger',
    address: '88 Sukhumvit Soi 24, Khlong Tan, Bangkok',
    status: 'active',
    distanceKm: 0.8,
    drivingMins: 3,
    connectors: [{ type: 'CCS2', kw: 150 }, { type: 'Type 2', kw: 22 }],
    ports: { available: 4, total: 6 },
    pricePerKwh: 7.5,
    rating: 4.8,
    operator: 'EV Charger Network',
    mapX: 42, mapY: 38,
  },
  {
    id: 'EVC-2042',
    name: 'Emporium Rooftop',
    address: '622 Sukhumvit Rd, Khlong Ton Nuea, Bangkok',
    status: 'active',
    distanceKm: 1.4,
    drivingMins: 6,
    connectors: [{ type: 'CCS2', kw: 120 }, { type: 'CHAdeMO', kw: 50 }],
    ports: { available: 2, total: 4 },
    pricePerKwh: 8.2,
    rating: 4.6,
    operator: 'EV Charger Network',
    mapX: 58, mapY: 30,
  },
  {
    id: 'EVC-2043',
    name: 'Lumpini Riverside',
    address: '12 Rama IV Rd, Pathum Wan, Bangkok',
    status: 'active',
    distanceKm: 2.3,
    drivingMins: 8,
    connectors: [{ type: 'Type 2', kw: 22 }],
    ports: { available: 3, total: 3 },
    pricePerKwh: 6.9,
    rating: 4.9,
    operator: 'EV Charger Network',
    mapX: 28, mapY: 58,
  },
  {
    id: 'EVC-2044',
    name: 'Terminal 21 Hub',
    address: '2/88 Sukhumvit Soi 19, Asoke, Bangkok',
    status: 'inactive',
    distanceKm: 3.1,
    drivingMins: 12,
    connectors: [{ type: 'CCS2', kw: 150 }],
    ports: { available: 0, total: 8 },
    pricePerKwh: 7.8,
    rating: 4.3,
    operator: 'EV Charger Network',
    mapX: 72, mapY: 46,
  },
  {
    id: 'EVC-2045',
    name: 'Silom Central',
    address: '191 Silom Rd, Bang Rak, Bangkok',
    status: 'active',
    distanceKm: 4.6,
    drivingMins: 15,
    connectors: [{ type: 'CCS2', kw: 180 }, { type: 'Type 2', kw: 22 }],
    ports: { available: 5, total: 10 },
    pricePerKwh: 8.5,
    rating: 4.7,
    operator: 'EV Charger Network',
    mapX: 18, mapY: 72,
  },
  {
    id: 'EVC-2046',
    name: 'Chatuchak North',
    address: '4 Kamphaeng Phet 2 Rd, Chatuchak, Bangkok',
    status: 'active',
    distanceKm: 6.2,
    drivingMins: 22,
    connectors: [{ type: 'CCS2', kw: 120 }, { type: 'CHAdeMO', kw: 50 }],
    ports: { available: 1, total: 4 },
    pricePerKwh: 6.5,
    rating: 4.5,
    operator: 'EV Charger Network',
    mapX: 48, mapY: 14,
  },
];

/* Current user's mock location (normalized 0..100 on the map) */
const USER_LOC = { mapX: 50, mapY: 50, label: 'Sukhumvit 21, Bangkok' };

/* ============ Map placeholder ============ */
function MapPlaceholder({ stations, activeId, onPinClick, showMe, locating, hasLocation, onLocate }) {
  return (
    <div className="map-card" role="img" aria-label="Map of nearby charging stations">
      <div className="map-canvas">
        <svg viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="mapBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%"   stopColor="#E8F1E2" />
              <stop offset="100%" stopColor="#D6E6D4" />
            </linearGradient>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M10 0H0V10" fill="none" stroke="rgba(14,26,18,0.05)" strokeWidth="0.5"/>
            </pattern>
            <radialGradient id="wash" cx="50%" cy="50%" r="60%">
              <stop offset="0%"   stopColor="rgba(47,174,98,0.18)"/>
              <stop offset="100%" stopColor="rgba(47,174,98,0)"/>
            </radialGradient>
          </defs>
          <rect width="200" height="150" fill="url(#mapBg)"/>
          <rect width="200" height="150" fill="url(#grid)"/>
          <rect width="200" height="150" fill="url(#wash)"/>

          {/* stylized roads */}
          <path d="M-5 80 Q60 70 120 90 T210 72"  fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="5" strokeLinecap="round"/>
          <path d="M-5 80 Q60 70 120 90 T210 72"  fill="none" stroke="rgba(14,26,18,0.08)" strokeWidth="0.5"/>
          <path d="M30 -5 Q40 60 55 85 T68 160"   fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round"/>
          <path d="M140 -5 Q134 50 150 80 T155 160" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="4" strokeLinecap="round"/>
          <path d="M-5 30 Q70 40 130 20 T210 34"  fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round"/>
          <path d="M-5 120 Q60 130 120 116 T210 128" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round"/>

          {/* parks / blocks */}
          <rect x="80"  y="40"  width="24" height="14" rx="2" fill="rgba(47,174,98,0.25)"/>
          <rect x="108" y="48"  width="18" height="10" rx="2" fill="rgba(14,26,18,0.06)"/>
          <rect x="160" y="100" width="26" height="18" rx="2" fill="rgba(47,174,98,0.2)"/>
          <rect x="10"  y="100" width="20" height="14" rx="2" fill="rgba(14,26,18,0.05)"/>
        </svg>
      </div>

      {showMe && (
        <div
          className="me-dot"
          style={{ left: `${USER_LOC.mapX}%`, top: `${USER_LOC.mapY}%` }}
          aria-label="Your location"
        />
      )}

      {stations.map(s => (
        <button
          key={s.id}
          className={`pin ${s.status === 'inactive' ? 'off' : ''} ${activeId === s.id ? 'active' : ''}`}
          style={{ left: `${s.mapX}%`, top: `${s.mapY}%` }}
          onClick={() => onPinClick(s.id)}
          aria-label={`${s.name}, ${s.status}`}
        >
          <span className="pin-body" aria-hidden="true">
            <Ico.BoltFill width="14" height="14"/>
          </span>
          {s.status === 'active' && <span className="pin-pulse" aria-hidden="true"/>}
        </button>
      ))}

      <div className="map-ctrls">
        <button className="map-btn" aria-label="Zoom in">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <button className="map-btn" aria-label="Zoom out">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
        </button>
        <button className="map-btn" aria-label="Recenter">
          <Ico.Crosshair width="16" height="16"/>
        </button>
      </div>

      <div className="map-legend" aria-hidden="true">
        <span className="leg"><span className="leg-dot ok"/> Active</span>
        <span className="leg"><span className="leg-dot off"/> Offline</span>
      </div>

      <button
        className={`map-locate ${hasLocation ? 'active' : ''}`}
        onClick={onLocate}
        aria-pressed={hasLocation}
        disabled={locating}
        aria-label={hasLocation ? 'Using your location' : 'Use my location'}
      >
        <span className="ico-wrap" aria-hidden="true">
          {locating ? <span className="loc-spinner"/> : <Ico.Crosshair width="13" height="13"/>}
        </span>
        <span>{locating ? 'Locating…' : hasLocation ? 'Using your location' : 'Use my location'}</span>
      </button>
    </div>
  );
}

/* ============ Station card ============ */
function StationCard({ s, focused, onFocus }) {
  const isActive = s.status === 'active';
  return (
    <article
      className={`station ${!isActive ? 'inactive' : ''} ${focused ? 'focused' : ''}`}
      id={`station-${s.id}`}
      onMouseEnter={() => onFocus && onFocus(s.id)}
    >
      <div className="st-top">
        <div className="st-icon" aria-hidden="true">
          <Ico.Bolt width="22" height="22"/>
        </div>
        <div className="st-head">
          <div className="st-name">
            <span>{s.name}</span>
            <span className="st-id">{s.id}</span>
          </div>
          <div className="st-addr">{s.address}</div>
        </div>
        <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="st-meta">
        <div className="meta-cell">
          <span className="lbl">Distance</span>
          <span className="val">{s.distanceKm.toFixed(1)}<small>km</small></span>
        </div>
        <div className="meta-cell">
          <span className="lbl">Drive time</span>
          <span className="val">{s.drivingMins}<small>mins</small></span>
        </div>
      </div>

      <div className="st-foot">
        <span className="ports-badge" aria-label={`${s.ports.available} of ${s.ports.total} ports available`}>
          <span className="dot" aria-hidden="true"/>
          <span>{s.ports.available}/{s.ports.total} ports · {s.connectors[0].kw}kW</span>
        </span>
        <a
          href={`../station-booking/index.html?id=${s.id}`}
          className="view-btn"
        >
          View Details
          <Ico.ArrowRight className="arrow" width="14" height="14"/>
        </a>
      </div>
    </article>
  );
}

/* ============ Skeleton card ============ */
function SkeletonCard() {
  return (
    <div className="sk-card" aria-hidden="true">
      <div className="sk-row">
        <div className="sk" style={{ width: 44, height: 44, borderRadius: 12 }}/>
        <div style={{ flex: 1, display: 'grid', gap: 8 }}>
          <div className="sk" style={{ width: '60%', height: 14 }}/>
          <div className="sk" style={{ width: '85%', height: 10 }}/>
        </div>
        <div className="sk" style={{ width: 64, height: 22, borderRadius: 999 }}/>
      </div>
      <div className="sk" style={{ height: 54, borderRadius: 12 }}/>
      <div className="sk-row" style={{ justifyContent: 'space-between' }}>
        <div className="sk" style={{ width: 120, height: 12 }}/>
        <div className="sk" style={{ width: 110, height: 34, borderRadius: 10 }}/>
      </div>
    </div>
  );
}

/* ============ Empty state ============ */
function EmptyState({ onRetry }) {
  return (
    <div className="empty" role="status">
      <div className="empty-ico" aria-hidden="true">
        <Ico.Search width="28" height="28"/>
      </div>
      <h3>No stations <em>nearby.</em></h3>
      <p>We couldn't find charging stations within your radius. Try expanding the search or checking back shortly.</p>
      <button className="btn btn-primary btn-sm" onClick={onRetry}>
        <Ico.Crosshair width="14" height="14"/>
        Expand radius
      </button>
    </div>
  );
}

/* ============ App ============ */
function App() {
  // demo state switcher: 'data' | 'loading' | 'empty'
  const [viewState, setViewState] = useState('data');
  const [sort, setSort] = useState('distance'); // 'distance' | 'time'
  const [locating, setLocating] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [activeStation, setActiveStation] = useState(null);

  const stations = useMemo(() => {
    const arr = [...MOCK_STATIONS];
    if (sort === 'distance') arr.sort((a, b) => a.distanceKm - b.distanceKm);
    else                     arr.sort((a, b) => a.drivingMins - b.drivingMins);
    return arr;
  }, [sort]);

  function useMyLocation() {
    if (hasLocation) { setHasLocation(false); return; }
    setLocating(true);
    setTimeout(() => {
      setLocating(false);
      setHasLocation(true);
    }, 1100);
  }

  const showStations = viewState === 'data';
  const showLoading  = viewState === 'loading';
  const showEmpty    = viewState === 'empty';

  return (
    <>
      <div className="app">
        {/* ===== Topbar ===== */}
        <header className="topbar">
          <a className="brand" href="#">
            <BrandMark />
            <span>EV Charger</span>
          </a>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" aria-label="Search" style={{ padding: '8px 10px' }}>
              <Ico.Search width="16" height="16"/>
            </button>
            <div className="avatar" role="button" aria-label="Account">JD</div>
          </div>
        </header>

        {/* ===== Hero heading ===== */}
        <section className="hero reveal">
          <span className="eyebrow">Nearby · Bangkok</span>
          <h1 className="title">Find a <em>charger</em>.</h1>
          <p className="sub">Live availability across the network, sorted by how close — and how quick — you can get there.</p>
        </section>

        {/* ===== Map ===== */}
        <section className="map-area" aria-label="Map">
          <MapPlaceholder
            stations={stations}
            activeId={activeStation}
            onPinClick={(id) => {
              setActiveStation(id);
              const el = document.getElementById(`station-${id}`);
              if (el) el.scrollIntoView({ block: 'nearest' });
            }}
            showMe={hasLocation}
            locating={locating}
            hasLocation={hasLocation}
            onLocate={useMyLocation}
          />
        </section>

        {/* ===== Locate + list ===== */}
        <section className="list-wrap">
          <div className="locate-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <button
              className={`btn loc-btn btn-block ${hasLocation ? 'active' : ''}`}
              onClick={useMyLocation}
              aria-pressed={hasLocation}
              disabled={locating}
            >
              <span className="ico" aria-hidden="true">
                {locating ? <span className="loc-spinner"/> : <Ico.Crosshair width="18" height="18"/>}
              </span>
              <span className="txt">
                <span className="t1">{hasLocation ? 'Using your location' : 'Use my location'}</span>
                <span className="t2">
                  {locating ? 'Locating…' : hasLocation ? USER_LOC.label : 'Sort stations by real distance'}
                </span>
              </span>
              <Ico.Chevron className="chev" width="16" height="16"/>
            </button>
          </div>

          <div className="list-head">
            <span className="cap">
              <span className="dash" aria-hidden="true"/>
              {showStations ? (
                <>Results <span className="count">{stations.length}</span></>
              ) : showLoading ? 'Loading' : 'No results'}
            </span>
            {showStations && (
              <button
                className="sort-btn"
                onClick={() => setSort(s => s === 'distance' ? 'time' : 'distance')}
                aria-label={`Change sort. Currently sorting by ${sort === 'distance' ? 'distance' : 'drive time'}.`}
              >
                <Ico.Sort width="12" height="12"/>
                <span className="sort-lbl">Sort</span>
                <span>{sort === 'distance' ? 'Distance' : 'Drive time'}</span>
              </button>
            )}
          </div>

          <div className="reveal" style={{ display: 'grid', gap: 12 }}>
            {showLoading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i}/>)}
            {showEmpty && <EmptyState onRetry={() => setViewState('data')}/>}
            {showStations && stations.map(s => (
              <StationCard
                key={s.id}
                s={s}
                focused={activeStation === s.id}
                onFocus={setActiveStation}
              />
            ))}
          </div>
        </section>

        {/* ===== Bottom nav (shared component) ===== */}
        <BottomNav active="home" />
      </div>

      {/* ===== Demo state switcher ===== */}
      <div className="state-switch" role="group" aria-label="Preview state">
        <button className={viewState === 'data'    ? 'on' : ''} onClick={() => setViewState('data')}>Data</button>
        <button className={viewState === 'loading' ? 'on' : ''} onClick={() => setViewState('loading')}>Loading</button>
        <button className={viewState === 'empty'   ? 'on' : ''} onClick={() => setViewState('empty')}>Empty</button>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
