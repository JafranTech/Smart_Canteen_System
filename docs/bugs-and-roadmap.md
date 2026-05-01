# Bug Fixes & Completion Roadmap

## Role of This File
This file is a senior developer audit of the current codebase state.
The AI agent must read this file before touching any existing file.
Execute phases in order: A → B → C → D → E → F.
Do not skip phases. Do not start the next phase until the current one is confirmed working.



📊 Completion Percentage: ~72%
Here's the breakdown by phase from the roadmap:
PhaseStatus% DonePhase 1 — Foundation✅ Complete100%Phase 2 — Auth & DB✅ Complete100%Phase 3 — Menu & Cart✅ Complete100%Phase 4 — Orders & QR✅ Complete95%Phase 5 — Staff Scanner⚠️ Partial70%Phase 6 — Fraud Detection⚠️ Partial60%Phase 7 — Admin Dashboard⚠️ Partial55%Phase 8 — PWA & Deploy⚠️ Partial65%

🐛 Bug Report — Scanner Blank Screen
Root cause: The html5-qrcode library injects its own video element directly into the DOM element with id="qr-reader". The problem is you have CSS on that container: overflow-hidden + rounded-3xl. On most mobile browsers, overflow: hidden on the parent clips and hides the dynamically injected <video> and <canvas> elements that html5-qrcode creates — resulting in a blank square.
Two additional bugs found:

Route mismatch — ScannerPage.jsx links to /staff/active-orders but App.jsx registers /staff/orders. The back button goes to a 404/catch-all.
Scanner not auto-started — The code requires the staff member to manually click "Start Scanner" every time. Should auto-start on mount for zero-friction workflow.


❓ Single Login Page → Different Pages — Is it a good approach?
Yes, single login with role-based redirect is the correct, industry-standard approach for SaaS. It's what Notion, Linear, and Slack do. Your current implementation is actually already correct:

One /login route → after auth, reads profile.role → redirects to the right dashboard
Students never see the admin URL; staff never see the student menu

The only thing to improve is the hardcoded test credentials visible in the login UI (autoFill buttons with real emails and passwords). Remove those before going to production.

🚀 Phase-by-Phase Completion Plan with AI Agent Prompts
You paste these prompts directly into your AI agent IDE (Cursor/Windsurf/etc.). Each prompt is self-contained.

⚡ PHASE A — Fix Critical Bugs (Do This First)
Prompt A1 — Fix Scanner Blank Screen Bug:
In the file src/components/staff/ScannerView.jsx, fix the blank screen bug caused by html5-qrcode injecting a video element that gets clipped.

The fix:
1. Remove `overflow-hidden` from the `id="qr-reader"` div.
2. Remove the fixed `aspect-square` class from that div — instead give it `style={{ minHeight: '300px' }}` via a Tailwind arbitrary value `min-h-[300px]`.
3. Remove the inner `absolute` placeholder text div — html5-qrcode already handles its own placeholder UI.
4. Auto-start the scanner when the component mounts by calling `startScanner()` inside the existing `useEffect` (after `scannerRef.current = new Html5Qrcode('qr-reader')`), wrapped in a 300ms setTimeout to ensure the DOM element is fully painted.
5. Keep all existing stop/start button logic. Just add the auto-start behavior on mount.
6. The outer container div should use: `className="w-full max-w-sm rounded-3xl overflow-visible border border-white/10 relative min-h-[300px]"`

Do not change any other files. Only fix ScannerView.jsx.
Prompt A2 — Fix Route Mismatch:
In src/pages/staff/ScannerPage.jsx, find the Link component that navigates to "/staff/active-orders" and change it to "/staff/orders". This fixes a broken navigation because App.jsx registers the route as /staff/orders not /staff/active-orders.

Only change that one string. Do not touch anything else.
Prompt A3 — Remove Hardcoded Test Credentials:
In src/pages/Login.jsx, remove the entire "Quick Fill for Testing" section at the bottom of the component. This includes:
1. The `autoFill` function definition
2. The entire JSX block that contains the "Quick Fill for Testing" paragraph and the three role buttons (student, staff, admin)
3. The import of `clsx` if it is no longer used after removal

Also remove all `console.log` statements from the file (keep only `console.error` in catch blocks).
Keep everything else exactly the same.

🔧 PHASE B — Complete Staff Scanner (Phase 5 Gaps)
Prompt B1 — Staff Active Orders Page:
In src/pages/staff/ActiveOrdersPage.jsx, build a complete working page that:

1. Fetches all orders from Supabase where status IN ('paid', 'ready') using useQuery from @tanstack/react-query with queryKey ['active_orders']
2. The query joins: orders.*, profiles(name, college_id), order_items(quantity, menu_items(name))
3. Shows a loading skeleton of 3 card placeholders while fetching (animate-pulse bg-gray-700 rounded-2xl h-24)
4. Shows an EmptyState when no active orders exist with message "No active orders right now"
5. Renders each order as a dark card (bg-white/5 border border-white/10 rounded-2xl p-4) showing: student name, college ID, items list (comma separated), total amount in ₹, time ago using date-fns formatDistanceToNow, and a status badge
6. Uses Supabase Realtime to subscribe to INSERT and UPDATE on the orders table — on any change, call queryClient.invalidateQueries(['active_orders'])
7. Page background is bg-night, text is white
8. Has a header with "Active Orders" title and a link back to /staff/scanner using ArrowLeft icon from lucide-react
9. Unsubscribes from realtime on component unmount

Use the existing component patterns from the codebase. Import supabase from src/lib/supabase.js.

🛡️ PHASE C — Complete Fraud Detection (Phase 6 Gaps)
Prompt C1 — Wire Up Expired Order Detection:
In src/hooks/useQR.js, find the verifyQR function. After the duplicate scan check (qr_scanned_count >= 1), add an expiry check:

1. Define ORDER_EXPIRY_HOURS = 4 (orders expire 4 hours after creation)
2. Calculate if the order is expired: check if order.created_at is more than ORDER_EXPIRY_HOURS ago using Date.now() comparison
3. If expired AND status is still 'paid': call logFraudAttempt(order.id, 'expired_order', staffId) and return { valid: false, reason: 'expired_order' }
4. Import logFraudAttempt from src/utils/fraudDetection.js

Do not change anything else in the file.
Prompt C2 — Admin Fraud Page:
In src/pages/admin/FraudPage.jsx, build a complete working page that:

1. Fetches all fraud_logs from Supabase: select('*, orders(id, total_amount), profiles(name)') ordered by detected_at DESC, limit 100
2. Uses useQuery with queryKey ['fraud_logs']
3. Shows a stats strip at the top with 3 StatsCard components: Total Fraud Attempts (count of all logs), Duplicate Scans (count where reason = 'duplicate_scan'), Invalid QR (count where reason = 'invalid_qr')
4. Renders a FraudLogTable component passing the logs as a prop
5. Page is wrapped in AdminLayout

In src/components/admin/FraudLogTable.jsx, build a table that:
1. Accepts `logs` array as a prop
2. Has columns: Time (formatDistanceToNow), Reason (human readable badge), Staff Name (from profiles join), Order ID (first 8 chars of UUID in monospace, or "N/A" if null)
3. Reason badges: duplicate_scan = red, invalid_qr = orange, expired_order = amber
4. Each row alternates bg-white and bg-gray-50
5. Shows a "No fraud events recorded" empty state when logs is empty
6. Table is paginated: show 20 rows per page with Prev/Next buttons

Use existing AdminLayout and StatsCard components from the codebase.

📊 PHASE D — Complete Admin Dashboard (Phase 7 Gaps)
Prompt D1 — Analytics Hook:
In src/hooks/useAnalytics.js, implement three exported query hooks:

1. useDailyRevenue() — fetches orders where status='collected' and created_at >= start of today. Returns: { totalRevenue: number, totalOrders: number }

2. useTopItems() — fetches from order_items joined with menu_items(name), groups by menu_item_id, sums quantity, returns top 5 items as array of { name, totalQuantity }. Since Supabase doesn't support GROUP BY directly, fetch all order_items with the join and aggregate in JavaScript using Array.reduce.

3. useHourlyVolume() — fetches today's orders (status='collected'), groups by hour (0-23) using JavaScript, returns array of { hour: string (e.g. '9AM'), count: number } for the last 12 hours only.

Each hook uses useQuery from @tanstack/react-query with appropriate queryKeys. Use supabase from src/lib/supabase.js. Throw errors properly so React Query handles retries.
Prompt D2 — Dashboard Page:
In src/pages/admin/DashboardPage.jsx, rebuild the page to be fully connected to real data:

1. Import and use useDailyRevenue, useTopItems, useHourlyVolume from src/hooks/useAnalytics.js
2. Top section: dark gradient header (bg-gradient-to-r from-night to-imperial) with "Good morning, Admin" title and today's date
3. Stats strip (3 cards in a row): Today's Revenue (₹ formatted), Orders Collected, and Fraud Attempts (query fraud_logs count for today separately)
4. SalesChart component receives hourlyVolume data — render as Recharts BarChart with hour on X-axis and count on Y-axis, bar fill color #FB3640
5. Top Items section: ranked list of top 5 items with a simple horizontal bar showing relative quantity
6. Recent Orders section: fetch last 10 orders from Supabase (any status), show as a simple table with: order ID (first 8 chars), student name (join profiles), total, status badge, time ago
7. Each data section must show a loading skeleton while fetching and a friendly error message if the query fails
8. Wrap entire page in AdminLayout

🌐 PHASE E — Production Hardening
Prompt E1 — Environment & Security Cleanup:
Do the following security and production hardening tasks across the project:

1. In src/utils/qrTokens.js — verify that encryptToken and decryptToken use VITE_QR_SECRET from import.meta.env. If the secret is missing (undefined), throw an Error('QR_SECRET environment variable is not set') rather than silently failing.

2. In src/lib/supabase.js — add a guard: if VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing, throw an Error with a clear message listing which variable is missing.

3. In src/pages/admin/MenuManagerPage.jsx — ensure the image upload section writes to Supabase Storage bucket 'food-images' using the menu item's UUID as the filename, and saves the public URL to the image_url column. If the bucket doesn't exist, show a friendly error toast.

4. In vite.config.js — confirm vite-plugin-pwa is configured with: name='Smart Canteen', short_name='Canteen', theme_color='#000F08', display='standalone', and both icon sizes (192, 512) pointing to /icons/icon-192.png and /icons/icon-512.png.

5. Create/update .env.example to contain exactly these three keys with empty values:
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_QR_SECRET=

Do not change any UI or business logic.
Prompt E2 — Offline QR Support:
In src/pages/student/QRPage.jsx, implement offline QR caching:

1. After the QR token is successfully fetched from Supabase, save it to localStorage with key `canteen_qr_${orderId}` and value being the qr_token string.

2. On component mount, before making the Supabase query, check if a cached token exists in localStorage for the current orderId (read orderId from React Router location state or URL params — whichever is already used in the file).

3. If a cached token exists, render the QR code immediately from cache while the Supabase fetch completes in the background.

4. Add a small "Cached — works offline" badge (text-xs text-white/40) below the QR when rendering from cache.

5. When the order status updates to 'collected' via Realtime, remove the localStorage entry: localStorage.removeItem(`canteen_qr_${orderId}`).

Do not change the QR encryption/decryption logic. Only add the caching layer.

🚀 PHASE F — Final Deployment Checklist
Prompt F1 — Pre-Deploy Build Audit:
Do a production build audit across the entire src/ folder:

1. Find and remove ALL console.log statements. Keep console.error only inside catch blocks.

2. Find any component files longer than 150 lines and split them into sub-components. Place sub-components in the same file above the main export.

3. In src/App.jsx, confirm the catch-all route `<Route path="*">` redirects to "/" not to "/login" — unauthenticated users hitting a bad URL should see the Landing page first.

4. In every page component, confirm there is a loading state, an error state, and an empty state. If any are missing, add them using the existing Spinner, EmptyState, and error div patterns already used in the codebase.

5. In src/styles/globals.css or src/index.css, confirm that `gradient-bg`, `gradient-btn`, `input-base`, and `noise-overlay` CSS classes are defined. If any are missing, add them based on the design system: gradient-bg uses linear-gradient(135deg, #000F08, #FB3640), gradient-btn uses linear-gradient(90deg, #000F08, #FB3640), input-base uses px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-imperial focus:outline-none transition duration-200.

Report what was changed.

🗺️ Summary: What You Have vs. What's Left
✅ Already working well:

Auth system with role-based routing (well-architected)
Student menu, cart, checkout, QR flow
Single login page with auto-redirect (this is the right approach, keep it)
Database schema and RLS design (solid)
PWA setup (mostly done)
Design system (clean and consistent)

🔴 Must fix now:

Scanner blank screen (Prompt A1)
Staff route mismatch (Prompt A2)
Hardcoded credentials in login (Prompt A3)

🟡 Complete before going live:

Admin dashboard connected to real data (Prompts D1, D2)
Fraud page fully built (Prompt C2)
Expired order detection (Prompt C1)
Offline QR caching (Prompt E2)

🟢 Polish (nice to have):

Active Orders realtime page for staff (Prompt B1)
Full pre-deploy audit (Prompt F1)

Execute in order: A → B → C → D → E → F and you'll have a production-ready SaaS.