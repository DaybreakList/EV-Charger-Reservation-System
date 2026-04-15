from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "EV-Charger Reservation System [ONLINE]"}

# OLD, Will update. So model.py get rework!
'''
@app.post("/chargers/")
def create_charger(name: str, db: Session = Depends(get_db)):
    db_charger = models.Charger(charger_name=name, status="available")
    db.add(db_charger)
    db.commit()
    db.refresh(db_charger)
    return db_charger

@app.get("/chargers/")
def get_all_chargers(db: Session = Depends(get_db)):
    return db.query(models.Charger).all()

@app.post("/reserve/{charger_id}")
def reserve_charger(charger_id: int, db: Session = Depends(get_db)):
    charger = db.query(models.Charger).filter(models.Charger.id == charger_id).first()
    
    if not charger:
        raise HTTPException(status_code=404, detail="ไม่พบหัวชาร์จนี้")
    
    if charger.status != "available":
        raise HTTPException(status_code=400, detail="หัวชาร์จนี้ไม่ว่าง")

    charger.status = "occupied"
    db.commit()
    
    return {"message": f"จองหัวชาร์จ {charger.charger_name} สำเร็จ!"}

@app.post("/Users/")
def create_users(name: str, surname: str, email: str, password: str, db: Session = Depends(get_db)):
    db_user = models.User(first_name=name, last_name=surname, email=email, password=password)
    
    try:
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    except:
        raise HTTPException(status_code=404, detail="Email already exist, Yeah I know this shouldn't happen. I just test the system.")
    return db_user

@app.get("/Users/")
def get_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()

@app.patch("/Users/")
def set_users(user_id: int, new_role: str, db: Session = Depends(get_db)):
    db_user =  db.query(models.User).filter(models.User.user_id == user_id).first()
    
    try:
        db_user.role = new_role
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
    except:
        raise HTTPException(status_code=404, detail="Something went wrong.")
    return db_user

@app.post("/Customers/")
def create_customers(phone_number: str, car_model: str, db: Session = Depends(get_db)):
    db_customer = models.Customers(phone=phone_number, car_model=car_model)
    try:
        db.add(db_customer)
        db.commit()
        db.refresh(db_customer)
    except:
        raise HTTPException(status_code=404, detail="Something went wrong")
    return db_customer
@app.get("/Customers/")
def get_customers(db: Session = Depends(get_db)):
    return db.query(models.Customers).all()
'''