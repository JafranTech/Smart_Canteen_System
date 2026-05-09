import { useState } from 'react'
import { useLocation, useNavigate, Navigate } from 'react-router-dom'
import { verifyOtp } from '../hooks/useAuth'
import toast from 'react-hot-toast'
import { KeyRound, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function VerifyOtp() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, profile, isLoading } = useAuth()
  
  const email = location.state?.email || ''
  
  const [token, setToken] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Redirect if already logged in
  if (!isLoading && user && profile) {
    const roleRoutes = {
      student: '/student/menu',
      staff: '/staff/scanner',
      admin: '/admin/dashboard'
    }
    return <Navigate to={roleRoutes[profile.role] || '/'} replace />
  }

  // Redirect if no email in state
  if (!email) {
    return <Navigate to="/register" replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (token.length !== 6) {
      toast.error('Please enter the 6-digit OTP.')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading('Verifying...')

    try {
      await verifyOtp(email, token)
      toast.success('Email verified successfully!', { id: toastId })
      // On success, AuthContext will detect the session and the component will re-render and redirect
    } catch (err) {
      toast.error(err.message || 'Invalid OTP.', { id: toastId })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen gradient-bg noise-overlay flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm relative z-10 animate-fade-in-up">
        
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full bg-imperial/10 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(251,54,64,0.3)]">
            <KeyRound className="w-8 h-8 text-imperial" />
          </div>
          <h1 className="text-2xl font-bold text-night tracking-tight">Verify Email</h1>
          <p className="text-sm text-gray-400 mt-2 text-center">
            We sent a 6-digit code to<br/>
            <span className="font-semibold text-gray-700">{email}</span>
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div className="relative">
            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="123456"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={isSubmitting}
              className="input-base pl-11 w-full text-center tracking-[0.5em] font-mono text-xl"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting || token.length !== 6}
            className="gradient-btn w-full py-3.5 rounded-xl font-bold text-white shadow-lg shadow-imperial/30 hover:shadow-imperial/50 flex justify-center items-center transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Account'}
          </button>
        </form>

      </div>
    </div>
  )
}
