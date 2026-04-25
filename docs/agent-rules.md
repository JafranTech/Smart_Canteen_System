# Agent Rules

## Role of This File

This file defines non-negotiable operating rules for the AI development agent. These rules govern code quality, naming conventions, security, error handling, and behaviour patterns. Every rule here applies to every file generated, in every phase, without exception. When in doubt, be stricter — not looser.

---

## Prime Directive

> "Build production-quality code. Not demo code. Not prototype code. Every component must handle its loading state, error state, and empty state. Every Supabase call must have error handling. Every form must validate before submitting. Every QR operation must account for the unhappy path."

---

## Code Quality Rules — NEVER VIOLATE

| Rule | Detail |
|---|---|
| Functional components only | Never generate class components. Always use functional components with hooks. |
| One component per file | Each `.jsx` file contains exactly one exported component. |
| No inline styles | Never use `style={{ ... }}` on elements. Use Tailwind utility classes only. |
| No hardcoded colors | Never write `#FB3640` in JSX. Always use Tailwind classes like `text-imperial`. |
| No `console.log` in production code | Remove all debug logs. Use `console.error` only in catch blocks. |
| No magic numbers | Extract repeated values into named constants. |
| Max component length: 150 lines | If a component exceeds 150 lines, split it into sub-components. |
| No deeply nested ternaries | Maximum 1 level of ternary in JSX. Use early returns or helper functions for complex conditionals. |

---

## Naming Conventions — EXACT (FOLLOW PRECISELY)

### Files
```
Components:       PascalCase      MenuCard.jsx, OrderSummary.jsx, QRDisplay.jsx
Pages:            PascalCase      MenuPage.jsx, ScannerPage.jsx, DashboardPage.jsx
Hooks:            camelCase       useMenu.js, useOrders.js, useAuth.js
Utilities:        camelCase       qrTokens.js, fraudDetection.js, formatters.js
Context:          PascalCase      AuthContext.jsx, CartContext.jsx
```

### Variables and Functions
```
React state:      camelCase               const [isLoading, setIsLoading] = useState(false)
Event handlers:   handle prefix           const handleSubmit = () => {}
                                          const handleScan = (data) => {}
Boolean props:    is/has/can prefix       isLoading, hasError, canDeliver
Constants:        UPPER_SNAKE_CASE        MAX_CART_ITEMS, QR_EXPIRY_HOURS
Supabase queries: descriptive verbs       fetchMenuItems, placeOrder, verifyQRToken
```

### CSS / Tailwind
```
Custom classes:   kebab-case              .gradient-bg, .card-shadow
Tailwind config:  camelCase               nightColor, imperialColor
```

### Supabase
```
Table names:      snake_case              menu_items, order_items, fraud_logs
Column names:     snake_case              student_id, qr_token, created_at
RLS policy names: human-readable          "Students can view own orders"
Function names:   snake_case              decrement_stock, handle_new_user
```

---

## React Patterns — REQUIRED

### Every data-fetching component must have all three states:

```jsx
function MenuPage() {
  const { data, isLoading, error } = useMenuItems()

  if (isLoading) return <LoadingSkeleton />
  if (error)     return <ErrorState message="Failed to load menu. Please try again." />
  if (!data?.length) return <EmptyState message="No items available right now." />

  return <MenuGrid items={data} />
}
```

### Custom hooks must follow this structure:

```js
// src/hooks/useMenu.js
export function useMenuItems() {
  return useQuery({
    queryKey: ['menu_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('is_available', true)
      if (error) throw new Error(error.message)
      return data
    },
  })
}
```

### Context providers must expose clear interfaces:

```jsx
// Always export a custom hook for context consumption
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
```

### Form validation must happen before any Supabase call:

```js
function validateLoginForm(email, password) {
  const errors = {}
  if (!email.includes('@'))        errors.email    = 'Enter a valid email address'
  if (password.length < 6)         errors.password = 'Password must be at least 6 characters'
  return errors
}

const handleLogin = async () => {
  const errors = validateLoginForm(email, password)
  if (Object.keys(errors).length > 0) {
    setFormErrors(errors)
    return                            // Stop here — never call Supabase with invalid data
  }
  try {
    await signIn(email, password)
  } catch (err) {
    toast.error(err.message)
  }
}
```

---

## Security Rules — ABSOLUTE

| Rule | Detail |
|---|---|
| Anon key only in frontend | Never use service role key in `src/`. Only `VITE_SUPABASE_ANON_KEY`. |
| Encrypt all QR tokens | Never encode raw order IDs in QR codes. Always AES-encrypt via `qrTokens.js`. |
| Validate role server-side | Never trust `role` passed from the frontend. Always re-read from `profiles` table. |
| RLS on every table | Every table must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` before any data is inserted. |
| No sensitive data in URL params | Never pass order IDs, tokens, or user IDs in URL query strings. |
| Environment variables for all secrets | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_QR_SECRET` must all come from `.env.local`. Never hardcode. |

---

## Error Handling Rules

### Supabase Errors — Always Catch, Never Expose Raw

```js
// WRONG — do not do this
const { data, error } = await supabase.from('orders').select('*')
if (error) toast.error(error.message)   // Raw Supabase error shown to user

// CORRECT
try {
  const { data, error } = await supabase.from('orders').select('*')
  if (error) throw error
  return data
} catch (err) {
  console.error('[useOrders] fetch failed:', err)
  throw new Error('Unable to load orders. Please refresh and try again.')
}
```

### User-Facing Error Messages — Friendly Always

```
Database error    →  "Something went wrong. Please try again."
Network timeout   →  "Connection lost. Check your internet and retry."
Invalid QR scan   →  "This QR code is not valid."
Duplicate scan    →  "This order has already been collected."
Out of stock      →  "This item is no longer available."
Auth failure      →  "Incorrect email or password."
```

---

## Component File Template

Use this structure as the starting point for every new component:

```jsx
import { useState } from 'react'
import { supabase } from '../lib/supabase'

// ─── Constants ───────────────────────────────────────────────

// ─── Types / PropTypes ───────────────────────────────────────

// ─── Sub-components (if needed, keep small) ──────────────────

// ─── Main Component ──────────────────────────────────────────
export default function ComponentName({ prop1, prop2 }) {
  // State
  const [isLoading, setIsLoading] = useState(false)

  // Data hooks
  // const { data, error } = useHookName()

  // Handlers
  const handleAction = async () => {}

  // Loading / error / empty states first
  if (isLoading) return <LoadingState />

  // Main render
  return (
    <div className="...">
      {/* content */}
    </div>
  )
}
```

---

## PWA Rules

- All pages must be readable when offline if data was previously cached via React Query.
- The QR display page must work offline once the QR has been generated — cache the QR token in localStorage.
- Service worker must be registered in `src/main.jsx` using `vite-plugin-pwa`.
- App manifest must define `"display": "standalone"` and correct theme color (`#000F08`).

---

## Performance Rules

| Rule | Detail |
|---|---|
| Lazy-load admin routes | Use `React.lazy()` + `Suspense` for all admin pages. Students and staff should not load admin bundle. |
| Optimise images | All food images must be served from Supabase Storage. Never embed base64 images. |
| Debounce search inputs | Any search input must debounce by 300ms before triggering a query. |
| Pagination for tables | Admin order history and fraud logs must use pagination (20 rows per page). Never load all records. |
| Avoid unnecessary re-renders | Never define objects or functions inside JSX. Extract them outside the render. |

---

## Git and File Rules

- Never commit `.env.local` — add it to `.gitignore` immediately.
- `.env.example` must always be kept up to date with all required variable names (values empty).
- All components must be importable without circular dependencies.
- Never import directly from `@supabase/supabase-js` inside components — always import from `src/lib/supabase.js`.
