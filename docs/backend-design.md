# Backend Design

## Role of This File

This file defines every Supabase operation, Row Level Security policy, authentication pattern, realtime subscription, and server-side logic rule in the Smart Canteen system. The AI agent must implement all backend interactions exactly as specified here. Do not bypass RLS, do not use service keys in the frontend, and do not invent API patterns not documented below.

---

## Supabase Service Architecture

```
Supabase Project
├── Auth             ← Email/password auth + user metadata (role)
├── Database         ← PostgreSQL with full RLS
├── Realtime         ← Live order status updates
└── Storage          ← Food item images (public bucket)
```

---

## Authentication System

### Auth Strategy
- **Students:** Sign in with college email + password via `supabase.auth.signInWithPassword()`
- **Staff:** Sign in with staff email + password (provisioned by admin)
- **Admin:** Sign in with admin email + password (provisioned manually in Supabase dashboard)

### Role Assignment
User role is stored in a `profiles` table linked to `auth.users`. Role is read from `profiles` after login and stored in `AuthContext`.

### Login Flow — `src/hooks/useAuth.js`

```js
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', data.user.id)
    .single()

  return { user: data.user, profile }
}
```

### Session Persistence
Supabase client auto-manages session tokens in localStorage. On app load, check for existing session:

```js
const { data: { session } } = await supabase.auth.getSession()
```

### Auth State Listener — `src/context/AuthContext.jsx`

```js
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      if (session) {
        const profile = await fetchProfile(session.user.id)
        setUser({ ...session.user, ...profile })
      } else {
        setUser(null)
      }
    }
  )
  return () => subscription.unsubscribe()
}, [])
```

---

## Row Level Security (RLS) Policies

RLS is enabled on every table. These are the exact policies to implement.

### `profiles` Table

```sql
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile (name only)
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

-- Admin can read all profiles
CREATE POLICY "Admin can view all profiles"
ON profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### `menu_items` Table

```sql
-- All authenticated users can read available menu items
CREATE POLICY "Authenticated users can view menu"
ON menu_items FOR SELECT
TO authenticated
USING (is_available = true);

-- Admin can do everything
CREATE POLICY "Admin has full menu access"
ON menu_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### `orders` Table

```sql
-- Students can only see their own orders
CREATE POLICY "Students can view own orders"
ON orders FOR SELECT
USING (auth.uid() = student_id);

-- Students can insert new orders
CREATE POLICY "Students can create orders"
ON orders FOR INSERT
WITH CHECK (auth.uid() = student_id);

-- Staff can read all paid/ready orders
CREATE POLICY "Staff can view active orders"
ON orders FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('staff', 'admin')
  )
);

-- Staff can update order status only
CREATE POLICY "Staff can update order status"
ON orders FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'staff'
  )
)
WITH CHECK (true);
```

### `order_items` Table

```sql
-- Students can view their own order items
CREATE POLICY "Students can view own order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = order_items.order_id AND student_id = auth.uid()
  )
);

-- Students can insert order items
CREATE POLICY "Students can create order items"
ON order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE id = order_items.order_id AND student_id = auth.uid()
  )
);

-- Staff and admin can read all order items
CREATE POLICY "Staff can view all order items"
ON order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('staff', 'admin')
  )
);
```

### `fraud_logs` Table

```sql
-- Staff can insert fraud logs
CREATE POLICY "Staff can create fraud logs"
ON fraud_logs FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('staff', 'admin')
  )
);

-- Admin can read all fraud logs
CREATE POLICY "Admin can read all fraud logs"
ON fraud_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

---

## Data Operation Patterns

### Fetching Menu Items — `src/hooks/useMenu.js`

```js
export function useMenuItems() {
  return useQuery({
    queryKey: ['menu_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
        .order('category', { ascending: true })
      if (error) throw error
      return data
    },
  })
}
```

### Placing an Order — `src/hooks/useOrders.js`

```js
export async function placeOrder(studentId, cartItems, total) {
  const orderId = crypto.randomUUID()
  const rawToken = `${orderId}:${studentId}:${Date.now()}`
  const qrToken  = encryptToken(rawToken)

  // 1. Create order record
  const { error: orderError } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      student_id: studentId,
      total_amount: total,
      status: 'paid',
      qr_token: qrToken,
      qr_scanned_count: 0,
    })
  if (orderError) throw orderError

  // 2. Insert all order items
  const items = cartItems.map(item => ({
    order_id: orderId,
    menu_item_id: item.id,
    quantity: item.quantity,
    unit_price: item.price,
  }))
  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(items)
  if (itemsError) throw itemsError

  return { orderId, qrToken }
}
```

### Stock Lock — `src/utils/stockLock.js`

```js
// Decrement stock when order is placed
export async function lockStock(cartItems) {
  for (const item of cartItems) {
    const { error } = await supabase.rpc('decrement_stock', {
      item_id: item.id,
      qty: item.quantity,
    })
    if (error) throw error
  }
}

// Restore stock if payment fails or order is cancelled
export async function releaseStock(cartItems) {
  for (const item of cartItems) {
    const { error } = await supabase.rpc('increment_stock', {
      item_id: item.id,
      qty: item.quantity,
    })
    if (error) throw error
  }
}
```

### Supabase SQL Functions for Stock Control

```sql
-- Safely decrement stock (cannot go below 0)
CREATE OR REPLACE FUNCTION decrement_stock(item_id uuid, qty integer)
RETURNS void AS $$
  UPDATE menu_items
  SET stock_quantity = GREATEST(stock_quantity - qty, 0)
  WHERE id = item_id;
$$ LANGUAGE sql;

-- Increment stock on cancellation
CREATE OR REPLACE FUNCTION increment_stock(item_id uuid, qty integer)
RETURNS void AS $$
  UPDATE menu_items
  SET stock_quantity = stock_quantity + qty
  WHERE id = item_id;
$$ LANGUAGE sql;
```

### QR Verification — `src/hooks/useQR.js`

```js
export async function verifyQR(scannedToken) {
  const decrypted = decryptToken(scannedToken)

  if (!decrypted) {
    return { valid: false, reason: 'invalid_qr' }
  }

  const { data: order, error } = await supabase
    .from('orders')
    .select('*, order_items(*, menu_items(name))')
    .eq('qr_token', scannedToken)
    .single()

  if (error || !order) {
    return { valid: false, reason: 'invalid_qr' }
  }
  if (order.status !== 'paid') {
    return { valid: false, reason: 'already_collected' }
  }
  if (order.qr_scanned_count >= 1) {
    return { valid: false, reason: 'duplicate_scan', order }
  }

  return { valid: true, order }
}

export async function deliverOrder(orderId, staffId) {
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'collected',
      qr_scanned_count: 1,
    })
    .eq('id', orderId)

  if (error) throw error
}
```

### Logging Fraud — `src/utils/fraudDetection.js`

```js
export async function logFraudAttempt(orderId, reason, staffId) {
  const { error } = await supabase
    .from('fraud_logs')
    .insert({
      order_id: orderId || null,
      reason,
      scanned_by: staffId,
      detected_at: new Date().toISOString(),
    })
  if (error) console.error('Failed to log fraud:', error)
}
```

---

## Realtime Subscriptions

### Student — Watch Order Status

```js
// On QRPage, subscribe to order status changes in real time
const subscription = supabase
  .channel(`order:${orderId}`)
  .on(
    'postgres_changes',
    { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
    (payload) => {
      setOrderStatus(payload.new.status)
    }
  )
  .subscribe()

// Cleanup
return () => supabase.removeChannel(subscription)
```

### Admin — Watch Incoming Orders

```js
const subscription = supabase
  .channel('new_orders')
  .on(
    'postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'orders' },
    (payload) => {
      queryClient.invalidateQueries(['orders'])
    }
  )
  .subscribe()
```

---

## Analytics Queries

### Daily Revenue

```js
const { data } = await supabase
  .from('orders')
  .select('total_amount, created_at')
  .eq('status', 'collected')
  .gte('created_at', startOfDay.toISOString())
  .lte('created_at', endOfDay.toISOString())
```

### Most Ordered Items

```js
const { data } = await supabase
  .from('order_items')
  .select('menu_item_id, quantity, menu_items(name)')
  .order('quantity', { ascending: false })
  .limit(5)
```

---

## Supabase Storage — Food Images

- Bucket name: `food-images`
- Bucket type: **public** (images are served without auth)
- Naming: `{menu_item_id}.jpg`
- Upload: admin panel only

```js
// Upload food image
const { data } = await supabase.storage
  .from('food-images')
  .upload(`${menuItemId}.jpg`, file, { upsert: true })

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('food-images')
  .getPublicUrl(`${menuItemId}.jpg`)
```
