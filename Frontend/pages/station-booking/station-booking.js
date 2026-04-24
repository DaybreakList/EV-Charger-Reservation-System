/* =============================================================
   STATION BOOKING — page script
   Reads ?id=<station_id> from URL, fetches chargers + slots from
   the backend, and creates a booking via POST /bookings/.
   ============================================================= */

const { useState, useEffect, useMemo, useRef } = React;
const { BrandMark, Ico } = window.EVShared;
const { api, auth } = window.EVApi;

/* Pull station id from query string. Fall back to demo id 1. */
function getStationId() {
  const p = new URLSearchParams(window.location.search);
  const id = p.get('id') || p.get('station');
  return id ? Number(id) : 1;
}

/* Mock fallbacks shown only when /stations or /chargers fail. */
const MOCK_STATION = {
  station_id: 1,
  name: 'Green Park Charger',
  address: '88 Sukhumvit Soi 24, Khlong Tan, Bangkok 10110',
  status: 'Active',
};
const MOCK_CHARGERS = [
  { charger_id: 1, type_id: 1, type_name: 'CCS Combo 2', max_power_kw: 150, charging_standard: 'DC', rate_per_kwh: 8.5,  status: 'Available' },
  { charger_id: 2, type_id: 2, type_name: 'CHAdeMO',     max_power_kw: 50,  charging_standard: 'DC', rate_per_kwh: 7.9,  status: 'Available' },
  { charger_id: 3, type_id: 3, type_name: 'Type 2 AC',   max_power_kw: 22,  charging_standard: 'AC', rate_per_kwh: 6.5,  status: 'Available' },
];

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
  const status = (c.status || '').toLowerCase();
  const unavailable = status === 'out of service' || status === 'offline';
  const standard = c.charging_standard || c.standard || 'AC';

  return (
    <article
      className={`charger ${selected ? 'selected' : ''} ${unavailable ? 'unavailable' : ''}`}
      data-charger-id={c.charger_id}
      id={`charger-${c.charger_id}`}
    >
      <div className="ch-top">
        <div className="ch-icon" aria-hidden="true">
          {standard === 'DC' ? <Ico.Bolt width="22" height="22"/> : <Ico.Plug width="22" height="22"/>}
        </div>
        <div className="ch-head">
          <div className="ch-name">
            <span>{c.type_name}</span>
            <span className="ch-code">CH-{String(c.charger_id).padStart(3, '0')}</span>
          </div>
          <div className="ch-type-row">
            <span className={standard === 'DC' ? 'badge-dc' : 'badge-ac'}>{standard}</span>
            <span className={unavailable ? 'badge-status-off' : 'badge-status-ok'}>
              {unavailable ? 'Out of service' : 'Available'}
            </span>
            {standard === 'DC' && <span className="badge">Fast charge</span>}
          </div>
        </div>
      </div>

      <div className="ch-meta">
        <div className="meta-cell">
          <span className="lbl">Max power</span>
          <span className="val">{c.max_power_kw}<small>kW</small></span>
        </div>
        <div className="meta-cell">
          <span className="lbl">Rate</span>
          <span className="val">฿{Number(c.rate_per_kwh).toFixed(1)}<small>/ kWh</small></span>
        </div>
      </div>

      <div className="ch-foot">
        <button
          className="select-btn"
          disabled={unavailable}
          onClick={() => onSelect(c.charger_id)}
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
function SlotGrid({ slots, loading, selectedIso, onPick }) {
  if (loading) {
    return (
      <div className="slot-grid" aria-busy="true">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="sk" style={{ height: 54, borderRadius: 12 }}/>
        ))}
      </div>
    );
  }
  return (
    <>
      <div className="slot-grid" role="listbox" aria-label="45-minute time slots">
        {slots.map(s => {
          const on = s.start_time === selectedIso;
          const taken = !s.available;
          const label = new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          return (
            <button
              key={s.start_time}
              className={`slot ${taken ? 'taken' : ''} ${on ? 'on' : ''}`}
              aria-disabled={taken}
              disabled={taken}
              onClick={() => !taken && onPick(s.start_time)}
              role="option"
              aria-selected={on}
            >
              <span className="s-time">{label}</span>
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
      <div className={`toast ${leaving ? 'leaving' : ''}`} data-toast="success">
        <div className="toast-ico" aria-hidden="true">
          <span className="toast-check"><Ico.Check width="20" height="20"/></span>
        </div>
        <div className="toast-body">
          <div className="toast-title">Booking <em>confirmed.</em></div>
          <div className="toast-sub">
            <span className="mono">#{payload.booking_id}</span> · {payload.dateLabel} · {payload.timeLabel}
          </div>
        </div>
        <div className="toast-progress" aria-hidden="true"/>
      </div>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const stationId = useMemo(getStationId, []);
  const dates = useMemo(buildDates, []);

  const [station, setStation]         = useState(null);
  const [chargers, setChargers]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [pageError, setPageError]     = useState('');

  const [selectedCharger, setSelectedCharger] = useState(null);
  const [selectedDate, setSelectedDate]       = useState(dates[0].iso);
  const [selectedSlot, setSelectedSlot]       = useState(null);
  const [slots, setSlots]                     = useState([]);
  const [slotsLoading, setSlotsLoading]       = useState(false);

  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [toast, setToast]             = useState(null);

  // Initial load: station + chargers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [allStations, ch] = await Promise.all([
          api.getAllStations().catch(() => null),
          api.getChargersByStation(stationId).catch(() => null),
        ]);
        if (cancelled) return;
        const found = allStations && allStations.find(s => s.station_id === stationId);
        setStation(found || MOCK_STATION);
        setChargers(ch || MOCK_CHARGERS);
      } catch (err) {
        if (cancelled) return;
        setPageError(err.message);
        setStation(MOCK_STATION);
        setChargers(MOCK_CHARGERS);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [stationId]);

  // Slots when charger or date changes
  useEffect(() => {
    if (!selectedCharger) { setSlots([]); return; }
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot(null);
    api.getAvailableSlots(selectedCharger, selectedDate)
      .then(data => { if (!cancelled) setSlots(data || []); })
      .catch(err => { if (!cancelled) { console.error(err); setSlots([]); } })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
  }, [selectedCharger, selectedDate]);

  const chargerObj = chargers.find(c => c.charger_id === selectedCharger);
  const dateObj    = dates.find(d => d.iso === selectedDate);

  const canConfirm = !!(selectedCharger && selectedSlot && !submitting);

  async function handleConfirm() {
    if (!canConfirm) return;
    const cust_id = auth.custId();
    if (!cust_id) {
      setSubmitError('Please sign in as a customer first.');
      return;
    }
    setSubmitting(true);
    setSubmitError('');
    try {
      const resp = await api.createBooking({
        cust_id,
        charger_id: selectedCharger,
        start_time: selectedSlot,
      });
      const slotLabel = new Date(selectedSlot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      setToast({
        key: Date.now(),
        booking_id: resp.booking_id,
        dateLabel: dateObj.isToday ? 'Today' : `${dateObj.dow} ${dateObj.dnum}`,
        timeLabel: slotLabel,
      });
      setSelectedSlot(null);
      // Refresh slots so the just-booked one greys out
      const fresh = await api.getAvailableSlots(selectedCharger, selectedDate).catch(() => null);
      if (fresh) setSlots(fresh);
    } catch (err) {
      setSubmitError(err.message || 'Booking failed.');
    } finally {
      setSubmitting(false);
    }
  }

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

  const stName = station?.name || '—';
  const stAddr = station?.address || '';

  return (
    <>
      <div className="app">
        <header className="topbar">
          <button
            className="back-btn"
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

        <section className="station-head reveal" data-station-id={stationId}>
          <span className="eyebrow">Station detail · EVC-{String(stationId).padStart(4, '0')}</span>
          <h1 className="title">{stName}<em>.</em></h1>
          <div className="st-addr-row">
            <Ico.Pin width="16" height="16"/>
            <span>{stAddr || '—'}</span>
          </div>
          <div className="head-meta">
            <span className={`badge badge-dot ${station?.status === 'Active' ? 'badge-active' : 'badge-inactive'}`}>
              {station?.status === 'Active' ? 'Open now' : 'Closed'}
            </span>
            <span className="badge">{chargers.length} charger{chargers.length === 1 ? '' : 's'}</span>
          </div>
        </section>

        <div className="main-grid">
          <div className="col-left">
            <div className="section-head">
              <div>
                <div className="sec-num">01 — Pick a charger</div>
                <h2>Choose your <em>connector.</em></h2>
              </div>
              <span className="hint">Tap · select</span>
            </div>

            <div className="charger-list reveal">
              {loading && Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="sk" style={{ height: 140, borderRadius: 16 }}/>
              ))}
              {!loading && chargers.length === 0 && (
                <div className="empty"><p>No chargers installed at this station yet.</p></div>
              )}
              {!loading && chargers.map(c => (
                <ChargerCard
                  key={c.charger_id}
                  c={c}
                  selected={selectedCharger === c.charger_id}
                  onSelect={setSelectedCharger}
                />
              ))}
            </div>
          </div>

          <div className="col-right">
            <div className="section-head">
              <div>
                <div className="sec-num">02 — Pick a time</div>
                <h2>Today, or <em>soon.</em></h2>
              </div>
              <span className="hint">
                {selectedCharger ? `Charger · CH-${String(selectedCharger).padStart(3, '0')}` : 'Select charger first'}
              </span>
            </div>

            <div
              className={`booking-panel ${!selectedCharger ? 'disabled' : ''}`}
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
                        ? <>{slots.filter(s => s.available).length} <em>open</em> · {slots.filter(s => !s.available).length} taken</>
                        : 'Pick a charger'}
                    </span>
                  </div>
                  <SlotGrid
                    slots={slots}
                    loading={slotsLoading}
                    selectedIso={selectedSlot}
                    onPick={setSelectedSlot}
                  />
                </div>
              </div>
            </div>

            <div className="summary-card" aria-label="Booking summary">
              <div className="sc-cell">
                <span className="lbl">Charger</span>
                <span className={`val ${chargerObj ? '' : 'placeholder'}`}>
                  {chargerObj ? `${chargerObj.type_name} · ${chargerObj.max_power_kw}kW` : 'not selected'}
                </span>
              </div>
              <div className="sc-cell">
                <span className="lbl">Date</span>
                <span className="val">
                  {dateObj.isToday ? 'Today' : `${dateObj.dow} ${dateObj.dnum} ${dateObj.mth}`}
                </span>
              </div>
              <div className="sc-cell">
                <span className="lbl">Time</span>
                <span className={`val ${selectedSlot ? '' : 'placeholder'}`}>
                  {selectedSlot
                    ? `${new Date(selectedSlot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} · 45 min`
                    : 'not selected'}
                </span>
              </div>
            </div>

            {submitError && (
              <div className="err-msg" aria-live="polite" style={{ marginTop: 10 }}>
                <Ico.Alert width="13" height="13"/>
                {submitError}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky-bar" role="region" aria-label="Confirm booking bar">
        <div className="sticky-bar-inner">
          <div className="sticky-price">
            <span className="lbl">Estimated · 45 min @ max</span>
            <span className={`val ${chargerObj ? '' : 'muted'}`}>
              {chargerObj
                ? <>฿{(Number(chargerObj.rate_per_kwh) * Number(chargerObj.max_power_kw) * 0.75).toFixed(0)} <em>/ session</em></>
                : '—'}
            </span>
          </div>
          <button
            className="btn-confirm"
            disabled={!canConfirm}
            onClick={handleConfirm}
          >
            {submitting ? 'Booking…' : 'Confirm Booking'}
            <Ico.ArrowRight className="arrow" width="16" height="16"/>
          </button>
        </div>
      </div>

      {toast && <Toast payload={toast} onClose={() => setToast(null)} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
