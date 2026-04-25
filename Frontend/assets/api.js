/* =============================================================
   EV CHARGER — API CLIENT
   Wraps fetch() with JWT auth + JSON handling. Exposed on
   window.EVApi so page scripts can call:
     const { api, auth } = window.EVApi;
     const data = await api.getStations();
   ============================================================= */
(function () {
  const BASE = (window.EV_CONFIG && window.EV_CONFIG.API_BASE) || 'http://localhost:8000';

  /* ---------- Auth / session storage ---------- */
  const auth = {
    setSession({ access_token, role, cust_id, manager_id }) {
      if (access_token) localStorage.setItem('ev_token', access_token);
      if (role)         localStorage.setItem('ev_role', role);
      if (cust_id != null)    localStorage.setItem('ev_cust_id', String(cust_id));
      if (manager_id != null) localStorage.setItem('ev_manager_id', String(manager_id));
    },
    clear() {
      ['ev_token','ev_role','ev_cust_id','ev_manager_id'].forEach(k => localStorage.removeItem(k));
    },
    token()     { return localStorage.getItem('ev_token'); },
    role()      { return localStorage.getItem('ev_role'); },
    custId()    { const v = localStorage.getItem('ev_cust_id');    return v ? Number(v) : null; },
    managerId() { const v = localStorage.getItem('ev_manager_id'); return v ? Number(v) : null; },
    isLoggedIn() { return !!localStorage.getItem('ev_token'); },
  };

  /* ---------- Core request helper ---------- */
  async function request(path, { method = 'GET', body, query } = {}) {
    let url = `${BASE}${path}`;
    if (query && Object.keys(query).length) {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) qs.append(k, String(v));
      }
      url += `?${qs.toString()}`;
    }
    const headers = { 'Content-Type': 'application/json' };
    const token = auth.token();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      data = await res.json().catch(() => null);
    } else {
      data = await res.text().catch(() => null);
    }

    if (!res.ok) {
      const detail = (data && (data.detail || data.message)) || res.statusText || 'Request failed';
      const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
      err.status = res.status;
      err.body = data;
      throw err;
    }
    return data;
  }

  /* ---------- Endpoint wrappers ---------- */
  const api = {
    /* Auth */
    login(email, password) {
      return request('/login/', { method: 'POST', body: { email, password } });
    },
    registerCustomer(user_data, cust_data) {
      return request('/register/customer/', {
        method: 'POST',
        body: { user_data, cust_data },
      });
    },
    registerManager(user_data, mgr_data) {
      return request('/register/manager/', {
        method: 'POST',
        body: { user_data, mgr_data },
      });
    },

    /* Profiles */
    getCustomerProfile(custId)       { return request(`/customers/${custId}`); },
    getManagerProfile(managerId)     { return request(`/managers/${managerId}`); },
    updateUser(userId, patch)        { return request(`/users/${userId}`,            { method: 'PATCH', body: patch }); },
    updateCustomer(custId, patch)    { return request(`/customers/${custId}`,        { method: 'PATCH', body: patch }); },
    updateManager(managerId, patch)  { return request(`/managers/${managerId}`,      { method: 'PATCH', body: patch }); },

    /* Stations */
    getAllStations()                 { return request('/stations'); },
    getStationsByManager(managerId)  { return request(`/managers/${managerId}/stations`); },
    getNearbyStations(lat, lng)      { return request('/stations/nearby', { query: { lat, lng } }); },
    addStation(managerId, station) {
      return request('/stations/', { method: 'POST', query: { manager_id: managerId }, body: station });
    },
    updateStation(stationId, managerId, patch) {
      return request(`/stations/${stationId}`, { method: 'PATCH', query: { manager_id: managerId }, body: patch });
    },
    getStationTodaySummary(stationId) { return request(`/stations/${stationId}/today-summary`); },

    /* Chargers */
    getChargerTypes()                { return request('/charger-types/'); },
    getChargersByStation(stationId)  { return request(`/station/${stationId}/chargers/`); },
    addCharger(stationId, charger) {
      return request(`/stations/${stationId}/chargers/`, { method: 'POST', body: charger });
    },
    updateCharger(chargerId, managerId, patch) {
      return request(`/chargers/${chargerId}`, { method: 'PATCH', query: { manager_id: managerId }, body: patch });
    },
    deleteCharger(chargerId, managerId) {
      return request(`/chargers/${chargerId}`, { method: 'DELETE', query: { manager_id: managerId } });
    },
    getAvailableSlots(chargerId, date) {
      return request(`/chargers/${chargerId}/available-slots`, { query: { date } });
    },

    /* Bookings */
    createBooking(payload)           { return request('/bookings/', { method: 'POST', body: payload }); },
    cancelBooking(bookingId)         { return request(`/bookings/${bookingId}/cancel`, { method: 'PATCH' }); },
    getBookingHistory(custId)        { return request(`/bookings/history/${custId}`); },

    /* Payments */
    payBooking(bookingId, payment_method) {
      return request(`/payments/${bookingId}/pay`, { method: 'PATCH', body: { payment_method } });
    },
  };

  /* ---------- Google Maps loader (idempotent) ---------- */
  let mapsPromise = null;
  function loadGoogleMaps() {
    if (mapsPromise) return mapsPromise;
    if (window.google && window.google.maps) {
      mapsPromise = Promise.resolve(window.google);
      return mapsPromise;
    }
    const key = window.EV_CONFIG && window.EV_CONFIG.GOOGLE_MAPS_API_KEY;
    if (!key) return Promise.reject(new Error('Missing GOOGLE_MAPS_API_KEY in config.js'));
    mapsPromise = new Promise((resolve, reject) => {
      const cbName = `__evGmapsReady_${Date.now()}`;
      window[cbName] = () => { resolve(window.google); delete window[cbName]; };
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&callback=${cbName}`;
      s.async = true;
      s.defer = true;
      s.onerror = () => reject(new Error('Failed to load Google Maps JS API'));
      document.head.appendChild(s);
    });
    return mapsPromise;
  }

  window.EVApi = { api, auth, loadGoogleMaps };
})();
