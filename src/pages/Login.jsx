import { useState, useEffect } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signIn, signInWithGoogle } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Mail, Lock, Loader2 } from 'lucide-react'

export default function Login() {
  const { user, profile, isLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Handle OAuth redirect errors
  useEffect(() => {
    const hash = window.location.hash
    if (hash && hash.includes('error_description')) {
      const hashParams = new URLSearchParams(hash.substring(1))
      const errorDesc = hashParams.get('error_description')
      if (errorDesc) {
        toast.error(decodeURIComponent(errorDesc).replace(/\+/g, ' '), { id: 'oauth-error', duration: 5000 })
        window.history.replaceState(null, '', window.location.pathname)
      }
    }
  }, [])

  // If already logged in, redirect to respective dashboard
  if (!isLoading && user && profile) {
    const roleRoutes = {
      student: '/student/menu',
      staff: '/staff/scanner',
      admin: '/admin/dashboard'
    }
    return <Navigate to={roleRoutes[profile.role] || '/'} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Form validation before Supabase call
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address.', { id: 'login-error' })
      return
    }
    if (!password || password.length < 6) {
      toast.error('Password must be at least 6 characters.', { id: 'login-error' })
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('Authenticating...')

    try {
      await signIn(email, password)
      toast.success('Login successful!', { id: toastId })
    } catch (err) {
      console.error('[Login.jsx] Caught error:', err)
      toast.error(err.message || 'Login failed. Please check your credentials.', { id: toastId })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg noise-overlay flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm relative z-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Smart Canteen Logo" className="w-16 h-16 rounded-full shadow-[0_0_20px_rgba(251,54,64,0.3)] mb-4" />
          <h1 className="text-2xl font-bold text-night tracking-tight">Welcome Back</h1>
          <p className="text-sm text-gray-400 mt-1">Smart Canteen — Crescent</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                placeholder="College Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="input-base pl-11 w-full"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="input-base pl-11 w-full"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="gradient-btn w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-imperial/30 hover:shadow-imperial/50 flex justify-center items-center transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Log In'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 border-t border-gray-200"></div>
          <span className="px-3 text-sm text-gray-400 bg-white">or</span>
          <div className="flex-1 border-t border-gray-200"></div>
        </div>

        {/* Google Login */}
        <button
          onClick={async () => {
            try {
              setIsSubmitting(true)
              await signInWithGoogle()
            } catch (err) {
              toast.error(err.message)
              setIsSubmitting(false)
            }
          }}
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-xl font-bold text-gray-700 bg-white border border-gray-200 shadow-sm hover:bg-gray-50 flex justify-center items-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>

        {/* Registration Link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-imperial font-bold hover:underline transition-all">
            Create Account
          </Link>
        </p>

      </div>
    </div>
  )
}
