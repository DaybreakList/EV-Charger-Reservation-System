/* =============================================================
   APP CONFIG — exposed as window.EV_CONFIG
   Loaded before api.js / page scripts. Keep secrets out of
   anything you commit; for production restrict the Maps key
   by HTTP referrer in Google Cloud Console.
   ============================================================= */
window.EV_CONFIG = {
  API_BASE: 'http://localhost:8000',
  GOOGLE_MAPS_API_KEY: 'AIzaSyDKPJJZhwez6odUpVILepQZ7rBTkJHdRVY',
  DEFAULT_MAP_CENTER: { lat: 13.7563, lng: 100.5018 }, // Bangkok
  DEFAULT_MAP_ZOOM: 13,
};
