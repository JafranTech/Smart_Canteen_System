import { useState } from 'react'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { signIn } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Mail, Lock, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function Login() {
  const { user, profile, isLoading } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

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
      console.log('Starting signIn...')
      await signIn(email, password)
      console.log('signIn successful. Handing off to AuthContext redirection.')
      toast.success('Login successful!', { id: toastId })
      
      // We explicitly DO NOT navigate here. 
      // The `onAuthStateChange` listener in AuthContext will fetch the profile,
      // update the state, and the `if (!isLoading && user && profile)` block at the top 
      // of this component will seamlessly handle the redirection!
      
    } catch (err) {
      console.error('[Login.jsx] Caught error:', err)
      toast.error(err.message || 'Login failed. Please check your credentials.', { id: toastId })
    } finally {
      console.log('Finally block executing... stopping spinner.')
      setIsSubmitting(false)
    }
  }

  // Quick-fill helpers for manual testing with verified credentials
  const autoFill = (role) => {
    if (role === 'student') {
      setEmail('230081601040@crescent.education')
      setPassword('kingjafran')
    } else if (role === 'staff') {
      setEmail('staff@amrita.edu')
      setPassword('Staff@1234')
    } else if (role === 'admin') {
      setEmail('admin@amrita.edu')
      setPassword('Admin@1234')
    }
  }

  return (
    <div className="min-h-screen gradient-bg noise-overlay flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm relative z-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-imperial/10 shadow-[0_0_20px_rgba(251,54,64,0.3)] flex items-center justify-center text-imperial font-black text-2xl mb-4">
            SC
          </div>
          <h1 className="text-2xl font-bold text-night tracking-tight">Welcome Back</h1>
          <p className="text-sm text-gray-400 mt-1">Smart Canteen — Amrita</p>
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

        {/* Registration Link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-imperial font-bold hover:underline transition-all">
            Create Account
          </Link>
        </p>

        {/* Role Hint Chips (for Testing/Dev) */}
        <div className="mt-8">
          <p className="text-xs text-center text-gray-400 font-medium mb-3 uppercase tracking-wider">
            Quick Fill for Testing
          </p>
          <div className="flex justify-center gap-2">
            {['student', 'staff', 'admin'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => autoFill(role)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                  role === 'student' && "bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100",
                  role === 'staff' && "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100",
                  role === 'admin' && "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                )}
              >
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
