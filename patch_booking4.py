import re

with open(r'd:\Ev_project\Frontend\Station Booking.html', 'r', encoding='utf-8') as f:
    content = f.read()

errors = []

# 1. Replace mock data block + buildSlotsFor
m = re.search(r'<script type="text/babel" data-presets="react">.*?function buildSlotsFor.*?\n\}', content, re.DOTALL)
if not m:
    errors.append("Block 1 not found")
else:
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
}"""
    content = content.replace(m.group(0), new1, 1)
    print("Block 1 done")

# 2. Replace App function state/effects/handleConfirm
i_start = content.find('function App() {\n  const dates = useMemo(() => buildDates(), []);')
i_end_tag = '  }, [selectedCharger]);\n\n  return ('
i_end = content.find(i_end_tag, i_start) if i_start != -1 else -1
if i_start == -1 or i_end == -1:
    errors.append("Block 2 not found")
else:
    old2 = content[i_start:i_end + len(i_end_tag)]
    new2 = """function App() {
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

  return ("""
    content = content.replace(old2, new2, 1)
    print("Block 2 done")

# 3. Station header fixes
if 'data-station-id={MOCK_STATION.id}>' in content:
    content = content.replace('data-station-id={MOCK_STATION.id}>', "data-station-id={station ? station.id : ''}>", 1)
    print("Block 3a done")
else:
    errors.append("Block 3a not found")

content = re.sub(r'\{MOCK_STATION\.id\}', "{station ? station.id : '...'}", content, count=1)

if '<h1 className="title">Green Park <em>Charger.</em></h1>' in content:
    content = content.replace(
        '<h1 className="title">Green Park <em>Charger.</em></h1>',
        """<h1 className="title">
            {station ? (
              <>
                {station.name.split(' ').slice(0,-1).join(' ')}{' '}
                <em>{station.name.split(' ').slice(-1)[0]}.</em>
              </>
            ) : 'Loading...'}
          </h1>""", 1)
    print("Block 3c done")
else:
    errors.append("Block 3c h1 not found")

content = re.sub(r'\{MOCK_STATION\.address\}', "{station ? station.address : ''}", content, count=1)
content = re.sub(r'<span className="badge">4 chargers</span>', '<span className="badge">{chargers.length} chargers</span>', content, count=1)
content = re.sub(r'<span className="badge">2 AC [^\<]+2 DC</span>', "<span className=\"badge\">{chargers.filter(c=>c.standard==='AC').length} AC \\xb7 {chargers.filter(c=>c.standard==='DC').length} DC</span>", content, count=1)
content = re.sub(r'\{MOCK_STATION\.operator\}', "{station ? station.operator : ''}", content, count=1)
print("Block 3 done")

# 4. Charger list
content = content.replace('{MOCK_CHARGERS.map(c => (', '{chargers.map(c => (', 1)
if 'chargers.map' in content:
    print("Block 4 done")
else:
    errors.append("Block 4 not found")

# 5. Charger hint
m5 = re.search(r'\{selectedCharger \? `Charger . \$\{selectedCharger\}` : .Select charger first.\}', content)
if m5:
    content = content.replace(m5.group(0), "{chargerObj ? 'Charger \xb7 ' + chargerObj.typeName : 'Select charger first'}", 1)
    print("Block 5 done")
elif 'chargerObj.typeName' in content:
    print("Block 5 already applied")
else:
    errors.append("Block 5 charger hint not found")

with open(r'd:\Ev_project\Frontend\Station Booking.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("File saved.")
if errors:
    for e in errors:
        print("WARNING:", e)
print("MOCK_ remaining:", len(re.findall(r'MOCK_', content)))
print("API_BASE:", content.count('API_BASE'))
print("stationId:", content.count('stationId'))
