with open(r'd:\Ev_project\Frontend\Station Booking.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 1. Replace mock data block + buildSlotsFor with API_BASE + normalize fns ──
old1 = '''<script type="text/babel" data-presets="react">
const { useState, useEffect, useMemo, useRef } = React;

/* =============================================================
   MOCK DATA — replace with API call when backend is ready.

   // TODO (backend integration):
   //   const res = await fetch(`/api/stations/${id}`);
   //   const { station, chargers } = await res.json();
   //   const slotRes = await fetch(`/api/chargers/${chargerId}/slots?date=${dateIso}`);
   //   const { slots } = await slotRes.json();
   ============================================================= */

const MOCK_STATION = {
  id: 'EVC-2041',
  name: 'Green Park Charger',
  address: '88 Sukhumvit Soi 24, Khlong Tan, Bangkok 10110',
  status: 'active',
  operator: 'EV Charger Network',
};

const MOCK_CHARGERS = [
  {
    id: 'CHG-A01',
    typeName: 'CCS Combo 2',
    standard: 'DC',          // AC | DC
    maxKw: 150,
    ratePerKwh: 8.5,         // THB per kWh
    status: 'available',     // available | busy | offline
    connectorIcon: 'ccs',
  },
  {
    id: 'CHG-A02',
    typeName: 'CHAdeMO',
    standard: 'DC',
    maxKw: 50,
    ratePerKwh: 7.9,
    status: 'busy',
    connectorIcon: 'chademo',
  },
  {
    id: 'CHG-B01',
    typeName: 'Type 2 AC',
    standard: 'AC',
    maxKw: 22,
    ratePerKwh: 6.5,
    status: 'available',
    connectorIcon: 'type2',
  },
  {
    id: 'CHG-B02',
    typeName: 'Type 2 AC',
    standard: 'AC',
    maxKw: 11,
    ratePerKwh: 5.9,
    status: 'offline',
    connectorIcon: 'type2',
  },
];

/* 45-minute slots from 08:00 to 22:00 — taken flags keyed by charger+date */
function buildSlotsFor(chargerId, dateIso) {
  const slots = [];'''

if old1 not in content:
    # Try to debug
    idx = content.find('MOCK_STATION')
    print("MOCK_STATION context:", repr(content[idx-50:idx+100]))
    idx2 = content.find('text/babel')
    print("script tag context:", repr(content[idx2-5:idx2+60]))
    raise AssertionError("BLOCK 1 start not found")

# Find the end of buildSlotsFor
import re
m = re.search(r'function buildSlotsFor\(.*?\n\}', content, re.DOTALL)
if not m:
    raise AssertionError("buildSlotsFor end not found")
old1_full = content[content.find('<script type="text/babel" data-presets="react">'):m.end()]
print("old1_full length:", len(old1_full))
print("old1_full end:", repr(old1_full[-50:]))

new1 = '''<script type="text/babel" data-presets="react">
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
}'''

content = content.replace(old1_full, new1, 1)
print("Block 1 done. API_BASE present:", 'API_BASE' in content)

# ── 2. Replace App function state/effects/handleConfirm ──
old2_start = 'function App() {\n  const dates = useMemo(() => buildDates(), []);'
old2_end = '  }, [selectedCharger]);\n\n  return ('

if old2_start not in content:
    raise AssertionError("BLOCK 2 start not found")
if old2_end not in content:
    raise AssertionError("BLOCK 2 end not found")

i_start = content.find(old2_start)
i_end = content.find(old2_end, i_start) + len(old2_end)
old2_full = content[i_start:i_end]
print("old2 from", i_start, "to", i_end)

new2 = '''function App() {
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

  return ('''

content = content.replace(old2_full, new2, 1)
print("Block 2 done. stationId present:", 'stationId' in content)

# ── 3. Station header section tag ──
old3 = '<section className="station-head reveal" id="station-header" data-station-id={MOCK_STATION.id}>'
new3 = "<section className=\"station-head reveal\" id=\"station-header\" data-station-id={station ? station.id : ''}>"
assert old3 in content, "BLOCK 3a NOT FOUND"
content = content.replace(old3, new3, 1)

old3b = '          <span className="eyebrow">Station detail \xc2\xb7 {MOCK_STATION.id}</span>'
new3b = "          <span className=\"eyebrow\">Station detail \xc2\xb7 {station ? station.id : '...'}</span>"
if old3b not in content:
    old3b = '          <span className="eyebrow">Station detail · {MOCK_STATION.id}</span>'
    new3b = "          <span className=\"eyebrow\">Station detail · {station ? station.id : '...'}</span>"
assert old3b in content, "BLOCK 3b NOT FOUND: " + repr(content[content.find('Station detail'):content.find('Station detail')+60])
content = content.replace(old3b, new3b, 1)

old3c = '          <h1 className="title">Green Park <em>Charger.</em></h1>'
new3c = '''          <h1 className="title">
            {station ? (
              <>
                {station.name.split(' ').slice(0,-1).join(' ')}{' '}
                <em>{station.name.split(' ').slice(-1)[0]}.</em>
              </>
            ) : 'Loading...'}
          </h1>'''
assert old3c in content, "BLOCK 3c NOT FOUND"
content = content.replace(old3c, new3c, 1)

old3d = '            <span>{MOCK_STATION.address}</span>'
new3d = '            <span>{station ? station.address : \'\'}</span>'
assert old3d in content, "BLOCK 3d NOT FOUND"
content = content.replace(old3d, new3d, 1)

old3e = '            <span className="badge">4 chargers</span>\n            <span className="badge">2 AC \xc2\xb7 2 DC</span>\n            <span className="badge">Operator \xc2\xb7 {MOCK_STATION.operator}</span>'
new3e = "            <span className=\"badge\">{chargers.length} chargers</span>\n            <span className=\"badge\">{chargers.filter(c=>c.standard==='AC').length} AC \xc2\xb7 {chargers.filter(c=>c.standard==='DC').length} DC</span>\n            <span className=\"badge\">Operator \xc2\xb7 {station ? station.operator : ''}</span>"
if old3e not in content:
    # try without encoding
    old3e = "            <span className=\"badge\">4 chargers</span>\n            <span className=\"badge\">2 AC · 2 DC</span>\n            <span className=\"badge\">Operator · {MOCK_STATION.operator}</span>"
    new3e = "            <span className=\"badge\">{chargers.length} chargers</span>\n            <span className=\"badge\">{chargers.filter(c=>c.standard==='AC').length} AC · {chargers.filter(c=>c.standard==='DC').length} DC</span>\n            <span className=\"badge\">Operator · {station ? station.operator : ''}</span>"
assert old3e in content, "BLOCK 3e NOT FOUND: " + repr(content[content.find('4 chargers')-10:content.find('4 chargers')+100])
content = content.replace(old3e, new3e, 1)

print("Block 3 done.")

# ── 4. Charger list MOCK_CHARGERS.map ──
old4 = '              {MOCK_CHARGERS.map(c => ('
new4 = '              {chargers.map(c => ('
assert old4 in content, "BLOCK 4 NOT FOUND"
content = content.replace(old4, new4, 1)
print("Block 4 done.")

# ── 5. Booking panel charger hint ──
# Find the exact text around 'Select charger first'
idx = content.find("'Select charger first'")
chunk = content[idx-80:idx+30]
print("Block 5 context:", repr(chunk))

old5 = "                {chargerObj ? 'Charger \xc2\xb7 ' + chargerObj.typeName : 'Select charger first'}"
if old5 in content:
    print("Block 5 already applied, skipping.")
else:
    # Need to find the charger hint line and replace it
    # The hint is inside the booking panel section header
    import re
    m5 = re.search(r'\{selectedCharger \? `Charger [^\`]+` : .Select charger first.\}', content)
    if m5:
        old5_real = m5.group(0)
        new5_real = "{chargerObj ? 'Charger \xc2\xb7 ' + chargerObj.typeName : 'Select charger first'}"
        if '\xc2\xb7' not in new5_real:
            new5_real = "{chargerObj ? 'Charger · ' + chargerObj.typeName : 'Select charger first'}"
        content = content.replace(old5_real, new5_real, 1)
        print("Block 5 done (regex).")
    else:
        # Check if already using chargerObj
        m5b = re.search(r'\{.*?chargerObj.*?Select charger first.*?\}', content)
        if m5b:
            print("Block 5 already updated:", m5b.group(0))
        else:
            print("WARNING: Block 5 not found, showing context:")
            idx2 = content.find('Select charger first')
            print(repr(content[idx2-100:idx2+30]))

with open(r'd:\Ev_project\Frontend\Station Booking.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("\nFinal check:")
for k in ['API_BASE', 'normalizeStation', 'stationId', 'MOCK_STATION', 'MOCK_CHARGERS', 'buildSlotsFor', 'chargers.map']:
    print(f'  {k}: {content.count(k)}')
