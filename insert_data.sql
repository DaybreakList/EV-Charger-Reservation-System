-- =============================================================
-- TEST DATA — EV Charger Reservation System
-- Source: test_subject.txt
--
-- NOTE: Passwords are stored as plain text.
--       To switch to bcrypt, run a Python script to hash each
--       row and UPDATE users SET password = '<hash>' WHERE email = '...'.
--
-- Run order (respects FK constraints):
--   1. users  →  2. customers / managers  →  3. charger_types
--   →  4. stations  →  5. chargers
-- =============================================================

BEGIN;

-- -------------------------------------------------------------
-- 1. USERS  (6 customers + 4 managers)
-- -------------------------------------------------------------
INSERT INTO users (first_name, last_name, email, password, role) VALUES
  ('Napat',    'Chaiyaporn',  'napat.cha@testdb.com',           'abc123',   'customer'),  -- user_id 1
  ('Kanya',    'Srisuk',      'kanya.s@samplemail.com',         'pass12',   'customer'),  -- user_id 2
  ('Arthit',   'Phromma',     'arthit.p@tester.io',             'evtest1',  'customer'),  -- user_id 3
  ('Mali',     'Wongsa',      'mali.w@devmail.com',             'qwerty1',  'customer'),  -- user_id 4
  ('Somchai',  'Rattanakorn', 'somchai.r@example.org',          '123abc',   'customer'),  -- user_id 5
  ('Ploy',     'Niran',       'ploy.n@testdb.net',              'letmein1', 'customer'),  -- user_id 6
  ('Anan',     'Kittipong',   'anan.kittipong@testdb.com',      'mgr1234',  'manager'),   -- user_id 7
  ('Siriporn', 'Chanthara',   'siriporn.chan@samplemail.com',   'admin123', 'manager'),   -- user_id 8
  ('Kittisak', 'Phumiphat',   'kittisak.phu@testdb.net',        'mgrtest7', 'manager'),   -- user_id 9
  ('Waraporn', 'Suthisak',    'waraporn.suth@testdb.com',       'mgr0001',  'manager');   -- user_id 10

-- -------------------------------------------------------------
-- 2a. CUSTOMERS
-- -------------------------------------------------------------
INSERT INTO customers (user_id, phone, car_model) VALUES
  (1,  '0812345678', 'Tesla Model 3'),           -- cust_id 1
  (2,  '0898765432', 'Nissan Leaf'),              -- cust_id 2
  (3,  '0823456789', 'Hyundai Kona Electric'),    -- cust_id 3
  (4,  '0832109876', 'MG ZS EV'),                -- cust_id 4
  (5,  '0845551212', 'BMW i3'),                   -- cust_id 5
  (6,  '0903334444', 'BYD Atto 3');              -- cust_id 6

-- -------------------------------------------------------------
-- 2b. MANAGERS
-- -------------------------------------------------------------
INSERT INTO managers (user_id, phone, tax_id) VALUES
  (7,  '0912345678', '1234567890123'),   -- manager_id 1  (Anan)
  (8,  '0898765432', '3210987654321'),   -- manager_id 2  (Siriporn)
  (9,  '0865551212', '5678012345679'),   -- manager_id 3  (Kittisak)
  (10, '0921112223', '7890123456784');   -- manager_id 4  (Waraporn)

-- -------------------------------------------------------------
-- 3. CHARGER TYPES  (7 types, ordered by connector then power)
-- -------------------------------------------------------------
INSERT INTO charger_types (type_name, max_power_kw, charging_standard) VALUES
  ('Type 2 (AC)',  7.4,  'AC'),   -- type_id 1
  ('Type 2 (AC)',  22.0, 'AC'),   -- type_id 2
  ('CCS Combo 2',  50.0, 'DC'),   -- type_id 3
  ('CCS Combo 2',  75.0, 'DC'),   -- type_id 4
  ('CCS Combo 2', 100.0, 'DC'),   -- type_id 5
  ('CCS Combo 2', 150.0, 'DC'),   -- type_id 6
  ('CHAdeMO',      50.0, 'DC');   -- type_id 7

-- -------------------------------------------------------------
-- 4. STATIONS
-- -------------------------------------------------------------
INSERT INTO stations (manager_id, name, address, latitude, longitude) VALUES
  (1, 'PTT Station ธรรมศาสตร์รังสิต',
      'ต.คลองหนึ่ง อ.คลองหลวง จ.ปทุมธานี 12120',
      14.0671453, 100.6062378),                                               -- station_id 1

  (2, 'EA Anywhere สถานีชาร์จ ธรรมศาสตร์รังสิต',
      'ตำบลคลองหนึ่ง อำเภอคลองหลวง ปทุมธานี',
      14.069200,  100.607000),                                                -- station_id 2

  (3, 'MEA EV Charger จุฬาลงกรณ์มหาวิทยาลัย',
      'จุฬาลงกรณ์มหาวิทยาลัย เขตปทุมวัน กรุงเทพฯ',
      13.736900,  100.530800),                                                -- station_id 3

  (3, 'EA Anywhere สถานีชาร์จ สยามสแควร์ / ใกล้จุฬาฯ',
      'สยามสแควร์ เขตปทุมวัน กรุงเทพฯ',
      13.746000,  100.534000),                                                -- station_id 4

  (4, 'PTT Station Chiang Mai University (สถานีชาร์จ มช.)',
      'ต.สุเทพ อ.เมืองเชียงใหม่ จ.เชียงใหม่',
      18.804000,  98.953000),                                                 -- station_id 5

  (4, 'MG Super Charge เซ็นทรัลพลาซา เวสต์เกต',
      '69/1 หมู่ 6 ต.บางรักพัฒนา อ.บางบัวทอง จ.นนทบุรี',
      13.912500,  100.446000);                                                -- station_id 6

-- -------------------------------------------------------------
-- 5. CHARGERS  (18 chargers across 6 stations)
-- -------------------------------------------------------------
INSERT INTO chargers (station_id, type_id, rate_per_kwh) VALUES
  -- station_id 1 : PTT Station ธรรมศาสตร์รังสิต
  (1, 1,  7.5),   -- charger_id  1  Type 2 (AC)  7.4 kW
  (1, 3,  7.5),   -- charger_id  2  CCS Combo 2 50 kW
  (1, 7,  7.5),   -- charger_id  3  CHAdeMO     50 kW

  -- station_id 2 : EA Anywhere ธรรมศาสตร์รังสิต
  (2, 2,  6.5),   -- charger_id  4  Type 2 (AC)  22 kW
  (2, 4,  8.0),   -- charger_id  5  CCS Combo 2 75 kW
  (2, 7,  8.0),   -- charger_id  6  CHAdeMO     50 kW

  -- station_id 3 : MEA EV Charger จุฬาฯ
  (3, 2,  5.5),   -- charger_id  7  Type 2 (AC)  22 kW
  (3, 3,  7.0),   -- charger_id  8  CCS Combo 2  50 kW
  (3, 6, 12.0),   -- charger_id  9  CCS Combo 2 150 kW

  -- station_id 4 : EA Anywhere สยามสแควร์
  (4, 2,  6.0),   -- charger_id 10  Type 2 (AC)  22 kW
  (4, 5, 10.0),   -- charger_id 11  CCS Combo 2 100 kW
  (4, 7,  9.0),   -- charger_id 12  CHAdeMO      50 kW

  -- station_id 5 : PTT Station CMU
  (5, 1,  6.0),   -- charger_id 13  Type 2 (AC)  7.4 kW
  (5, 4,  9.0),   -- charger_id 14  CCS Combo 2  75 kW
  (5, 7,  9.0),   -- charger_id 15  CHAdeMO      50 kW

  -- station_id 6 : MG Super Charge เวสต์เกต
  (6, 2,  6.5),   -- charger_id 16  Type 2 (AC)  22 kW
  (6, 6, 12.0),   -- charger_id 17  CCS Combo 2 150 kW
  (6, 4, 10.0);   -- charger_id 18  CCS Combo 2  75 kW

COMMIT;
