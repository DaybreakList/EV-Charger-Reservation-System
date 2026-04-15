from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# -- User Schemas -- #
class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: str # Will be 'Customer' or 'Manager'

class UserCreate(UserBase):
    password: str

class User(UserBase):
    user_id: int
    class Config:
        from_attributes = True

# -- Customer Schemas -- #
class CustomerCreate(BaseModel):
    phone: str
    car_model: str

class Customer(BaseModel):
    cust_id: int
    user_id: int
    phone: str
    car_model: str
    class Config:
        from_attributes = True

# -- Station Schemas -- #
class StationBase(BaseModel):
    name: str
    address: str    
    latitude: float
    longitude: float

class Station(StationBase):
    station_id: int
    manager_id: int
    status: str
    class Config:
        from_attributes = True