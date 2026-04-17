from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import schemas
from database import get_db
from sqlalchemy import text
import bcrypt
from jose import jwt #for Create JWT token
from datetime import datetime, timedelta #for JWT expiration

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

