    # -- DISCLAIMER -- #
# This file 'models.py' isn't using here because of 100%? Raw SQL.
# But we're still keeping it since it might use for understanding something. I(FinaleNova) guess. LOL.
# We're using it as reference.

from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# == User Related == #
class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    role = Column(String)

    customer_profile = relationship("Customer", back_populates="user", uselist=False)
    manager_profile = relationship("Manager", back_populates="user", uselist=False)

class Customer(Base):
    __tablename__ = "customers"
    cust_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    phone = Column(String, unique=True)
    car_model = Column(String)

    user = relationship("User", back_populates="customer_profile")
    reserve = relationship("Booking", back_populates="customer")

class Manager(Base):
    __tablename__ = "managers"
    manager_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id"))
    phone = Column(String)
    tax_id = Column(String, primary_key=True)

    user = relationship("User", back_populates="manager_profile")
    managed_station = relationship("Station", back_populates="manager")

# == Station Structure == #
class ChargerType(Base):
    __tablename__ = "charger_types"
    type_id = Column(Integer, primary_key=True, index=True)
    type_name = Column(String)
    max_power_kw = Column(Float)

    charger = relationship("Charger", back_populates="charger_type")

class Station(Base):
    __tablename__ = "stations"
    station_id = Column(Integer, primary_key=True)
    manager_id = Column(Integer, ForeignKey("managers.manager_id"))
    name = Column(String)
    address = Column(String)
    latitude = Column(Float)
    longitude = Column(Float)
    status = Column(String, default="Active")
    created_at = Column(TIMESTAMP, server_default=func.now()) # Stamp time when created.

    manager = relationship("Manager", back_populates="managed_station")
    charger = relationship("Charger", back_populates="station")

class Charger(Base):
    __tablename__ = "chargers"
    charger_id = Column(Integer, primary_key=True)
    station_id = Column(Integer, ForeignKey("stations.station_id"))
    type_id = Column(Integer, ForeignKey("charger_types.type_id"))
    rate_per_kwh = Column(Float)
    status = Column(String, default="Available")

    charger_type = relationship("ChargerType", back_populates="charger")
    station = relationship("Station", back_populates="charger")
    booking = relationship("Booking", back_populates="charger")

# == Reservation & Transaction == #
class Booking(Base):
    __tablename__ = "bookings"
    booking_id = Column(Integer, primary_key=True)
    cust_id = Column(Integer, ForeignKey("customers.cust_id"))
    charger_id = Column(Integer, ForeignKey("chargers.charger_id"))
    start_time = Column(DateTime)
    end_time = Column(DateTime)
    total_kwh = Column(Float)
    rate_per_kwh_snapshot = Column(Float)
    booking_status = Column(String)

    customer = relationship("Customer", back_populates="reserve")
    charger = relationship("Charger", back_populates="booking")
    payment = relationship("Payment", back_populates="booking_cost", uselist=False)

class Payment(Base):
    __tablename__ = "payments"
    booking_id = Column(Integer, ForeignKey("bookings.booking_id"), primary_key=True)
    amount = Column(Float)
    payment_method = Column(String)
    payment_date = Column(DateTime)
    payment_status = Column(String)

    booking_cost = relationship("Booking", back_populates="payment")
    