/* =============================================================
   BOOKING HISTORY — page script
   Loads bookings via GET /bookings/history/{cust_id}, supports
   cancel and Pay Now (PATCH /payments/{booking_id}/pay).
   ============================================================= */

const { useState, useEffect, useMemo } = React;
const { BrandMark, Ico, BottomNav } = window.EVShared;
const { api, auth } = window.EVApi;

/* Backend status casing → lowercase tokens used by chips/CSS. */
function normaliseBooking(b) {
  return {
    id:               b.booking_id,
    booking_id:       b.booking_id,
    charger_id:       b.charger_id,
    stationName:      b.station_name || '—',
    chargerLabel:     `CH-${String(b.charger_id).padStart(3, '0')}`,
    startIso:         b.start_time,
    endIso:           b.end_time,
    kwhUsed:          b.total_kwh != null ? Number(b.total_kwh) : null,
    ratePerKwh:       Number(b.rate_per_kwh_snapshot || 0),
    amount:           b.amount != null ? Number(b.amount) : null,
    bookingStatus:    (b.booking_status || '').toLowerCase(),  // pending | completed | cancelled
    paymentStatus:    (b.payment_status || 'pending').toLowerCase(), // pending | paid
  };
}

/* ============ utils ============ */
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}
function fmtTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}
function bookingAmount(b) {
  if (b.amount != null) return b.amount;
  // Fallback while booking still pending and payments row not yet inserted
  const kwh = b.kwhUsed != null ? b.kwhUsed : 0;
  return kwh * b.ratePerKwh;
}

/* ============ Status chip helpers ============ */
function bookingChip(status) {
  if (status === 'pending')   return <span className="chip chip-warn">Pending</span>;
  if (status === 'completed') return <span className="chip chip-ok">Completed</span>;
  if (status === 'cancelled') return <span className="chip chip-err">Cancelled</span>;
  return <span className="chip">{status}</span>;
}
function paymentChip(status) {
  if (status === 'pending')  return <span className="chip chip-warn">Unpaid</span>;
  if (status === 'paid')     return <span className="chip chip-ok">Paid</span>;
  if (status === 'refunded') return <span className="chip chip-done">Refunded</span>;
  return <span className="chip">{status}</span>;
}

/* ============ Booking Card ============ */
function BookingCard({ b, onCancel, onPay }) {
  const amount = bookingAmount(b);
  const kwh = b.kwhUsed;

  // Pay button only for completed bookings with pending payment
  const needsPayment = b.paymentStatus === 'pending'
    && b.bookingStatus === 'completed';
  const canCancel = b.bookingStatus === 'pending';

  return (
    <article className={`booking ${b.bookingStatus}`} id={`booking-${b.id}`}>
      <div className="bk-top">
        <div className="bk-icon" aria-hidden="true">
          <Ico.Bolt width="22" height="22"/>
        </div>
        <div className="bk-head">
          <div className="bk-station">{b.stationName}</div>
          <div className="bk-datetime">
            <Ico.Calendar width="14" height="14"/>
            <span>{fmtDate(b.startIso)}</span>
            <span className="dot" aria-hidden="true"/>
            <Ico.Clock width="14" height="14"/>
            <span>{fmtTime(b.startIso)}–{fmtTime(b.endIso)}</span>
            <span className="dot" aria-hidden="true"/>
            <span className="mono">#{b.id}</span>
          </div>
        </div>
        <div className="bk-badges">
          {bookingChip(b.bookingStatus)}
          {paymentChip(b.paymentStatus)}
        </div>
      </div>

      <div className="bk-meta">
        <div className="meta-cell">
          <span className="lbl">Energy</span>
          <span className="val">
            {kwh != null ? <>{kwh.toFixed(1)}<small>kWh</small></> : '—'}
          </span>
        </div>
        <div className="meta-cell">
          <span className="lbl">Rate</span>
          <span className="val">฿{b.ratePerKwh.toFixed(1)}<small>/kWh</small></span>
        </div>
        <div className="meta-cell" style={{ textAlign: 'right' }}>
          <span className="lbl">{b.amount != null ? 'Total' : 'Est. total'}</span>
          <span className="val serif"><em>฿{amount.toFixed(0)}</em></span>
        </div>
      </div>

      {(canCancel || needsPayment) && (
        <div className="bk-foot">
          {canCancel && (
            <button
              className="btn btn-ghost-danger"
              onClick={() => onCancel(b.id)}
            >
              Cancel Booking
            </button>
          )}
          {needsPayment && (
            <button
              className="btn btn-primary"
              onClick={() => onPay(b)}
            >
              Pay Now
              <Ico.ArrowRight className="arrow" width="14" height="14"/>
            </button>
          )}
        </div>
      )}
    </article>
  );
}

/* ============ Empty state ============ */
function EmptyState({ filter }) {
  const map = {
    all:       ['No bookings', 'yet.',       "Once you book a charging session, it'll show up here with status, receipts, and quick actions."],
    pending:   ['Nothing',     'pending.',   'All your upcoming sessions are paid and confirmed. New bookings appear here first.'],
    completed: ['No sessions', 'logged.',    'Completed charges will land here with full energy and payment receipts.'],
    cancelled: ['Nothing',     'cancelled.', 'Cancelled bookings are kept here for your records — none so far.'],
  };
  const [t1, t2, body] = map[filter] || map.all;
  return (
    <div className="empty" role="status">
      <div className="empty-ico" aria-hidden="true"><Ico.Receipt width="30" height="30"/></div>
      <h3>{t1} <em>{t2}</em></h3>
      <p>{body}</p>
      <a className="btn btn-secondary" href="../find-stations/index.html">Find a charger</a>
    </div>
  );
}

/* ============ Mock QR (placeholder) ============ */
function MockQRCode() {
  const size = 23;
  const modules = useMemo(() => {
    const m = []; let s = 987654321 >>> 0;
    const rnd = () => { s = (s * 1103515245 + 12345) >>> 0; return s / 0xffffffff; };
    for (let y = 0; y < size; y++) {
      const row = [];
      for (let x = 0; x < size; x++) row.push(rnd() < 0.5 ? 1 : 0);
      m.push(row);
    }
    const clear = (cx, cy) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const xx = cx + x, yy = cy + y;
        if (xx < size && yy < size) m[yy][xx] = 0;
      }
    };
    clear(0, 0); clear(size - 7, 0); clear(0, size - 7);
    return m;
  }, []);
  return (
    <svg width="172" height="172" viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" aria-label="Prompt Pay QR">
      <rect width={size} height={size} fill="#fff"/>
      {modules.map((row, y) => row.map((v, x) => v
        ? <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0E1A12"/>
        : null
      ))}
      {[[0,0],[size-7,0],[0,size-7]].map(([cx,cy], i) => (
        <g key={i}>
          <rect x={cx}     y={cy}     width="7" height="7" fill="#0E1A12"/>
          <rect x={cx + 1} y={cy + 1} width="5" height="5" fill="#fff"/>
          <rect x={cx + 2} y={cy + 2} width="3" height="3" fill="#0E1A12"/>
        </g>
      ))}
    </svg>
  );
}

/* ============ Payment Modal ============ */
function PaymentModal({ booking, onClose, onSuccess }) {
  const [method, setMethod]         = useState('promptpay');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [leaving, setLeaving]       = useState(false);
  const [errMsg, setErrMsg]         = useState('');
  const [card, setCard]             = useState({ number: '', name: '', exp: '', cvc: '' });

  const amount = bookingAmount(booking);

  function close() { setLeaving(true); setTimeout(() => onClose(), 180); }

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setErrMsg('');
    const apiMethod = method === 'promptpay' ? 'Prompt Pay'
                    : method === 'credit'    ? 'Credit Card'
                    :                          'Debit Card';
    try {
      await api.payBooking(booking.id, apiMethod);
      setSuccess(true);
      setTimeout(() => onSuccess(booking.id), 1600);
    } catch (err) {
      setErrMsg(err.message || 'Payment failed.');
    } finally {
      setSubmitting(false);
    }
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

  function formatCardNum(v) { return v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim(); }
  function formatExp(v) {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length <= 2 ? d : d.slice(0, 2) + '/' + d.slice(2);
  }

  const methodOk =
    method === 'promptpay' ||
    (method !== 'promptpay'
      && card.number.replace(/\s/g, '').length >= 12
      && card.exp.length >= 4
      && card.cvc.length >= 3
      && card.name.trim().length > 1);

  return (
    <div
      className={`modal-backdrop ${leaving ? 'leaving' : ''}`}
      role="dialog" aria-modal="true"
      onClick={(e) => { if (e.target.classList.contains('modal-backdrop')) close(); }}
    >
      <div className="modal">
        <div className="modal-grip" aria-hidden="true"/>

        {!success && (
          <>
            <header className="modal-head">
              <div>
                <div className="mh-eyebrow">Payment · #{booking.id}</div>
                <h2>Pay for your <em>session.</em></h2>
              </div>
              <button className="modal-close" aria-label="Close" onClick={close}>
                <Ico.Close width="16" height="16"/>
              </button>
            </header>

            <div className="modal-amount">
              <div>
                <div className="lbl">Amount due</div>
                <span className="sta">{booking.stationName} · {fmtDate(booking.startIso)}, {fmtTime(booking.startIso)}</span>
              </div>
              <div className="amt"><em>฿{amount.toFixed(0)}</em></div>
            </div>

            <div className="modal-body">
              <span className="modal-body-head">Choose a method</span>

              <div className="methods" role="radiogroup" aria-label="Payment method">
                <label className={`method ${method === 'promptpay' ? 'on' : ''}`}>
                  <input type="radio" name="pay-method" checked={method === 'promptpay'} onChange={() => setMethod('promptpay')} />
                  <span className="m-ico" aria-hidden="true"><Ico.QR width="20" height="20"/></span>
                  <span className="m-txt">
                    <span className="m-name">Prompt Pay</span>
                    <span className="m-desc">Scan QR with your banking app · no fee</span>
                  </span>
                  <span className="m-radio" aria-hidden="true"/>
                </label>

                <label className={`method ${method === 'credit' ? 'on' : ''}`}>
                  <input type="radio" name="pay-method" checked={method === 'credit'} onChange={() => setMethod('credit')} />
                  <span className="m-ico" aria-hidden="true"><Ico.CardFill width="20" height="20"/></span>
                  <span className="m-txt">
                    <span className="m-name">Credit Card</span>
                    <span className="m-desc">Visa, Mastercard, JCB · +2% fee</span>
                  </span>
                  <span className="m-radio" aria-hidden="true"/>
                </label>

                <label className={`method ${method === 'debit' ? 'on' : ''}`}>
                  <input type="radio" name="pay-method" checked={method === 'debit'} onChange={() => setMethod('debit')} />
                  <span className="m-ico" aria-hidden="true"><Ico.CardOutline width="20" height="20"/></span>
                  <span className="m-txt">
                    <span className="m-name">Debit Card</span>
                    <span className="m-desc">Bank debit · no fee</span>
                  </span>
                  <span className="m-radio" aria-hidden="true"/>
                </label>
              </div>

              {method === 'promptpay' && (
                <div className="m-panel">
                  <div className="qr-wrap">
                    <div className="qr-card">
                      <div className="qr-img">
                        <MockQRCode/>
                        <div className="qr-logo" aria-hidden="true"><span className="l1">Pay</span></div>
                      </div>
                      <div className="qr-cap">฿{amount.toFixed(2)} · expires 5:00</div>
                    </div>
                    <p className="qr-note">
                      Open your banking app and scan the code. Press <strong>Confirm Payment</strong> after the bank confirms the transfer.
                    </p>
                  </div>
                </div>
              )}

              {(method === 'credit' || method === 'debit') && (
                <div className="m-panel">
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div className="field">
                      <label htmlFor="card-number">Card number</label>
                      <div className="input-wrap">
                        <input id="card-number" inputMode="numeric" autoComplete="cc-number" placeholder="4242 4242 4242 4242"
                          value={card.number}
                          onChange={(e) => setCard({ ...card, number: formatCardNum(e.target.value) })} />
                        <span className="suffix">
                          {card.number.startsWith('4') ? 'VISA' : card.number.startsWith('5') ? 'MC' : 'CARD'}
                        </span>
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="card-name">Name on card</label>
                      <div className="input-wrap">
                        <input id="card-name" autoComplete="cc-name" placeholder="J. DOE"
                          value={card.name}
                          onChange={(e) => setCard({ ...card, name: e.target.value })} />
                      </div>
                    </div>
                    <div className="row-2">
                      <div className="field">
                        <label htmlFor="card-exp">Expiry</label>
                        <div className="input-wrap">
                          <input id="card-exp" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/YY"
                            value={card.exp}
                            onChange={(e) => setCard({ ...card, exp: formatExp(e.target.value) })} />
                        </div>
                      </div>
                      <div className="field">
                        <label htmlFor="card-cvc">CVC</label>
                        <div className="input-wrap">
                          <input id="card-cvc" inputMode="numeric" autoComplete="cc-csc" placeholder="123" maxLength={4}
                            value={card.cvc}
                            onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 4) })} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {errMsg && (
                <div className="err-msg" aria-live="polite" style={{ marginTop: 8 }}>
                  <Ico.Alert width="13" height="13"/> {errMsg}
                </div>
              )}
            </div>

            <footer className="modal-foot">
              <button className="btn btn-secondary btn-lg" onClick={close} disabled={submitting}>Cancel</button>
              <button
                className="btn btn-primary btn-lg"
                disabled={!methodOk || submitting}
                onClick={confirm}
              >
                {submitting ? <><span className="spinner" aria-hidden="true"/> Confirming…</> : <>Confirm Payment <Ico.ArrowRight className="arrow" width="14" height="14"/></>}
              </button>
            </footer>
          </>
        )}

        {success && (
          <div className="pay-success">
            <div className="pay-success-ring" aria-hidden="true">
              <Ico.Check width="44" height="44"/>
            </div>
            <div>
              <h3>Payment <em>received.</em></h3>
              <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14, lineHeight: 1.5 }}>
                A receipt is on its way to your inbox.
              </p>
            </div>
            <div className="receipt">
              <div className="row"><span className="k">Booking</span><span className="v mono">#{booking.id}</span></div>
              <div className="row"><span className="k">Station</span><span className="v">{booking.stationName}</span></div>
              <div className="row"><span className="k">Method</span><span className="v">{method === 'promptpay' ? 'Prompt Pay' : method === 'credit' ? 'Credit Card' : 'Debit Card'}</span></div>
              <div className="row"><span className="k">Amount</span><span className="v">฿{amount.toFixed(2)}</span></div>
            </div>
            <button className="btn btn-primary btn-lg" style={{ alignSelf: 'stretch' }} onClick={close}>Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============ App ============ */
function App() {
  const [filter, setFilter]       = useState('all');
  const [bookings, setBookings]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [payingFor, setPayingFor] = useState(null);

  async function reload() {
    const custId = auth.custId();
    if (!custId) {
      setError('Please sign in as a customer to see your booking history.');
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await api.getBookingHistory(custId);
      setBookings((data || []).map(normaliseBooking));
    } catch (err) {
      setError(err.message || 'Could not load bookings.');
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => new Date(b.startIso) - new Date(a.startIso));
    if (filter === 'all') return sorted;
    return sorted.filter(b => b.bookingStatus === filter);
  }, [bookings, filter]);

  const counts = useMemo(() => ({
    all:       bookings.length,
    pending:   bookings.filter(b => b.bookingStatus === 'pending').length,
    completed: bookings.filter(b => b.bookingStatus === 'completed').length,
    cancelled: bookings.filter(b => b.bookingStatus === 'cancelled').length,
  }), [bookings]);

  async function handleCancel(id) {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await api.cancelBooking(id);
      reload();
    } catch (err) {
      alert(err.message || 'Cancel failed.');
    }
  }

  function handlePaySuccess(id) {
    setPayingFor(null);
    reload();
  }

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
          <span className="eyebrow">Bookings · account</span>
          <h1 className="title">Every charge, <em>accounted for.</em></h1>
          <p className="sub">Receipts, status, and quick actions for every session — past, upcoming, and everything in between.</p>
          {error && (
            <p className="sub" style={{ color: 'var(--danger)', marginTop: 6 }}>{error}</p>
          )}
        </section>

        <div className="filter-wrap" role="region" aria-label="Filter bookings">
          <div className="filter-tabs" role="tablist">
            {[
              ['all',       'All'],
              ['pending',   'Pending'],
              ['completed', 'Completed'],
              ['cancelled', 'Cancelled'],
            ].map(([key, label]) => (
              <button
                key={key}
                className={`ftab ${filter === key ? 'on' : ''}`}
                role="tab"
                aria-selected={filter === key}
                onClick={() => setFilter(key)}
              >
                {label}
                <span className="cnt">{counts[key]}</span>
              </button>
            ))}
          </div>
        </div>

        <section className="list-wrap">
          <div className="list-head">
            <span className="cap">Results <span className="count">{filtered.length}</span></span>
            <span className="sort-hint">Newest first</span>
          </div>

          {loading && (
            <div className="reveal" style={{ display: 'grid', gap: 14 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="sk" style={{ height: 160, borderRadius: 16 }}/>
              ))}
            </div>
          )}

          {!loading && filtered.length === 0 && <EmptyState filter={filter}/>}

          {!loading && filtered.length > 0 && (
            <div className="reveal" style={{ display: 'grid', gap: 14 }}>
              {filtered.map(b => (
                <BookingCard key={b.id} b={b} onCancel={handleCancel} onPay={setPayingFor}/>
              ))}
            </div>
          )}
        </section>
      </div>

      <BottomNav active="bookings" />

      {payingFor && (
        <PaymentModal
          booking={payingFor}
          onClose={() => setPayingFor(null)}
          onSuccess={handlePaySuccess}
        />
      )}
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
