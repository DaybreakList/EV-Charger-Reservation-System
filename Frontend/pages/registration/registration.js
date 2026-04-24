/* =============================================================
   REGISTRATION — page script
   Shared helpers (BrandMark, ChargeViz, Ico) come from
   window.EVShared. RegistrationForm, Tabs and SideBenefits are
   local to this page.
   ============================================================= */

const { useState, useMemo, useEffect } = React;
const { BrandMark, ChargeViz, Ico, api } = window.EVShared;

const INVITE_CODE = 'ajarnjack';

/* ---------------- Validation helpers ---------------- */
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phoneRe = /^[+\d][\d\s\-().]{7,}$/;

function pwStrength(pw) {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw) || pw.length >= 12) score++;
  return score;
}
const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Strong', 'Excellent'];

/* ---------------- Input primitive (with trailing check on success) ---------------- */
function Input({ id, label, type = 'text', value, onChange, onBlur, error, touched, placeholder, autoComplete, inputMode, right, prefix, success, optional, help, maxLength }) {
  const showErr = touched && error;
  const showOk  = touched && !error && success && value;
  return (
    <div className="field">
      <label htmlFor={id}>
        <span>{label}</span>
        {optional && <span className="optional">Optional</span>}
      </label>
      <div className={`input-wrap ${showErr ? 'error' : ''} ${showOk ? 'success' : ''}`}>
        {prefix && <span className="prefix">{prefix}</span>}
        <input
          id={id}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          inputMode={inputMode}
          maxLength={maxLength}
          aria-invalid={!!showErr}
          aria-describedby={`${id}-msg`}
        />
        {right}
        {!right && showOk && (
          <span className="trailing ok" aria-hidden="true">
            <Ico.Check width="16" height="16"/>
          </span>
        )}
      </div>
      <div id={`${id}-msg`}>
        {showErr ? (
          <div className="err-msg" aria-live="polite">
            <Ico.Alert width="13" height="13"/>
            {error}
          </div>
        ) : help ? (
          <div className="help">{help}</div>
        ) : null}
      </div>
    </div>
  );
}

/* ---------------- Registration form ---------------- */
function RegistrationForm({ persona }) {
  const isManager = persona === 'manager';

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', carModel: '', taxId: '', inviteCode: '',
  });
  const [touched, setTouched]   = useState({});
  const [showPw, setShowPw]     = useState(false);
  const [agree, setAgree]       = useState(false);
  const [submitting, setSubmit] = useState(false);
  const [success, setSuccess]   = useState(null);

  useEffect(() => { setTouched({}); setSuccess(null); }, [persona]);

  const set  = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const mark = (k) => () => setTouched(t => ({ ...t, [k]: true }));

  const errors = useMemo(() => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    else if (form.firstName.trim().length < 2) e.firstName = 'Too short';
    if (!form.lastName.trim()) e.lastName = 'Required';
    else if (form.lastName.trim().length < 2) e.lastName = 'Too short';
    if (!form.email) e.email = 'Email is required';
    else if (!emailRe.test(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 8) e.password = 'At least 8 characters';
    if (!form.phone) e.phone = 'Phone is required';
    else if (!phoneRe.test(form.phone)) e.phone = 'Enter a valid phone';
    if (isManager) {
      if (!form.taxId.trim()) e.taxId = 'Tax ID is required';
      else if (form.taxId.replace(/\D/g,'').length < 6) e.taxId = 'Looks too short';
      if (!form.inviteCode) e.inviteCode = 'Invite code is required';
      else if (form.inviteCode.trim().toLowerCase() !== INVITE_CODE) e.inviteCode = 'Invalid invite code';
    } else {
      if (!form.carModel.trim()) e.carModel = 'Required';
    }
    return e;
  }, [form, isManager]);

  const strength = pwStrength(form.password);
  const hasAnyError = Object.keys(errors).length > 0;
  const canSubmit = !hasAnyError && agree && !submitting;

  const [apiError, setApiError] = useState('');

  async function submit(e) {
    e.preventDefault();
    const allKeys = isManager
      ? ['firstName','lastName','email','password','phone','taxId','inviteCode']
      : ['firstName','lastName','email','password','phone','carModel'];
    setTouched(Object.fromEntries(allKeys.map(k => [k, true])));
    setApiError('');
    if (hasAnyError || !agree) return;
    setSubmit(true);
    try {
      const userData = {
        first_name: form.firstName.trim(),
        last_name:  form.lastName.trim(),
        email:      form.email.trim(),
        password:   form.password,
        role:       isManager ? 'manager' : 'customer',
      };
      if (isManager) {
        await api('/register/manager/', {
          method: 'POST',
          body: {
            user_data: userData,
            mgr_data: {
              phone:       form.phone.trim(),
              tax_id:      form.taxId.trim(),
              invite_code: form.inviteCode.trim(),
            },
          },
        });
      } else {
        await api('/register/customer/', {
          method: 'POST',
          body: {
            user_data: userData,
            cust_data: {
              phone:     form.phone.trim(),
              car_model: form.carModel.trim(),
            },
          },
        });
      }
      setSuccess({ persona, email: form.email, firstName: form.firstName });
    } catch (err) {
      setApiError(err.message || 'Registration failed');
    } finally {
      setSubmit(false);
    }
  }

  if (success) {
    return (
      <div className="success" role="status" aria-live="polite">
        <div className="check" aria-hidden="true">
          <Ico.Check width="28" height="28"/>
        </div>
        <div className="persona-pill">
          {success.persona === 'customer' ? (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 13h18l-2-6H5l-2 6zM5 13v6h14v-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Customer account
            </>
          ) : (
            <>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M4 20V10l8-6 8 6v10H4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8"/></svg>
              Manager account
            </>
          )}
        </div>
        <h2>Welcome, <em>{success.firstName}.</em></h2>
        <p>We sent a verification link to <strong>{success.email}</strong>. Open it to activate your account.</p>
        <button
          type="button"
          className="btn-submit"
          style={{ maxWidth: 260, margin: '0 auto' }}
          onClick={() => {
            setSuccess(null);
            setForm({ firstName:'', lastName:'', email:'', password:'', phone:'', carModel:'', taxId:'', inviteCode:'' });
            setTouched({});
            setAgree(false);
          }}
        >
          Create another account
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate key={persona} className="tab-body">
      <div className="grid-2">
        <Input id="firstName" label="First name" value={form.firstName}
          onChange={set('firstName')} onBlur={mark('firstName')}
          error={errors.firstName} touched={touched.firstName}
          placeholder="Jane" autoComplete="given-name" success />
        <Input id="lastName" label="Last name" value={form.lastName}
          onChange={set('lastName')} onBlur={mark('lastName')}
          error={errors.lastName} touched={touched.lastName}
          placeholder="Doe" autoComplete="family-name" success />
      </div>

      <Input id="email" label="Email address" type="email" value={form.email}
        onChange={set('email')} onBlur={mark('email')}
        error={errors.email} touched={touched.email}
        placeholder="jane@company.com" autoComplete="email" inputMode="email" success />

      <div className="field">
        <label htmlFor="password"><span>Password</span></label>
        <div className={`input-wrap ${touched.password && errors.password ? 'error' : ''}`}>
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            value={form.password}
            onChange={e => set('password')(e.target.value)}
            onBlur={mark('password')}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            aria-invalid={!!(touched.password && errors.password)}
            aria-describedby="password-msg"
          />
          <button
            type="button"
            className="toggle-pw"
            onClick={() => setShowPw(s => !s)}
            aria-label={showPw ? 'Hide password' : 'Show password'}
            aria-pressed={showPw}
          >
            {showPw ? 'Hide' : 'Show'}
          </button>
        </div>

        {form.password && (
          <>
            <div className="strength" data-lvl={strength} aria-hidden="true">
              <span /><span /><span /><span />
            </div>
            <div className="strength-label">
              <span>Password strength</span>
              <em>{STRENGTH_LABELS[strength]}</em>
            </div>
          </>
        )}

        <div id="password-msg">
          {touched.password && errors.password ? (
            <div className="err-msg" aria-live="polite">
              <Ico.Alert width="13" height="13"/>
              {errors.password}
            </div>
          ) : null}
        </div>
      </div>

      <Input id="phone" label="Phone number" type="tel" value={form.phone}
        onChange={set('phone')} onBlur={mark('phone')}
        error={errors.phone} touched={touched.phone}
        placeholder="555 000 1234"
        prefix={<span>🜄 +1</span>}
        autoComplete="tel" inputMode="tel" success />

      <div className="section-head">
        {isManager ? 'Station operator details' : 'Your vehicle'}
      </div>

      {isManager ? (
        <>
          <Input id="taxId" label="Tax ID / EIN" value={form.taxId}
            onChange={set('taxId')} onBlur={mark('taxId')}
            error={errors.taxId} touched={touched.taxId}
            placeholder="12-3456789"
            help="Used for payout and tax reporting — never shown publicly."
            autoComplete="off" success />
          <Input id="inviteCode" label="Invite code" value={form.inviteCode}
            onChange={set('inviteCode')} onBlur={mark('inviteCode')}
            error={errors.inviteCode} touched={touched.inviteCode}
            placeholder="Enter your operator invite code"
            autoComplete="off" success />
          <div className="invite-note">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7l-9-5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>
              Manager accounts require an invite code from the EV Charger Station network team. Don't have one?{' '}
              <a href="#" onClick={e => e.preventDefault()} style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                Request access
              </a>.
            </span>
          </div>
        </>
      ) : (
        <Input id="carModel" label="Car model" value={form.carModel}
          onChange={set('carModel')} onBlur={mark('carModel')}
          error={errors.carModel} touched={touched.carModel}
          placeholder="e.g. Tesla Model 3, Hyundai Ioniq 5"
          help="We'll use this to recommend the fastest-compatible connectors near you."
          autoComplete="off" success />
      )}

      <label className="terms">
        <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
        <span>
          I agree to the{' '}
          <a href="#" onClick={e => e.preventDefault()}>Terms of Service</a> and{' '}
          <a href="#" onClick={e => e.preventDefault()}>Privacy Policy</a>.
        </span>
      </label>

      {apiError && (
        <div className="err-msg" aria-live="polite" style={{ marginTop: 4 }}>
          <Ico.Alert width="13" height="13"/>
          {apiError}
        </div>
      )}

      <button type="submit" className="btn-submit" disabled={!canSubmit}>
        {submitting ? (
          <>
            <span className="spinner" aria-hidden="true" />
            <span>Creating account…</span>
          </>
        ) : (
          <>
            <span>Create {isManager ? 'Manager' : 'Customer'} account</span>
            <Ico.ArrowRight className="arrow" width="16" height="16"/>
          </>
        )}
      </button>

      <div className="signin-link">
        Already have an account? <a href="../login/index.html">Sign in</a>
      </div>
    </form>
  );
}

/* ---------------- Customer / Manager tab toggle ---------------- */
function Tabs({ persona, onChange }) {
  return (
    <div className="tabs" role="tablist" data-active={persona}>
      <span className="tab-indicator" aria-hidden="true" />
      <button
        role="tab"
        type="button"
        className="tab"
        aria-selected={persona === 'customer'}
        onClick={() => onChange('customer')}
      >
        <span className="ico" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M3 13l2-6h14l2 6M5 13h14v5H5v-5zM7 18v2M17 18v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        Customer
      </button>
      <button
        role="tab"
        type="button"
        className="tab"
        aria-selected={persona === 'manager'}
        onClick={() => onChange('manager')}
      >
        <span className="ico" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 20V10l8-6 8 6v10H4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M10 20v-6h4v6" stroke="currentColor" strokeWidth="1.8"/>
          </svg>
        </span>
        Manager
      </button>
    </div>
  );
}

/* ---------------- Per-persona side benefits (dark panel) ---------------- */
const BENEFITS = {
  customer: [
    'Find and unlock 2,800+ stations from one app',
    'Pay by session, schedule top-ups, split bills',
    'Track kWh, cost, and CO₂ saved per vehicle',
  ],
  manager: [
    'Monitor your fleet of stations in real time',
    'Set pricing, schedules, and access rules',
    'Automated payouts with tax-ready reporting',
  ],
};

function SideBenefits({ persona }) {
  const items = BENEFITS[persona];
  return (
    <div className="benefits" key={persona}>
      {items.map((t, i) => (
        <div className="benefit" key={i}>
          <Ico.Check width="18" height="18"/>
          <span>{t}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Persona readout inside the ChargeViz ---------------- */
function PersonaReadout({ persona }) {
  return (
    <div className="readout" key={persona}>
      <div className="persona">
        {persona === 'customer'
          ? <>Drive <em>greener.</em></>
          : <>Run the <em>grid.</em></>}
      </div>
      <div className="lbl">
        {persona === 'customer' ? 'Customer · New account' : 'Operator · New account'}
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
function App() {
  const [persona, setPersona] = useState('customer');

  return (
    <div className="page">
      <aside className="visual">
        <div className="visual-inner">
          <a className="brand" href="#">
            <BrandMark />
            <span>EV Charger Station</span>
          </a>

          <div className="visual-stage">
            <ChargeViz><PersonaReadout persona={persona} /></ChargeViz>
          </div>

          <div className="visual-foot">
            <div>
              <div className="tagline">
                {persona === 'customer'
                  ? <>Every charge, <em>accounted for.</em></>
                  : <>Every station, <em>in one place.</em></>}
              </div>
              <SideBenefits persona={persona} />
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

          <div className="reveal">
            <span className="eyebrow">Create an account</span>
            <h1 className="title">
              {persona === 'customer'
                ? <>Start charging <em>smarter.</em></>
                : <>Onboard your <em>stations.</em></>}
            </h1>
            <p className="sub">
              {persona === 'customer'
                ? 'Join EV Charger Station and pay for charging the way you drive — effortlessly.'
                : 'Register as a station manager to monitor, price, and scale your charging network.'}
            </p>

            <Tabs persona={persona} onChange={setPersona} />

            <RegistrationForm persona={persona} />
          </div>

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
