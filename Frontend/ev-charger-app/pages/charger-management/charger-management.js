/* =============================================================
   CHARGER MANAGEMENT — page script
   Shared helpers (Ico, ManagerHeader, Toast) come from
   window.EVShared. RateCell, AddModal, DeleteModal, ChargerRow,
   ChargerCard and App are local to this page.
   ============================================================= */

const { useState, useEffect, useMemo, useRef } = React;
const { Ico, ManagerHeader, Toast } = window.EVShared;

const MANAGER = { name: 'Ajarn Jack', role: 'Network Manager', initials: 'AJ' };

/* =============================================================
   MOCK DATA — replace with API calls when backend is ready.
   // TODO (backend integration):
   //   const { id } = new URLSearchParams(location.search).get('station');
   //   const station  = await fetch(`/api/stations/${id}`).then(r => r.json());
   //   const chargers = await fetch(`/api/stations/${id}/chargers`).then(r => r.json());
   ============================================================= */
const STATION = {
  id: 'EVC-2041',
  name: 'Green Park Charger',
  address: '88 Sukhumvit Soi 24, Khlong Tan, Bangkok 10110',
};

const INITIAL_CHARGERS = [
  {
    id: 'CH-A01', typeKey: 'type2_ac', typeName: 'Type 2', connector: 'AC', maxKW: 22,
    ratePerKWh: 7.5, status: 'available', activeBookings: 2,
  },
  {
    id: 'CH-A02', typeKey: 'type2_ac', typeName: 'Type 2', connector: 'AC', maxKW: 22,
    ratePerKWh: 7.5, status: 'in-use', activeBookings: 5,
  },
  {
    id: 'CH-B01', typeKey: 'ccs_dc', typeName: 'CCS2', connector: 'DC', maxKW: 120,
    ratePerKWh: 12.0, status: 'available', activeBookings: 1,
  },
  {
    id: 'CH-B02', typeKey: 'ccs_dc', typeName: 'CCS2', connector: 'DC', maxKW: 150,
    ratePerKWh: 13.5, status: 'out-of-service', activeBookings: 0,
  },
  {
    id: 'CH-C01', typeKey: 'chademo_dc', typeName: 'CHAdeMO', connector: 'DC', maxKW: 50,
    ratePerKWh: 10.0, status: 'available', activeBookings: 0,
  },
];

const CHARGER_TYPES = [
  { key: 'type2_ac',   name: 'Type 2',  connector: 'AC', maxKW: 22,  desc: 'Up to 22 kW · single or 3-phase' },
  { key: 'ccs_dc',     name: 'CCS2',    connector: 'DC', maxKW: 150, desc: 'Up to 150 kW · fast charging' },
  { key: 'chademo_dc', name: 'CHAdeMO', connector: 'DC', maxKW: 50,  desc: 'Up to 50 kW · legacy Japanese spec' },
];

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
function AddModal({ onClose, onAdd }) {
  const [leaving, setLeaving] = useState(false);
  const [typeKey, setTypeKey] = useState('type2_ac');
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
  const valid = !isNaN(rateNum) && rateNum > 0;

  function submit() {
    if (!valid) return;
    onAdd({ typeKey, ratePerKWh: rateNum });
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
            <div className="type-picker" role="radiogroup" aria-label="Charger type">
              {CHARGER_TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={typeKey === t.key}
                  className={`type-opt ${t.connector.toLowerCase()} ${typeKey === t.key ? 'on' : ''}`}
                  data-type={t.key}
                  onClick={() => setTypeKey(t.key)}
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
            <div className="mh-eyebrow">{charger.id} · {charger.typeName}</div>
            <h2 id="del-title" className="delete-title">
              Delete this <em>charger?</em>
            </h2>
          </div>
          <div className="warn-box">
            <span className="w-ico" aria-hidden="true"><Ico.Warn width="16" height="16"/></span>
            <p>
              <strong>{charger.id}</strong> has{' '}
              <strong>
                {charger.activeBookings} active booking{charger.activeBookings === 1 ? '' : 's'}
              </strong>. If this charger has existing bookings, consider marking as{' '}
              <strong>Out of Service</strong> instead — deletion is permanent.
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
  const statusLabel =
    c.status === 'available' ? 'Available' :
    c.status === 'in-use'    ? 'In use'    :
                               'Out of service';
  const statusClass =
    c.status === 'available' ? 'on' :
    c.status === 'in-use'    ? 'in-use' :
                               'off';

  return (
    <tr data-charger-id={c.id} data-status={c.status} id={`charger-${c.id}`}>
      <td><span className="ch-id">{c.id}</span></td>
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
            <div className="ch-type-connector">{c.typeKey.toUpperCase().replace('_', '-')}</div>
          </div>
        </div>
      </td>
      <td><span className="power"><em>{c.maxKW}</em> kW</span></td>
      <td><RateCell value={c.ratePerKWh} onChange={(v) => onRateChange(c.id, v)} chargerId={c.id}/></td>
      <td>
        <div className="status-cell">
          <button
            className={`toggle ${c.status !== 'out-of-service' ? 'on' : ''}`}
            data-action="toggle-status"
            data-charger-id={c.id}
            aria-pressed={c.status !== 'out-of-service'}
            aria-label={`Toggle status for ${c.id}`}
            disabled={c.status === 'in-use'}
            title={c.status === 'in-use' ? 'Cannot change while in use' : ''}
            onClick={() => onToggle(c.id)}
          />
          <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
        </div>
      </td>
      <td>
        <div className="row-actions">
          <button
            className="icon-action"
            data-action="edit-charger"
            data-charger-id={c.id}
            aria-label={`Edit ${c.id}`}
            title="Edit"
          >
            <Ico.Edit width="15" height="15"/>
          </button>
          <button
            className="icon-action danger"
            data-action="delete-charger"
            data-charger-id={c.id}
            aria-label={`Delete ${c.id}`}
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
  const statusLabel =
    c.status === 'available' ? 'Available' :
    c.status === 'in-use'    ? 'In use'    :
                               'Out of service';
  const statusClass =
    c.status === 'available' ? 'on' :
    c.status === 'in-use'    ? 'in-use' :
                               'off';

  return (
    <div className="cg-card" data-charger-id={c.id} id={`charger-card-${c.id}`}>
      <div className="cg-top">
        <div className="ch-type-cell">
          <span className={`ch-type-ico ${c.connector.toLowerCase()}`} aria-hidden="true">
            <Ico.Plug width="16" height="16"/>
          </span>
          <div>
            <div className="ch-id" style={{ fontSize: 11 }}>{c.id}</div>
            <div className="ch-type-name" style={{ fontSize: 15 }}>
              {c.typeName}
              <span className={`badge ${c.connector.toLowerCase()}`} style={{ marginLeft: 6 }}>
                {c.connector}
              </span>
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
            className={`toggle ${c.status !== 'out-of-service' ? 'on' : ''}`}
            data-action="toggle-status"
            data-charger-id={c.id}
            aria-pressed={c.status !== 'out-of-service'}
            disabled={c.status === 'in-use'}
            onClick={() => onToggle(c.id)}
          />
          <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            {c.status === 'in-use' ? 'Locked · in use' : 'Toggle service'}
          </span>
        </div>
        <div className="row-actions">
          <button
            className="icon-action"
            data-action="edit-charger"
            data-charger-id={c.id}
            aria-label="Edit"
          >
            <Ico.Edit width="15" height="15"/>
          </button>
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
  const [chargers, setChargers] = useState(INITIAL_CHARGERS);
  const [filter, setFilter]     = useState('all');
  const [showAdd, setShowAdd]   = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [toast, setToast]       = useState(null);

  function flash(msg) { setToast(msg); }

  const counts = useMemo(() => ({
    all:              chargers.length,
    available:        chargers.filter(c => c.status === 'available').length,
    'in-use':         chargers.filter(c => c.status === 'in-use').length,
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

  function toggleStatus(id) {
    setChargers(list => list.map(c => {
      if (c.id !== id) return c;
      if (c.status === 'in-use') return c;
      return { ...c, status: c.status === 'available' ? 'out-of-service' : 'available' };
    }));
  }

  function rateChange(id, newRate) {
    setChargers(list => list.map(c => c.id === id ? { ...c, ratePerKWh: newRate } : c));
    flash(`Rate updated · ฿${newRate.toFixed(2)}/kWh`);
  }

  function addCharger({ typeKey, ratePerKWh }) {
    const type = CHARGER_TYPES.find(t => t.key === typeKey);
    const idx = chargers.length + 1;
    const id = 'CH-' + String.fromCharCode(65 + Math.min(idx - 1, 25)) + String(idx).padStart(2, '0');
    const newCh = {
      id, typeKey,
      typeName: type.name,
      connector: type.connector,
      maxKW: type.maxKW,
      ratePerKWh,
      status: 'available',
      activeBookings: 0,
    };
    setChargers(list => [...list, newCh]);
    setShowAdd(false);
    flash(`Added · ${id} · ${type.name}`);
  }

  function doDelete(id) {
    setChargers(list => list.filter(c => c.id !== id));
    setToDelete(null);
    flash(`Deleted · ${id}`);
  }

  return (
    <>
      <ManagerHeader
        tag="Manager"
        user={MANAGER}
        hasNotifications={false}
      />

      <div className="page">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href="../manager-dashboard/index.html" data-route="dashboard">Dashboard</a>
          <span className="sep">/</span>
          <a href="#" data-route={`station-${STATION.id}`}>{STATION.name}</a>
          <span className="sep">/</span>
          <span className="here">Chargers</span>
        </nav>

        <section className="station-head" aria-labelledby="st-name" data-station-id={STATION.id}>
          <div className="sh-left">
            <span className="sh-eyebrow">Station · {STATION.id}</span>
            <h1 className="sh-name" id="st-name">
              {STATION.name.split(' ').slice(0, -1).join(' ')}{' '}
              <em>{STATION.name.split(' ').slice(-1)}.</em>
            </h1>
            <div className="sh-addr">
              <Ico.Pin width="14" height="14"/>
              <span>{STATION.address}</span>
            </div>
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
            ['in-use',         'In use'],
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

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={addCharger}/>}
      {toDelete && <DeleteModal charger={toDelete} onClose={() => setToDelete(null)} onConfirm={doDelete}/>}

      <Toast message={toast} onClose={() => setToast(null)} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
