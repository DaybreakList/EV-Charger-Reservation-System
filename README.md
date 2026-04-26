# EV Charger Reservation System

A full-stack web application that allows EV owners to discover nearby charging stations, reserve a charger, and manage their charging sessions — while giving station managers a dashboard to oversee their fleet of chargers.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Python · FastAPI · SQLAlchemy (raw SQL) |
| **Database** | PostgreSQL (hosted on Supabase) |
| **Auth** | JWT (python-jose) · bcrypt |
| **Scheduler** | APScheduler |
| **Frontend** | Vanilla HTML · React (CDN / Babel) |
| **Maps** | Google Maps JS API · Distance Matrix API |

---

## Features

### Customer
- Register / login with JWT authentication
- Browse all charging stations on an interactive map
- Find nearby stations sorted by real driving distance (Google Distance Matrix)
- Book a 45-minute charging slot (time-aligned blocks)
- View booking history with status filters (All / Pending / Completed / Cancelled)
- Cancel a pending booking or pay for a completed one (Prompt Pay, Credit Card, Debit Card)
- View and edit profile (name, email, phone, vehicle model)

### Station Manager
- Register with an invite code
- Add and manage charging stations (location, status Active / Inactive)
- Add, configure, and remove chargers per station
- View today's booking count and revenue per station
- Toggle charger availability (Available / Out of Service)
- View and edit manager profile

---

## Architecture

```
Frontend (MPA, CDN React)
│   ├── assets/config.js          → window.EV_CONFIG  (API base URL, Maps key)
│   ├── assets/api.js             → window.EVApi       (all HTTP calls)
│   └── assets/shared-components.js → window.EVShared (reusable React components)
│
└──► Backend (FastAPI · localhost:8000)
        └──► PostgreSQL on Supabase
```

- JWT is stored in `localStorage` (`ev_token`, `ev_role`, `ev_cust_id`, `ev_manager_id`)
- Booking slots are fixed 45-minute blocks aligned to multiples of 45 min from midnight (Asia/Bangkok)
- APScheduler runs every minute to auto-complete expired bookings and calculate `total_kwh`

---

## Getting Started

### Prerequisites

- Python 3.10+
- A Supabase project (PostgreSQL)
- Google Maps API key (Distance Matrix enabled)

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/<your-org>/EV-Charger-Reservation-System.git
cd EV-Charger-Reservation-System

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create a .env file
cp .env.example .env
# Fill in DATABASE_URL and GOOGLE_MAPS_API_KEY

# 4. Initialise the database
# Run the SQL in create_table.sql against your Supabase instance

# 5. Start the server
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### Frontend Setup

No build step required. Serve the `Frontend/` directory with any static file server, e.g.:

```bash
# Using VS Code Live Server (port 5500) — recommended during development
# Or with Python's built-in server:
cd Frontend
python -m http.server 5500
```

Open `http://127.0.0.1:5500/pages/login/index.html` to start.

---

## Database Schema

| Table | Key Columns |
|---|---|
| `users` | user_id, first_name, last_name, email, password, role (`customer` \| `manager`), phone |
| `customers` | cust_id, user_id FK, car_model |
| `managers` | manager_id, user_id FK, tax_id |
| `stations` | station_id, manager_id FK, name, address, latitude, longitude, status (`Active` \| `Inactive`) |
| `charger_types` | type_id, type_name, max_power_kw, charging_standard (`AC` \| `DC`) |
| `chargers` | charger_id, station_id FK, type_id FK, rate_per_kwh, status (`Available` \| `Out of Service`) |
| `bookings` | booking_id, cust_id FK, charger_id FK, start_time, end_time, total_kwh, booking_status, rate_per_kwh_snapshot |
| `payments` | booking_id PK FK, amount, payment_method, payment_status, payment_date |

Full schema: [`create_table.sql`](create_table.sql)

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| POST | `/login/` | Authenticate and receive JWT |
| POST | `/register/customer/` | Register a new customer |
| POST | `/register/manager/` | Register a new manager (invite code required) |
| GET | `/customers/{id}` | Get customer profile |
| GET | `/managers/{id}` | Get manager profile |
| PATCH | `/users/{id}` | Update name / email |
| PATCH | `/customers/{id}` | Update phone / car model |
| PATCH | `/managers/{id}` | Update phone / tax ID |
| GET | `/stations` | List all stations |
| GET | `/stations/nearby` | Nearby stations (Google Distance Matrix) |
| GET | `/managers/{id}/stations` | Manager's stations |
| POST | `/stations/` | Create a station |
| PATCH | `/stations/{id}` | Update station details |
| GET | `/stations/{id}/today-summary` | Today's booking count and revenue |
| GET | `/charger-types/` | List all charger types |
| POST | `/charger-types/` | Create a charger type |
| GET | `/station/{id}/chargers/` | List chargers at a station |
| POST | `/stations/{id}/chargers/` | Add a charger to a station |
| PATCH | `/chargers/{id}` | Update charger details |
| DELETE | `/chargers/{id}` | Remove a charger |
| GET | `/chargers/{id}/available-slots` | Available 45-min slots for a date |
| POST | `/bookings/` | Create a booking |
| PATCH | `/bookings/{id}/cancel` | Cancel a booking |
| GET | `/bookings/history/{cust_id}` | Customer booking history |
| PATCH | `/payments/{booking_id}/pay` | Pay for a completed booking |

---

## Project Structure

```
EV-Charger-Reservation-System/
├── main.py                  # FastAPI app, all endpoints
├── schemas.py               # Pydantic request/response models
├── models.py                # SQLAlchemy ORM models (reference only)
├── database.py              # DB connection
├── create_table.sql         # Database schema
├── requirements.txt
├── .env                     # DATABASE_URL, GOOGLE_MAPS_API_KEY (not committed)
└── Frontend/
    ├── assets/
    │   ├── api.js           # Centralised API client (window.EVApi)
    │   ├── shared-components.js  # Shared React components (window.EVShared)
    │   └── config.js        # App config (window.EV_CONFIG)
    └── pages/
        ├── login/
        ├── registration/
        ├── find-stations/
        ├── station-booking/
        ├── booking-history/
        ├── profile/
        ├── manager-dashboard/
        └── charger-management/
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (from Supabase) |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key with Distance Matrix enabled |

---

*University project — Computer Engineering*
