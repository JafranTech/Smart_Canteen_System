import { Link } from 'react-router-dom'
import { ShoppingBag, Zap, QrCode, TrendingDown } from 'lucide-react'

// ─── Feature Pills Data ───────────────────────────────────────
const FEATURES = [
  { icon: QrCode,       label: 'QR Verified Pickup' },
  { icon: TrendingDown, label: 'Live Stock Tracking' },
  { icon: Zap,          label: 'Zero Queue'          },
]

// ─── Landing Page ─────────────────────────────────────────────
export default function Landing() {
  return (
    <main className="min-h-screen gradient-bg noise-overlay flex flex-col">

      {/* Floating Navbar */}
      <nav className="
        mx-4 mt-4 px-5 py-3
        rounded-full
        bg-white/10 backdrop-blur-md
        border border-white/20
        flex items-center justify-between
        sticky top-4 z-50
      ">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="
            w-8 h-8 rounded-full
            bg-imperial
            flex items-center justify-center
            text-white text-xs font-bold tracking-wide
          ">
            SC
          </span>
          <span className="text-white font-semibold text-sm tracking-wide hidden sm:block">
            Smart Canteen
          </span>
        </div>

        {/* Login Button */}
        <Link
          to="/login"
          className="
            px-5 py-2 rounded-full
            bg-white text-night
            text-sm font-semibold
            hover:scale-[1.03] active:scale-[0.97]
            transition-transform duration-200
            shadow-md
          "
        >
          Login
        </Link>
      </nav>

      {/* Hero Content */}
      <section className="flex-1 flex flex-col justify-end px-6 pb-24 pt-12">

        {/* Eyebrow */}
        <p className="
          text-white/60 text-xs uppercase tracking-[0.2em] font-medium mb-4
        ">
          Amrita College Canteen
        </p>

        {/* Headline */}
        <h1 className="text-white mb-2">
          <span className="block text-4xl font-bold leading-tight">
            Canteen is the
          </span>
          <span className="block text-6xl font-bold leading-none italic tracking-tight">
            Future.
          </span>
        </h1>

        {/* Subtext */}
        <p className="text-white/70 text-base mt-4 max-w-xs leading-relaxed">
          Pre-order food. Skip the queue. Beat the crowd.
        </p>

        {/* CTA */}
        <Link
          to="/login"
          className="
            mt-8 inline-flex items-center gap-2
            px-8 py-4 rounded-full
            bg-white text-night
            text-base font-semibold
            hover:scale-[1.03] active:scale-[0.97]
            transition-transform duration-200
            shadow-xl self-start
          "
        >
          <ShoppingBag size={18} />
          Order Now
        </Link>

        {/* Feature Pills */}
        <div className="flex flex-wrap gap-2 mt-6">
          {FEATURES.map(({ icon: Icon, label }) => (
            <span
              key={label}
              className="
                flex items-center gap-1.5
                bg-white/10 border border-white/20
                text-white text-xs font-medium
                px-4 py-2 rounded-full
              "
            >
              <Icon size={12} />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* Scroll Indicator */}
      <div className="flex justify-center pb-8 animate-bounce">
        <svg
          width="20" height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-white/40"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </main>
  )
}
