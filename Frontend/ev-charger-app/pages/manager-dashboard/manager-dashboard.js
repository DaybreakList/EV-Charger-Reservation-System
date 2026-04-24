/* =============================================================
   MANAGER DASHBOARD — page script
   Shared helpers (BrandMark, Ico, ManagerHeader, Toast) come from
   window.EVShared. Sparkline, Metric, StationCard, StationModal
   and App are local to this page.
   ============================================================= */

const { useState, useEffect, useMemo, useRef } = React;
const { Ico, ManagerHeader, Toast } = window.EVShared;

/* =============================================================
   MOCK DATA — replace with API calls when backend is ready.
   // TODO (backend integration):
   //   const summary  = await fetch('/api/manager/summary').then(r => r.json());
   //   const stations = await fetch('/api/manager/stations').then(r => r.json());
   ============================================================= */
const MANAGER = { name: 'Ajarn Jack', role: 'Network Manager', initials: 'AJ' };

const INITIAL_STATIONS = [
  {
    id: 'EVC-2041',
    name: 'Green Park Charger',
    address: '88 Sukhumvit Soi 24, Khlong Tan, Bangkok 10110',
    latitude: 13.7239, longitude: 100.5689,
    status: 'active',
    chargers: { total: 6, available: 4, busy: 2, offline: 0 },
    todayBookings: 18, todayRevenue: 4820, utilization: 72,
  },
  {
    id: 'EVC-2042',
    name: 'Emporium Rooftop',
    address: '622 Sukhumvit Rd, Khlong Ton Nuea, Bangkok 10110',
    latitude: 13.7302, longitude: 100.5697,
    status: 'active',
    chargers: { total: 4, available: 1, busy: 3, offline: 0 },
    todayBookings: 22, todayRevenue: 6310, utilization: 86,
  },
  {
    id: 'EVC-2043',
    name: 'Lumpini Riverside',
    address: '12 Rama IV Rd, Pathum Wan, Bangkok 10330',
    latitude: 13.7307, longitude: 100.5418,
    status: 'maintenance',
    chargers: { total: 3, available: 0, busy: 0, offline: 3 },
    todayBookings: 4, todayRevenue: 940, utilization: 14,
  },
  {
    id: 'EVC-2044',
    name: 'Terminal 21 Hub',
    address: '2/88 Sukhumvit Soi 19, Asoke, Bangkok 10110',
    latitude: 13.7373, longitude: 100.5602,
    status: 'inactive',
    chargers: { total: 8, available: 0, busy: 0, offline: 8 },
    todayBookings: 0, todayRevenue: 0, utilization: 0,
  },
];

/* ============ Sparkline ============ */
function Sparkline({ seed = 1, color = 'var(--accent)' }) {
  const pts = useMemo(() => {
    let s = (seed * 9301 + 49297) % 233280;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const vals = [];
    let y = 50;
    for (let i = 0; i < 24; i++) {
      y += (rnd() - 0.45) * 20;
      y = Math.max(10, Math.min(90, y));
      vals.push(y);
    }
    return vals;
  }, [seed]);
  const w = 100, h = 100;
  const step = w / (pts.length - 1);
  const d = pts.map((y, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = d + ` L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg className="spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`sp-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.28"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sp-${seed})`}/>
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}

/* ============ Metric card ============ */
function Metric({ lbl, value, unit, delta, deltaDir = 'up', icon, accent, spark, sparkSeed }) {
  return (
    <div className={`metric ${accent ? 'accent' : ''}`}>
      <div className="m-top">
        <span className="m-lbl">{lbl}</span>
        <span className="m-ico" aria-hidden="true">{icon}</span>
      </div>
      <div className="m-val">
        {accent ? <em>{value}</em> : value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {spark ? <Sparkline seed={sparkSeed} color={accent ? 'var(--accent)' : '#6B7668'}/> : (
        <div className="m-trend">
          <span className={`delta ${deltaDir === 'down' ? 'down' : ''}`}>
            {deltaDir === 'down' ? '▾' : '▴'} {delta}
          </span>
          <span>vs yesterday</span>
        </div>
      )}
    </div>
  );
}

/* ============ Station Card ============ */
function StationCard({ s, onToggleStatus, onEdit, onManageChargers }) {
  const { chargers } = s;
  const total = chargers.total || 1;
  const okPct   = (chargers.available / total) * 100;
  const busyPct = (chargers.busy      / total) * 100;
  const offPct  = (chargers.offline   / total) * 100;

  const statusLabel =
    s.status === 'active'      ? 'Active' :
    s.status === 'maintenance' ? 'Maintenance' :
                                 'Inactive';

  return (
    <article
      className={`station ${s.status === 'inactive' ? 'off' : s.status === 'maintenance' ? 'maint' : ''}`}
      data-station-id={s.id}
      id={`station-${s.id}`}
    >
      <div className="st-top">
        <div className="st-title-wrap">
          <span className="st-id">{s.id}</span>
          <span className="st-name">{s.name}</span>
        </div>
        <div className="toggle-wrap">
          <span className={`status-badge ${s.status === 'active' ? 'on' : s.status === 'maintenance' ? 'maint' : 'off'}`}>
            {statusLabel}
          </span>
          <button
            className={`toggle ${s.status === 'active' ? 'on' : s.status === 'maintenance' ? 'maint' : ''}`}
            data-action="toggle-status"
            data-station-id={s.id}
            aria-pressed={s.status === 'active'}
            aria-label={`Toggle ${s.name} status`}
            onClick={() => onToggleStatus(s.id)}
          />
        </div>
      </div>

      <div className="st-addr">
        <Ico.Pin width="14" height="14"/>
        <span>{s.address}</span>
      </div>

      <div>
        <div className="st-metrics">
          <div className="mini">
            <span className="lbl">Chargers</span>
            <span className="val">{chargers.total}<small>ports</small></span>
          </div>
          <div className="mini">
            <span className="lbl">Today · bookings</span>
            <span className="val">{s.todayBookings}</span>
          </div>
          <div className="mini">
            <span className="lbl">Today · revenue</span>
            <span className="val serif"><em>฿{s.todayRevenue.toLocaleString()}</em></span>
          </div>
        </div>
        <div className="cb-legend" style={{ marginTop: 10 }}>
          <div className="charger-bar" style={{ width: '100%', marginBottom: 6 }}>
            {okPct   > 0 && <span className="cb-ok"   style={{ width: `${okPct}%` }}/>}
            {busyPct > 0 && <span className="cb-busy" style={{ width: `${busyPct}%` }}/>}
            {offPct  > 0 && <span className="cb-off"  style={{ width: `${offPct}%` }}/>}
          </div>
          <span><span className="dot" style={{ background: 'var(--accent-2)' }}/>{chargers.available} avail</span>
          <span><span className="dot" style={{ background: 'var(--warning)'  }}/>{chargers.busy} in use</span>
          <span><span className="dot" style={{ background: 'var(--danger)'   }}/>{chargers.offline} offline</span>
        </div>
      </div>

      <div className="st-foot">
        <button
          className="btn btn-primary"
          data-action="manage-chargers"
          data-station-id={s.id}
          onClick={() => onManageChargers(s.id)}
        >
          Manage Chargers
          <Ico.ArrowRight className="arrow" width="14" height="14"/>
        </button>
        <button
          className="icon-action"
          data-action="edit-station"
          data-station-id={s.id}
          aria-label={`Edit ${s.name}`}
          title="Edit station"
          onClick={() => onEdit(s)}
        >
          <Ico.Edit width="16" height="16"/>
        </button>
      </div>
    </article>
  );
}

/* ============ Station Modal (create / edit) ============ */
function StationModal({ initial, onClose, onSave }) {
  const [leaving, setLeaving] = useState(false);
  const [form, setForm] = useState(initial || {
    id: '', name: '', address: '', latitude: '', longitude: '',
  });
  const isEdit = !!initial?.id;
  const nameRef = useRef(null);

  function close() {
    setLeaving(true);
    setTimeout(() => onClose(), 180);
  }

  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    setTimeout(() => nameRef.current && nameRef.current.focus(), 100);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  const valid =
    form.name.trim().length > 1 &&
    form.address.trim().length > 3 &&
    form.latitude  !== '' && !isNaN(parseFloat(form.latitude)) &&
    form.longitude !== '' && !isNaN(parseFloat(form.longitude));

  function pickOnMap() {
    // Placeholder: drop a random Bangkok-ish pin until the map integration lands.
    setForm(f => ({
      ...f,
      latitude:  (13.72  + (Math.random() - 0.5) * 0.1).toFixed(4),
      longitude: (100.56 + (Math.random() - 0.5) * 0.1).toFixed(4),
    }));
  }

  function save() {
    if (!valid) return;
    onSave({
      ...form,
      latitude:  parseFloat(form.latitude),
      longitude: parseFloat(form.longitude),
    });
  }

  return (
    <div
      className={`modal-backdrop ${leaving ? 'leaving' : ''}`}
      role="dialog" aria-modal="true" aria-labelledby="st-modal-title"
      id="station-modal"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) close(); }}
    >
      <div className="modal">
        <header className="modal-head">
          <div>
            <div className="mh-eyebrow">{isEdit ? `Edit · ${form.id}` : 'New station'}</div>
            <h2 id="st-modal-title">
              {isEdit ? <>Edit <em>station.</em></> : <>Add a <em>station.</em></>}
            </h2>
          </div>
          <button className="modal-close" aria-label="Close" onClick={close}>
            <Ico.Close width="16" height="16"/>
          </button>
        </header>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="st-name">Station name</label>
            <div className="input-wrap">
              <input
                id="st-name"
                ref={nameRef}
                placeholder="e.g. Green Park Charger"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="st-addr">
              Address <span className="hint">Full street address</span>
            </label>
            <div className="input-wrap">
              <textarea
                id="st-addr"
                rows={2}
                placeholder="88 Sukhumvit Soi 24, Khlong Tan, Bangkok 10110"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
          </div>

          <div className="row-2">
            <div className="field">
              <label htmlFor="st-lat">Latitude</label>
              <div className="input-wrap">
                <span className="prefix">N</span>
                <input
                  id="st-lat"
                  inputMode="decimal"
                  placeholder="13.7239"
                  value={form.latitude}
                  onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="st-lng">Longitude</label>
              <div className="input-wrap">
                <span className="prefix">E</span>
                <input
                  id="st-lng"
                  inputMode="decimal"
                  placeholder="100.5689"
                  value={form.longitude}
                  onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                />
              </div>
            </div>
          </div>

          <button
            type="button"
            className="pick-on-map"
            data-action="pick-on-map"
            onClick={pickOnMap}
          >
            <span className="pm-ico" aria-hidden="true"><Ico.Crosshair width="16" height="16"/></span>
            <span className="pm-txt">
              <span className="pm-t1">Pick on map</span>
              <span className="pm-t2">Drop a pin and we'll fill the coordinates for you</span>
            </span>
            <Ico.ArrowRight width="16" height="16" style={{ color: 'var(--accent)' }}/>
          </button>
        </div>

        <footer className="modal-foot">
          <button className="btn btn-secondary btn-lg" onClick={close}>Cancel</button>
          <button
            className="btn btn-primary btn-lg"
            data-action="save-station"
            disabled={!valid}
            onClick={save}
          >
            {isEdit ? 'Save changes' : 'Save station'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const [stations, setStations] = useState(INITIAL_STATIONS);
  const [filter, setFilter]     = useState('all');
  const [query, setQuery]       = useState('');
  const [modal, setModal]       = useState(null);
  const [toast, setToast]       = useState(null);

  const metrics = useMemo(() => {
    const totalBookings = stations.reduce((a, s) => a + s.todayBookings, 0);
    const totalRevenue  = stations.reduce((a, s) => a + s.todayRevenue,  0);
    const activeCount   = stations.filter(s => s.status === 'active').length;
    return {
      total:    stations.length,
      active:   activeCount,
      bookings: totalBookings,
      revenue:  totalRevenue,
    };
  }, [stations]);

  const filtered = useMemo(() => {
    return stations.filter(s => {
      if (filter === 'active'      && s.status !== 'active')      return false;
      if (filter === 'inactive'    && s.status !== 'inactive')    return false;
      if (filter === 'maintenance' && s.status !== 'maintenance') return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(s.name.toLowerCase().includes(q) ||
              s.id.toLowerCase().includes(q) ||
              s.address.toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [stations, filter, query]);

  const counts = useMemo(() => ({
    all:         stations.length,
    active:      stations.filter(s => s.status === 'active').length,
    maintenance: stations.filter(s => s.status === 'maintenance').length,
    inactive:    stations.filter(s => s.status === 'inactive').length,
  }), [stations]);

  function toggleStatus(id) {
    setStations(list => list.map(s => {
      if (s.id !== id) return s;
      return { ...s, status: s.status === 'active' ? 'inactive' : 'active' };
    }));
  }

  function saveStation(data) {
    if (data.id) {
      setStations(list => list.map(s => s.id === data.id ? { ...s, ...data } : s));
      flash(`Saved · ${data.name}`);
    } else {
      const id = 'EVC-' + Math.floor(2047 + Math.random() * 50);
      setStations(list => [
        {
          ...data, id, status: 'active',
          chargers: { total: 0, available: 0, busy: 0, offline: 0 },
          todayBookings: 0, todayRevenue: 0, utilization: 0,
        },
        ...list,
      ]);
      flash(`Created · ${id} · ${data.name}`);
    }
    setModal(null);
  }

  function flash(msg) {
    setToast(msg);
    // Toast component handles its own auto-dismiss
  }

  function goToChargerManagement(stationId) {
    window.location.href = `../charger-management/index.html?station=${encodeURIComponent(stationId)}`;
  }

  return (
    <>
      <ManagerHeader
        tag="Manager"
        crumb="Dashboard · Overview"
        user={MANAGER}
        onLogout={() => flash('Logged out (mock)')}
      />

      <div className="page">
        <div className="page-head">
          <div className="titles">
            <span className="eyebrow">
              Today · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <h1 className="title">
              Good afternoon, <em>{MANAGER.name.split(' ')[0]}.</em>
            </h1>
            <p className="sub">
              Live operations across your network — revenue, bookings, and station health at a glance.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-lg" onClick={() => flash('Exporting CSV… (mock)')}>
              Export
            </button>
            <button
              className="btn btn-primary btn-lg"
              data-action="add-station"
              id="add-station-btn"
              onClick={() => setModal({ mode: 'new' })}
            >
              <Ico.Plus width="16" height="16"/>
              Add New Station
            </button>
          </div>
        </div>

        {/* ===== Summary Metrics ===== */}
        <div className="metrics reveal" aria-label="Summary metrics">
          <Metric
            lbl="Total stations"
            value={metrics.total}
            delta="+1"
            deltaDir="up"
            icon={<Ico.Station width="18" height="18"/>}
          />
          <Metric
            lbl="Active stations"
            value={`${metrics.active}/${metrics.total}`}
            delta={`${Math.round(metrics.active / metrics.total * 100)}%`}
            deltaDir="up"
            icon={<Ico.Activity width="18" height="18"/>}
            accent
          />
          <Metric
            lbl="Today's bookings"
            value={metrics.bookings}
            unit="sessions"
            icon={<Ico.Calendar width="18" height="18"/>}
            spark
            sparkSeed={7}
          />
          <Metric
            lbl="Today's revenue"
            value={`฿${metrics.revenue.toLocaleString()}`}
            icon={<Ico.Cash width="18" height="18"/>}
            accent
            spark
            sparkSeed={42}
          />
        </div>

        {/* ===== Stations ===== */}
        <div className="sec-head">
          <div className="left">
            <span className="sec-num">01 — Stations</span>
            <h2>Your <em>network.</em></h2>
          </div>
        </div>

        <div className="filter-row">
          {[
            ['all',         'All'],
            ['active',      'Active'],
            ['maintenance', 'Maintenance'],
            ['inactive',    'Inactive'],
          ].map(([k, l]) => (
            <button
              key={k}
              className={`filter-chip ${filter === k ? 'on' : ''}`}
              data-filter={k}
              onClick={() => setFilter(k)}
            >
              {l}
              <span className="cnt">{counts[k]}</span>
            </button>
          ))}
          <div className="search-wrap" role="search">
            <Ico.Search width="14" height="14"/>
            <input
              type="search"
              placeholder="Search stations, IDs, addresses…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search stations"
            />
          </div>
        </div>

        <div className="station-grid" id="stations-grid">
          {filtered.length === 0 && (
            <div className="empty">
              <h3>No stations <em>match.</em></h3>
              <p>Try a different filter or clear the search to see all stations in your network.</p>
            </div>
          )}
          {filtered.map(s => (
            <StationCard
              key={s.id}
              s={s}
              onToggleStatus={toggleStatus}
              onEdit={(st) => setModal({ mode: 'edit', station: st })}
              onManageChargers={goToChargerManagement}
            />
          ))}
          {filter === 'all' && !query && (
            <button
              className="add-card"
              data-action="add-station"
              onClick={() => setModal({ mode: 'new' })}
              aria-label="Add new station"
            >
              <div className="add-ico" aria-hidden="true"><Ico.Plus width="22" height="22"/></div>
              <div className="t1">Add a <em>new station.</em></div>
              <div className="t2">Onboard a new location to your network — it takes under a minute.</div>
            </button>
          )}
        </div>
      </div>

      {modal && (
        <StationModal
          initial={modal.mode === 'edit' ? modal.station : null}
          onClose={() => setModal(null)}
          onSave={saveStation}
        />
      )}

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
