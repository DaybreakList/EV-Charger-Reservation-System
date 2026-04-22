-- This create_table.sql will use for CREATE Table on Supabase. ##Direct command on Supabase.
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('customer', 'manager')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE customers (
    cust_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    phone VARCHAR(20),
    car_model VARCHAR(100)
);
 
CREATE TABLE managers (
    manager_id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
    phone VARCHAR(20),
    tax_id VARCHAR(50)
);
 
CREATE TABLE stations (
    station_id SERIAL PRIMARY KEY,
    manager_id INTEGER REFERENCES managers(manager_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
 
CREATE TABLE charger_types (
    type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL,
    max_power_kw DECIMAL(5, 2),
    charging_standard VARCHAR(10) CHECK (charging_standard IN ('AC', 'DC'))
);
 
CREATE TABLE chargers (
    charger_id SERIAL PRIMARY KEY,
    station_id INTEGER REFERENCES stations(station_id) ON DELETE CASCADE,
    type_id INTEGER REFERENCES charger_types(type_id),
    rate_per_kwh DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Available' -- Available, Out of Service
);
 
CREATE TABLE bookings (
    booking_id SERIAL PRIMARY KEY,
    cust_id INTEGER REFERENCES customers(cust_id) ON DELETE CASCADE,
    charger_id INTEGER REFERENCES chargers(charger_id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    total_kwh DECIMAL(10, 2),
    booking_status VARCHAR(20) DEFAULT 'Pending', -- Pending, Confirmed, Completed, Cancelled
    rate_per_kwh_snapshot NUMERIC
);
 
CREATE TABLE payments (
    booking_id INTEGER PRIMARY KEY REFERENCES bookings(booking_id) ON DELETE CASCADE,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50), -- Credit Card, QR Code, Wallet | EDITED: Stil considering about this.
    payment_status VARCHAR(20) DEFAULT 'Pending',
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);