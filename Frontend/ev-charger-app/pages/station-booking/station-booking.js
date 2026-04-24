/* =============================================================
   STATION BOOKING — page script
   Shared helpers (BrandMark, Ico) come from window.EVShared.
   ChargerCard, DatePills, SlotGrid and Toast are local.
   ============================================================= */

const { useState, useEffect, useMemo, useRef } = React;
const { BrandMark, Ico } = window.EVShared;

/* =============================================================
   MOCK DATA — replace with API calls when backend is ready.
   // TODO (backend integration):
   //   const res = await fetch(`/api/stations/${id}`);
   //   const { station, chargers } = await res.json();
   //   const slotRes = await fetch(`/api/chargers/${chargerId}/slots?date=${dateIso}`);
   //   const { slots } = await slotRes.json();
   ============================================================= */
const MOCK_STATION = {
  id: 'EVC-2041',
  name: 'Green Park Charger',
  address: '88 Sukhumvit Soi 24, Khlong Tan, Bangkok 10110',
  status: 'active',
  operator: 'EV Charger Network',
};

const MOCK_CHARGERS = [
  {
    id: 'CHG-A01',
    typeName: 'CCS Combo 2',
    standard: 'DC',
    maxKw: 150,
    ratePerKwh: 8.5,
    status: 'available',
    connectorIcon: 'ccs',
  },
  {
    id: 'CHG-A02',
    typeName: 'CHAdeMO',
    standard: 'DC',
    maxKw: 50,
    ratePerKwh: 7.9,
    status: 'busy',
    connectorIcon: 'chademo',
  },
  {
    id: 'CHG-B01',
    typeName: 'Type 2 AC',
    standard: 'AC',
    maxKw: 22,
    ratePerKwh: 6.5,
    status: 'available',
    connectorIcon: 'type2',
  },
  {
    id: 'CHG-B02',
    typeName: 'Type 2 AC',
    standard: 'AC',
    maxKw: 11,
    ratePerKwh: 5.9,
    status: 'offline',
    connectorIcon: 'type2',
  },
];

/* 45-minute slots from 08:00 to 22:00 — taken flags keyed by charger+date. */
function buildSlotsFor(chargerId, dateIso) {
  const slots = [];
  const start = new Date(`${dateIso}T08:00:00`);
  const end   = new Date(`${dateIso}T22:00:00`);
  let cur = new Date(start);
  let seed = (chargerId.charCodeAt(4) * 31 + dateIso.charCodeAt(8) * 17) >>> 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return (seed / 0xffffffff); };
  while (cur < end) {
    const iso = cur.toISOString();
    const hh = String(cur.getHours()).padStart(2, '0');
    const mm = String(cur.getMinutes()).padStart(2, '0');
    slots.push({
      startIso: iso,
      label: `${hh}:${mm}`,
      durationMin: 45,
      taken: rnd() < 0.32,
    });
    cur = new Date(cur.getTime() + 45 * 60 * 1000);
  }
  return slots;
}

/* Today + next 6 days. */
function buildDates() {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const iso = d.toISOString().slice(0, 10);
    out.push({
      iso,
      date: d,
      dow:  d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      dnum: d.getDate(),
      mth:  d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
      isToday: i === 0,
    });
  }
  return out;
}

/* ============ Charger Card ============ */
function ChargerCard({ c, selected, onSelect }) {
  const unavailable = c.status === 'offline';
  const busy = c.status === 'busy';
  const statusBadge =
    c.status === 'available' ? <span className="badge-status-ok">Available</span> :
    busy                     ? <span className="badge-status-busy">In use</span> :
                               <span className="badge-status-off">Offline</span>;

  return (
    <article
      className={`charger ${selected ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}
      data-charger-id={c.id}
      id={`charger-${c.id}`}
    >
      <div className="ch-top">
        <div className="ch-icon" aria-hidden="true">
          {c.standard === 'DC' ? <Ico.Bolt width="22" height="22"/> : <Ico.Plug width="22" height="22"/>}
        </div>
        <div className="ch-head">
          <div className="ch-name">
            <span>{c.typeName}</span>
            <span className="ch-code">{c.id}</span>
          </div>
          <div className="ch-type-row">
            <span className={c.standard === 'DC' ? 'badge-dc' : 'badge-ac'}>{c.standard}</span>
            {statusBadge}
            {c.standard === 'DC' && <span className="badge">Fast charge</span>}
          </div>
        </div>
      </div>

      <div className="ch-meta">
        <div className="meta-cell">
          <span className="lbl">Max power</span>
          <span className="val" data-field="maxKw">{c.maxKw}<small>kW</small></span>
        </div>
        <div className="meta-cell">
          <span className="lbl">Rate</span>
          <span className="val" data-field="ratePerKwh">฿{c.ratePerKwh.toFixed(1)}<small>/ kWh</small></span>
        </div>
      </div>

      <div className="ch-foot">
        <button
          className="select-btn"
          data-action="select-charger"
          data-charger-id={c.id}
          disabled={unavailable}
          onClick={() => onSelect(c.id)}
          aria-pressed={selected}
        >
          {selected ? 'Selected' : (busy ? 'Select · queue' : 'Select')}
          {!selected && <Ico.ArrowRight className="arrow" width="14" height="14"/>}
        </button>
      </div>
    </article>
  );
}

/* ============ Date pills ============ */
function DatePills({ dates, selected, onPick }) {
  return (
    <div className="date-pills" role="tablist" aria-label="Choose date">
      {dates.map(d => {
        const on = d.iso === selected;
        return (
          <button
            key={d.iso}
            className={`date-pill ${on ? 'on' : ''} ${d.isToday ? 'today' : ''}`}
            role="tab"
            aria-selected={on}
            data-date={d.iso}
            onClick={() => onPick(d.iso)}
          >
            <span className="dow">{d.isToday ? 'Today' : d.dow}</span>
            <span className="dnum">{d.dnum}</span>
            <span className="mth">{d.mth}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============ Slot grid ============ */
function SlotGrid({ slots, selectedIso, onPick }) {
  return (
    <>
      <div className="slot-grid" role="listbox" aria-label="45-minute time slots">
        {slots.map(s => {
          const on = s.startIso === selectedIso;
          return (
            <button
              key={s.startIso}
              className={`slot ${s.taken ? 'taken' : ''} ${on ? 'on' : ''}`}
              data-slot-start={s.startIso}
              data-slot-taken={s.taken ? 'true' : 'false'}
              aria-disabled={s.taken}
              disabled={s.taken}
              onClick={() => !s.taken && onPick(s.startIso)}
              role="option"
              aria-selected={on}
            >
              <span className="s-time">{s.label}</span>
              <span className="s-dur">45 min</span>
            </button>
          );
        })}
      </div>
      <div className="slot-legend" aria-hidden="true">
        <span className="leg"><span className="leg-swatch"/> Available</span>
        <span className="leg"><span className="leg-swatch on"/> Selected</span>
        <span className="leg"><span className="leg-swatch taken"/> Taken</span>
      </div>
    </>
  );
}

/* ============ Confirmation toast ============ */
function Toast({ payload, onClose }) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 3600);
    const t2 = setTimeout(() => onClose(), 3950);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [payload.key, onClose]);

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className={`toast ${leaving ? 'leaving' : ''}`} id="booking-toast" data-toast="success">
        <div className="toast-ico" aria-hidden="true">
          <span className="toast-check"><Ico.Check width="20" height="20"/></span>
        </div>
        <div className="toast-body">
          <div className="toast-title">Booking <em>confirmed.</em></div>
          <div className="toast-sub">
            <span className="mono">{payload.chargerId}</span> · {payload.dateLabel} · {payload.timeLabel}
            <div style={{ marginTop: 2 }}>
              See you at {MOCK_STATION.name.split(' ').slice(0, 2).join(' ')}. A reminder will land 15 min before.
            </div>
          </div>
        </div>
        <div className="toast-progress" aria-hidden="true"/>
      </div>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const dates = useMemo(() => buildDates(), []);
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [selectedDate, setSelectedDate]       = useState(dates[0].iso);
  const [selectedSlot, setSelectedSlot]       = useState(null);
  const [toast, setToast]                     = useState(null);

  const slots = useMemo(() => {
    if (!selectedCharger) return [];
    return buildSlotsFor(selectedCharger, selectedDate);
  }, [selectedCharger, selectedDate]);

  useEffect(() => { setSelectedSlot(null); }, [selectedCharger, selectedDate]);

  const chargerObj = MOCK_CHARGERS.find(c => c.id === selectedCharger);
  const slotObj    = slots.find(s => s.startIso === selectedSlot);
  const dateObj    = dates.find(d => d.iso === selectedDate);

  const canConfirm = !!(selectedCharger && selectedSlot);

  function handleConfirm() {
    if (!canConfirm) return;
    // TODO (backend): POST /api/bookings { chargerId, startIso }
    setToast({
      key: Date.now(),
      chargerId: selectedCharger,
      dateLabel: dateObj.isToday
        ? 'Today'
        : `${dateObj.dow.charAt(0) + dateObj.dow.slice(1).toLowerCase()} ${dateObj.dnum}`,
      timeLabel: slotObj.label,
    });
    setSelectedSlot(null);
  }

  // Scroll booking panel into view on mobile after picking a charger.
  const bookingRef = useRef(null);
  useEffect(() => {
    if (selectedCharger && bookingRef.current && window.innerWidth < 960) {
      const el = bookingRef.current;
      setTimeout(() => {
        const y = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 120);
    }
  }, [selectedCharger]);

  return (
    <>
      <div className="app">
        {/* ===== Topbar ===== */}
        <header className="topbar">
          <button
            className="back-btn"
            id="back-btn"
            onClick={() => window.history.length > 1 ? window.history.back() : null}
            aria-label="Back to stations"
          >
            <span className="ico" aria-hidden="true"><Ico.ArrowLeft width="13" height="13"/></span>
            Back to stations
          </button>
          <a className="brand" href="../find-stations/index.html" aria-label="EV Charger home">
            <BrandMark />
            <span>EV Charger</span>
          </a>
        </header>

        {/* ===== Station header ===== */}
        <section className="station-head reveal" id="station-header" data-station-id={MOCK_STATION.id}>
          <span className="eyebrow">Station detail · {MOCK_STATION.id}</span>
          <h1 className="title">Green Park <em>Charger.</em></h1>
          <div className="st-addr-row">
            <Ico.Pin width="16" height="16"/>
            <span>{MOCK_STATION.address}</span>
          </div>
          <div className="head-meta">
            <span className="badge badge-dot badge-active">Open now</span>
            <span className="badge">4 chargers</span>
            <span className="badge">2 AC · 2 DC</span>
            <span className="badge">Operator · {MOCK_STATION.operator}</span>
          </div>
        </section>

        {/* ===== Main grid (columns on desktop) ===== */}
        <div className="main-grid">
          {/* LEFT: Chargers */}
          <div className="col-left">
            <div className="section-head">
              <div>
                <div className="sec-num">01 — Pick a charger</div>
                <h2>Choose your <em>connector.</em></h2>
              </div>
              <span className="hint">Tap · select</span>
            </div>

            <div className="charger-list reveal" id="charger-list">
              {MOCK_CHARGERS.map(c => (
                <ChargerCard
                  key={c.id}
                  c={c}
                  selected={selectedCharger === c.id}
                  onSelect={setSelectedCharger}
                />
              ))}
            </div>
          </div>

          {/* RIGHT: Booking panel */}
          <div className="col-right">
            <div className="section-head">
              <div>
                <div className="sec-num">02 — Pick a time</div>
                <h2>Today, or <em>soon.</em></h2>
              </div>
              <span className="hint">
                {selectedCharger ? `Charger · ${selectedCharger}` : 'Select charger first'}
              </span>
            </div>

            <div
              className={`booking-panel ${!selectedCharger ? 'disabled' : ''}`}
              id="booking-panel"
              ref={bookingRef}
              aria-disabled={!selectedCharger}
            >
              {!selectedCharger && (
                <div className="bp-hint">
                  <Ico.Info width="18" height="18"/>
                  <span><strong>Select a charger</strong> above to see available 45-minute slots for the next 7 days.</span>
                </div>
              )}

              <div className="bp-body">
                <div>
                  <div className="bp-row-head">
                    <span className="lbl">Date</span>
                    <span className="sub">Next <em>7 days</em></span>
                  </div>
                  <DatePills dates={dates} selected={selectedDate} onPick={setSelectedDate}/>
                </div>

                <div>
                  <div className="bp-row-head">
                    <span className="lbl">45-min slots</span>
                    <span className="sub">
                      {selectedCharger
                        ? <>{slots.filter(s => !s.taken).length} <em>open</em> · {slots.filter(s => s.taken).length} taken</>
                        : 'Pick a charger'}
                    </span>
                  </div>
                  <SlotGrid
                    slots={slots.length ? slots : buildSlotsFor('CHG-A01', selectedDate)}
                    selectedIso={selectedSlot}
                    onPick={setSelectedSlot}
                  />
                </div>
              </div>
            </div>

            {/* Summary card */}
            <div className="summary-card" aria-label="Booking summary">
              <div className="sc-cell">
                <span className="lbl">Charger</span>
                <span className={`val ${chargerObj ? '' : 'placeholder'}`}>
                  {chargerObj ? `${chargerObj.typeName} · ${chargerObj.maxKw}kW` : 'not selected'}
                </span>
              </div>
              <div className="sc-cell">
                <span className="lbl">Date</span>
                <span className="val">
                  {dateObj.isToday
                    ? 'Today'
                    : `${dateObj.dow.charAt(0) + dateObj.dow.slice(1).toLowerCase()} ${dateObj.dnum} ${dateObj.mth.charAt(0) + dateObj.mth.slice(1).toLowerCase()}`}
                </span>
              </div>
              <div className="sc-cell">
                <span className="lbl">Time</span>
                <span className={`val ${slotObj ? '' : 'placeholder'}`}>
                  {slotObj ? `${slotObj.label} · 45 min` : 'not selected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Sticky bottom CTA ===== */}
      <div className="sticky-bar" role="region" aria-label="Confirm booking bar">
        <div className="sticky-bar-inner">
          <div className="sticky-price">
            <span className="lbl">Estimated · 45 min @ max</span>
            <span className={`val ${chargerObj ? '' : 'muted'}`}>
              {chargerObj
                ? <>฿{(chargerObj.ratePerKwh * chargerObj.maxKw * 0.75).toFixed(0)} <em>/ session</em></>
                : '—'}
            </span>
          </div>
          <button
            id="confirm-booking"
            className="btn-confirm"
            data-action="confirm-booking"
            data-charger-id={selectedCharger || ''}
            data-slot-start={selectedSlot || ''}
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            Confirm Booking
            <Ico.ArrowRight className="arrow" width="16" height="16"/>
          </button>
        </div>
      </div>

      {/* ===== Toast ===== */}
      {toast && <Toast payload={toast} onClose={() => setToast(null)} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
