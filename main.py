from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas
from database import get_db, SessionLocal
from sqlalchemy import text
import bcrypt
from jose import jwt #for Create JWT token
from datetime import datetime, timedelta #for JWT expiration
from zoneinfo import ZoneInfo

TZ_BANGKOK = ZoneInfo("Asia/Bangkok")
from apscheduler.schedulers.background import BackgroundScheduler

MANAGER_INVITE_CODE = "ajarnjack"
SECRET_KEY = "ev_charger_secret_2024"
ALGORITHM = "HS256"

app = FastAPI()
'''
# Not use? #
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
'''

def auto_complete_bookings():
    db = SessionLocal()
    try:
        sql_find = text("""
            SELECT b.booking_id, b.start_time, b.end_time,
                   b.rate_per_kwh_snapshot, ct.max_power_kw
            FROM bookings b
            JOIN chargers c ON b.charger_id = c.charger_id
            JOIN charger_types ct ON c.type_id = ct.type_id
            WHERE b.booking_status = 'Pending'
            AND b.end_time < NOW()
        """)
        expired = db.execute(sql_find).fetchall()

        for row in expired:
            booking_id, start_time, end_time, rate, max_power_kw = row
            duration_hours = (end_time - start_time).total_seconds() / 3600
            total_kwh = round(float(max_power_kw) * duration_hours, 2)
            amount = round(total_kwh * float(rate), 2)

            db.execute(text("""
                UPDATE bookings SET booking_status = 'Completed', total_kwh = :total_kwh
                WHERE booking_id = :booking_id
            """), {"total_kwh": total_kwh, "booking_id": booking_id})

            db.execute(text("""
                INSERT INTO payments (booking_id, amount, payment_status)
                VALUES (:booking_id, :amount, 'Pending')
            """), {"booking_id": booking_id, "amount": amount})

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Scheduler error: {e}")
    finally:
        db.close()
# Start the scheduler to auto-complete bookings every minute #
scheduler = BackgroundScheduler()
scheduler.add_job(auto_complete_bookings, "interval", minutes=1)
scheduler.start()

@app.post("/login/", response_model=schemas.TokenResponse)
def login(login_data: schemas.LoginRequest, db: Session = Depends(get_db)):
    # -- Find user by email -- #
    sql = text("""SELECT user_id, password, role FROM users WHERE email = :email""")
    user = db.execute(sql, {"email": login_data.email}).fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # -- if user found, verify password -- #
    if not bcrypt.checkpw(login_data.password.encode('utf-8'), user[1].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # -- Create JWT token -- #
    token_data = {
        "user_id": user[0],
        "role": user[2],
        "exp": datetime.utcnow() + timedelta(hours=1) # Token expires in 1 hour
    }

    token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM) # Create JWT token form token_data, SECRET_KEY and ALGORITHM
    return {"access_token": token, "role": user[2]} # Return token and role to client

@app.post("/register/customer/")
def register_customer(user_data: schemas.UserCreate, cust_data: schemas.CustomerCreate, db: Session = Depends(get_db)):
# -- Email Check (SELECT) -- #
    sql_check = text("""
        SELECT email
        FROM users
        WHERE email = :email
    """)
    existing = db.execute(sql_check, {"email": user_data.email}).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    try:
        # -- Record User and pull back User (INSERT and RETURNING) -- #
        sql_user = text("""
            INSERT INTO users (first_name, last_name, email, password, role)
            VALUES (:fname, :lname, :email, :pwd, 'customer')
            RETURNING user_id
        """)
        result = db.execute(sql_user, {
            "fname": user_data.first_name,
            "lname": user_data.last_name,
            "email": user_data.email,
            "pwd": bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        })
        new_user_id = result.fetchone()[0]

        # -- Record Customer -- #
        sql_cust = text("""
            INSERT INTO customers (user_id, phone, car_model)
            VALUES (:uid, :phone, :car)
        """)
        db.execute(sql_cust, {
            "uid": new_user_id,
            "phone": cust_data.phone,
            "car": cust_data.car_model
        })
        db.commit()
        return {"Status": "Success", "user_id": new_user_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/register/manager/")
def register_manager(user_data: schemas.UserCreate, mgr_data: schemas.ManagerCreate, db: Session = Depends(get_db)):
    # -- Check Invite Code -- #
    if mgr_data.invite_code != MANAGER_INVITE_CODE:
        raise HTTPException(status_code=403, detail="Invalid invite code")
    
    # -- Email Check (SELECT) -- #
    sql_check = text("""
        SELECT email
        FROM users
        WHERE email = :email
    """)
    existing = db.execute(sql_check, {"email": user_data.email}).fetchone()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    try:
        # -- Record User -- #
        sql_user = text("""
            INSERT INTO users (first_name, last_name, email, password , role)
            VALUES (:fname, :lname , :email, :pwd, 'manager')
            RETURNING user_id
        """)
        result = db.execute(sql_user, {
            "fname": user_data.first_name,
            "lname": user_data.last_name,
            "email": user_data.email,
            "pwd": bcrypt.hashpw(user_data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        })
        new_user_id = result.fetchone()[0]

        # -- Record Manager -- #
        sql_mgr = text("""
            INSERT INTO managers (user_id, phone, tax_id)
            VALUES (:uid, :phone, :tax_id)
        """)
        db.execute(sql_mgr, {
            "uid": new_user_id,
            "phone": mgr_data.phone,
            "tax_id": mgr_data.tax_id
        })
        db.commit()
        return {"Status": "Success", "user_id": new_user_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stations", response_model=list[schemas.StationResponse])
def get_all_stations(db: Session = Depends(get_db)):
    query = text("""
        SELECT
            s.station_id,
            s.name,
            s.address,
            s.status,
            u.first_name || ' ' || u.last_name AS manager_name
        FROM stations s
        LEFT JOIN managers m ON s.manager_id = m.manager_id
        LEFT JOIN users u ON m.user_id = u.user_id
    """)
    result = db.execute(query)
    stations = result.mappings().all()
    return stations

@app.get("/stations/nearby", response_model=list[schemas.StationNearby])
def get_nearby_stations(lat: float ,lng: float, db: Session = Depends(get_db)):
    # Haversine formula to calculate distance between two lat/lng points
    query = text("""SELECT station_id, name, address, status,
                 ROUND(CAST(
                    6371 * ACOS(
                        COS(RADIANS(:lat)) * COS(RADIANS(latitude)) * 
                        COS(RADIANS(longitude) - RADIANS(:lng)) + 
                        SIN(RADIANS(:lat)) * SIN(RADIANS(latitude))
                    )
                    AS NUMERIC),2) AS distance_km
                FROM stations WHERE status = 'Active'
                AND latitude IS NOT NULL AND longitude IS NOT NULL
                ORDER BY distance_km ASC
                """)
    result = db.execute(query, {"lat": lat, "lng": lng})
    stations = result.mappings().all()
    return stations

@app.post("/charger-types/")
def add_charger_type(charger_type: schemas.ChargerTypeCreate, db: Session = Depends(get_db)):
    sql = text("""
        INSERT INTO charger_types (type_name, max_power_kw, charging_standard)
        VALUES (:type_name, :max_power_kw, :charging_standard)
        Returning type_id
    """)
    result = db.execute(sql, {
        "type_name": charger_type.type_name,
        "max_power_kw": charger_type.max_power_kw,
        "charging_standard": charger_type.charging_standard
    })

    new_type_id = result.fetchone()[0]
    db.commit()
    return {"Status": "Success", "type_id": new_type_id}

@app.post("/stations/")
def add_station(station: schemas.StationBase, manager_id: int, db: Session = Depends(get_db)):
    try:
        sql = text("""
            INSERT INTO stations (manager_id, name, address, latitude, longitude, status)
            VALUES (:manager_id, :name, :address, :lat, :lng, 'Active')
            RETURNING station_id
        """)
        result = db.execute(sql, {
            "manager_id": manager_id,
            "name": station.name,
            "address": station.address,
            "lat": station.latitude,
            "lng": station.longitude
        })
        new_station_id = result.fetchone()[0]
        db.commit()
        return {"Status": "Success", "station_id": new_station_id}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/stations/{station_id}/chargers/")
def add_charger_to_station(station_id: int, charger: schemas.ChargerCreate, db: Session = Depends(get_db)):
    ## -- Check if station exists -- ##
    sql_check = text("""
        SELECT station_id
        FROM stations
        WHERE station_id = :station_id
    """)
    result = db.execute(sql_check, {"station_id": station_id}).fetchone()
    if not result:
        raise HTTPException(status_code=404, detail="Station not found")

    try:
        sql = text("""
                INSERT INTO chargers (station_id, type_id, rate_per_kwh,status)
                VALUES (:station_id, :type_id, :rate_per_kwh, 'Available')
                RETURNING charger_id
        """)
        result = db.execute(sql, {
            "station_id": station_id,
            "type_id": charger.type_id,
            "rate_per_kwh": charger.rate_per_kwh
        })
        new_charger_id = result.fetchone()[0]
        db.commit()
        return {"Status": "Success", "charger_id": new_charger_id}
    
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/station/{station_id}/chargers/", response_model=list[schemas.ChargerResponse])
def get_chargers_by_station(station_id: int, db: Session = Depends(get_db)):
    query = text("""
                SELECT
                    c.charger_id,
                    c.type_id,
                    ct.type_name,
                    ct.max_power_kw,
                    ct.charging_standard,
                    c.rate_per_kwh,
                    c.status
                FROM chargers c JOIN charger_types ct ON c.type_id = ct.type_id
                WHERE c.station_id = :station_id
            """)
    result = db.execute(query, {"station_id": station_id})
    return result.mappings().all()

@app.post("/bookings/", response_model=schemas.BookingResponse)
def create_booking(booking: schemas.BookingCreate, db: Session = Depends(get_db)):
    # -- Check charger availability and status = Available -- #
    sql_check = text("""
        SELECT charger_id, status, rate_per_kwh
        FROM chargers
        WHERE charger_id = :charger_id
    """)
    charger = db.execute(sql_check, {"charger_id": booking.charger_id}).fetchone()
    if not charger:
        raise HTTPException(status_code=404, detail="Charger not found")
    if charger[1] == "Out of Service":
        raise HTTPException(status_code=400, detail="Charger is out of service")
    
    # -- Check for overlapping bookings -- #
    sql_overlap = text("""
        SELECT booking_id
        FROM bookings
        WHERE charger_id = :charger_id
        AND booking_status NOT IN ('Completed', 'Cancelled')
        AND start_time < :end_time
        AND end_time > :start_time
    """)
    # -- แปลงเวลาจาก user เป็นเวลาไทย -- #
    start_time = booking.start_time.replace(tzinfo=TZ_BANGKOK)
    end_time = booking.end_time.replace(tzinfo=TZ_BANGKOK)

    overlap = db.execute(sql_overlap, {
        "charger_id": booking.charger_id,
        "start_time": start_time,
        "end_time": end_time
    }).fetchone()
    if overlap:
        raise HTTPException(status_code=400, detail="Charger is already booked for the selected time slot")

    try:
        # -- Create booking -- #
        sql_book = text("""
            INSERT INTO bookings (cust_id, charger_id, start_time, end_time, rate_per_kwh_snapshot, booking_status)
            VALUES (:cust_id, :charger_id, :start_time, :end_time, :rate, 'Pending')
            RETURNING booking_id, cust_id, charger_id, start_time, end_time, total_kwh, rate_per_kwh_snapshot, booking_status
        """)
        result = db.execute(sql_book, {
            "cust_id": booking.cust_id,
            "charger_id": booking.charger_id,
            "start_time": start_time,
            "end_time": end_time,
            "rate": charger[2]
        })

        new_booking = result.mappings().fetchone()
        db.commit()
        return new_booking

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    
@app.patch("/bookings/{booking_id}/cancel")
def cancel_booking(booking_id: int, db: Session = Depends(get_db)):
    # -- Check if booking exists and is cancellable -- #
    sql_check = text("""
        SELECT booking_id, booking_status
        FROM bookings
        WHERE booking_id = :booking_id
    """)
    booking = db.execute(sql_check, {"booking_id": booking_id}).fetchone()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # -- Checked if booking can be cancelled (e.g. only if status is Pending) -- #
    if booking[1] != "Pending":
        raise HTTPException(status_code=400, detail="Only pending bookings can be cancelled")
    
    # -- Update booking status to Cancelled -- #
    sql_cancel = text("""
        UPDATE bookings
        SET booking_status = 'Cancelled'
        WHERE booking_id = :booking_id
    """)
    db.execute(sql_cancel, {"booking_id": booking_id})
    db.commit()
    return {"Status": "Success", "message": "Booking cancelled successfully"}

@app.get("/bookings/history/{cust_id}")
def get_booking_history(cust_id: int, db: Session = Depends(get_db)):
    query = text("""
    SELECT
        b.booking_id,
        b.charger_id,
        s.name AS station_name,
        b.start_time AT TIME ZONE 'Asia/Bangkok' AS start_time,
        b.end_time AT TIME ZONE 'Asia/Bangkok' AS end_time,
        b.total_kwh,
        b.rate_per_kwh_snapshot,
        b.booking_status,
        p.amount,
        p.payment_status
    FROM bookings b
    JOIN chargers c ON b.charger_id = c.charger_id
    JOIN stations s ON c.station_id = s.station_id
    LEFT JOIN payments p ON b.booking_id = p.booking_id
    WHERE b.cust_id = :cust_id
    ORDER BY b.start_time DESC
""")
    result = db.execute(query, {"cust_id": cust_id})
    return result.mappings().all()

@app.patch("/chargers/{charger_id}/status")
def update_charger_status(charger_id: int, new_status: str, manager_id: int, db: Session = Depends(get_db)):
    ## -- Check if charger is in station that belongs to manager -- ##
    sql_check = text("""
        SELECT c.charger_id
        FROM chargers c
        JOIN stations s ON c.station_id = s.station_id
        WHERE c.charger_id = :charger_id
        AND s.manager_id = :manager_id
    """)
    result = db.execute(sql_check, {"charger_id": charger_id, "manager_id": manager_id}).fetchone()
    if not result:
        raise HTTPException(status_code=403, detail="Charger not found or you don't have permission to update this charger")

    # -- Check status is valid -- #
    if new_status not in ["Available", "Out of Service"]:
        raise HTTPException(status_code=400, detail="Status must be 'Available' or 'Out of Service'")

    # -- Update charger status -- #
    db.execute(text("""
        UPDATE chargers SET status = :new_status WHERE charger_id = :charger_id
    """), {"new_status": new_status, "charger_id": charger_id})
    db.commit()
    return {"Status": "Success", "charger_id": charger_id, "new_status": new_status}