# EV Charger Reservation System

A full-stack web application that allows EV owners to discover nearby charging stations, reserve a charger, and manage their charging sessions — while giving station managers a dashboard to oversee their fleet of chargers.

---

## Team Members

| Student ID | Name |
|---|---|
| 6710615037 | กิตติกานต์ เมธีกุลสุเมธ |
| 6710615078 | ณพัฐกรภ์ จิรานนท์อัครโชค |
| 6710615193 | ภูริภัทร สายเนตร |
| 6710615227 | รวีโรจน์ มานะคิด |

CN230 Database · Computer Engineering

---

## Technologies Used

| Layer | Technology |
|---|---|
| **Backend** | Python · FastAPI · SQLAlchemy (raw SQL) |
| **Database** | PostgreSQL (hosted on Supabase) |
| **Auth** | JWT (python-jose) · bcrypt |
| **Scheduler** | APScheduler |
| **Frontend** | HTML · CSS · JavaScript · React (CDN / Babel) |
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

## Quick Start for Evaluators

> The database is already provisioned on Supabase and pre-loaded with test data.  
> A `.env` file containing all required credentials will be provided separately — no database setup is needed.

**Steps:**

1. Place the provided `.env` file in the project root
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the backend:
   ```bash
   uvicorn main:app --reload
   ```
4. Open the frontend — serve `Frontend/` with either option below, then navigate to `http://127.0.0.1:5500/pages/login/index.html`

That's all. Test account credentials (email and password) are listed in [`test_subject.txt`](test_subject.txt).

---

## Full Installation (for Developers)

> This section is for developers who want to run the project with their own database instance.  
> Sample SQL files for creating tables and loading test data are provided.

### Prerequisites

- Python 3.10+
- A Supabase project (PostgreSQL)
- Google Maps API key (Distance Matrix API enabled)

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/EV-Charger-Reservation-System.git
cd EV-Charger-Reservation-System
```

### 2. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@host:port/dbname
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string (from Supabase) |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key with Distance Matrix enabled |

### 4. Set up the database

Run [`create_table.sql`](create_table.sql) against your Supabase instance to create all tables, then optionally run [`insert_data.sql`](insert_data.sql) to load sample test data.

---

## Running the System

### Start the Backend

```bash
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`  
Interactive API docs: `http://localhost:8000/docs`

### Start the Frontend

No build step required. Serve the `Frontend/` directory with any static file server:

**Option A — Python built-in server** (no extra installation needed)
```bash
cd Frontend
python -m http.server 5500
```

**Option B — VS Code Live Server** (requires installing the [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) in VS Code first)
```
1. Install "Live Server" by Ritwick Dey from the VS Code Extensions panel
2. Right-click Frontend/pages/login/index.html
3. Select "Open with Live Server"
```

Open `http://127.0.0.1:5500/pages/login/index.html` to start.

---

## Architecture

```
Frontend (MPA, CDN React)
│   ├── assets/config.js             → window.EV_CONFIG  (API base URL, Maps key)
│   ├── assets/api.js                → window.EVApi      (all HTTP calls via fetch)
│   └── assets/shared-components.js → window.EVShared   (reusable React components)
│
└──► Backend (FastAPI · localhost:8000)
        └──► PostgreSQL on Supabase
```

- JWT is stored in `localStorage` (`ev_token`, `ev_role`, `ev_cust_id`, `ev_manager_id`)
- Booking slots are fixed 45-minute blocks aligned to multiples of 45 min from midnight (Asia/Bangkok)
- APScheduler runs every minute to auto-complete expired bookings and calculate `total_kwh`

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
| `bookings` | booking_id, cust_id FK, charger_id FK, start_time, end_time, total_kwh, booking_status (`Pending` \| `Completed` \| `Cancelled`), rate_per_kwh_snapshot |
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
| PATCH | `/users/{id}` | Update name / email / phone |
| PATCH | `/customers/{id}` | Update car model |
| PATCH | `/managers/{id}` | Update tax ID |
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
├── database.py              # DB connection
├── create_table.sql         # Database schema
├── insert_data.sql          # Sample test data
├── requirements.txt
├── .env                     # DATABASE_URL, GOOGLE_MAPS_API_KEY (not committed)
└── Frontend/
    ├── assets/
    │   ├── api.js                # Centralised API client (window.EVApi)
    │   ├── shared-components.js  # Shared React components (window.EVShared)
    │   └── config.js             # App config (window.EV_CONFIG)
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
