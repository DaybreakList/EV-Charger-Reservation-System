from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas
from database import get_db
from sqlalchemy import text
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
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
            "pwd": pwd_context.hash(user_data.password)
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

