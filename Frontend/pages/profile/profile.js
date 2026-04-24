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
  const [stats, setStats] = useState({ total: 0, completed: 0, kwh: 0 });
  const [loading, setLoading] = useState(true);

  // Read session
  const custId   = auth.custId();
  const role     = auth.role() || 'customer';
  // Derive display name from email or fall back
  const rawEmail = localStorage.getItem('ev_email') || '';
  const name     = localStorage.getItem('ev_name')  || rawEmail.split('@')[0] || 'John Doe';
  const email    = rawEmail || 'user@example.com';
  const initials = getInitials(name);

  useEffect(() => {
    if (!custId) { setLoading(false); return; }
    api.getBookingHistory(custId)
      .then(data => {
        const list = (data || []);
        const completed = list.filter(b => (b.booking_status || '').toLowerCase() === 'completed');
        const kwh = completed.reduce((sum, b) => sum + Number(b.total_kwh || 0), 0);
        setStats({ total: list.length, completed: completed.length, kwh: Math.round(kwh) });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [custId]);

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

        {/* Menu sections */}
        <div className="sections reveal">

          {/* Account */}
          <span className="section-label">Account</span>
          <nav className="menu-list">
            <MenuItem
              icon={<IcoUser width="18" height="18" />}
              iconVariant="accent"
              title="Personal info"
              sub="Name, email, phone number"
            />
            <MenuItem
              icon={<IcoShield width="18" height="18" />}
              title="Security"
              sub="Password, 2-factor auth"
            />
            <MenuItem
              icon={<IcoCard width="18" height="18" />}
              title="Payment methods"
              sub="Cards, Prompt Pay, wallets"
            />
          </nav>

          {/* Preferences */}
          <span className="section-label">Preferences</span>
          <nav className="menu-list">
            <MenuItem
              icon={<IcoBell width="18" height="18" />}
              iconVariant="warning"
              title="Notifications"
              sub="Booking reminders, promotions"
            />
            <MenuItem
              icon={<IcoBolt width="18" height="18" />}
              iconVariant="accent"
              title="Charging preferences"
              sub="Default connector, max power"
            />
          </nav>

          {/* Support */}
          <span className="section-label">Support</span>
          <nav className="menu-list">
            <MenuItem
              icon={<IcoHelp width="18" height="18" />}
              title="Help & FAQ"
              sub="Guides, contact support"
            />
          </nav>

          {/* Danger zone */}
          <nav className="menu-list logout-row">
            <MenuItem
              icon={<IcoLogout width="18" height="18" />}
              iconVariant="danger"
              title="Log out"
              danger={true}
              chevron={false}
              onClick={handleLogout}
            />
          </nav>

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
