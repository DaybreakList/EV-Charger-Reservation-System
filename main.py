from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
import models
import schemas
from database import engine, SessionLocal

models.Base.metadata.create_all(bind=engine)

app = FastAPI()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
# -- Register System for Customer -- #
@app.post("/register/customer", response_model=schemas.User)
def register_customer(user_data: schemas.UserCreate, customer_data: schemas.CustomerCreate, db: Session = Depends(get_db)):
    # Check if Email has been registered.
    db_user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Record the info into User table.
    new_user = models.User(
        first_name = user_data.first_name,
        last_name = user_data.last_name,
        email = user_data.email,
        password = user_data.password, # Real System need to HASH this password first!
        role = "customer"
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Record the info into Customer table from user_id.
    new_customer = models.Customer(
        user_id = new_user.user_id,
        phone = customer_data.phone,
        car_model = customer_data.car_model
    )
    db.add(new_customer)
    db.commit()

    return new_user