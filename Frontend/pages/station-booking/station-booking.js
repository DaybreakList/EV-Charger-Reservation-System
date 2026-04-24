/* =============================================================
   STATION BOOKING — page script
   Shared helpers (BrandMark, Ico) come from window.EVShared.
   ChargerCard, DatePills, SlotGrid and Toast are local.
   ============================================================= */

const { useState, useEffect, useMemo, useRef } = React;
const { BrandMark, Ico, api, normalizeStation, normalizeCharger, getSession } = window.EVShared;

/* Pull station_id from the URL (?id=…). Fallback to 1 for a direct hit
   so the page still renders something in dev. */
const URL_STATION_ID = (() => {
  const v = new URLSearchParams(window.location.search).get('id');
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
})();

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
  const unavailable = c.status === 'out-of-service';
  const statusBadge = unavailable
    ? <span className="badge-status-off">Out of service</span>
    : <span className="badge-status-ok">Available</span>;

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
            <span className="ch-code">CHG-{c.id}</span>
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
          {selected ? 'Selected' : 'Select'}
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
              A reminder will land 15 min before your session.
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
  const [station, setStation]                 = useState(null);
  const [chargers, setChargers]               = useState([]);
  const [loadErr, setLoadErr]                 = useState('');
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [selectedDate, setSelectedDate]       = useState(dates[0].iso);
  const [selectedSlot, setSelectedSlot]       = useState(null);
  const [slots, setSlots]                     = useState([]);
  const [slotsLoading, setSlotsLoading]       = useState(false);
  const [toast, setToast]                     = useState(null);
  const [submitErr, setSubmitErr]             = useState('');

  // Load station info + chargers on mount
  useEffect(() => {
    if (!URL_STATION_ID) { setLoadErr('Missing station id in URL'); return; }
    (async () => {
      try {
        const [allStations, chs] = await Promise.all([
          api('/stations'),
          api(`/station/${URL_STATION_ID}/chargers/`),
        ]);
        const match = allStations.find(s => s.station_id === URL_STATION_ID);
        setStation(match ? normalizeStation(match) : { id: URL_STATION_ID, name: `Station ${URL_STATION_ID}`, address: '', status: 'active' });
        setChargers(chs.map(normalizeCharger));
      } catch (err) {
        setLoadErr(err.message || 'Failed to load station');
      }
    })();
  }, []);

  // Load 45-min slots for the selected charger+date
  useEffect(() => {
    if (!selectedCharger) { setSlots([]); return; }
    let cancelled = false;
    setSlotsLoading(true);
    api(`/chargers/${selectedCharger}/available-slots?date=${selectedDate}`)
      .then(raw => {
        if (cancelled) return;
        const now = Date.now();
        const mapped = raw.map(r => {
          const d = new Date(r.start_time);
          const hh = String(d.getHours()).padStart(2, '0');
          const mm = String(d.getMinutes()).padStart(2, '0');
          return {
            startIso: r.start_time,
            label: `${hh}:${mm}`,
            durationMin: 45,
            taken: !r.available || d.getTime() < now,
          };
        });
        setSlots(mapped);
      })
      .catch(err => { if (!cancelled) setSubmitErr(err.message || 'Failed to load slots'); })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCharger, selectedDate]);

  useEffect(() => { setSelectedSlot(null); setSubmitErr(''); }, [selectedCharger, selectedDate]);

  const chargerObj = chargers.find(c => c.id === selectedCharger);
  const slotObj    = slots.find(s => s.startIso === selectedSlot);
  const dateObj    = dates.find(d => d.iso === selectedDate);

  const canConfirm = !!(selectedCharger && selectedSlot);

  async function handleConfirm() {
    if (!canConfirm) return;
    const session = getSession();
    if (!session || !session.cust_id) {
      setSubmitErr('Please sign in as a customer before booking.');
      return;
    }
    setSubmitErr('');
    try {
      await api('/bookings/', {
        method: 'POST',
        body: {
          cust_id:    session.cust_id,
          charger_id: selectedCharger,
          start_time: selectedSlot,
        },
      });
      setToast({
        key: Date.now(),
        chargerId: `CHG-${selectedCharger}`,
        dateLabel: dateObj.isToday
          ? 'Today'
          : `${dateObj.dow.charAt(0) + dateObj.dow.slice(1).toLowerCase()} ${dateObj.dnum}`,
        timeLabel: slotObj.label,
      });
      setSelectedSlot(null);
      // Refresh slots so the just-booked one flips to taken
      setSlots(s => s.map(x => x.startIso === selectedSlot ? { ...x, taken: true } : x));
    } catch (err) {
      setSubmitErr(err.message || 'Booking failed');
    }
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
        <section className="station-head reveal" id="station-header" data-station-id={station?.id}>
          <span className="eyebrow">Station detail · EVC-{station?.id ?? '—'}</span>
          <h1 className="title">
            {station?.name ? station.name : (loadErr ? <em>Not found.</em> : <em>Loading…</em>)}
          </h1>
          {station?.address && (
            <div className="st-addr-row">
              <Ico.Pin width="16" height="16"/>
              <span>{station.address}</span>
            </div>
          )}
          <div className="head-meta">
            {station && (
              <span className={`badge badge-dot ${station.status === 'active' ? 'badge-active' : ''}`}>
                {station.status === 'active' ? 'Active' : 'Inactive'}
              </span>
            )}
            {chargers.length > 0 && (
              <>
                <span className="badge">{chargers.length} charger{chargers.length === 1 ? '' : 's'}</span>
                <span className="badge">
                  {chargers.filter(c => c.standard === 'AC').length} AC · {chargers.filter(c => c.standard === 'DC').length} DC
                </span>
              </>
            )}
            {loadErr && <span className="badge" style={{ color: 'var(--danger)' }}>{loadErr}</span>}
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
              {chargers.length === 0 && !loadErr && (
                <div className="sk-card"><div className="sk" style={{ height: 80 }}/></div>
              )}
              {chargers.map(c => (
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
                {selectedCharger ? `Charger · CHG-${selectedCharger}` : 'Select charger first'}
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
                        ? slotsLoading
                          ? 'Loading…'
                          : <>{slots.filter(s => !s.taken).length} <em>open</em> · {slots.filter(s => s.taken).length} taken</>
                        : 'Pick a charger'}
                    </span>
                  </div>
                  {selectedCharger && !slotsLoading && (
                    <SlotGrid
                      slots={slots}
                      selectedIso={selectedSlot}
                      onPick={setSelectedSlot}
                    />
                  )}
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
            {submitErr && (
              <span style={{ color: 'var(--danger)', fontSize: 12, marginTop: 2 }}>{submitErr}</span>
            )}
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
