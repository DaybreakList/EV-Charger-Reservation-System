from sqlalchemy import Column, Integer, String
from database import Base

class Charger(Base):
    __tablename__ = "chargers"

    id = Column(Integer, primary_key=True, index=True)
    charger_name = Column(String)
    status = Column(String, default="available")