/* =============================================================
   EV CHARGER — SHARED REACT COMPONENTS
   Loaded before each page's own script. Components are exposed
   on `window.EVShared` so page scripts can pull what they need:

     const { BrandMark, Ico, BottomNav } = window.EVShared;

   This file is compiled as text/babel alongside page scripts.
   ============================================================= */

(function () {
  const { useEffect } = React;

  /* ---------- BrandMark ----------
     The little gradient badge with the lightning bolt. Sized via
     the `.brand-mark` class in global.css. Pass `light` to render
     the glyph in white on any surface (default).                */
  function BrandMark() {
    return (
      <span className="brand-mark" aria-hidden="true">
        <svg width="14" height="16" viewBox="0 0 14 16" fill="none">
          <path d="M8 1L1 9h4l-1 6 7-8H7l1-6z" fill="currentColor" />
        </svg>
      </span>
    );
  }

  /* ---------- Ico ----------
     Consolidated icon library. Every SVG accepts standard props
     (width, height, className, ...) and inherits currentColor.  */
  const Ico = {
    /* energy / stations */
    Bolt:     (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
    BoltFill: (p)=><svg {...p} viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"/></svg>,
    Zap2:     (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M8 21l1-6H5l4-12h6l-1 7h4L8 21z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
    Plug:     (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M9 3v4M15 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M6 7h12v5a6 6 0 11-12 0V7z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 18v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Station:  (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="12" height="18" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M8 8h4M8 12h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><path d="M16 8l4 3v8a2 2 0 01-2 2 2 2 0 01-2-2v-6h2V9" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,

    /* geo */
    Pin:       (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M12 22s7-7.5 7-13a7 7 0 10-14 0c0 5.5 7 13 7 13z" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.8"/></svg>,
    Nav:       (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M12 2l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>,
    Crosshair: (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,

    /* arrows / chevrons */
    ArrowLeft:  (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    ArrowRight: (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    Chevron:    (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,

    /* tab-bar glyphs */
    Home:     (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M4 11l8-7 8 7v9H4v-9z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 20v-5h4v5" stroke="currentColor" strokeWidth="1.8"/></svg>,
    Calendar: (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    User:     (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,

    /* status / system */
    Check:  (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    Close:  (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Info:   (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Warn:   (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M12 3L2 20h20L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M12 10v4M12 17v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Alert:  (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v6M12 16v.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Bell:   (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 20a2 2 0 104 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Clock:  (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,

    /* action / edit */
    Plus:   (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
    Edit:   (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.8"/></svg>,
    Pencil: (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M4 20h4l10-10-4-4L4 16v4z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M14 6l4 4" stroke="currentColor" strokeWidth="1.6"/></svg>,
    Trash:  (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 002 2h6a2 2 0 002-2l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    Logout: (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M15 5H5v14h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    Search: (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8"/><path d="M20 20l-4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Sort:   (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M7 4v14M7 18l-3-3M7 18l3-3M17 20V6M17 6l-3 3M17 6l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>,

    /* misc / finance */
    Receipt:     (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M5 3h14v18l-3-2-3 2-3-2-3 2-2-2V3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>,
    QR:          (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.8"/><rect x="14" y="3" width="7" height="7" stroke="currentColor" strokeWidth="1.8"/><rect x="3" y="14" width="7" height="7" stroke="currentColor" strokeWidth="1.8"/><path d="M14 14h3v3h-3zM20 14v3M14 20h7M17 20v1" stroke="currentColor" strokeWidth="1.8"/></svg>,
    CardFill:    (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20" stroke="currentColor" strokeWidth="1.8"/><path d="M6 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    CardOutline: (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20M6 15h3M12 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Cash:        (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><circle cx="12" cy="12.5" r="3" stroke="currentColor" strokeWidth="1.8"/><path d="M6 9v0M18 16v0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>,
    Activity:    (p)=><svg {...p} viewBox="0 0 24 24" fill="none"><path d="M3 12h4l2-7 4 14 2-7h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  };

  /* ---------- BottomNav ----------
     Three-tab mobile tab bar used on customer-facing pages.
     Props:
       active  — 'home' | 'bookings' | 'profile'
       paths   — optional override map of hrefs (defaults to MPA layout)
  */
  const DEFAULT_NAV_PATHS = {
    home:     '../find-stations/index.html',
    bookings: '../booking-history/index.html',
    profile:  '../profile/index.html',
  };

  function BottomNav({ active = 'home', paths }) {
    const p = { ...DEFAULT_NAV_PATHS, ...(paths || {}) };
    const item = (key, label, IconCmp, href) => (
      <a
        className={`nav-item ${active === key ? 'active' : ''}`}
        href={href}
        aria-current={active === key ? 'page' : undefined}
      >
        <span className="nav-ico"><IconCmp width="22" height="22"/></span>
        <span>{label}</span>
      </a>
    );
    return (
      <nav className="nav" aria-label="Primary">
        <div className="nav-inner">
          {item('home',     'Home',     Ico.Home,     p.home)}
          {item('bookings', 'Bookings', Ico.Calendar, p.bookings)}
          {item('profile',  'Profile',  Ico.User,     p.profile)}
        </div>
      </nav>
    );
  }

  /* ---------- Modal ----------
     Minimal reusable overlay. Closes on Escape / backdrop click.
     Caller is responsible for the panel contents & styling.
  */
  function Modal({ open, onClose, labelledBy, children }) {
    useEffect(() => {
      if (!open) return;
      const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }, [open, onClose]);

    if (!open) return null;
    return (
      <div
        className="modal-backdrop"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
      >
        {children}
      </div>
    );
  }

  /* ---------- ChargeViz ----------
     The animated dark-panel charging ring used on the login and
     registration pages. Pure presentation — caller provides the
     center readout via children so the text/numbers can vary per
     page (kWh counter, persona tagline, etc).
  */
  function ChargeViz({ children }) {
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

          <circle cx="0" cy="0" r="80" fill="url(#coreGlow)" />
          <circle className="ring" cx="0" cy="0" r="92" />
          <circle className="ring dashed" cx="0" cy="0" r="72" />
          <circle className="ring" cx="0" cy="0" r="56" />

          <g className="rot-slow">
            <path className="arc" d="M -84,0 A 84,84 0 0,1 59.4,-59.4" stroke="rgba(234,243,236,0.22)" strokeWidth="1.25" />
            <circle className="blip a" cx="59.4" cy="-59.4" r="2.4" />
          </g>
          <g className="rot-mid">
            <path className="arc primary" d="M 0,-72 A 72,72 0 1,1 -50.9,50.9" />
            <circle className="blip b" cx="-50.9" cy="50.9" r="3" />
          </g>
          <g className="rot-fast">
            <path className="arc" d="M 40,-40 A 56,56 0 0,1 -56,0" stroke="#B6E4C3" strokeWidth="1.5" strokeOpacity="0.9" />
            <circle className="blip c" cx="-56" cy="0" r="2.2" />
          </g>

          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30) * Math.PI / 180;
            const x1 = Math.cos(a) * 98,  y1 = Math.sin(a) * 98;
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

          <circle cx="0" cy="0" r="42" fill="#0A130D" opacity="0.55" />
          <circle cx="0" cy="0" r="42" fill="none" stroke="rgba(182,228,195,0.25)" strokeWidth="0.75" />
        </svg>

        <div className="center-card">{children}</div>
      </div>
    );
  }

  /* ---------- ManagerHeader ----------
     Sticky topbar used by the manager-facing pages (dashboard,
     charger management). Renders brand + role tag + optional
     breadcrumb on the left, and notifications/user chip/logout
     on the right.

     Props:
       tag           — role pill text (e.g. 'Manager')
       crumb         — optional short breadcrumb (hidden < 900px)
       user          — { name, role, initials }
       onLogout      — if provided, shows the logout button
       onNotifications — click handler for the bell
       hasNotifications — if true, shows the pulsing red dot
  */
  function ManagerHeader({ tag = 'Manager', crumb, user, onLogout, onEditProfile, brandHref = '#' }) {
    const safeUser = user || { name: 'Loading…', role: tag, initials: '··' };
    return (
      <header className="topbar">
        <div className="brand-row">
          <a className="brand" href={brandHref}>
            <BrandMark />
            <span className="brand-name">EV Charger</span>
          </a>
          {tag && <span className="brand-tag">{tag}</span>}
          {crumb && <span className="crumb">{crumb}</span>}
        </div>

        <div className="top-actions">
          <div className="user-chip" role="button" aria-label="Account menu">
            <div className="user-avatar">{safeUser.initials}</div>
            <div className="user-info">
              <span className="user-name">{safeUser.name}</span>
              <span className="user-role">{safeUser.role}</span>
            </div>
          </div>

          {onEditProfile && (
            <button
              className="icon-btn"
              data-action="edit-profile"
              onClick={onEditProfile}
              aria-label="Edit profile"
              title="Edit profile"
            >
              <Ico.Edit width="16" height="16"/>
            </button>
          )}

          {onLogout && (
            <button className="logout-btn" data-action="logout" onClick={onLogout}>
              <Ico.Logout width="14" height="14"/>
              Log out
            </button>
          )}
        </div>
      </header>
    );
  }

  /* ---------- ProfileEditModal ----------
     Shared edit-profile modal used by both customer profile and
     manager pages. Caller provides:
       profile      — { user_id, first_name, last_name, email, phone, car_model?, tax_id? }
       role         — 'customer' | 'manager'
       onClose, onSaved(message) callbacks.
     Pulls api.updateUser + api.updateCustomer/updateManager from
     window.EVApi. phone is updated via updateUser (lives in users table).
  */
  function ProfileEditModal({ profile, role, onClose, onSaved }) {
    const { api, auth } = window.EVApi;
    const [form, setForm] = React.useState({
      first_name: profile.first_name || '',
      last_name:  profile.last_name  || '',
      email:      profile.email      || '',
      phone:      profile.phone      || '',
      car_model:  profile.car_model  || '',
      tax_id:     profile.tax_id     || '',
    });
    const [submitting, setSubmitting] = React.useState(false);
    const [errMsg, setErrMsg] = React.useState('');

    const valid =
      form.first_name.trim().length > 0 &&
      form.last_name.trim().length  > 0 &&
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
      form.phone.trim().length > 0 &&
      (role === 'manager' ? form.tax_id.trim().length > 0 : form.car_model.trim().length > 0);

    async function save() {
      if (!valid || submitting) return;
      setSubmitting(true);
      setErrMsg('');
      try {
        await api.updateUser(profile.user_id, {
          first_name: form.first_name.trim(),
          last_name:  form.last_name.trim(),
          email:      form.email.trim(),
          phone:      form.phone.trim(),
        });
        if (role === 'manager') {
          await api.updateManager(auth.managerId(), {
            tax_id: form.tax_id.trim(),
          });
        } else {
          await api.updateCustomer(auth.custId(), {
            car_model: form.car_model.trim(),
          });
        }
        onSaved && onSaved('Profile updated');
      } catch (err) {
        setErrMsg(err.message || 'Update failed');
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <Modal open={true} onClose={onClose} labelledBy="ev-edit-profile-title">
        <div className="modal" onClick={(e) => e.stopPropagation()}>
          <header className="modal-head">
            <div>
              <div className="mh-eyebrow">Account</div>
              <h2 id="ev-edit-profile-title">Edit your <em>profile.</em></h2>
            </div>
            <button className="modal-close" aria-label="Close" onClick={onClose}>
              <Ico.Close width="16" height="16"/>
            </button>
          </header>

          <div className="modal-body">
            <div className="row-2">
              <div className="field">
                <label htmlFor="ep-first">First name</label>
                <div className="input-wrap">
                  <input id="ep-first" value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })}/>
                </div>
              </div>
              <div className="field">
                <label htmlFor="ep-last">Last name</label>
                <div className="input-wrap">
                  <input id="ep-last" value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })}/>
                </div>
              </div>
            </div>

            <div className="field">
              <label htmlFor="ep-email">Email</label>
              <div className="input-wrap">
                <input id="ep-email" type="email" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}/>
              </div>
            </div>

            <div className="field">
              <label htmlFor="ep-phone">Phone</label>
              <div className="input-wrap">
                <input id="ep-phone" type="tel" value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}/>
              </div>
            </div>

            {role === 'manager' ? (
              <div className="field">
                <label htmlFor="ep-tax">Tax ID</label>
                <div className="input-wrap">
                  <input id="ep-tax" value={form.tax_id}
                    onChange={(e) => setForm({ ...form, tax_id: e.target.value })}/>
                </div>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="ep-car">Car model</label>
                <div className="input-wrap">
                  <input id="ep-car" placeholder="e.g. Tesla Model 3" value={form.car_model}
                    onChange={(e) => setForm({ ...form, car_model: e.target.value })}/>
                </div>
              </div>
            )}

            {errMsg && (
              <div style={{ color: 'var(--danger)', fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
                <Ico.Alert width="13" height="13"/> {errMsg}
              </div>
            )}
          </div>

          <footer className="modal-foot">
            <button className="btn btn-secondary btn-lg" onClick={onClose} disabled={submitting}>Cancel</button>
            <button className="btn btn-primary btn-lg" disabled={!valid || submitting} onClick={save}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </footer>
        </div>
      </Modal>
    );
  }

  /* ---------- Toast ----------
     Short-lived top-center notice. Pass a `message` prop — it
     auto-dismisses after `duration` ms and calls `onClose`.
     Pages that need richer toasts (progress bars, undo) ship
     their own local Toast component and ignore this.
  */
  function Toast({ message, onClose, duration = 2600 }) {
    useEffect(() => {
      if (!message) return;
      const id = setTimeout(() => onClose && onClose(), duration);
      return () => clearTimeout(id);
    }, [message, duration, onClose]);

    if (!message) return null;
    return (
      <div className="toast-wrap" role="status" aria-live="polite">
        <div className="toast">
          <span className="tico" aria-hidden="true"><Ico.Check width="16" height="16"/></span>
          <span>{message}</span>
        </div>
      </div>
    );
  }

  /* ---------- Expose ---------- */
  window.EVShared = { BrandMark, Ico, BottomNav, Modal, ChargeViz, ManagerHeader, ProfileEditModal, Toast };
})();
