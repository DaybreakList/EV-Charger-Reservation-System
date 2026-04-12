import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

load_dotenv

DATABASE_URL= os.getenv("DATABASE_URL")

print(f"========\n***DEBUG: Database URL is {DATABASE_URL}\n========") 
if DATABASE_URL is None:
    raise ValueError("หา DATABASE_URL ไม่เจอในไฟล์ .env กรุณาเช็คชื่อไฟล์หรือตัวแปรครับ!")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()