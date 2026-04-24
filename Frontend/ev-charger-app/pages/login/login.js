/* =============================================================
   LOGIN — page script
   Shared helpers are pulled from window.EVShared (BrandMark).
   ChargeViz and LoginForm are local to this page.
   ============================================================= */

const { useState, useEffect, useMemo } = React;
const { BrandMark } = window.EVShared;

/* ---------------- Animated charge viz ---------------- */
function ChargeViz() {
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
    <div className="viz" aria-hidden="true">
      <svg viewBox="-100 -100 200 200">
        <defs>
          <linearGradient id="arcGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor="#2FAE62" stopOpacity="0" />
            <stop offset="45%"  stopColor="#2FAE62" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#B6E4C3" stopOpacity="1" />
          </linearGradient>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#2FAE62" stopOpacity="0.35" />
            <stop offset="70%"  stopColor="#2FAE62" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#2FAE62" stopOpacity="0" />
          </radialGradient>
          <path id="flowRing" d="M 0,-84 A 84,84 0 1,1 -0.01,-84 Z" />
        </defs>

        {/* core glow */}
        <circle cx="0" cy="0" r="80" fill="url(#coreGlow)" />

        {/* concentric rings */}
        <circle className="ring" cx="0" cy="0" r="92" />
        <circle className="ring dashed" cx="0" cy="0" r="72" />
        <circle className="ring" cx="0" cy="0" r="56" />

        {/* slow outer arc */}
        <g className="rot-slow">
          <path className="arc" d="M -84,0 A 84,84 0 0,1 59.4,-59.4" stroke="rgba(234,243,236,0.22)" strokeWidth="1.25" />
          <circle className="blip a" cx="59.4" cy="-59.4" r="2.4" />
        </g>

        {/* primary progress arc (mid) */}
        <g className="rot-mid">
          <path className="arc primary" d="M 0,-72 A 72,72 0 1,1 -50.9,50.9" />
          <circle className="blip b" cx="-50.9" cy="50.9" r="3" />
        </g>

        {/* fast inner arc */}
        <g className="rot-fast">
          <path className="arc" d="M 40,-40 A 56,56 0 0,1 -56,0" stroke="#B6E4C3" strokeWidth="1.5" strokeOpacity="0.9" />
          <circle className="blip c" cx="-56" cy="0" r="2.2" />
        </g>

        {/* tick marks every 30deg */}
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i * 30) * Math.PI / 180;
          const x1 = Math.cos(a) * 98, y1 = Math.sin(a) * 98;
          const x2 = Math.cos(a) * 102, y2 = Math.sin(a) * 102;
          const strong = i % 3 === 0;
          return (
            <line
              key={i}
              className="tick"
              x1={x1} y1={y1} x2={x2} y2={y2}
              strokeOpacity={strong ? 0.6 : 0.25}
              strokeWidth={strong ? 1.25 : 1}
            />
          );
        })}

        {/* flowing particles along outer ring */}
        <circle r="2.4" fill="#EAF3EC" style={{ filter: 'drop-shadow(0 0 8px rgba(182,228,195,0.9))' }}>
          <animateMotion dur="6s" repeatCount="indefinite" rotate="auto">
            <mpath xlinkHref="#flowRing" />
          </animateMotion>
        </circle>
        <circle r="1.8" fill="#B6E4C3" opacity="0.7">
          <animateMotion dur="6s" begin="-2s" repeatCount="indefinite" rotate="auto">
            <mpath xlinkHref="#flowRing" />
          </animateMotion>
        </circle>
        <circle r="1.4" fill="#B6E4C3" opacity="0.5">
          <animateMotion dur="6s" begin="-4s" repeatCount="indefinite" rotate="auto">
            <mpath xlinkHref="#flowRing" />
          </animateMotion>
        </circle>

        {/* inner soft disc */}
        <circle cx="0" cy="0" r="42" fill="#0A130D" opacity="0.55" />
        <circle cx="0" cy="0" r="42" fill="none" stroke="rgba(182,228,195,0.25)" strokeWidth="0.75" />
      </svg>

      <div className="center-card">
        <div className="readout">
          <div className="kwh">
            {whole}<em>.{frac}</em>
          </div>
          <div className="lbl">kWh · Delivering</div>
        </div>
      </div>
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

  function handleSubmit(e) {
    e.preventDefault();
    setTouched({ email: true, pw: true });
    setAuthErr('');
    if (emailErr || pwErr) return;
    setSubmit(true);
    setTimeout(() => {
      setSubmit(false);
      if (pw.toLowerCase() === 'wrong') {
        setAuthErr('Those credentials don’t match our records.');
        return;
      }
      setSuccess(true);
      // TODO (backend): window.location.href = '../find-stations/index.html';
    }, 900);
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
            <ChargeViz />
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
