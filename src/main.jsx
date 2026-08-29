import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import App from './App.jsx'
import './styles/globals.css'

// ─── Global Error Boundary ───────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught error:', error, info)
  }

  handleReset = async () => {
    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations()
        await Promise.all(regs.map(r => r.unregister()))
      }
      if ('caches' in window) {
        const keys = await caches.keys()
        await Promise.all(keys.map(k => caches.delete(k)))
      }
    } catch {}
    window.location.href = '/?t=' + Date.now()
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div style={{
        minHeight: '100dvh', background: '#f9fafb', display: 'flex',
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '24px', fontFamily: 'Inter, system-ui, sans-serif'
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%', background: '#fee2e2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 28, marginBottom: 20
        }}>⚠️</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 8, textAlign: 'center' }}>
          Something went wrong
        </h2>
        <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, textAlign: 'center', maxWidth: 300 }}>
          The app crashed. Tap below to clear the cache and reload the latest version.
        </p>
        <button
          onClick={this.handleReset}
          style={{
            background: '#FB3640', color: '#fff', border: 'none', borderRadius: 999,
            padding: '12px 32px', fontWeight: 700, fontSize: 14, cursor: 'pointer'
          }}
        >
          Clear Cache & Reload
        </button>
        {this.state.error?.message && (
          <p style={{ marginTop: 16, fontSize: 11, color: '#9ca3af', textAlign: 'center', maxWidth: 320 }}>
            {String(this.state.error.message).slice(0, 120)}
          </p>
        )}
      </div>
    )
  }
}
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

// ─── React Query Client ──────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // Always fresh on navigation
      refetchOnWindowFocus: true,
      retry: 1,
    },
  },
})

// ─── App Root ────────────────────────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <CartProvider>
            <App />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  fontFamily: 'Inter, system-ui, sans-serif',
                  fontSize: '14px',
                  fontWeight: '500',
                },
                success: {
                  iconTheme: { primary: '#22C55E', secondary: '#fff' },
                },
                error: {
                  iconTheme: { primary: '#FB3640', secondary: '#fff' },
                },
              }}
            />
          </CartProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)
