/* =============================================================
   PROFILE — page script
   Reads auth session from localStorage, displays account info,
   stats pulled from booking history, and provides logout.
   ============================================================= */

const { useState, useEffect } = React;
const { BrandMark, Ico, BottomNav } = window.EVShared;
const { api, auth } = window.EVApi;

/* ---------- Helpers ---------- */
function getInitials(name) {
  if (!name) return 'JD';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ---------- Icons (page-local) ---------- */
function IcoUser(p)     { return <svg {...p} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IcoShield(p)   { return <svg {...p} viewBox="0 0 24 24" fill="none"><path d="M12 3l8 3v5c0 5-3.5 9-8 10C7.5 20 4 16 4 11V6l8-3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>; }
function IcoBell(p)     { return <svg {...p} viewBox="0 0 24 24" fill="none"><path d="M6 8a6 6 0 0112 0c0 7 3 8 3 8H3s3-1 3-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M10 20a2 2 0 104 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IcoCard(p)     { return <svg {...p} viewBox="0 0 24 24" fill="none"><rect x="2" y="6" width="20" height="13" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M2 10h20M6 15h3M12 15h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>; }
function IcoHelp(p)     { return <svg {...p} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/><path d="M9.5 9a2.5 2.5 0 015 .5c0 2-2.5 2.5-2.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="17" r=".5" fill="currentColor"/></svg>; }
function IcoLogout(p)   { return <svg {...p} viewBox="0 0 24 24" fill="none"><path d="M15 5H5v14h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IcoChevron(p)  { return <svg {...p} viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IcoBolt(p)     { return <svg {...p} viewBox="0 0 24 24" fill="none"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>; }

/* ---------- MenuItem ---------- */
function MenuItem({ icon, iconVariant = '', title, sub, danger, chevron = true, onClick, href }) {
  const Tag = href ? 'a' : 'button';
  return (
    <Tag
      className={`menu-item${danger ? ' danger' : ''}`}
      onClick={onClick}
      href={href}
    >
      <span className={`menu-ico${iconVariant ? ' ' + iconVariant : ''}`}>
        {icon}
      </span>
      <span className="menu-txt">
        <span className="menu-title">{title}</span>
        {sub && <span className="menu-sub">{sub}</span>}
      </span>
      {chevron && <IcoChevron className="menu-chev" width="16" height="16" />}
    </Tag>
  );
}

/* ---------- App ---------- */
function App() {
  const [stats, setStats]     = useState({ total: 0, completed: 0, kwh: 0 });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Read session
  const custId    = auth.custId();
  const managerId = auth.managerId();
  const role      = auth.role() || 'customer';

  // Derived display values (live from backend when available)
  const name     = profile
    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'User'
    : 'Loading…';
  const email    = profile?.email || '';
  const phone    = profile?.phone || '';
  const carModel = profile?.car_model || '';
  const taxId    = profile?.tax_id || '';
  const initials = profile ? getInitials(name) : '··';

  useEffect(() => {
    const profilePromise = role === 'manager' && managerId
      ? api.getManagerProfile(managerId)
      : custId
        ? api.getCustomerProfile(custId)
        : Promise.resolve(null);

    const statsPromise = custId
      ? api.getBookingHistory(custId).then(data => {
          const list = (data || []);
          const completed = list.filter(b => (b.booking_status || '').toLowerCase() === 'completed');
          const kwh = completed.reduce((sum, b) => sum + Number(b.total_kwh || 0), 0);
          return { total: list.length, completed: completed.length, kwh: Math.round(kwh) };
        })
      : Promise.resolve({ total: 0, completed: 0, kwh: 0 });

    Promise.all([
      profilePromise.catch(() => null),
      statsPromise.catch(() => ({ total: 0, completed: 0, kwh: 0 })),
    ]).then(([p, s]) => {
      setProfile(p);
      setStats(s);
      setLoading(false);
    });
  }, [custId, managerId, role]);

  function handleLogout() {
    if (!window.confirm('Log out of EV Charger?')) return;
    auth.clear();
    window.location.href = '../login/index.html';
  }

  return (
    <>
      <div className="app">
        {/* Topbar */}
        <header className="topbar">
          <a className="brand" href="../find-stations/index.html">
            <BrandMark />
            <span>EV Charger</span>
          </a>
          <div className="avatar" role="button" aria-label="Account">
            {initials}
          </div>
        </header>

        {/* Identity hero */}
        <section className="profile-hero reveal">
          <div className="identity">
            <div className="id-avatar" aria-hidden="true">{initials}</div>
            <div className="id-info">
              <div className="id-name">{name}<em>.</em></div>
              <div className="id-email">{email}</div>
              <span className="id-badge">{role}</span>
            </div>
          </div>
        </section>

        {/* Stats strip */}
        <div className="stats-strip reveal">
          <div className="stat-cell">
            <span className="stat-lbl">Bookings</span>
            <span className="stat-val">
              {loading ? '—' : stats.total}
            </span>
          </div>
          <div className="stat-cell">
            <span className="stat-lbl">Completed</span>
            <span className="stat-val">
              {loading ? '—' : stats.completed}
            </span>
          </div>
          <div className="stat-cell">
            <span className="stat-lbl">Energy</span>
            <span className="stat-val">
              {loading ? '—' : <>{stats.kwh}<small>kWh</small></>}
            </span>
          </div>
        </div>

        {/* User info + logout */}
        <div className="sections reveal">

          <div className="info-card">
            <span className="info-card-label">User Information</span>

            <div className="info-row">
              <span className="info-key">Phone</span>
              <span className="info-val">{loading ? '—' : (phone || '—')}</span>
            </div>

            <div className="info-row">
              <span className="info-key">{role === 'manager' ? 'Tax ID' : 'Vehicle Model'}</span>
              <span className="info-val">
                {loading ? '—' : (role === 'manager' ? (taxId || '—') : (carModel || '—'))}
              </span>
            </div>
          </div>

          <button className="logout-btn-full" onClick={handleLogout}>
            <IcoLogout width="16" height="16" />
            Log out
          </button>

          <p className="version-tag">EV Charger · v1.0.0</p>
        </div>
      </div>

      <BottomNav active="profile" paths={{
        home:     '../find-stations/index.html',
        bookings: '../booking-history/index.html',
        profile:  '#',
      }} />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
