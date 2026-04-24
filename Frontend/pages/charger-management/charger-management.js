/* =============================================================
   CHARGER MANAGEMENT — page script
   Reads ?station=<id> from URL, then GET/POST/PATCH/DELETE
   chargers via the backend.
   ============================================================= */

const { useState, useEffect, useMemo, useRef } = React;
const { Ico, ManagerHeader, Toast } = window.EVShared;
const { api, auth } = window.EVApi;

const MANAGER = { name: 'Network Manager', role: 'Manager', initials: 'NM' };

function getStationId() {
  const p = new URLSearchParams(window.location.search);
  const id = p.get('station') || p.get('id');
  return id ? Number(id) : null;
}

/* No GET /charger-types/ exists, so the type picker is hardcoded.
   Each entry's `type_id` MUST match a row created via POST /charger-types/.
   TODO (backend): expose GET /charger-types/. */
const CHARGER_TYPES = [
  { type_id: 1, key: 'type2_ac',   name: 'Type 2',  connector: 'AC', maxKW: 22,  desc: 'Up to 22 kW · single or 3-phase' },
  { type_id: 2, key: 'ccs_dc',     name: 'CCS2',    connector: 'DC', maxKW: 150, desc: 'Up to 150 kW · fast charging' },
  { type_id: 3, key: 'chademo_dc', name: 'CHAdeMO', connector: 'DC', maxKW: 50,  desc: 'Up to 50 kW · legacy Japanese spec' },
];

function normaliseCharger(c) {
  const status = (c.status || '').toLowerCase();
  return {
    id:         c.charger_id,
    typeId:     c.type_id,
    typeName:   c.type_name || '—',
    connector:  c.charging_standard || 'AC',
    maxKW:      Number(c.max_power_kw || 0),
    ratePerKWh: Number(c.rate_per_kwh || 0),
    // Backend statuses: 'Available' | 'Out of Service'
    status:     status === 'out of service' ? 'out-of-service' : 'available',
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
  function cancel() { setEditing(false); setDraft(String(value)); }

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
        />
        <span className="suffix">/kWh</span>
      </div>
    );
  }
  return (
    <button type="button" className="rate-cell" onClick={() => setEditing(true)}>
      <span className="unit">฿</span>
      <span className="val">{value.toFixed(value % 1 === 0 ? 0 : 1)}</span>
      <span className="suffix">/kWh</span>
      <Ico.Pencil className="pencil" width="12" height="12"/>
    </button>
  );
}

/* ============ Add Charger Modal ============ */
function AddModal({ stationLabel, onClose, onAdd }) {
  const [leaving, setLeaving] = useState(false);
  const [typeId, setTypeId]   = useState(CHARGER_TYPES[0].type_id);
  const [rate, setRate]       = useState('7.5');
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg]   = useState('');

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

  const rateNum = parseFloat(rate);
  const valid = !isNaN(rateNum) && rateNum > 0;

  async function submit() {
    if (!valid) return;
    setSubmitting(true);
    setErrMsg('');
    try {
      await onAdd({ type_id: typeId, rate_per_kwh: rateNum });
    } catch (err) {
      setErrMsg(err.message || 'Add failed.');
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
            <div className="mh-eyebrow">New charger · {stationLabel}</div>
            <h2>Add a <em>charger.</em></h2>
          </div>
          <button className="modal-close" aria-label="Close" onClick={close}>
            <Ico.Close width="16" height="16"/>
          </button>
        </header>

        <div className="modal-body">
          <div className="field">
            <label>Charger type</label>
            <div className="type-picker" role="radiogroup">
              {CHARGER_TYPES.map(t => (
                <button
                  key={t.type_id}
                  type="button"
                  role="radio"
                  aria-checked={typeId === t.type_id}
                  className={`type-opt ${t.connector.toLowerCase()} ${typeId === t.type_id ? 'on' : ''}`}
                  onClick={() => setTypeId(t.type_id)}
                >
                  <span className="t-ico" aria-hidden="true"><Ico.Plug width="16" height="16"/></span>
                  <span className="t-txt">
                    <span className="t-t1">
                      {t.name}{' '}
                      <span className={`badge ${t.connector.toLowerCase()}`} style={{ marginLeft: 6 }}>{t.connector}</span>
                    </span>
                    <span className="t-t2">{t.desc}</span>
                  </span>
                  <span className="tick" aria-hidden="true"><Ico.Check width="12" height="12"/></span>
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label htmlFor="rate">Rate per kWh <span className="hint">THB</span></label>
            <div className="input-wrap">
              <span className="prefix">฿</span>
              <input id="rate" inputMode="decimal" placeholder="7.50"
                value={rate} onChange={(e) => setRate(e.target.value)} />
              <span className="suffix">/kWh</span>
            </div>
          </div>

          {errMsg && (
            <div className="err-msg" aria-live="polite" style={{ marginTop: 8 }}>
              <Ico.Alert width="13" height="13"/> {errMsg}
            </div>
          )}
        </div>

        <footer className="modal-foot">
          <button className="btn btn-secondary btn-lg" onClick={close} disabled={submitting}>Cancel</button>
          <button className="btn btn-primary btn-lg" disabled={!valid || submitting} onClick={submit}>
            {submitting ? 'Adding…' : 'Add charger'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ============ Delete Modal ============ */
function DeleteModal({ charger, onClose, onConfirm }) {
  const [leaving, setLeaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errMsg, setErrMsg] = useState('');

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

  async function confirm() {
    setSubmitting(true);
    setErrMsg('');
    try {
      await onConfirm(charger.id);
    } catch (err) {
      setErrMsg(err.message || 'Delete failed.');
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
      <div className="modal sm">
        <div className="modal-body" style={{ paddingTop: 28 }}>
          <div className="delete-head-ico" aria-hidden="true"><Ico.Trash width="24" height="24"/></div>
          <div>
            <div className="mh-eyebrow">CH-{String(charger.id).padStart(3, '0')} · {charger.typeName}</div>
            <h2 className="delete-title">Delete this <em>charger?</em></h2>
          </div>
          <div className="warn-box">
            <span className="w-ico" aria-hidden="true"><Ico.Warn width="16" height="16"/></span>
            <p>
              If this charger has existing bookings the server will refuse —
              consider marking it <strong>Out of Service</strong> instead.
            </p>
          </div>
          {errMsg && (
            <div className="err-msg" aria-live="polite">
              <Ico.Alert width="13" height="13"/> {errMsg}
            </div>
          )}
        </div>
        <footer className="modal-foot">
          <button className="btn btn-secondary btn-lg" onClick={close} disabled={submitting}>Cancel</button>
          <button className="btn btn-danger btn-lg" onClick={confirm} disabled={submitting}>
            <Ico.Trash width="14" height="14"/>
            {submitting ? 'Deleting…' : 'Delete'}
          </button>
        </footer>
      </div>
    </div>
  );
}

/* ============ Charger Row (desktop) ============ */
function ChargerRow({ c, onToggle, onRateChange, onDelete }) {
  const statusLabel = c.status === 'available' ? 'Available' : 'Out of service';
  const statusClass = c.status === 'available' ? 'on' : 'off';

  return (
    <tr data-charger-id={c.id}>
      <td><span className="ch-id">CH-{String(c.id).padStart(3, '0')}</span></td>
      <td>
        <div className="ch-type-cell">
          <span className={`ch-type-ico ${c.connector.toLowerCase()}`} aria-hidden="true">
            <Ico.Plug width="16" height="16"/>
          </span>
          <div>
            <div className="ch-type-name">
              {c.typeName}{' '}
              <span className={`badge ${c.connector.toLowerCase()}`} style={{ marginLeft: 6, verticalAlign: 'middle' }}>
                {c.connector}
              </span>
            </div>
          </div>
        </div>
      </td>
      <td><span className="power"><em>{c.maxKW}</em> kW</span></td>
      <td><RateCell value={c.ratePerKWh} onChange={(v) => onRateChange(c.id, v)} chargerId={c.id}/></td>
      <td>
        <div className="status-cell">
          <button
            className={`toggle ${c.status === 'available' ? 'on' : ''}`}
            aria-pressed={c.status === 'available'}
            onClick={() => onToggle(c)}
          />
          <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
        </div>
      </td>
      <td>
        <div className="row-actions">
          <button className="icon-action danger" aria-label="Delete" onClick={() => onDelete(c)}>
            <Ico.Trash width="15" height="15"/>
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ============ Charger Card (mobile) ============ */
function ChargerCard({ c, onToggle, onRateChange, onDelete }) {
  const statusLabel = c.status === 'available' ? 'Available' : 'Out of service';
  const statusClass = c.status === 'available' ? 'on' : 'off';

  return (
    <div className="cg-card" data-charger-id={c.id}>
      <div className="cg-top">
        <div className="ch-type-cell">
          <span className={`ch-type-ico ${c.connector.toLowerCase()}`} aria-hidden="true">
            <Ico.Plug width="16" height="16"/>
          </span>
          <div>
            <div className="ch-id" style={{ fontSize: 11 }}>CH-{String(c.id).padStart(3, '0')}</div>
            <div className="ch-type-name" style={{ fontSize: 15 }}>
              {c.typeName}
              <span className={`badge ${c.connector.toLowerCase()}`} style={{ marginLeft: 6 }}>{c.connector}</span>
            </div>
          </div>
        </div>
        <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
      </div>
      <div className="cg-kv">
        <div className="cell">
          <span className="lbl">Max power</span>
          <span className="power"><em>{c.maxKW}</em> kW</span>
        </div>
        <div className="cell">
          <span className="lbl">Rate</span>
          <RateCell value={c.ratePerKWh} onChange={(v) => onRateChange(c.id, v)} chargerId={c.id}/>
        </div>
      </div>
      <div className="cg-foot">
        <div className="status-cell">
          <button
            className={`toggle ${c.status === 'available' ? 'on' : ''}`}
            aria-pressed={c.status === 'available'}
            onClick={() => onToggle(c)}
          />
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>Toggle service</span>
        </div>
        <div className="row-actions">
          <button className="icon-action danger" aria-label="Delete" onClick={() => onDelete(c)}>
            <Ico.Trash width="15" height="15"/>
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const stationId = useMemo(getStationId, []);
  const managerId = auth.managerId();

  const [station, setStation]   = useState(null);
  const [chargers, setChargers] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filter, setFilter]     = useState('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toast, setToast]       = useState(null);

  function flash(msg) { setToast(msg); }

  async function reload() {
    if (!stationId) {
      setError('Missing station id in URL (?station=...)');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [allStations, ch] = await Promise.all([
        api.getAllStations().catch(() => null),
        api.getChargersByStation(stationId).catch(() => []),
      ]);
      const found = allStations && allStations.find(s => s.station_id === stationId);
      setStation(found || { station_id: stationId, name: `Station ${stationId}`, address: '' });
      setChargers((ch || []).map(normaliseCharger));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

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
    totalKW: chargers.reduce((a, c) => a + c.maxKW, 0),
    avgRate: chargers.length
      ? chargers.reduce((a, c) => a + c.ratePerKWh, 0) / chargers.length
      : 0,
  }), [chargers]);

  async function toggleStatus(c) {
    if (!managerId) return flash('Sign in as a manager.');
    const next = c.status === 'available' ? 'Out of Service' : 'Available';
    try {
      await api.updateCharger(c.id, managerId, { status: next });
      flash(`Updated · CH-${String(c.id).padStart(3, '0')}`);
      reload();
    } catch (err) {
      flash(`Update failed: ${err.message}`);
    }
  }

  async function rateChange(id, newRate) {
    if (!managerId) return flash('Sign in as a manager.');
    try {
      await api.updateCharger(id, managerId, { rate_per_kwh: newRate });
      flash(`Rate updated · ฿${newRate.toFixed(2)}/kWh`);
      reload();
    } catch (err) {
      flash(`Rate update failed: ${err.message}`);
    }
  }

  async function addCharger({ type_id, rate_per_kwh }) {
    await api.addCharger(stationId, { type_id, rate_per_kwh });
    setShowAdd(false);
    flash('Charger added');
    reload();
  }

  async function doDelete(id) {
    if (!managerId) throw new Error('Sign in as a manager.');
    await api.deleteCharger(id, managerId);
    setToDelete(null);
    flash(`Deleted · CH-${String(id).padStart(3, '0')}`);
    reload();
  }

  const stationName = station?.name || '—';
  const stationAddr = station?.address || '';
  const stationLabel = `EVC-${String(stationId || 0).padStart(4, '0')}`;

  return (
    <>
      <ManagerHeader
        tag="Manager"
        user={MANAGER}
        hasNotifications={false}
      />

      <div className="page">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="../manager-dashboard/index.html">Dashboard</a>
          <span className="sep">/</span>
          <span className="here">Chargers</span>
        </nav>

        <section className="station-head" data-station-id={stationId}>
          <div className="sh-left">
            <span className="sh-eyebrow">Station · {stationLabel}</span>
            <h1 className="sh-name">{stationName}<em>.</em></h1>
            <div className="sh-addr">
              <Ico.Pin width="14" height="14"/>
              <span>{stationAddr || '—'}</span>
            </div>
            {error && (
              <div className="err-msg" aria-live="polite" style={{ marginTop: 8 }}>
                <Ico.Alert width="13" height="13"/> {error}
              </div>
            )}
          </div>
          <div className="sh-meta">
            <div className="cell">
              <span className="lbl">Chargers</span>
              <span className="val">{totals.count}</span>
            </div>
            <div className="cell">
              <span className="lbl">Total capacity</span>
              <span className="val"><em>{totals.totalKW}</em> <span className="unit">kW</span></span>
            </div>
            <div className="cell">
              <span className="lbl">Avg. rate</span>
              <span className="val"><em>฿{totals.avgRate.toFixed(2)}</em> <span className="unit">/kWh</span></span>
            </div>
          </div>
        </section>

        <div className="sec-head">
          <div>
            <div className="sec-num">01 — Chargers</div>
            <h2>Ports &amp; <em>rates.</em></h2>
          </div>
          <button className="btn btn-primary btn-lg" onClick={() => setShowAdd(true)}>
            <Ico.Plus width="16" height="16"/>
            Add New Charger
          </button>
        </div>

        <div className="filter-row" role="tablist">
          {[
            ['all',            'All'],
            ['available',      'Available'],
            ['out-of-service', 'Out of service'],
          ].map(([k, l]) => (
            <button key={k} className={`filter-chip ${filter === k ? 'on' : ''}`}
              role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>
              {l} <span className="cnt">{counts[k]}</span>
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
            <tbody>
              {loading && (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading…</td></tr>
              )}
              {!loading && filtered.map(c => (
                <ChargerRow
                  key={c.id} c={c}
                  onToggle={toggleStatus}
                  onRateChange={rateChange}
                  onDelete={setToDelete}
                />
              ))}
              {!loading && filtered.length === 0 && (
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

        <button className="add-card" onClick={() => setShowAdd(true)}>
          <span className="add-ico" aria-hidden="true"><Ico.Plus width="20" height="20"/></span>
          <div>
            <div className="t1">Add a <em>new charger.</em></div>
            <div className="t2">Install a new port on this station — Type 2 AC, CCS DC, or CHAdeMO.</div>
          </div>
        </button>
      </div>

      {showAdd && <AddModal stationLabel={stationLabel} onClose={() => setShowAdd(false)} onAdd={addCharger}/>}
      {toDelete && <DeleteModal charger={toDelete} onClose={() => setToDelete(null)} onConfirm={doDelete}/>}

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
