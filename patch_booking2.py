with open(r'd:\Ev_project\Frontend\Station Booking.html', 'r', encoding='utf-8') as f:
    content = f.read()

# ── 6. Slot count loading state ──
old6 = '''                      {selectedCharger
                        ? <>{slots.filter(s=>!s.taken).length} <em>open</em> · {slots.filter(s=>s.taken).length} taken</>
                        : 'Pick a charger'}'''
new6 = '''                      {loadingSlots ? 'Loading...' : selectedCharger
                        ? <>{slots.filter(s=>!s.taken).length} <em>open</em> · {slots.filter(s=>s.taken).length} taken</>
                        : 'Pick a charger'}'''
assert old6 in content, "BLOCK 6 NOT FOUND: " + repr(content[content.find('Pick a charger')-120:content.find('Pick a charger')+20])
content = content.replace(old6, new6, 1)

# ── 7. SlotGrid remove buildSlotsFor fallback ──
old7 = "                    slots={slots.length ? slots : buildSlotsFor('CHG-A01', selectedDate)}"
new7 = '                    slots={slots}'
assert old7 in content, "BLOCK 7 NOT FOUND"
content = content.replace(old7, new7, 1)

# ── 8. Toast: replace MOCK_STATION.name reference ──
old8 = "          <div style={{ marginTop: 2 }}>See you at {MOCK_STATION.name.split(' ').slice(0,2).join(' ')}. A reminder will land 15 min before.</div>"
new8 = "          <div style={{ marginTop: 2 }}>See you at {payload.stationName || 'the station'}. A reminder will land 15 min before.</div>"
assert old8 in content, "BLOCK 8 NOT FOUND"
content = content.replace(old8, new8, 1)

# ── 9. Add booking error display below confirm button ──
old9 = '''            Confirm Booking
            <Ico.ArrowRight className="arrow" width="16" height="16"/>
          </button>
        </div>
      </div>'''
new9 = '''            Confirm Booking
            <Ico.ArrowRight className="arrow" width="16" height="16"/>
          </button>
          {bookingErr && <div style={{color:'var(--danger)',fontSize:12,marginTop:8,textAlign:'center'}}>{bookingErr}</div>}
        </div>
      </div>'''
assert old9 in content, "BLOCK 9 NOT FOUND"
content = content.replace(old9, new9, 1)

with open(r'd:\Ev_project\Frontend\Station Booking.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("Station Booking.html patch2 OK")
