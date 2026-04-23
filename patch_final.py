with open(r'd:\Ev_project\Frontend\Station Booking.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ── Block 1: Replace <script> header through end of buildSlotsFor ──
b1_start = content.find('<script type="text/babel" data-presets="react">')
b1_end   = content.find('/* Today + next 6 days */')
assert b1_start != -1 and b1_end != -1, "Block 1 anchors not found"

new1 = """<script type="text/babel" data-presets="react">
const { useState, useEffect, useMemo, useRef } = React;

const API_BASE = 'http://127.0.0.1:8000';

function normalizeStation(s) {
  return {
    id: String(s.station_id),
    station_id: s.station_id,
    name: s.name,
    address: s.address || '',
    status: (s.status || 'Active').toLowerCase(),
    operator: s.manager_name || 'EV Charger',
  };
}

function normalizeCharger(c) {
  const st = (c.status || 'available').toLowerCase();
  const statusMap = { 'out of service': 'offline' };
  return {
    id: String(c.charger_id),
    charger_id: c.charger_id,
    typeName: c.type_name,
    standard: c.charging_standard,
    maxKw: c.max_power_kw,
    ratePerKwh: c.rate_per_kwh,
    status: statusMap[st] || st,
  };
}

function normalizeSlot(s) {
  const d = new Date(s.start_time);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return {
    startIso: s.start_time,
    label: hh + ':' + mm,
    durationMin: 45,
    taken: !s.available,
  };
}

"""
content = new1 + content[b1_end:]
print("Block 1 done. API_BASE:", content.count('API_BASE'))

# ── Block 2: Replace App function state through just before return ( ──
b2_start = content.find('\nfunction App() {')
b2_end   = content.find('\n  return (', b2_start)
assert b2_start != -1 and b2_end != -1, "Block 2 anchors not found"

new2 = """
function App() {
  const stationId = useMemo(() => {
    const p = new URLSearchParams(window.location.search);
    return parseInt(p.get('id')) || null;
  }, []);
  const custId = useMemo(() => parseInt(localStorage.getItem('cust_id')) || null, []);

  const dates = useMemo(() => buildDates(), []);
  const [selectedCharger, setSelectedCharger] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dates[0].iso);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [toast, setToast] = useState(null);
  const [station, setStation] = useState(null);
  const [chargers, setChargers] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingErr, setBookingErr] = useState('');

  useEffect(() => {
    if (!stationId) return;
    Promise.all([
      fetch(API_BASE + '/stations/' + stationId).then(r => r.json()),
      fetch(API_BASE + '/station/' + stationId + '/chargers/').then(r => r.json()),
    ]).then(([st, ch]) => {
      setStation(normalizeStation(st));
      setChargers(ch.map(normalizeCharger));
    }).catch(() => {});
  }, [stationId]);

  useEffect(() => {
    if (!selectedCharger) { setSlots([]); return; }
    setLoadingSlots(true);
    const now = new Date();
    fetch(API_BASE + '/chargers/' + selectedCharger + '/available-slots?date=' + selectedDate)
      .then(r => r.json())
      .then(data => {
        const normalized = data.map(normalizeSlot).filter(s => new Date(s.startIso) >= now);
        setSlots(normalized);
        setLoadingSlots(false);
      })
      .catch(() => setLoadingSlots(false));
  }, [selectedCharger, selectedDate]);

  useEffect(() => { setSelectedSlot(null); }, [selectedCharger, selectedDate]);

  const chargerObj = chargers.find(c => c.id === selectedCharger);
  const slotObj = slots.find(s => s.startIso === selectedSlot);
  const dateObj = dates.find(d => d.iso === selectedDate);

  const canConfirm = !!(selectedCharger && selectedSlot);

  async function handleConfirm() {
    if (!canConfirm || !custId) return;
    setBookingErr('');
    try {
      const res = await fetch(API_BASE + '/bookings/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cust_id: custId,
          charger_id: parseInt(selectedCharger),
          start_time: selectedSlot,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        setBookingErr(d.detail || 'Booking failed. Please try again.');
        return;
      }
      const stName = station ? station.name.split(' ').slice(0, 2).join(' ') : 'the station';
      setToast({
        key: Date.now(),
        chargerId: chargerObj ? chargerObj.typeName : selectedCharger,
        dateLabel: dateObj.isToday ? 'Today' : dateObj.dow.charAt(0) + dateObj.dow.slice(1).toLowerCase() + ' ' + dateObj.dnum,
        timeLabel: slotObj.label,
        stationName: stName,
      });
      setSelectedSlot(null);
    } catch (err) {
      setBookingErr('Cannot connect to server. Please try again.');
    }
  }

  // scroll booking panel into view on mobile after picking charger
  const bookingRef = useRef(null);
  useEffect(() => {
    if (selectedCharger && bookingRef.current && window.innerWidth < 960) {
      const el = bookingRef.current;
      setTimeout(() => {
        const y = el.getBoundingClientRect().top + window.scrollY - 72;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 120);
    }
  }, [selectedCharger]);
"""
content = content[:b2_start] + new2 + content[b2_end:]
print("Block 2 done. stationId:", content.count('stationId'))

# ── Block 3: Fix remaining MOCK_STATION JSX refs ──
content = content.replace('data-station-id={MOCK_STATION.id}>', "data-station-id={station ? station.id : ''}>", 1)
content = content.replace('{MOCK_STATION.id}', "{station ? station.id : '...'}", 1)
content = content.replace('{MOCK_STATION.address}', "{station ? station.address : ''}", 1)
content = content.replace('<h1 className="title">Green Park <em>Charger.</em></h1>',
"""<h1 className="title">
            {station ? (
              <>
                {station.name.split(' ').slice(0,-1).join(' ')}{' '}
                <em>{station.name.split(' ').slice(-1)[0]}.</em>
              </>
            ) : 'Loading...'}
          </h1>""", 1)
print("Block 3 done. MOCK_STATION remaining:", content.count('MOCK_STATION'))

# ── Block 4: MOCK_CHARGERS.find in old App (replace line referencing it) ──
content = content.replace('const chargerObj = MOCK_CHARGERS.find(c => c.id === selectedCharger);',
                          'const chargerObj = chargers.find(c => c.id === selectedCharger);', 1)
print("Block 4 done. MOCK_CHARGERS remaining:", content.count('MOCK_CHARGERS'))

with open(r'd:\Ev_project\Frontend\Station Booking.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nFile saved. Summary:")
for k in ['API_BASE','normalizeStation','stationId','custId','handleConfirm','MOCK_STATION','MOCK_CHARGERS','buildSlotsFor','chargers.map','loadingSlots','bookingErr']:
    print(f"  {k}: {content.count(k)}")
