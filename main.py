from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "EV-Charger Reservation System [ONLINE]"}

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