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

  /* ---------- Expose ---------- */
  window.EVShared = { BrandMark, Ico, BottomNav, Modal };
})();
