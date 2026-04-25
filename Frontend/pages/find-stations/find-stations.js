/* =============================================================
   FIND STATIONS — page script
   Uses real backend (/stations, /stations/nearby) + Google Maps JS.
   Falls back to local mock data if the backend is unreachable.
   ============================================================= */

const { useState, useMemo, useEffect, useRef } = React;
const { BrandMark, Ico, BottomNav } = window.EVShared;
const { api, loadGoogleMaps } = window.EVApi;

/* =============================================================
   FALLBACK MOCK — only used if backend is offline so the page
   still renders during development.
   ============================================================= */
const MOCK_STATIONS = [
  { id: 1, station_id: 1, name: 'Green Park Charger',  address: '88 Sukhumvit Soi 24, Bangkok',         status: 'Active',
    latitude: 13.7239, longitude: 100.5689, distance_km: 0.8, duration_text: '3 mins' },
  { id: 2, station_id: 2, name: 'Emporium Rooftop',    address: '622 Sukhumvit Rd, Bangkok',            status: 'Active',
    latitude: 13.7302, longitude: 100.5697, distance_km: 1.4, duration_text: '6 mins' },
  { id: 3, station_id: 3, name: 'Lumpini Riverside',   address: '12 Rama IV Rd, Pathum Wan, Bangkok',    status: 'Active',
    latitude: 13.7307, longitude: 100.5418, distance_km: 2.3, duration_text: '8 mins' },
  { id: 4, station_id: 4, name: 'Terminal 21 Hub',     address: '2/88 Sukhumvit Soi 19, Asoke, Bangkok', status: 'Inactive',
    latitude: 13.7373, longitude: 100.5602, distance_km: 3.1, duration_text: '12 mins' },
];

const DEFAULT_CENTER = (window.EV_CONFIG && window.EV_CONFIG.DEFAULT_MAP_CENTER) || { lat: 13.7563, lng: 100.5018 };
const DEFAULT_ZOOM = (window.EV_CONFIG && window.EV_CONFIG.DEFAULT_MAP_ZOOM) || 13;

/* Normalise mixed mock/api shape into one consistent object */
function normaliseStation(s) {
  return {
    id:          s.station_id ?? s.id,
    station_id:  s.station_id ?? s.id,
    name:        s.name,
    address:     s.address,
    status:      (s.status || '').toLowerCase(),
    latitude:    s.latitude  != null ? Number(s.latitude)  : null,
    longitude:   s.longitude != null ? Number(s.longitude) : null,
    distance_km: s.distance_km != null ? Number(s.distance_km) : null,
    duration_text: s.duration_text || null,
  };
}

/* ============ Google Map ============ */
function GoogleMap({ stations, userLoc, activeId, onPinClick, onMapReady }) {
  const containerRef = useRef(null);
  const mapRef       = useRef(null);
  const markersRef   = useRef({});
  const meMarkerRef  = useRef(null);
  const [mapReady, setMapReady] = useState(false);

  // Init map
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: DEFAULT_CENTER,
          zoom: DEFAULT_ZOOM,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: 'greedy',
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
          ],
        });
        setMapReady(true);
        if (onMapReady) onMapReady(mapRef.current);
      })
      .catch((err) => console.error('Map load failed:', err));
    return () => { cancelled = true; };
  }, []);

  // User location marker
  useEffect(() => {
    const google = window.google;
    if (!mapReady || !mapRef.current || !google) return;
    if (meMarkerRef.current) { meMarkerRef.current.setMap(null); meMarkerRef.current = null; }
    if (userLoc) {
      meMarkerRef.current = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: userLoc.lat, lng: userLoc.lng },
        title: 'Your location',
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#3B82F6',
          fillOpacity: 1,
          strokeColor: '#fff',
          strokeWeight: 3,
        },
        zIndex: 999,
      });
      mapRef.current.panTo({ lat: userLoc.lat, lng: userLoc.lng });
    }
  }, [userLoc, mapReady]);

  // Station pins
  useEffect(() => {
    const google = window.google;
    if (!mapRef.current || !google) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(m => m.setMap(null));
    markersRef.current = {};

    const bounds = new google.maps.LatLngBounds();
    let hasAny = false;

    stations.forEach(s => {
      if (s.latitude == null || s.longitude == null) return;
      const isActive = s.status === 'active';
      const marker = new google.maps.Marker({
        map: mapRef.current,
        position: { lat: s.latitude, lng: s.longitude },
        title: s.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: activeId === s.id ? 12 : 9,
          fillColor: isActive ? '#1E7F47' : '#B4442A',
          fillOpacity: 0.95,
          strokeColor: '#fff',
          strokeWeight: 2,
        },
      });
      marker.addListener('click', () => onPinClick && onPinClick(s.id));
      markersRef.current[s.id] = marker;
      bounds.extend(marker.getPosition());
      hasAny = true;
    });

    if (userLoc) bounds.extend({ lat: userLoc.lat, lng: userLoc.lng });
    if (hasAny && !userLoc) {
      try { mapRef.current.fitBounds(bounds, 60); } catch (_) {}
    }
  }, [stations, activeId, mapReady]);

  // Pan to active pin
  useEffect(() => {
    if (!mapRef.current || !activeId) return;
    const m = markersRef.current[activeId];
    if (m) mapRef.current.panTo(m.getPosition());
  }, [activeId]);

  return (
    <div className="map-card">
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <div className="map-legend" aria-hidden="true">
        <span className="leg"><span className="leg-dot ok"/> Active</span>
        <span className="leg"><span className="leg-dot off"/> Offline</span>
      </div>
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
            <span className="st-id">EVC-{String(s.id).padStart(4, '0')}</span>
          </div>
          <div className="st-addr">{s.address || '—'}</div>
        </div>
        <span className={`badge ${isActive ? 'badge-active' : 'badge-inactive'}`}>
          {isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="st-meta">
        <div className="meta-cell">
          <span className="lbl">Distance</span>
          <span className="val">
            {s.distance_km != null ? <>{s.distance_km.toFixed(1)}<small>km</small></> : '—'}
          </span>
        </div>
        <div className="meta-cell">
          <span className="lbl">Drive time</span>
          <span className="val">{s.duration_text || '—'}</span>
        </div>
      </div>

      <div className="st-foot">
        <span className="ports-badge">
          <span className="dot" aria-hidden="true"/>
          <span>{isActive ? 'Open now' : 'Currently offline'}</span>
        </span>
        <a href={`../station-booking/index.html?id=${s.id}`} className="view-btn">
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
      <p>We couldn't find charging stations in our network. Pull down to retry, or check back shortly.</p>
      <button className="btn btn-primary btn-sm" onClick={onRetry}>
        <Ico.Crosshair width="14" height="14"/>
        Retry
      </button>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const [stations, setStations]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [usingMock, setUsingMock] = useState(false);
  const [sort, setSort]           = useState('distance');
  const [sortOpen, setSortOpen]   = useState(false);
  const [locating, setLocating]   = useState(false);
  const [userLoc, setUserLoc]     = useState(null);
  const [activeStation, setActiveStation] = useState(null);
  const sortWrapRef = useRef(null);

  useEffect(() => {
    if (!sortOpen) return;
    function onDocClick(e) {
      if (sortWrapRef.current && !sortWrapRef.current.contains(e.target)) setSortOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [sortOpen]);

  async function loadStations(loc) {
    setLoading(true);
    setError('');
    try {
      let data;
      if (loc) data = await api.getNearbyStations(loc.lat, loc.lng);
      else     data = await api.getAllStations();
      setStations((data || []).map(normaliseStation));
      setUsingMock(false);
    } catch (err) {
      console.error('Stations load failed, using mock:', err);
      setStations(MOCK_STATIONS.map(normaliseStation));
      setUsingMock(true);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      loadStations(null);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setLocating(false);
        loadStations(loc);
      },
      () => {
        setLocating(false);
        loadStations(null);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  function useMyLocation() {
    if (userLoc) { setUserLoc(null); loadStations(null); return; }
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(loc);
        setLocating(false);
        loadStations(loc);
      },
      (err) => {
        setLocating(false);
        setError(err.message || 'Could not get your location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }

  const sorted = useMemo(() => {
    const arr = [...stations];
    if (sort === 'distance') {
      arr.sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));
    } else {
      const parseMins = (t) => {
        if (!t) return Infinity;
        let total = 0;
        const h = t.match(/(\d+)\s*h/);
        const m = t.match(/(\d+)\s*min/);
        if (h) total += Number(h[1]) * 60;
        if (m) total += Number(m[1]);
        return total || Infinity;
      };
      arr.sort((a, b) => parseMins(a.duration_text) - parseMins(b.duration_text));
    }
    return arr;
  }, [stations, sort]);

  const showEmpty = !loading && sorted.length === 0;

  return (
    <>
      <div className="app">
        <header className="topbar">
          <a className="brand" href="#">
            <BrandMark />
            <span>EV Charger</span>
          </a>
          <div className="avatar" role="button" aria-label="Account">JD</div>
        </header>

        <section className="hero reveal">
          <span className="eyebrow">Nearby · Bangkok</span>
          <h1 className="title">Find a <em>charger</em>.</h1>
          <p className="sub">Live availability across the network, sorted by how close — and how quick — you can get there.</p>
          {usingMock && (
            <p className="sub" style={{ color: 'var(--danger)', marginTop: 6 }}>
              ⚠ Backend offline — showing demo stations.
            </p>
          )}
        </section>

        <section className="map-area" aria-label="Map">
          <GoogleMap
            stations={sorted}
            userLoc={userLoc}
            activeId={activeStation}
            onPinClick={(id) => {
              setActiveStation(id);
              const el = document.getElementById(`station-${id}`);
              if (el) el.scrollIntoView({ block: 'nearest' });
            }}
          />
        </section>

        <section className="list-wrap">
          <div className="locate-row" style={{ paddingLeft: 0, paddingRight: 0 }}>
            <button
              className={`btn loc-btn btn-block ${userLoc ? 'active' : ''}`}
              onClick={useMyLocation}
              aria-pressed={!!userLoc}
              disabled={locating}
            >
              <span className="ico" aria-hidden="true">
                {locating ? <span className="loc-spinner"/> : <Ico.Crosshair width="18" height="18"/>}
              </span>
              <span className="txt">
                <span className="t1">{userLoc ? 'Using your location' : 'Use my location'}</span>
                <span className="t2">
                  {locating ? 'Locating…' : userLoc ? `${userLoc.lat.toFixed(4)}, ${userLoc.lng.toFixed(4)}` : 'Sort stations by real distance'}
                </span>
              </span>
              <Ico.Chevron className="chev" width="16" height="16"/>
            </button>
          </div>

          <div className="list-head">
            <span className="cap">
              <span className="dash" aria-hidden="true"/>
              {loading ? 'Loading' : <>Results <span className="count">{sorted.length}</span></>}
            </span>
            {!loading && sorted.length > 0 && (
              <div className="sort-wrap" ref={sortWrapRef}>
                <button
                  className="sort-btn"
                  onClick={() => setSortOpen(o => !o)}
                  aria-haspopup="menu"
                  aria-expanded={sortOpen}
                >
                  <Ico.Sort width="12" height="12"/>
                  <span className="sort-lbl">Sort</span>
                  <span>{sort === 'distance' ? 'Distance' : 'Drive time'}</span>
                  <Ico.Chevron className={`chev ${sortOpen ? 'open' : ''}`} width="14" height="14"/>
                </button>
                {sortOpen && (
                  <div className="sort-menu" role="menu">
                    <button
                      role="menuitemradio"
                      aria-checked={sort === 'distance'}
                      className={`sort-item ${sort === 'distance' ? 'on' : ''}`}
                      onClick={() => { setSort('distance'); setSortOpen(false); }}
                    >
                      <span>Distance</span>
                      {sort === 'distance' && <Ico.Check width="14" height="14"/>}
                    </button>
                    <button
                      role="menuitemradio"
                      aria-checked={sort === 'time'}
                      className={`sort-item ${sort === 'time' ? 'on' : ''}`}
                      onClick={() => { setSort('time'); setSortOpen(false); }}
                    >
                      <span>Drive time</span>
                      {sort === 'time' && <Ico.Check width="14" height="14"/>}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="reveal" style={{ display: 'grid', gap: 12 }}>
            {loading && Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i}/>)}
            {showEmpty && <EmptyState onRetry={() => loadStations(userLoc)}/>}
            {!loading && sorted.map(s => (
              <StationCard
                key={s.id}
                s={s}
                focused={activeStation === s.id}
                onFocus={setActiveStation}
              />
            ))}
          </div>
        </section>

        <BottomNav active="home" />
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
