# UI Design System

## Role of This File

This file is the single source of truth for every visual decision in the Smart Canteen application. The AI agent must apply these tokens, patterns, and rules to every component it generates. Do not invent colors, spacing, or typography outside of this system. If a design decision is not covered here, apply the closest defined rule and flag it for review.

> **Design Identity:** A modern, mobile-first food ordering app built for a college campus. The aesthetic sits between Zomato and a premium dark-themed dashboard — bold gradients, clean card layouts, fast interactions. Every screen should feel like it belongs on a flagship Android phone.

---

## Color Palette — FIXED (NEVER CHANGE)

```
Primary Dark:    #000F08   "Night"       ← Backgrounds, navbars, dark sections
Primary Red:     #FB3640   "Imperial"    ← CTAs, highlights, interactive states
White:           #FFFFFF                 ← Card backgrounds, text on dark
Off-white:       #F5F5F5                 ← Page backgrounds, input backgrounds
Light Gray:      #E0E0E0                 ← Borders, dividers, skeleton loaders
Muted Gray:      #9E9E9E                 ← Placeholder text, secondary labels
Success Green:   #22C55E                 ← Order confirmed, payment success
Warning Amber:   #F59E0B                 ← Low stock alerts, pending states
Error Red:       #EF4444                 ← Validation errors (not Imperial Red)
```

### Tailwind Custom Colors — `tailwind.config.js`
```js
theme: {
  extend: {
    colors: {
      night: '#000F08',
      imperial: '#FB3640',
    },
  },
},
```

---

## Gradient System — THE SIGNATURE VISUAL

The Night-to-Imperial gradient is the identity of this application. Apply it to every major section, hero screen, and primary button.

```css
/* Primary gradient — dark to red */
background: linear-gradient(135deg, #000F08, #FB3640);

/* Reversed — red to dark (use for overlay effects) */
background: linear-gradient(135deg, #FB3640, #000F08);

/* Subtle card accent — very dark, slight red tint */
background: linear-gradient(135deg, #000F08 60%, #3d0509 100%);

/* Button gradient (left to right reads faster on horizontal buttons) */
background: linear-gradient(90deg, #000F08, #FB3640);
```

### Apply Gradient To — ALWAYS
- Landing page hero section background
- Login screen full background
- Order confirmation screen background
- QR display screen background
- Admin dashboard header
- All primary CTA buttons
- Navbar on dark screens
- Category filter active state

### Apply Gradient To — NEVER
- Card backgrounds (use white)
- Input fields (use off-white)
- Error messages (use Error Red)
- Body text
- Data tables

---

## Typography

```
Font Family:   'Inter', system-ui, sans-serif
               (Load from Google Fonts)
```

### Scale
```
Page Title:     text-3xl font-bold      (30px, 700)
Section Title:  text-2xl font-bold      (24px, 700)
Card Title:     text-lg font-semibold   (18px, 600)
Body:           text-base font-normal   (16px, 400)
Label:          text-sm font-medium     (14px, 500)
Caption:        text-xs font-normal     (12px, 400)
Price:          text-xl font-bold       (20px, 700)  — always Imperial Red
```

### Google Fonts Import — `index.html`
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## Spacing and Layout

```
Page padding (mobile):    px-4 py-4
Page padding (desktop):   px-8 py-6
Card padding:             p-4 (mobile), p-6 (desktop)
Section gap:              space-y-6
Card gap in grid:         gap-4
Button padding:           px-6 py-3
Input padding:            px-4 py-3
```

---

## Border Radius System

```
Buttons:          rounded-full          (pill shape — always)
Cards:            rounded-2xl           (large cards, menu items)
Input fields:     rounded-xl
Badges:           rounded-full
Modal:            rounded-3xl
Bottom sheet:     rounded-t-3xl         (mobile modals slide up)
Small elements:   rounded-lg            (chips, tags)
```

> **Rule:** No sharp corners anywhere in the UI. Minimum border radius is `rounded-lg`. This is non-negotiable.

---

## Shadow System

```
Cards:            shadow-md
Elevated cards:   shadow-lg
Navbar:           shadow-sm
Floating button:  shadow-xl
No shadow:        plain text, labels, badges on colored bg
```

---

## Component Patterns — CANONICAL

### Primary Button
```jsx
// Gradient background, white text, pill shape, scale on hover
<button className="
  w-full py-3 px-6 rounded-full font-semibold text-white
  bg-gradient-to-r from-night to-imperial
  hover:scale-[1.02] active:scale-[0.98]
  transition-transform duration-200
  disabled:opacity-50 disabled:cursor-not-allowed
">
  Place Order
</button>
```

### Secondary Button
```jsx
// Transparent with Imperial Red border and text
<button className="
  py-3 px-6 rounded-full font-semibold
  border-2 border-imperial text-imperial
  hover:bg-imperial hover:text-white
  transition-all duration-200
">
  View Menu
</button>
```

### Food Menu Card
```jsx
// White card, food image top, content below
<div className="bg-white rounded-2xl shadow-md overflow-hidden">
  <img className="w-full h-40 object-cover" />
  <div className="p-4">
    <h3 className="text-lg font-semibold text-gray-900">Item Name</h3>
    <p className="text-sm text-gray-500 mt-1">Description line</p>
    <div className="flex items-center justify-between mt-3">
      <span className="text-xl font-bold text-imperial">₹45</span>
      <AddButton />
    </div>
  </div>
</div>
```

### Input Field
```jsx
<input className="
  w-full px-4 py-3 rounded-xl
  bg-gray-50 border border-gray-200
  text-gray-900 placeholder-gray-400
  focus:outline-none focus:ring-2 focus:ring-imperial focus:border-transparent
  transition duration-200
" />
```

### Status Badge
```jsx
// Status → color mapping
const statusColors = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-blue-100 text-blue-700',
  ready:     'bg-purple-100 text-purple-700',
  collected: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}
// Always: rounded-full px-3 py-1 text-xs font-semibold
```

### Gradient Hero Section
```jsx
<section className="
  min-h-screen flex flex-col items-center justify-center
  bg-gradient-to-br from-night to-imperial
  text-white px-6
">
```

### Dark Navbar
```jsx
<nav className="
  fixed top-0 left-0 right-0 z-50
  bg-night/90 backdrop-blur-md
  border-b border-white/10
  px-4 py-3 flex items-center justify-between
">
```

### Bottom Navigation (Mobile Staff / Student)
```jsx
// Fixed bottom bar — 4 icons max
<nav className="
  fixed bottom-0 left-0 right-0
  bg-white border-t border-gray-200
  flex items-center justify-around
  py-2 px-4 z-50
">
```

---

## Screen-by-Screen Design Specification

### Login Screen
- Full-screen gradient background (`from-night to-imperial`)
- Centered white card with logo, email + password fields, login button
- Card: `bg-white rounded-3xl shadow-2xl p-8`
- No background image. Gradient only.

### Student Menu Page
- White background (`bg-gray-50`)
- Top: search bar + horizontal category filter chips
- Grid: 2-column card grid on mobile, 3-column on desktop
- Bottom: floating cart summary bar when cart is not empty
- Sticky gradient header showing canteen name

### Checkout / Order Summary Page
- White background
- List of cart items with quantity controls
- Order total section with gradient breakdown
- "Pay Now" button — full width, gradient, pill, bottom of screen

### QR Display Screen
- Full gradient background (`from-night to-imperial`)
- White QR code centered on screen
- Order details below in white text
- Large "Show this to Staff" label
- Auto-refresh order status via Supabase Realtime

### Staff Scanner Screen
- Full dark background (`bg-night`)
- Camera viewfinder centered — large, rounded corners
- Result card slides up from bottom after scan
- Order details: student name, items, total, time
- Deliver button: full width, gradient

### Admin Dashboard
- Light background (`bg-gray-50`)
- Dark gradient header with stats strip
- Cards in a 2-column grid: total orders, revenue, fraud count
- Charts section: bar chart for hourly orders, line chart for revenue
- Recent orders table

---

## Interaction and Animation Rules

```
All hover effects:    transition-all duration-200
Button press:         active:scale-[0.97]
Card hover:           hover:shadow-lg hover:-translate-y-0.5
Page transitions:     fade in — opacity-0 → opacity-100 over 300ms
Loading skeleton:     animate-pulse bg-gray-200 rounded-xl
Toast position:       top-center (mobile), top-right (desktop)
```

---

## Mobile-First Breakpoints

```
Default (mobile):    0px+     → single column, compact padding
sm:                  640px+   → slightly wider cards
md:                  768px+   → 2-column grids unlock
lg:                  1024px+  → 3-column grids, sidebar layout for admin
```

> **Rule:** Design for a 390px wide phone screen first. Every layout decision must work on mobile before adding responsive variants.

---

## Accessibility Rules

- All interactive elements must have a minimum tap target of **44×44px**.
- Color contrast must pass WCAG AA for all text on backgrounds.
- All images must have descriptive `alt` attributes.
- Focus rings must be visible on all keyboard-navigable elements (`focus:ring-2 focus:ring-imperial`).
- Loading states must announce themselves to screen readers with `aria-busy="true"`.
