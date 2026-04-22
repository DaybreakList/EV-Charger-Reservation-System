from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

# -- Login Schemas -- #
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    role: str
    cust_id: Optional[int] = None
    manager_id: Optional[int] = None

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

class CustomerProfile(BaseModel):
    cust_id: int
    user_id: int
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    car_model: Optional[str]
    class Config:
        from_attributes = True

# -- Manager Schemas -- #
class ManagerCreate(BaseModel):
    phone: str
    tax_id: str
    invite_code: str

# -- Station Schemas -- #
class StationResponse(BaseModel):
    station_id: int
    name: str
    address: Optional[str]
    status: str
    manager_name: str
    class Config:
        from_attributes = True

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

class StationNearby(BaseModel):
    station_id: int
    name: str
    address: Optional[str]
    status: str
    distance_km: Optional[float]
    duration_text: Optional[str]  
    class Config:
        from_attributes = True

class StationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[str] = None
    
# -- Charger Schemas -- #

class ChargerType(BaseModel):
    type_id: int
    type_name: str
    max_power_kw: float
    charging_standard: str
    class Config:
        from_attributes = True

class ChargerTypeResponse(BaseModel):
    type_id: int
    type_name: str
    max_power_kw: float
    charging_standard: str
    class Config:
        from_attributes = True

class ChargerTypeCreate(BaseModel):
    type_name: str
    max_power_kw: float
    charging_standard: str

class ChargerCreate(BaseModel):
    type_id: int
    rate_per_kwh: float

class ChargerUpdate(BaseModel):
    type_id: Optional[int] = None
    rate_per_kwh: Optional[float] = None
    status: Optional[str] = None

class ChargerResponse(BaseModel):
    charger_id: int
    type_id: int
    type_name: str
    max_power_kw: float
    charging_standard: str
    rate_per_kwh: float
    status: str
    class Config:
        from_attributes = True

# -- Payment Schemas -- #
class PaymentRequest(BaseModel):
    payment_method: str

# -- Booking Schemas -- #
class BookingCreate(BaseModel):
    cust_id: int
    charger_id: int
    start_time: datetime

class BookingResponse(BaseModel):
    booking_id: int
    cust_id: int
    charger_id: int
    start_time: datetime
    end_time: datetime
    total_kwh: Optional[float]
    rate_per_kwh_snapshot: float
    booking_status: str
    class Config:
        from_attributes = True
