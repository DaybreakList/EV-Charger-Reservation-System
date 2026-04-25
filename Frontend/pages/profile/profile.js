/* =============================================================
   PROFILE — page script
   Reads auth session from localStorage, displays account info,
   stats pulled from booking history, and provides logout.
   ============================================================= */

const { useState, useEffect } = React;
const { BrandMark, Ico, BottomNav, ProfileEditModal, Toast } = window.EVShared;
const { api, auth } = window.EVApi;

/* ---------- Helpers ---------- */
function getInitials(name) {
  if (!name) return 'JD';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ---------- Icons (page-local) ---------- */
function IcoLogout(p)   { return <svg {...p} viewBox="0 0 24 24" fill="none"><path d="M15 5H5v14h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 8l4 4-4 4M18 12H9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }
function IcoChevron(p)  { return <svg {...p} viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>; }

/* ---------- App ---------- */
function App() {
  const [stats, setStats]     = useState({ total: 0, completed: 0, kwh: 0 });
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [toast, setToast]       = useState(null);
  const [reloadTick, setReloadTick] = useState(0);

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
  }, [custId, managerId, role, reloadTick]);

  function handleSaved(msg) {
    setEditOpen(false);
    setToast(msg);
    setReloadTick(t => t + 1);
  }

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

          <button
            className="action-btn"
            onClick={() => setEditOpen(true)}
            disabled={loading || !profile}
          >
            <span className="ico" aria-hidden="true"><Ico.Edit width="16" height="16"/></span>
            <span className="txt">
              <span className="t1">Edit profile</span>
              <span className="t2">Update name, email, phone{role === 'manager' ? ', tax ID' : ', car model'}</span>
            </span>
            <IcoChevron className="chev" width="16" height="16"/>
          </button>

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

      {editOpen && profile && (
        <ProfileEditModal
          profile={profile}
          role={role}
          onClose={() => setEditOpen(false)}
          onSaved={handleSaved}
        />
      )}

      <Toast message={toast} onClose={() => setToast(null)}/>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
