# Technology Stack

## Role of This File

This file defines every library and tool used in the Smart Canteen system. The AI agent must use **exactly these libraries at exactly these versions**. Do not substitute, upgrade, or add libraries without explicit instruction. Every choice here is intentional — do not second-guess it.

---

## Core Framework

| Technology | Version | Purpose |
|---|---|---|
| React | 18.x | UI component framework |
| Vite | 5.x | Build tool and dev server |
| React Router DOM | 6.x | Client-side routing |
| Tailwind CSS | 3.x | Utility-first styling |

### Setup Command
```bash
npm create vite@latest smart-canteen -- --template react
cd smart-canteen
npm install
```

---

## Backend and Database

| Technology | Version | Purpose |
|---|---|---|
| @supabase/supabase-js | 2.x | Supabase client — auth, DB, realtime |

### Supabase Client Setup — `src/lib/supabase.js`
```js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey)
```

> **Rule:** This is the **only place** the Supabase client is instantiated. Every hook imports from this file. Never create a second client instance.

---

## Data Fetching and State

| Technology | Version | Purpose |
|---|---|---|
| @tanstack/react-query | 5.x | Server state, caching, background refetch |

### React Query Setup — `src/main.jsx`
```jsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,  // 2 minutes
      retry: 1,
    },
  },
})
```

> **Rule:** All Supabase data fetching goes through React Query. Never use raw `useEffect` + `useState` for server data. This ensures consistent loading, error, and caching behaviour across all screens.

---

## QR Code

| Technology | Version | Purpose |
|---|---|---|
| qrcode.react | 3.x | Render QR codes in student app |
| html5-qrcode | 2.x | Camera-based QR scanning in staff app |
| crypto-js | 4.x | AES encryption/decryption of QR tokens |

### QR Token Encryption — `src/utils/qrTokens.js`
```js
import CryptoJS from 'crypto-js'

const SECRET = import.meta.env.VITE_QR_SECRET

export function encryptToken(orderId) {
  return CryptoJS.AES.encrypt(orderId, SECRET).toString()
}

export function decryptToken(token) {
  const bytes = CryptoJS.AES.decrypt(token, SECRET)
  return bytes.toString(CryptoJS.enc.Utf8)
}
```

> **Rule:** Never store raw order IDs in QR codes. Always encrypt before generating and decrypt before querying.

---

## UI and Icons

| Technology | Version | Purpose |
|---|---|---|
| lucide-react | latest | Icon library — consistent stroke icons |
| react-hot-toast | 2.x | Toast notifications (success, error, info) |
| clsx | 2.x | Conditional Tailwind class merging |

### Toast Usage Pattern
```js
import toast from 'react-hot-toast'

toast.success('Order placed successfully!')
toast.error('Payment failed. Please try again.')
toast('Scanning QR code...', { icon: '📷' })
```

---

## Charts and Analytics

| Technology | Version | Purpose |
|---|---|---|
| recharts | 2.x | Admin dashboard charts |

### Charts Used in Admin Dashboard
- `BarChart` — hourly order volume
- `LineChart` — daily revenue trend
- `PieChart` — category-wise sales breakdown

> **Rule:** Only use Recharts. Do not install Chart.js, ApexCharts, or any other charting library.

---

## PWA

| Technology | Version | Purpose |
|---|---|---|
| vite-plugin-pwa | latest | Service worker + manifest generation |

### PWA Config — `vite.config.js`
```js
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Crescent Smart Canteen',
        short_name: 'Canteen',
        theme_color: '#000F08',
        background_color: '#000F08',
        display: 'standalone',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
}
```

---

## Utilities

| Technology | Version | Purpose |
|---|---|---|
| date-fns | 3.x | Date formatting and calculations |
| uuid | 9.x | Generating unique order token seeds |

### Formatter Patterns — `src/utils/formatters.js`
```js
import { format, isToday, formatDistanceToNow } from 'date-fns'

export const formatCurrency = (amount) =>
  `₹${Number(amount).toFixed(2)}`

export const formatOrderTime = (timestamp) =>
  isToday(new Date(timestamp))
    ? formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    : format(new Date(timestamp), 'dd MMM yyyy, hh:mm a')
```

---

## Environment Variables — `.env.local`

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_QR_SECRET=a-long-random-secret-string-for-aes-encryption
```

### `.env.example` (safe to commit)
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_QR_SECRET=
```

> **Rule:** All environment variables must be prefixed with `VITE_` to be accessible in the React app. Never hardcode these values in any source file.

---

## Complete Install Command

```bash
npm install \
  @supabase/supabase-js \
  @tanstack/react-query \
  react-router-dom \
  qrcode.react \
  html5-qrcode \
  crypto-js \
  lucide-react \
  react-hot-toast \
  clsx \
  recharts \
  date-fns \
  uuid

npm install -D \
  vite-plugin-pwa \
  tailwindcss \
  postcss \
  autoprefixer
```

---

## What Is Intentionally Excluded

| Excluded | Reason |
|---|---|
| Redux / Zustand | React Context + React Query is sufficient for this system's complexity |
| Axios | Supabase client handles all HTTP internally |
| Next.js | Vite + React Router is lighter and sufficient for a PWA |
| Firebase | Supabase provides all required features with PostgreSQL |
| Real payment gateway | v1 uses demo payment only |
| TypeScript | Out of scope for v1; plain JS is used throughout |
