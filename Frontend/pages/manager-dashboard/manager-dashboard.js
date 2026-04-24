/* =============================================================
   MANAGER DASHBOARD — page script
   Loads the signed-in manager's stations via
   GET /managers/{manager_id}/stations. Per-station booking and
   revenue figures don't have a backend endpoint yet, so they're
   filled with deterministic mock numbers (TODO: real summary).
   ============================================================= */

const { useState, useEffect, useMemo, useRef } = React;
const { Ico, ManagerHeader, Toast } = window.EVShared;
const { api, auth } = window.EVApi;

const MANAGER = { name: 'Network Manager', role: 'Manager', initials: 'NM' };

/* Deterministic pseudo-random metrics so each station shows
   stable numbers. TODO (backend): replace with /manager/summary. */
function mockMetricsFor(id) {
  let s = (Number(id) * 9301 + 49297) % 233280;
  const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  return {
    chargers:     { total: 0, available: 0, busy: 0, offline: 0 },
    todayBookings: Math.round(r() * 24),
    todayRevenue:  Math.round(r() * 7000),
    utilization:   Math.round(r() * 90),
  };
}

function normaliseStation(s) {
  const status = (s.status || 'Active').toLowerCase();
  const m = mockMetricsFor(s.station_id);
  return {
    id:        s.station_id,
    name:      s.name,
    address:   s.address || '',
    latitude:  s.latitude  != null ? Number(s.latitude)  : null,
    longitude: s.longitude != null ? Number(s.longitude) : null,
    status:    status === 'inactive' ? 'inactive' : 'active',
    chargers:  m.chargers,
    todayBookings: m.todayBookings,
    todayRevenue:  m.todayRevenue,
    utilization:   m.utilization,
  };
}

/* ============ Sparkline ============ */
function Sparkline({ seed = 1, color = 'var(--accent)' }) {
  const pts = useMemo(() => {
    let s = (seed * 9301 + 49297) % 233280;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const vals = []; let y = 50;
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
          <stop offset="0%" stopColor={color} stopOpacity="0.28"/>
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
        delta && (
          <div className="m-trend">
            <span className={`delta ${deltaDir === 'down' ? 'down' : ''}`}>
              {deltaDir === 'down' ? '▾' : '▴'} {delta}
            </span>
            <span>vs yesterday</span>
          </div>
        )
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
  const statusLabel = s.status === 'active' ? 'Active' : 'Inactive';

  return (
    <article className={`station ${s.status === 'inactive' ? 'off' : ''}`} data-station-id={s.id}>
      <div className="st-top">
        <div className="st-title-wrap">
          <span className="st-id">EVC-{String(s.id).padStart(4, '0')}</span>
          <span className="st-name">{s.name}</span>
        </div>
        <div className="toggle-wrap">
          <span className={`status-badge ${s.status === 'active' ? 'on' : 'off'}`}>
            {statusLabel}
          </span>
          <button
            className={`toggle ${s.status === 'active' ? 'on' : ''}`}
            aria-pressed={s.status === 'active'}
            aria-label={`Toggle ${s.name} status`}
            onClick={() => onToggleStatus(s)}
          />
        </div>
      </div>

      <div className="st-addr">
        <Ico.Pin width="14" height="14"/>
        <span>{s.address || '—'}</span>
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
        <button className="btn btn-primary" onClick={() => onManageChargers(s.id)}>
          Manage Chargers
          <Ico.ArrowRight className="arrow" width="14" height="14"/>
        </button>
        <button
          className="icon-action"
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
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [form, setForm] = useState(initial || {
    id: '', name: '', address: '', latitude: '', longitude: '',
  });
  const isEdit = !!initial?.id;
  const nameRef = useRef(null);

  function close() { setLeaving(true); setTimeout(onClose, 180); }

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
    setForm(f => ({
      ...f,
      latitude:  (13.72  + (Math.random() - 0.5) * 0.1).toFixed(4),
      longitude: (100.56 + (Math.random() - 0.5) * 0.1).toFixed(4),
    }));
  }

  async function save() {
    if (!valid) return;
    setSubmitting(true);
    setErrMsg('');
    try {
      await onSave({
        ...form,
        latitude:  parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
      });
    } catch (err) {
      setErrMsg(err.message || 'Save failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className={`modal-backdrop ${leaving ? 'leaving' : ''}`}
      role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) close(); }}
    >
      <div className="modal">
        <header className="modal-head">
          <div>
            <div className="mh-eyebrow">{isEdit ? `Edit · EVC-${String(form.id).padStart(4, '0')}` : 'New station'}</div>
            <h2>{isEdit ? <>Edit <em>station.</em></> : <>Add a <em>station.</em></>}</h2>
          </div>
          <button className="modal-close" aria-label="Close" onClick={close}>
            <Ico.Close width="16" height="16"/>
          </button>
        </header>

        <div className="modal-body">
          <div className="field">
            <label htmlFor="st-name">Station name</label>
            <div className="input-wrap">
              <input id="st-name" ref={nameRef} placeholder="e.g. Green Park Charger"
                value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>

          <div className="field">
            <label htmlFor="st-addr">Address <span className="hint">Full street address</span></label>
            <div className="input-wrap">
              <textarea id="st-addr" rows={2} placeholder="88 Sukhumvit Soi 24, Khlong Tan, Bangkok 10110"
                value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </div>
          </div>

          <div className="row-2">
            <div className="field">
              <label htmlFor="st-lat">Latitude</label>
              <div className="input-wrap">
                <span className="prefix">N</span>
                <input id="st-lat" inputMode="decimal" placeholder="13.7239"
                  value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="st-lng">Longitude</label>
              <div className="input-wrap">
                <span className="prefix">E</span>
                <input id="st-lng" inputMode="decimal" placeholder="100.5689"
                  value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
              </div>
            </div>
          </div>

          <button type="button" className="pick-on-map" onClick={pickOnMap}>
            <span className="pm-ico" aria-hidden="true"><Ico.Crosshair width="16" height="16"/></span>
            <span className="pm-txt">
              <span className="pm-t1">Pick on map</span>
              <span className="pm-t2">Drop a random pin near Bangkok (placeholder)</span>
            </span>
            <Ico.ArrowRight width="16" height="16" style={{ color: 'var(--accent)' }}/>
          </button>

          {errMsg && (
            <div className="err-msg" aria-live="polite" style={{ marginTop: 8 }}>
              <Ico.Alert width="13" height="13"/> {errMsg}
            </div>
          )}
        </div>

        <footer className="modal-foot">
          <button className="btn btn-secondary btn-lg" onClick={close} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary btn-lg" disabled={!valid || submitting} onClick={save}>
            {submitting ? 'Saving…' : (isEdit ? 'Save changes' : 'Save station')}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const managerId = auth.managerId();

  const [stations, setStations] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState('all');
  const [query, setQuery]       = useState('');
  const [modal, setModal]       = useState(null);
  const [toast, setToast]       = useState(null);

  async function reload() {
    if (!managerId) {
      setError('Please sign in as a manager.');
      setStations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.getStationsByManager(managerId);
      setStations((data || []).map(normaliseStation));
    } catch (err) {
      setError(err.message || 'Could not load stations.');
      setStations([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

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
      if (filter === 'active'   && s.status !== 'active')   return false;
      if (filter === 'inactive' && s.status !== 'inactive') return false;
      if (query) {
        const q = query.toLowerCase();
        if (!(s.name.toLowerCase().includes(q) ||
              String(s.id).includes(q) ||
              (s.address || '').toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }, [stations, filter, query]);

  const counts = useMemo(() => ({
    all:      stations.length,
    active:   stations.filter(s => s.status === 'active').length,
    inactive: stations.filter(s => s.status === 'inactive').length,
  }), [stations]);

  async function toggleStatus(s) {
    const next = s.status === 'active' ? 'Inactive' : 'Active';
    try {
      await api.updateStation(s.id, managerId, { status: next });
      flash(`Updated · ${s.name}`);
      reload();
    } catch (err) {
      flash(`Update failed: ${err.message}`);
    }
  }

  async function saveStation(data) {
    try {
      if (data.id) {
        await api.updateStation(data.id, managerId, {
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        flash(`Saved · ${data.name}`);
      } else {
        await api.addStation(managerId, {
          name: data.name,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        });
        flash(`Created · ${data.name}`);
      }
      setModal(null);
      reload();
    } catch (err) {
      throw err; // bubble to modal
    }
  }

  function flash(msg) { setToast(msg); }

  function goToChargerManagement(stationId) {
    window.location.href = `../charger-management/index.html?station=${encodeURIComponent(stationId)}`;
  }

  function logout() {
    auth.clear();
    window.location.href = '../login/index.html';
  }

  return (
    <>
      <ManagerHeader
        tag="Manager"
        crumb="Dashboard · Overview"
        user={MANAGER}
        onLogout={logout}
      />

      <div className="page">
        <div className="page-head">
          <div className="titles">
            <span className="eyebrow">
              Today · {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <h1 className="title">Welcome back<em>.</em></h1>
            <p className="sub">
              Live operations across your network — revenue, bookings, and station health at a glance.
            </p>
            {error && (
              <p className="sub" style={{ color: 'var(--danger)', marginTop: 6 }}>{error}</p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-lg" onClick={() => flash('Exporting CSV… (mock)')}>
              Export
            </button>
            <button className="btn btn-primary btn-lg" onClick={() => setModal({ mode: 'new' })}>
              <Ico.Plus width="16" height="16"/>
              Add New Station
            </button>
          </div>
        </div>

        <div className="metrics reveal" aria-label="Summary metrics">
          <Metric lbl="Total stations" value={metrics.total}
            icon={<Ico.Station width="18" height="18"/>} />
          <Metric lbl="Active stations"
            value={`${metrics.active}/${metrics.total || 0}`}
            delta={metrics.total ? `${Math.round(metrics.active / metrics.total * 100)}%` : '0%'}
            deltaDir="up"
            icon={<Ico.Activity width="18" height="18"/>} accent />
          <Metric lbl="Today's bookings" value={metrics.bookings} unit="sessions"
            icon={<Ico.Calendar width="18" height="18"/>} spark sparkSeed={7} />
          <Metric lbl="Today's revenue" value={`฿${metrics.revenue.toLocaleString()}`}
            icon={<Ico.Cash width="18" height="18"/>} accent spark sparkSeed={42} />
        </div>

        <div className="sec-head">
          <div className="left">
            <span className="sec-num">01 — Stations</span>
            <h2>Your <em>network.</em></h2>
          </div>
        </div>

        <div className="filter-row">
          {[
            ['all',      'All'],
            ['active',   'Active'],
            ['inactive', 'Inactive'],
          ].map(([k, l]) => (
            <button key={k} className={`filter-chip ${filter === k ? 'on' : ''}`} onClick={() => setFilter(k)}>
              {l}
              <span className="cnt">{counts[k]}</span>
            </button>
          ))}
          <div className="search-wrap" role="search">
            <Ico.Search width="14" height="14"/>
            <input type="search" placeholder="Search stations, IDs, addresses…"
              value={query} onChange={(e) => setQuery(e.target.value)}
              aria-label="Search stations" />
          </div>
        </div>

        <div className="station-grid">
          {loading && Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="sk" style={{ height: 240, borderRadius: 16 }}/>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="empty">
              <h3>No stations <em>match.</em></h3>
              <p>Try a different filter, clear the search, or add your first station.</p>
            </div>
          )}
          {!loading && filtered.map(s => (
            <StationCard
              key={s.id}
              s={s}
              onToggleStatus={toggleStatus}
              onEdit={(st) => setModal({ mode: 'edit', station: st })}
              onManageChargers={goToChargerManagement}
            />
          ))}
          {!loading && filter === 'all' && !query && (
            <button className="add-card" onClick={() => setModal({ mode: 'new' })} aria-label="Add new station">
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
