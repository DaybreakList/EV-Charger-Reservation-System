/* =============================================================
   CHARGER MANAGEMENT — page script
   Shared helpers (Ico, ManagerHeader, Toast) come from
   window.EVShared. RateCell, AddModal, DeleteModal, ChargerRow,
   ChargerCard and App are local to this page.
   ============================================================= */

const { useState, useEffect, useMemo, useRef } = React;
const { Ico, ManagerHeader, Toast, api, normalizeStation, normalizeCharger, STATUS, getSession, logout } = window.EVShared;

const URL_STATION_ID = (() => {
  const v = new URLSearchParams(window.location.search).get('station');
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
})();

/* Normalize a row from GET /charger-types/ into the shape the picker uses. */
function normalizeChargerType(t) {
  return {
    typeId:    t.type_id,
    name:      t.type_name,
    connector: t.charging_standard,
    maxKW:     parseFloat(t.max_power_kw),
    desc:      `Up to ${parseFloat(t.max_power_kw)} kW · ${t.charging_standard}`,
  };
}

/* ============ Rate cell (inline editor) ============ */
function RateCell({ value, onChange, chargerId }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(String(value));
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    const n = parseFloat(draft);
    if (!isNaN(n) && n > 0 && n !== value) onChange(n);
    setEditing(false);
    setDraft(String(!isNaN(n) && n > 0 ? n : value));
  }
  function cancel() {
    setEditing(false);
    setDraft(String(value));
  }

  if (editing) {
    return (
      <div className="rate-cell editing" data-charger-id={chargerId}>
        <span className="unit">฿</span>
        <input
          ref={inputRef}
          inputMode="decimal"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter')  commit();
            if (e.key === 'Escape') cancel();
          }}
          aria-label={`Rate per kWh for ${chargerId}`}
        />
        <span className="suffix">/kWh</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      className="rate-cell"
      data-action="edit-rate"
      data-charger-id={chargerId}
      onClick={() => setEditing(true)}
      aria-label={`Edit rate for ${chargerId}, currently ${value} THB per kWh`}
    >
      <span className="unit">฿</span>
      <span className="val">{value.toFixed(value % 1 === 0 ? 0 : 1)}</span>
      <span className="suffix">/kWh</span>
      <Ico.Pencil className="pencil" width="12" height="12"/>
    </button>
  );
}

/* ============ Add Charger Modal ============ */
function AddModal({ onClose, onAdd, stationId, chargerTypes }) {
  const [leaving, setLeaving] = useState(false);
  const [typeId, setTypeId]   = useState(chargerTypes[0]?.typeId ?? null);
  const [rate, setRate]       = useState('7.5');

  function close() {
    setLeaving(true);
    setTimeout(onClose, 180);
  }
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  const rateNum = parseFloat(rate);
  const valid = !isNaN(rateNum) && rateNum > 0 && typeId != null;

  function submit() {
    if (!valid) return;
    onAdd({ typeId, ratePerKWh: rateNum });
  }

  return (
    <div
      className={`modal-backdrop ${leaving ? 'leaving' : ''}`}
      role="dialog" aria-modal="true" aria-labelledby="add-title"
      id="add-charger-modal"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) close(); }}
    >
      <div className="modal">
        <header className="modal-head">
          <div>
            <div className="mh-eyebrow">New charger · {STATION.id}</div>
            <h2 id="add-title">Add a <em>charger.</em></h2>
          </div>
          <button className="modal-close" aria-label="Close" onClick={close}>
            <Ico.Close width="16" height="16"/>
          </button>
        </header>

        <div className="modal-body">
          <div className="field">
            <label>Charger type</label>
            {chargerTypes.length === 0 ? (
              <div className="warn-box">
                <span className="w-ico" aria-hidden="true"><Ico.Warn width="16" height="16"/></span>
                <p>
                  No charger types seeded in the database yet. Seed at least one row
                  via <strong>POST /charger-types/</strong> before adding a charger.
                </p>
              </div>
            ) : (
            <div className="type-picker" role="radiogroup" aria-label="Charger type">
              {chargerTypes.map(t => (
                <button
                  key={t.typeId}
                  type="button"
                  role="radio"
                  aria-checked={typeId === t.typeId}
                  className={`type-opt ${t.connector.toLowerCase()} ${typeId === t.typeId ? 'on' : ''}`}
                  data-type={t.typeId}
                  onClick={() => setTypeId(t.typeId)}
                >
                  <span className="t-ico" aria-hidden="true"><Ico.Plug width="16" height="16"/></span>
                  <span className="t-txt">
                    <span className="t-t1">
                      {t.name}{' '}
                      <span className={`badge ${t.connector.toLowerCase()}`} style={{ marginLeft: 6 }}>
                        {t.connector}
                      </span>
                    </span>
                    <span className="t-t2">{t.desc}</span>
                  </span>
                  <span className="tick" aria-hidden="true"><Ico.Check width="12" height="12"/></span>
                </button>
              ))}
            </div>
            )}
          </div>

          <div className="field">
            <label htmlFor="rate">Rate per kWh <span className="hint">THB</span></label>
            <div className="input-wrap">
              <span className="prefix">฿</span>
              <input
                id="rate"
                inputMode="decimal"
                placeholder="7.50"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
              />
              <span className="suffix">/kWh</span>
            </div>
          </div>
        </div>

        <footer className="modal-foot">
          <button className="btn btn-secondary btn-lg" onClick={close}>Cancel</button>
          <button
            className="btn btn-primary btn-lg"
            data-action="submit-add-charger"
            disabled={!valid}
            onClick={submit}
          >
            Add charger
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ============ Delete Confirmation Modal ============ */
function DeleteModal({ charger, onClose, onConfirm }) {
  const [leaving, setLeaving] = useState(false);
  function close() { setLeaving(true); setTimeout(onClose, 180); }
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') close(); }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className={`modal-backdrop ${leaving ? 'leaving' : ''}`}
      role="dialog" aria-modal="true" aria-labelledby="del-title"
      id="delete-charger-modal"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) close(); }}
    >
      <div className="modal sm">
        <div className="modal-body" style={{ paddingTop: 28 }}>
          <div className="delete-head-ico" aria-hidden="true"><Ico.Trash width="24" height="24"/></div>
          <div>
            <div className="mh-eyebrow">CHG-{charger.id} · {charger.typeName}</div>
            <h2 id="del-title" className="delete-title">
              Delete this <em>charger?</em>
            </h2>
          </div>
          <div className="warn-box">
            <span className="w-ico" aria-hidden="true"><Ico.Warn width="16" height="16"/></span>
            <p>
              Deletion is permanent. The backend will refuse this request if any
              booking still references <strong>CHG-{charger.id}</strong> — in that
              case, mark it as <strong>Out of Service</strong> instead.
            </p>
          </div>
        </div>
        <footer className="modal-foot">
          <button className="btn btn-secondary btn-lg" onClick={close}>Cancel</button>
          <button
            className="btn btn-danger btn-lg"
            data-action="confirm-delete"
            data-charger-id={charger.id}
            onClick={() => onConfirm(charger.id)}
          >
            <Ico.Trash width="14" height="14"/>
            Delete
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ============ Charger Row (desktop table) ============ */
function ChargerRow({ c, onToggle, onRateChange, onDelete }) {
  const isAvail = c.status === 'available';
  const statusLabel = isAvail ? 'Available' : 'Out of service';
  const statusClass = isAvail ? 'on' : 'off';

  return (
    <tr data-charger-id={c.id} data-status={c.status} id={`charger-${c.id}`}>
      <td><span className="ch-id">CHG-{c.id}</span></td>
      <td>
        <div className="ch-type-cell">
          <span className={`ch-type-ico ${c.standard.toLowerCase()}`} aria-hidden="true">
            <Ico.Plug width="16" height="16"/>
          </span>
          <div>
            <div className="ch-type-name">
              {c.typeName}{' '}
              <span className={`badge ${c.standard.toLowerCase()}`} style={{ marginLeft: 6, verticalAlign: 'middle' }}>
                {c.standard}
              </span>
            </div>
            <div className="ch-type-connector">TYPE-{c.typeId}</div>
          </div>
        </div>
      </td>
      <td><span className="power"><em>{c.maxKw}</em> kW</span></td>
      <td><RateCell value={c.ratePerKwh} onChange={(v) => onRateChange(c.id, v)} chargerId={c.id}/></td>
      <td>
        <div className="status-cell">
          <button
            className={`toggle ${isAvail ? 'on' : ''}`}
            data-action="toggle-status"
            data-charger-id={c.id}
            aria-pressed={isAvail}
            aria-label={`Toggle status for CHG-${c.id}`}
            onClick={() => onToggle(c)}
          />
          <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
        </div>
      </td>
      <td>
        <div className="row-actions">
          <button
            className="icon-action danger"
            data-action="delete-charger"
            data-charger-id={c.id}
            aria-label={`Delete CHG-${c.id}`}
            title="Delete"
            onClick={() => onDelete(c)}
          >
            <Ico.Trash width="15" height="15"/>
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ============ Charger Card (mobile) ============ */
function ChargerCard({ c, onToggle, onRateChange, onDelete }) {
  const isAvail = c.status === 'available';
  const statusLabel = isAvail ? 'Available' : 'Out of service';
  const statusClass = isAvail ? 'on' : 'off';

  return (
    <div className="cg-card" data-charger-id={c.id} id={`charger-card-${c.id}`}>
      <div className="cg-top">
        <div className="ch-type-cell">
          <span className={`ch-type-ico ${c.standard.toLowerCase()}`} aria-hidden="true">
            <Ico.Plug width="16" height="16"/>
          </span>
          <div>
            <div className="ch-id" style={{ fontSize: 11 }}>CHG-{c.id}</div>
            <div className="ch-type-name" style={{ fontSize: 15 }}>
              {c.typeName}
              <span className={`badge ${c.standard.toLowerCase()}`} style={{ marginLeft: 6 }}>
                {c.standard}
              </span>
            </div>
          </div>
        </div>
        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="cg-kv">
        <div className="cell">
          <span className="lbl">Max power</span>
          <span className="power"><em>{c.maxKw}</em> kW</span>
        </div>
        <div className="cell">
          <span className="lbl">Rate</span>
          <RateCell value={c.ratePerKwh} onChange={(v) => onRateChange(c.id, v)} chargerId={c.id}/>
        </div>
      </div>
      <div className="cg-foot">
        <div className="status-cell">
          <button
            className={`toggle ${isAvail ? 'on' : ''}`}
            data-action="toggle-status"
            data-charger-id={c.id}
            aria-pressed={isAvail}
            onClick={() => onToggle(c)}
          />
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Toggle service</span>
        </div>
        <div className="row-actions">
          <button
            className="icon-action danger"
            data-action="delete-charger"
            data-charger-id={c.id}
            aria-label="Delete"
            onClick={() => onDelete(c)}
          >
            <Ico.Trash width="15" height="15"/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const session = getSession();
  const MANAGER = useMemo(() => {
    if (!session || !session.manager_id) return { name: 'Manager', role: 'Network Manager', initials: 'M' };
    return { name: `Manager #${session.manager_id}`, role: 'Network Manager', initials: 'M' };
  }, []);
  const MANAGER_ID = session ? session.manager_id : null;

  const [station, setStation]           = useState(null);
  const [chargers, setChargers]         = useState([]);
  const [chargerTypes, setChargerTypes] = useState([]);
  const [loadErr, setLoadErr]           = useState('');
  const [filter, setFilter]             = useState('all');
  const [showAdd, setShowAdd]           = useState(false);
  const [toDelete, setToDelete]         = useState(null);
  const [toast, setToast]               = useState(null);

  function flash(msg) { setToast(msg); }

  async function loadAll() {
    if (!URL_STATION_ID) { setLoadErr('Missing ?station= in URL'); return; }
    try {
      const [allStations, chs, types] = await Promise.all([
        api('/stations'),
        api(`/station/${URL_STATION_ID}/chargers/`),
        api('/charger-types/'),
      ]);
      const match = allStations.find(s => s.station_id === URL_STATION_ID);
      setStation(match ? normalizeStation(match) : { id: URL_STATION_ID, name: `Station ${URL_STATION_ID}`, address: '' });
      setChargers(chs.map(normalizeCharger));
      setChargerTypes(types.map(normalizeChargerType));
      setLoadErr('');
    } catch (e) {
      setLoadErr(e.message || 'Failed to load');
    }
  }

  useEffect(() => { loadAll(); }, []);

  const counts = useMemo(() => ({
    all:              chargers.length,
    available:        chargers.filter(c => c.status === 'available').length,
    'out-of-service': chargers.filter(c => c.status === 'out-of-service').length,
  }), [chargers]);

  const filtered = useMemo(() => {
    if (filter === 'all') return chargers;
    return chargers.filter(c => c.status === filter);
  }, [chargers, filter]);

  const totals = useMemo(() => ({
    count:   chargers.length,
    totalKW: chargers.reduce((a, c) => a + (c.maxKw || 0), 0),
    avgRate: chargers.length
      ? chargers.reduce((a, c) => a + c.ratePerKwh, 0) / chargers.length
      : 0,
  }), [chargers]);

  async function toggleStatus(c) {
    const nextUi = c.status === 'available' ? 'out-of-service' : 'available';
    try {
      await api(`/chargers/${c.id}?manager_id=${MANAGER_ID}`, {
        method: 'PATCH',
        body: { status: STATUS.charger.toAPI[nextUi] },
      });
      await loadAll();
      flash(`Charger ${nextUi === 'available' ? 'enabled' : 'disabled'}`);
    } catch (e) {
      flash(e.message || 'Toggle failed');
    }
  }

  async function rateChange(id, newRate) {
    try {
      await api(`/chargers/${id}?manager_id=${MANAGER_ID}`, {
        method: 'PATCH',
        body: { rate_per_kwh: newRate },
      });
      setChargers(list => list.map(c => c.id === id ? { ...c, ratePerKwh: newRate } : c));
      flash(`Rate updated · ฿${newRate.toFixed(2)}/kWh`);
    } catch (e) {
      flash(e.message || 'Update failed');
    }
  }

  async function addCharger({ typeId, ratePerKWh }) {
    try {
      await api(`/stations/${URL_STATION_ID}/chargers/`, {
        method: 'POST',
        body: { type_id: typeId, rate_per_kwh: ratePerKWh },
      });
      setShowAdd(false);
      await loadAll();
      flash('Charger added');
    } catch (e) {
      flash(e.message || 'Add failed');
    }
  }

  async function doDelete(id) {
    try {
      await api(`/chargers/${id}?manager_id=${MANAGER_ID}`, { method: 'DELETE' });
      setToDelete(null);
      await loadAll();
      flash(`Deleted · CHG-${id}`);
    } catch (e) {
      flash(e.message || 'Delete failed');
      setToDelete(null);
    }
  }

  return (
    <>
      <ManagerHeader
        tag="Manager"
        user={MANAGER}
        hasNotifications={false}
        onLogout={() => logout('../login/index.html')}
      />

      <div className="page">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="../manager-dashboard/index.html" data-route="dashboard">Dashboard</a>
          <span className="sep">/</span>
          <a href="#" data-route={`station-${station?.id}`}>{station?.name || `Station ${URL_STATION_ID ?? ''}`}</a>
          <span className="sep">/</span>
          <span className="here">Chargers</span>
        </nav>

        <section className="station-head" aria-labelledby="st-name" data-station-id={station?.id}>
          <div className="sh-left">
            <span className="sh-eyebrow">Station · EVC-{station?.id ?? URL_STATION_ID ?? '—'}</span>
            <h1 className="sh-name" id="st-name">
              {station?.name || (loadErr ? <em>Not found.</em> : <em>Loading…</em>)}
            </h1>
            {station?.address && (
              <div className="sh-addr">
                <Ico.Pin width="14" height="14"/>
                <span>{station.address}</span>
              </div>
            )}
            {loadErr && <div className="sh-addr" style={{ color: 'var(--danger)' }}>{loadErr}</div>}
          </div>
          <div className="sh-meta">
            <div className="cell">
              <span className="lbl">Chargers</span>
              <span className="val">{totals.count}</span>
            </div>
            <div className="cell">
              <span className="lbl">Total capacity</span>
              <span className="val">
                <em>{totals.totalKW}</em> <span className="unit">kW</span>
              </span>
            </div>
            <div className="cell">
              <span className="lbl">Avg. rate</span>
              <span className="val">
                <em>฿{totals.avgRate.toFixed(2)}</em> <span className="unit">/kWh</span>
              </span>
            </div>
          </div>
        </section>

        <div className="sec-head">
          <div>
            <div className="sec-num">01 — Chargers</div>
            <h2>Ports &amp; <em>rates.</em></h2>
          </div>
          <button
            className="btn btn-primary btn-lg"
            data-action="open-add-charger"
            id="add-charger-btn"
            onClick={() => setShowAdd(true)}
          >
            <Ico.Plus width="16" height="16"/>
            Add New Charger
          </button>
        </div>

        <div className="filter-row" role="tablist" aria-label="Filter chargers">
          {[
            ['all',            'All'],
            ['available',      'Available'],
            ['out-of-service', 'Out of service'],
          ].map(([k, l]) => (
            <button
              key={k}
              className={`filter-chip ${filter === k ? 'on' : ''}`}
              data-filter={k}
              role="tab"
              aria-selected={filter === k}
              onClick={() => setFilter(k)}
            >
              {l}
              <span className="cnt">{counts[k]}</span>
            </button>
          ))}
        </div>

        {/* Desktop table */}
        <div className="table-wrap">
          <table className="table" aria-label="Chargers">
            <thead>
              <tr>
                <th style={{ width: '110px' }}>Charger ID</th>
                <th>Type</th>
                <th style={{ width: '110px' }}>Max power</th>
                <th style={{ width: '170px' }}>Rate per kWh</th>
                <th style={{ width: '200px' }}>Status</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody id="chargers-tbody">
              {filtered.map(c => (
                <ChargerRow
                  key={c.id} c={c}
                  onToggle={toggleStatus}
                  onRateChange={rateChange}
                  onDelete={setToDelete}
                />
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
                    No chargers match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="card-list">
          {filtered.map(c => (
            <ChargerCard
              key={c.id} c={c}
              onToggle={toggleStatus}
              onRateChange={rateChange}
              onDelete={setToDelete}
            />
          ))}
        </div>

        <button
          className="add-card"
          data-action="open-add-charger"
          onClick={() => setShowAdd(true)}
        >
          <span className="add-ico" aria-hidden="true"><Ico.Plus width="20" height="20"/></span>
          <div>
            <div className="t1">Add a <em>new charger.</em></div>
            <div className="t2">Install a new port on this station — Type 2 AC, CCS DC, or CHAdeMO.</div>
          </div>
        </button>
      </div>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={addCharger} stationId={URL_STATION_ID} chargerTypes={chargerTypes}/>}
      {toDelete && <DeleteModal charger={toDelete} onClose={() => setToDelete(null)} onConfirm={doDelete}/>}

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
