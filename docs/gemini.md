# Smart Canteen Pre-Order and Fraud Detection System

## Role

Act as a World-Class Senior Full-Stack Engineer and Product Architect specialising in React, Supabase, and Progressive Web Apps. You build production-grade, mobile-first web applications with clean architecture, bulletproof authentication, and real-time data. Every screen you produce must feel like a consumer-grade food ordering app — fast, intuitive, and visually polished. Eradicate all generic AI patterns. Every component must be intentional, every interaction smooth, every data flow secure.

---

## Agent Flow — MUST FOLLOW

When this file is loaded into a fresh project session, immediately understand the full system context from all linked `.md` files. Do not ask clarifying questions unless a spec is genuinely ambiguous. Do not over-discuss. Build.

### Startup Sequence (run on every new session)

1. Read `gemini.md` — understand the system role and agent rules.
2. Read `architecture.md` — understand the folder structure, routes, and system boundaries.
3. Read `tech-stack.md` — understand every library, its version, and its purpose.
4. Read `ui-design.md` — load the full design system before generating any component.
5. Read `backend-design.md` — understand all Supabase logic, RLS policies, and API patterns.
6. Read `database-schema.md` — understand every table, column, type, and relationship.
7. Read `agent-rules.md` — apply all code quality, naming, and security rules without exception.
8. Read `development-roadmap.md` — know the current phase and build only what is in scope.

> **Execution Directive:** "Do not build a canteen app. Build a digital food ordering instrument for a college campus — every tap intentional, every QR scan instant, every fraud detection silent and automatic. This system must feel as fast and confident as Zomato on a flagship phone."

---

## Project Identity

**Name:** Smart Canteen — Crescent College  
**Type:** Progressive Web Application (PWA)  
**Purpose:** Allow students to pre-order food before break time, pay digitally, collect food via QR verification, and eliminate crowd congestion and payment fraud at the canteen counter.

---

## User Roles — Three Actors, Three Worlds

### Student
The primary consumer of the system. Uses the app on their personal phone. Browses the menu, adds items to cart, pays via demo payment, receives a QR code, and shows it at the canteen.

**Student Capabilities:**
- Login using official college email
- View food menu with live stock status
- Place and pay for orders (demo payment gateway)
- Receive a secure, encrypted QR code
- View current order status in real time
- View full order history

### Staff
A canteen worker. Uses the app on a staff mobile device at the counter. Scans student QR codes, verifies orders, and marks them as collected.

**Staff Capabilities:**
- Login using staff credentials
- Access the QR scanner screen instantly (zero friction)
- Scan student QR codes using phone camera
- View full order details on scan
- Mark orders as delivered
- Cannot modify menu, stock, or pricing

### Admin
The canteen manager. Uses the app on a desktop or tablet. Full control over the system — menu, stock, orders, analytics, and fraud monitoring.

**Admin Capabilities:**
- Add, edit, enable, or disable menu items
- Update food stock quantities
- Monitor all orders in real time
- View daily, weekly, and monthly sales analytics
- Inspect fraud attempt logs with full context
- Manage staff accounts

---

## Core System Features

### 1. Pre-Order System
Students place orders before the break begins. This distributes demand over time and eliminates counter queues.

### 2. Secure QR Code Verification
After payment, a unique QR code is generated containing an encrypted order token. Staff scan this QR to verify and deliver the order. The token is single-use — scanning it twice triggers fraud detection.

### 3. Stock Lock Mechanism
When a student adds an item to their cart, the stock count is decremented immediately and locked. If the order is cancelled or payment fails, stock is restored. This prevents overselling during high-demand periods.

### 4. Fraud Detection Engine
The system automatically detects and logs:
- **Duplicate QR scans** — same QR code scanned more than once
- **Invalid QR tokens** — tokens that do not match any order in the database
- **Expired orders** — QR codes presented after the pickup window has closed
- **Cross-user scan attempts** — a QR code presented by someone other than the original student

### 5. Admin Analytics Dashboard
Real-time and historical insights:
- Total daily revenue
- Most ordered items (ranked)
- Hourly order volume chart
- Fraud attempt count and breakdown
- Stock depletion alerts

---

## System Workflow

```
Step 1 — Student opens app and logs in with college email
Step 2 — Student browses menu, adds items to cart
Step 3 — System checks live stock before confirming cart
Step 4 — Student completes payment (demo gateway)
Step 5 — System generates encrypted QR token, stores in DB
Step 6 — QR code is displayed on student's phone screen
Step 7 — Student arrives at canteen counter, shows QR
Step 8 — Staff scans QR using the scanner screen
Step 9 — System verifies token: valid / invalid / duplicate
Step 10 — If valid: order details shown, staff taps "Deliver"
Step 11 — Order status updated to "collected" in real time
Step 12 — If duplicate or invalid: fraud log entry created, alert shown to staff
```

---

## Build Sequence

When asked to build any feature, follow this sequence without deviation:

1. Identify which phase the feature belongs to (see `development-roadmap.md`).
2. Confirm the database tables involved (see `database-schema.md`).
3. Write the Supabase hook first (`src/hooks/`), then the component.
4. Apply design tokens from `ui-design.md` — never invent colors or spacing.
5. Implement mobile layout first, then add responsive breakpoints.
6. Add loading states, empty states, and error states to every data-fetching component.
7. Test the happy path, then the error path (no stock, payment fail, invalid QR).

---

## Non-Negotiable Rules

- **Never hardcode user role logic in components.** Always derive role from Supabase auth metadata.
- **Never expose the Supabase service key** anywhere in the frontend.
- **Never build a screen without a loading state and an error state.**
- **Never use placeholder data in production components.** Connect to real Supabase queries.
- **Never skip RLS.** Every table must have Row Level Security policies active.
- **Never generate a QR code without encrypting the order token first.**
- **Every form must have client-side validation before submitting to Supabase.**
