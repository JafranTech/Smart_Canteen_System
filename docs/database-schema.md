# Database Schema

## Role of This File

This file defines the complete PostgreSQL database schema for the Smart Canteen system running on Supabase. The AI agent must use exactly these table names, column names, data types, and constraints. Do not rename columns, do not change data types, and do not add tables without explicit instruction.

---

## Entity Relationship Overview

```
auth.users (Supabase managed)
    │
    └──▶ profiles (1:1)
              │
              └──▶ orders (1:many — student places orders)
                      │
                      ├──▶ order_items (1:many — each order has items)
                      │         │
                      │         └──▶ menu_items (many:1 — items reference menu)
                      │
                      └──▶ fraud_logs (1:many — fraud events per order)
```

---

## Table Definitions

### Table: `profiles`

Stores role and identity information for every user. Linked 1:1 to Supabase `auth.users`.

```sql
CREATE TABLE profiles (
  id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('student', 'staff', 'admin')),
  name         text NOT NULL,
  email        text NOT NULL UNIQUE,
  college_id   text,                         -- Student roll number or staff ID
  created_at   timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
```

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, FK to auth.users — same UUID as the Supabase auth user |
| `role` | text | Enum: 'student', 'staff', 'admin' — enforced by CHECK constraint |
| `name` | text | Full name of the user |
| `email` | text | Matches the auth email |
| `college_id` | text | Optional — student roll number or staff badge ID |
| `created_at` | timestamptz | Auto-set on insert |

### Auto-create Profile on Signup — Supabase Trigger

```sql
-- Trigger function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'student')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

### Table: `menu_items`

The food catalogue managed by admin.

```sql
CREATE TABLE menu_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  description      text,
  price            numeric(10, 2) NOT NULL CHECK (price > 0),
  category         text NOT NULL,             -- e.g. 'Meals', 'Snacks', 'Beverages'
  stock_quantity   integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_available     boolean NOT NULL DEFAULT true,
  image_url        text,                       -- Supabase Storage public URL
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
```

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, auto-generated |
| `name` | text | Display name of the food item |
| `description` | text | Short description shown on card |
| `price` | numeric(10,2) | In INR (₹). Cannot be 0 or negative. |
| `category` | text | Used for filter chips on menu page |
| `stock_quantity` | integer | Current available quantity. Cannot go below 0. |
| `is_available` | boolean | Admin can hide items without deleting |
| `image_url` | text | Supabase Storage URL |
| `created_at` | timestamptz | Auto-set on insert |
| `updated_at` | timestamptz | Must be updated on every modification |

---

### Table: `orders`

One record per order placed by a student.

```sql
CREATE TABLE orders (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id         uuid NOT NULL REFERENCES profiles(id),
  total_amount       numeric(10, 2) NOT NULL CHECK (total_amount > 0),
  status             text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'paid', 'ready', 'collected', 'cancelled')),
  qr_token           text UNIQUE,               -- AES encrypted token
  qr_scanned_count   integer NOT NULL DEFAULT 0 CHECK (qr_scanned_count >= 0),
  created_at         timestamptz DEFAULT now(),
  pickup_deadline    timestamptz                 -- Optional: calculated pickup window
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
```

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `student_id` | uuid | FK to profiles — who placed the order |
| `total_amount` | numeric | Sum of all order items |
| `status` | text | State machine: pending → paid → ready → collected |
| `qr_token` | text | AES-encrypted unique token. This is what the QR encodes. |
| `qr_scanned_count` | integer | How many times the QR has been scanned. If > 0 and status is already 'collected', it is fraud. |
| `created_at` | timestamptz | Order creation time |
| `pickup_deadline` | timestamptz | Optional: time by which the order must be collected |

### Order Status State Machine

```
pending    ← Order created but payment not confirmed
    ↓
paid       ← Payment confirmed, QR generated and active
    ↓
ready      ← (Optional) Staff marks order as prepared
    ↓
collected  ← Staff scanned QR and delivered food
    ↑
cancelled  ← Student cancelled or payment failed (stock is restored)
```

---

### Table: `order_items`

Line items within an order. An order has one or more items.

```sql
CREATE TABLE order_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id    uuid NOT NULL REFERENCES menu_items(id),
  quantity        integer NOT NULL CHECK (quantity > 0),
  unit_price      numeric(10, 2) NOT NULL CHECK (unit_price > 0),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
```

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `order_id` | uuid | FK to orders |
| `menu_item_id` | uuid | FK to menu_items |
| `quantity` | integer | Number of this item ordered |
| `unit_price` | numeric | Snapshot of price at order time — does not change if menu price changes later |
| `created_at` | timestamptz | Auto-set |

> **Rule:** Always snapshot `unit_price` from `menu_items.price` at order time. Never reference live price from `menu_items` when displaying order history, as the price may have changed.

---

### Table: `fraud_logs`

Every detected fraud or suspicious event is logged here.

```sql
CREATE TABLE fraud_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid REFERENCES orders(id),   -- nullable — invalid QR has no order
  reason         text NOT NULL
                 CHECK (reason IN (
                   'duplicate_scan',
                   'invalid_qr',
                   'expired_order',
                   'cross_user_scan'
                 )),
  scanned_by     uuid REFERENCES profiles(id), -- which staff member scanned
  detected_at    timestamptz DEFAULT now(),
  notes          text                           -- optional extra context
);

ALTER TABLE fraud_logs ENABLE ROW LEVEL SECURITY;
```

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `order_id` | uuid | FK to orders — null if QR was completely invalid |
| `reason` | text | Enum of fraud types. Always use exact strings. |
| `scanned_by` | uuid | FK to profiles — which staff triggered the event |
| `detected_at` | timestamptz | Auto-set |
| `notes` | text | Optional. Use for extra context ("scanned 3 times", etc.) |

---

## Indexes for Performance

```sql
-- Frequent lookups by student
CREATE INDEX idx_orders_student_id ON orders(student_id);

-- QR token lookup on scan (must be fast)
CREATE INDEX idx_orders_qr_token ON orders(qr_token);

-- Fraud log admin queries
CREATE INDEX idx_fraud_logs_detected_at ON fraud_logs(detected_at DESC);

-- Menu by category filter
CREATE INDEX idx_menu_items_category ON menu_items(category);

-- Orders by status for staff view
CREATE INDEX idx_orders_status ON orders(status);
```

---

## SQL Setup — Complete Execution Order

Run SQL scripts in this exact order in the Supabase SQL editor:

```
1. Create tables: profiles, menu_items, orders, order_items, fraud_logs
2. Enable RLS on all tables
3. Create RLS policies (see backend-design.md)
4. Create trigger: handle_new_user
5. Create functions: decrement_stock, increment_stock
6. Create indexes
7. Insert seed data: 5-10 sample menu items for testing
```

---

## Seed Data — Sample Menu Items

```sql
INSERT INTO menu_items (name, description, price, category, stock_quantity, is_available)
VALUES
  ('Veg Meals',       'Rice, sambar, 2 curries, papad',     60.00, 'Meals',     50, true),
  ('Chicken Meals',   'Rice, chicken curry, 2 sides',       90.00, 'Meals',     30, true),
  ('Masala Dosa',     'Crispy dosa with potato filling',    40.00, 'Snacks',    40, true),
  ('Vada',            '2 pieces medu vada with chutney',    25.00, 'Snacks',    60, true),
  ('Samosa',          '2 pieces with mint chutney',         20.00, 'Snacks',    80, true),
  ('Tea',             'Fresh ginger tea',                   10.00, 'Beverages', 100, true),
  ('Coffee',          'Filter coffee, medium cup',          15.00, 'Beverages', 100, true),
  ('Bottled Water',   '500ml sealed bottle',                20.00, 'Beverages', 200, true),
  ('Fried Rice',      'Vegetable fried rice, large plate',  55.00, 'Meals',     25, true),
  ('Parotta',         '2 pieces with salna',                30.00, 'Snacks',    45, true);
```
