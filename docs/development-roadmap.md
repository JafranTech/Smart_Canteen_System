# Development Roadmap

## Role of This File

This file defines the phased build sequence for the Smart Canteen system. The AI agent must always know which phase is active and build only features within scope for that phase. Do not build Phase 3 features while Phase 1 is incomplete. Do not skip phases. Every phase ends with a working, testable deliverable.

---

## Roadmap Overview

```
Phase 1 — Project Foundation          ← START HERE
Phase 2 — Database and Auth
Phase 3 — Student Menu and Cart
Phase 4 — Order Placement and QR
Phase 5 — Staff QR Scanner
Phase 6 — Fraud Detection
Phase 7 — Admin Dashboard
Phase 8 — PWA and Deployment
```

---

## Phase 1 — Project Foundation

**Goal:** A working React + Tailwind + Supabase project that runs locally, applies the correct design system, and has the correct folder structure.

**Deliverables:**
- [ ] `npm create vite@latest smart-canteen -- --template react` completed
- [ ] All dependencies installed (see `tech-stack.md`)
- [ ] Tailwind CSS configured with custom `night` and `imperial` colors
- [ ] `src/lib/supabase.js` created with Supabase client
- [ ] `.env.local` created with correct keys (from Supabase dashboard)
- [ ] `.env.example` committed with empty values
- [ ] `src/styles/globals.css` with Tailwind directives
- [ ] Folder structure matches `architecture.md` exactly
- [ ] All `docs/` markdown files placed in project root
- [ ] App runs on `localhost:5173` with no console errors

**Test Checkpoint:** `npm run dev` opens a blank page with the correct gradient background (`#000F08` to `#FB3640`). No errors in console.

---

## Phase 2 — Database and Authentication

**Goal:** Supabase database fully set up. All three user roles can log in. Role-based redirect works correctly.

**Deliverables:**

### Database (Supabase SQL Editor)
- [ ] All 5 tables created: `profiles`, `menu_items`, `orders`, `order_items`, `fraud_logs`
- [ ] RLS enabled on all tables
- [ ] All RLS policies applied (from `backend-design.md`)
- [ ] `handle_new_user` trigger created
- [ ] `decrement_stock` and `increment_stock` functions created
- [ ] All indexes created
- [ ] Seed data inserted (10 menu items)

### Frontend
- [ ] `src/context/AuthContext.jsx` — provides `user`, `profile`, `signIn`, `signOut`
- [ ] `src/hooks/useAuth.js` — `signIn`, `signOut`, `fetchProfile`
- [ ] `src/pages/Login.jsx` — email + password form, gradient background, validation
- [ ] `src/App.jsx` — React Router setup, protected routes, role-based redirect
- [ ] `src/components/common/Spinner.jsx`
- [ ] `src/components/common/Toast.jsx` (react-hot-toast configured)

**Test Checkpoint:**
- Student email logs in → redirected to `/student/menu`
- Staff email logs in → redirected to `/staff/scanner`
- Admin email logs in → redirected to `/admin/dashboard`
- Wrong password → friendly error toast shown
- Refresh page → session persists

---

## Phase 3 — Student Menu and Cart

**Goal:** Students can browse the menu, filter by category, and add items to a cart.

**Deliverables:**
- [ ] `src/hooks/useMenu.js` — fetches available menu items from Supabase
- [ ] `src/components/student/MenuCard.jsx` — food card with image, name, price, Add button
- [ ] `src/context/CartContext.jsx` — cart state: items, quantities, total
- [ ] `src/hooks/useCart.js` — `addItem`, `removeItem`, `updateQuantity`, `clearCart`
- [ ] `src/components/student/CartDrawer.jsx` — slide-up cart summary on mobile
- [ ] `src/pages/student/MenuPage.jsx` — search, category filter chips, 2-col grid
- [ ] Category filter derived dynamically from menu data (not hardcoded)
- [ ] Stock count shown on card — "Only 3 left" warning when stock ≤ 5
- [ ] Add button disabled when `stock_quantity === 0`
- [ ] Floating cart bar at bottom when cart is non-empty

**Test Checkpoint:**
- Menu loads with real Supabase data
- Category filter hides/shows items correctly
- Adding an item increments cart count in floating bar
- Out-of-stock item shows disabled Add button
- Cart drawer opens and shows correct items and total

---

## Phase 4 — Order Placement and QR Code

**Goal:** Students can confirm their cart, complete a demo payment, and receive a working QR code.

**Deliverables:**
- [ ] `src/pages/student/CheckoutPage.jsx` — order summary, item list, total, Pay button
- [ ] `src/utils/qrTokens.js` — `encryptToken()` and `decryptToken()` with CryptoJS
- [ ] `src/utils/stockLock.js` — `lockStock()` and `releaseStock()` via Supabase RPC
- [ ] `src/hooks/useOrders.js` — `placeOrder()`, `fetchOrderHistory()`, `fetchOrderById()`
- [ ] Demo payment screen — simple modal with "Confirm Payment" button (no real gateway)
- [ ] On payment confirm: stock locked, order inserted, order_items inserted, QR token generated
- [ ] `src/pages/student/QRPage.jsx` — full-screen gradient background, centered white QR code
- [ ] QR encodes the encrypted token only — never the raw order ID
- [ ] Realtime subscription on QRPage: status updates live
- [ ] `src/pages/student/HistoryPage.jsx` — list of past orders with status badges

**Test Checkpoint:**
- Place an order → order appears in Supabase `orders` table with status `paid`
- QR code is displayed correctly
- `qr_token` in database is encrypted (not a readable order ID)
- Order history shows the new order with correct items and total
- Stock quantity in `menu_items` decremented correctly after order

---

## Phase 5 — Staff QR Scanner

**Goal:** Staff can scan student QR codes, view order details, and mark orders as delivered.

**Deliverables:**
- [ ] `src/pages/staff/ScannerPage.jsx` — full dark screen, camera viewfinder, scan result area
- [ ] `src/hooks/useQR.js` — `verifyQR(token)`, `deliverOrder(orderId, staffId)`
- [ ] `src/components/staff/ScannerView.jsx` — html5-qrcode integration, start/stop controls
- [ ] `src/components/staff/OrderVerifyCard.jsx` — shows student name, items, total, time after scan
- [ ] `src/components/staff/DeliverButton.jsx` — gradient button, disabled after deliver is tapped
- [ ] On valid scan: display order details, enable deliver button
- [ ] On deliver tap: update `status` to `collected`, update `qr_scanned_count` to 1
- [ ] On invalid scan: show "Invalid QR code" toast, do not show order details
- [ ] `src/pages/staff/ActiveOrdersPage.jsx` — list of all paid/ready orders for manual lookup

**Test Checkpoint:**
- Scanner opens camera on ScannerPage load
- Scanning valid student QR shows correct order details
- Tapping Deliver updates order status to `collected` in Supabase
- Student's QRPage updates in real time (Realtime subscription fires)
- Scanning the same QR again after delivery triggers the fraud path (next phase)

---

## Phase 6 — Fraud Detection

**Goal:** The system automatically detects and logs all fraud events. Staff sees a clear alert.

**Deliverables:**
- [ ] `src/utils/fraudDetection.js` — `logFraudAttempt(orderId, reason, staffId)`
- [ ] Duplicate scan detection: if `qr_scanned_count >= 1` → log `'duplicate_scan'`
- [ ] Invalid token detection: if `decryptToken()` returns null → log `'invalid_qr'`
- [ ] Already collected detection: if `status === 'collected'` → log `'duplicate_scan'`
- [ ] Expired order detection: if order `created_at` > expiry window → log `'expired_order'`
- [ ] Staff sees a clear red alert modal for each fraud case with reason in plain language
- [ ] Fraud event logged to `fraud_logs` table with `order_id`, `reason`, `scanned_by`, `detected_at`
- [ ] `src/pages/admin/FraudPage.jsx` — table of all fraud logs, sortable by date
- [ ] `src/components/admin/FraudLogTable.jsx` — row shows: time, reason, staff name, order ID

**Test Checkpoint:**
- Scan a valid QR and deliver → scan same QR again → `duplicate_scan` entry appears in `fraud_logs`
- Scan a random string as QR → `invalid_qr` entry appears in `fraud_logs`
- Admin fraud page shows both entries with correct timestamps and reasons

---

## Phase 7 — Admin Dashboard

**Goal:** Admin has full visibility and control over the canteen system.

**Deliverables:**
- [ ] `src/pages/admin/DashboardPage.jsx` — stats strip + charts + recent orders
- [ ] `src/hooks/useAnalytics.js` — daily revenue, top items, hourly volume
- [ ] `src/components/admin/StatsCard.jsx` — single metric card (total orders, revenue, fraud count)
- [ ] `src/components/admin/SalesChart.jsx` — Recharts BarChart for hourly orders
- [ ] `src/pages/admin/MenuManagerPage.jsx` — list of all items, add/edit/toggle availability
- [ ] `src/components/admin/MenuItemForm.jsx` — form to create or edit a menu item
- [ ] `src/pages/admin/StockPage.jsx` — table of all items with editable stock quantity
- [ ] `src/components/admin/StockEditor.jsx` — inline stock edit with save button
- [ ] `src/pages/admin/OrdersPage.jsx` — all orders, filterable by status and date
- [ ] Admin routes lazy-loaded with `React.lazy()` (do not load in student/staff bundle)

**Test Checkpoint:**
- Admin can add a new menu item — appears on student menu page immediately
- Admin can disable a menu item — disappears from student menu
- Admin can update stock — new value reflects in student menu
- Dashboard stats reflect real order data from Supabase
- Fraud log table shows all fraud events

---

## Phase 8 — PWA and Deployment

**Goal:** App is installable as a PWA and deployed to Vercel.

**Deliverables:**
- [ ] `vite.config.js` — `vite-plugin-pwa` configured with correct manifest
- [ ] PWA manifest: `name`, `short_name`, `theme_color: #000F08`, `display: standalone`
- [ ] App icons: `icon-192.png` and `icon-512.png` in `public/icons/`
- [ ] Service worker registered — React Query cache survives offline
- [ ] QR display page works offline (QR token cached in localStorage after generation)
- [ ] Vercel project created, environment variables set in Vercel dashboard
- [ ] Production build passes: `npm run build` with no errors
- [ ] Deployed URL works on mobile — "Add to Home Screen" installs the app

**Test Checkpoint:**
- `npm run build` completes with no errors or warnings
- Deployed URL opens on Android Chrome — "Add to Home Screen" prompt appears
- Installed app opens without browser chrome (standalone mode)
- Student can place an order end-to-end on mobile
- Staff can scan QR code on mobile camera

---

## Current Phase Tracker

Update this section manually after completing each phase.

```
Phase 1 — Project Foundation       [x] In Progress  [x] Complete
Phase 2 — Database and Auth        [x] In Progress  [x] Complete
Phase 3 — Student Menu and Cart    [x] In Progress  [x] Complete
Phase 4 — Order and QR Code        [x] In Progress  [x] Complete
Phase 5 — Staff QR Scanner         [x] In Progress  [x] Complete
Phase 6 — Fraud Detection          [x] In Progress  [x] Complete
Phase 7 — Admin Dashboard          [x] In Progress  [x] Complete
Phase 8 — PWA and Deployment       [/] In Progress  [ ] Complete
```

---

## Agent Instruction for Phase Management

When the user says "start Phase N" or "move to Phase N":
1. Read the deliverables for that phase from this file.
2. Check which items are unchecked.
3. Build each deliverable in order, starting with data hooks before UI components.
4. After generating each file, confirm it is complete before moving to the next.
5. When all deliverables for the phase are complete, update the phase tracker above.
6. Do not begin Phase N+1 until the test checkpoint for Phase N is confirmed by the user.
