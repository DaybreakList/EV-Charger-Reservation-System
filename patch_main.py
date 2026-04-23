with open(r'd:\Ev_project\main.py', 'r', encoding='utf-8') as f:
    content = f.read()

old = '''    result = db.execute(query)
    stations = result.mappings().all()
    return stations

@app.get("/managers/{manager_id}/stations"'''

new = '''    result = db.execute(query)
    stations = result.mappings().all()
    return stations

@app.get("/stations/{station_id}", response_model=schemas.StationResponse)
def get_station(station_id: int, db: Session = Depends(get_db)):
    query = text("""
        SELECT s.station_id, s.name, s.address, s.status,
               u.first_name || ' ' || u.last_name AS manager_name
        FROM stations s
        LEFT JOIN managers m ON s.manager_id = m.manager_id
        LEFT JOIN users u ON m.user_id = u.user_id
        WHERE s.station_id = :station_id
    """)
    result = db.execute(query, {"station_id": station_id}).mappings().fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Station not found")
    return result

@app.get("/managers/{manager_id}/stations"'''

assert old in content, "OLD TEXT NOT FOUND IN MAIN.PY"
content = content.replace(old, new, 1)

with open(r'd:\Ev_project\main.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("main.py patched OK")
