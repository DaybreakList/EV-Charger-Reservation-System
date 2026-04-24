/* =============================================================
   LOGIN — page script
   Shared helpers (BrandMark, ChargeViz) come from window.EVShared.
   LoginForm and the kWh counter wrapper are local to this page.
   ============================================================= */

const { useState, useEffect, useMemo } = React;
const { BrandMark, ChargeViz, api, saveSession } = window.EVShared;

/* ---------------- Live kWh readout (login-only) ---------------- */
function KwhReadout() {
  const [kwh, setKwh] = useState(12.74);
  useEffect(() => {
    const id = setInterval(() => {
      setKwh(v => {
        const next = v + (Math.random() * 0.08 + 0.02);
        return next > 99.99 ? 12.00 : next;
      });
    }, 900);
    return () => clearInterval(id);
  }, []);

  const [whole, frac] = kwh.toFixed(2).split('.');
  return (
    <div className="readout">
      <div className="kwh">{whole}<em>.{frac}</em></div>
      <div className="lbl">kWh · Delivering</div>
    </div>
  );
}

/* ---------------- Login form ---------------- */
function LoginForm() {
  const [email, setEmail]       = useState('');
  const [pw, setPw]             = useState('');
  const [show, setShow]         = useState(false);
  const [touched, setTouched]   = useState({ email: false, pw: false });
  const [submitting, setSubmit] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [authError, setAuthErr] = useState('');

  const emailErr = useMemo(() => {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email';
    return '';
  }, [email]);

  const pwErr = useMemo(() => {
    if (!pw) return 'Password is required';
    if (pw.length < 6) return 'At least 6 characters';
    return '';
  }, [pw]);

  const canSubmit = !emailErr && !pwErr && !submitting;

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, pw: true });
    setAuthErr('');
    if (emailErr || pwErr) return;
    setSubmit(true);
    try {
      const res = await api('/login/', {
        method: 'POST',
        body: { email, password: pw },
      });
      saveSession(res);
      setSuccess(true);
      const target = res.role === 'manager'
        ? '../manager-dashboard/index.html'
        : '../find-stations/index.html';
      setTimeout(() => { window.location.href = target; }, 600);
    } catch (err) {
      setAuthErr(err.message || 'Login failed');
    } finally {
      setSubmit(false);
    }
  }

  if (success) {
    return (
      <div className="success" role="status" aria-live="polite">
        <div className="check" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2>You're in.</h2>
        <p>Redirecting to your stations…</p>
        <button
          type="button"
          className="btn-signin"
          style={{ maxWidth: 220, margin: '0 auto' }}
          onClick={() => { setSuccess(false); setEmail(''); setPw(''); setTouched({ email: false, pw: false }); }}
        >
          Sign out (demo)
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="reveal">
      <div>
        <span className="eyebrow">Secure sign-in</span>
        <h1 className="title">Welcome <em>back.</em></h1>
        <p className="sub">Manage stations, track sessions, and keep the grid moving. Sign in to continue.</p>
      </div>

      {/* Email */}
      <div className="field">
        <label htmlFor="email">Email address</label>
        <div className={`input-wrap ${touched.email && emailErr ? 'error' : ''}`}>
          <input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="you@company.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setAuthErr(''); }}
            onBlur={() => setTouched(t => ({ ...t, email: true }))}
            aria-invalid={touched.email && !!emailErr}
            aria-describedby="email-err"
          />
        </div>
        <div id="email-err" className="err-msg" aria-live="polite">
          {touched.email && emailErr ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              {emailErr}
            </>
          ) : null}
        </div>
      </div>

      {/* Password */}
      <div className="field">
        <label htmlFor="pw">Password</label>
        <div className={`input-wrap ${touched.pw && pwErr ? 'error' : ''}`}>
          <input
            id="pw"
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={pw}
            onChange={e => { setPw(e.target.value); setAuthErr(''); }}
            onBlur={() => setTouched(t => ({ ...t, pw: true }))}
            aria-invalid={touched.pw && !!pwErr}
            aria-describedby="pw-err"
          />
          <button
            type="button"
            className="toggle-pw"
            onClick={() => setShow(s => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
          >
            {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <div id="pw-err" className="err-msg" aria-live="polite">
          {touched.pw && pwErr ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              {pwErr}
            </>
          ) : authError ? (
            <>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v6M12 16.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              {authError}
            </>
          ) : null}
        </div>
      </div>

      <div className="row-between">
        <span />
        <a href="#" className="forgot" onClick={e => e.preventDefault()}>Forgot password?</a>
      </div>

      <button type="submit" className="btn-signin" disabled={!canSubmit}>
        {submitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span>Signing in…</span>
          </>
        ) : (
          <>
            <span>Sign In</span>
            <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </>
        )}
      </button>

      <div className="signup">
        Don't have an account? <a href="../registration/index.html">Sign up</a>
      </div>
    </form>
  );
}

/* ---------------- Page ---------------- */
function App() {
  return (
    <div className="page">
      <aside className="visual" aria-hidden="false">
        <div className="visual-inner">
          <a className="brand" href="#">
            <BrandMark />
            <span>EV Charger Station</span>
          </a>

          <div className="visual-stage">
            <ChargeViz><KwhReadout /></ChargeViz>
          </div>

          <div className="visual-foot">
            <div className="tagline">
              Clean energy, <em>clean code.</em><br/>
              One login for every station.
            </div>
            <div className="stats">
              <div>
                <span className="num">2,847</span>
                Stations online
              </div>
              <div>
                <span className="num">184.2k</span>
                kWh today
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="form-wrap">
        <div className="form-card">
          <div className="form-brand">
            <BrandMark />
            <span>EV Charger Station</span>
          </div>

          <LoginForm />

          <div className="form-foot">
            <span>v2.4 · api.evcharger.io</span>
            <span>© 2026</span>
          </div>
        </div>
      </main>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
