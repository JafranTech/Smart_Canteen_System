import { useState, useEffect } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { signInWithGoogle } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Register() {
  const { user, profile, isLoading } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  // Redirect if already logged in (same behavior as Login)
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

    // 1. Validate full name
    const trimmedName = fullName.trim()
    if (trimmedName.length < 2) {
      toast.error('Full Name must be at least 2 characters.')
      return
    }

    // 2. Validate exact email domain
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail.endsWith('@crescent.education')) {
      toast.error('Only @crescent.education email addresses are allowed')
      return
    }

    // 3. Validate password requirements
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    // 4. Validate password match
    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('Creating account...')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            name: trimmedName,
            role: 'student'
          }
        }
      })

      if (error) throw error

      if (!data.session) {
        toast.success('OTP sent to your email!', { id: toastId })
        navigate('/verify-otp', { state: { email: trimmedEmail } })
      } else {
        toast.success('Account created! You can now log in.', { id: toastId })
        navigate('/login')
      }
    } catch (err) {
      const message = err.message || ''
      if (message.toLowerCase().includes('already registered')) {
        toast.error('This email is already registered', { id: toastId })
      } else if (message.toLowerCase().includes('rate limit')) {
        toast.error('Too many signups. Please try again later.', { id: toastId })
      } else {
        toast.error(message || 'Something went wrong. Please try again.', { id: toastId })
      }
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
          <h1 className="text-2xl font-bold text-night tracking-tight">Create Account</h1>
          <p className="text-sm text-gray-400 mt-1">Crescent College</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="space-y-4">
            {/* Full Name */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={isSubmitting}
                className="input-base pl-11 w-full"
                required
              />
            </div>
            
            {/* Email */}
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
            
            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="input-base pl-11 pr-11 w-full"
                required
              />
              <button 
                type="button" 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                className="input-base pl-11 pr-11 w-full"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="gradient-btn w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-imperial/30 hover:shadow-imperial/50 flex justify-center items-center transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
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
          Sign up with Google
        </button>

        {/* Login Link */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-imperial font-bold hover:underline transition-all">
            Login
          </Link>
        </p>

      </div>
    </div>
  )
}
