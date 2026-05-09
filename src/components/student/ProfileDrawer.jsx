import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Loader2, PackageOpen, QrCode } from 'lucide-react'
import { format, isSameMonth, isSameYear, startOfMonth } from 'date-fns'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useOrderHistory } from '../../hooks/useOrders'
import clsx from 'clsx'

// ─── Constants ────────────────────────────────────────────────
const STATUS_COLORS = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-blue-100 text-blue-700',
  ready:     'bg-purple-100 text-purple-700',
  collected: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
}

const STATUS_LABELS = {
  pending:   'Pending',
  paid:      'Paid',
  ready:     'Ready',
  collected: 'Collected',
  cancelled: 'Cancelled',
}

// ─── Sub-component: Analytics Strip ──────────────────────────
function AnalyticsStrip({ orders }) {
  const now = new Date()

  const thisMonthCount = useMemo(() => {
    return orders.filter(o =>
      isSameMonth(new Date(o.created_at), now) &&
      isSameYear(new Date(o.created_at), now)
    ).length
  }, [orders]) // eslint-disable-line react-hooks/exhaustive-deps

  const totalSpent = useMemo(() => {
    return orders
      .filter(o => o.status === 'collected')
      .reduce((sum, o) => sum + Number(o.total_amount), 0)
  }, [orders])

  const formattedSpent = `₹${totalSpent.toLocaleString('en-IN')}`

  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-2 text-center">
        <p className="font-black text-sm text-gray-900">{orders.length}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Total</p>
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-2 text-center">
        <p className="font-black text-sm text-gray-900">{thisMonthCount}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">This Month</p>
      </div>
      <div className="bg-gray-50 border border-gray-100 rounded-xl p-2 text-center">
        <p className="font-black text-sm text-imperial">{formattedSpent}</p>
        <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">Spent</p>
      </div>
    </div>
  )
}

// ─── Sub-component: Month Filter ─────────────────────────────
function MonthFilter({ selectedMonth, onSelect }) {
  const now = new Date()
  const chips = [{ label: 'All', value: null }]

  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    chips.push({
      label: format(d, 'MMM yyyy'),
      value: startOfMonth(d).toISOString(),
    })
  }

  return (
    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1 mb-3">
      {chips.map(chip => (
        <button
          key={chip.label}
          onClick={() => onSelect(chip.value)}
          className={clsx(
            'whitespace-nowrap text-xs font-semibold px-3 py-1.5 rounded-full transition-all duration-200 flex-shrink-0',
            selectedMonth === chip.value
              ? 'gradient-btn text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          {chip.label}
        </button>
      ))}
    </div>
  )
}

// ─── Sub-component: Order Card ────────────────────────────────
function OrderCard({ order, onClose }) {
  const navigate = useNavigate()
  const statusColor = STATUS_COLORS[order.status] || 'bg-gray-100 text-gray-700'
  const statusLabel = STATUS_LABELS[order.status] || order.status
  const date = format(new Date(order.created_at), 'dd MMM yyyy')
  const shortId = order.id.slice(0, 8).toUpperCase()
  const canViewQR = (order.status === 'paid' || order.status === 'ready') && order.qr_token

  const itemLine = order.order_items
    ?.map(i => `${i.quantity}x ${i.menu_items?.name || 'Item'}`)
    .join(', ') || '—'

  const handleViewQR = () => {
    // Write token first, then navigate — navigation unmounts drawer naturally,
    // avoiding a race between the close transition and the route change.
    localStorage.setItem('latest_qr_token', order.qr_token)
    navigate('/student/qr')
  }

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-2xl p-3">
      <div className="flex items-start justify-between mb-1.5">
        <div>
          <p className="font-mono text-[11px] font-bold text-gray-500 uppercase">{shortId}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{date}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={clsx('badge text-[10px] font-bold', statusColor)}>
            {statusLabel}
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-500 line-clamp-1 mb-2">{itemLine}</p>
      <div className="flex items-center justify-between">
        <span className="text-sm font-black text-imperial">
          ₹{Number(order.total_amount).toFixed(2)}
        </span>
        {canViewQR && (
          <button
            onClick={handleViewQR}
            className="flex items-center gap-1.5 text-xs font-semibold text-imperial border border-imperial rounded-full px-3 py-1 hover:bg-imperial hover:text-white transition-all duration-200"
          >
            <QrCode className="w-3 h-3" />
            View QR
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Sub-component: Orders Section ───────────────────────────
function OrdersSection({ userId, isOpen, onClose }) {
  const [selectedMonth, setSelectedMonth] = useState(null)
  // Only fetch when drawer is open — pass null to disable when closed
  const activeUserId = isOpen ? userId : null
  const { data: orders, isLoading, error } = useOrderHistory(activeUserId)

  const filteredOrders = useMemo(() => {
    if (!orders) return []
    if (!selectedMonth) return orders
    const month = new Date(selectedMonth)
    return orders.filter(o =>
      isSameMonth(new Date(o.created_at), month) &&
      isSameYear(new Date(o.created_at), month)
    )
  }, [orders, selectedMonth])

  const selectedLabel = useMemo(() => {
    if (!selectedMonth) return null
    return format(new Date(selectedMonth), 'MMM yyyy')
  }, [selectedMonth])

  return (
    <div className="pt-4 border-t border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
        My Orders
      </p>

      {/* Analytics Strip — always uses ALL orders */}
      {orders && orders.length > 0 && (
        <AnalyticsStrip orders={orders} />
      )}

      {/* Month Filter */}
      {orders && orders.length > 0 && (
        <MonthFilter selectedMonth={selectedMonth} onSelect={setSelectedMonth} />
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(n => (
            <div key={n} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl text-center">
          Unable to load orders. Please try again.
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && orders && orders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <PackageOpen className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No orders placed yet</p>
        </div>
      )}

      {/* Filtered Empty State */}
      {!isLoading && !error && orders && orders.length > 0 && filteredOrders.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <PackageOpen className="w-8 h-8 text-gray-300 mb-2" />
          <p className="text-sm text-gray-400">No orders in {selectedLabel}</p>
        </div>
      )}

      {/* Order Cards — no inner scroll; the drawer itself scrolls (overflow-y-auto on its content div) */}
      {!isLoading && !error && filteredOrders.length > 0 && (
        <div className="space-y-3">
          {filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} onClose={onClose} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Sub-component: Editable Profile Form ────────────────────
function ProfileForm({ userId }) {
  const [phone, setPhone] = useState('')
  const [collegeId, setCollegeId] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [phoneError, setPhoneError] = useState('')

  useEffect(() => {
    if (!userId) return
    // mounted ref guard — prevents stale state update if drawer closes
    // while the Supabase fetch is still in-flight
    let mounted = true
    supabase
      .from('profiles')
      .select('phone_number, college_id')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (!mounted) return
        if (data) {
          setPhone(data.phone_number || '')
          setCollegeId(data.college_id || '')
        }
      })
    return () => { mounted = false }
  }, [userId])

  const handleSave = async () => {
    setPhoneError('')
    // Strip common +91 / 0 prefix before validating so both
    // "+917xxxxxxxxxx" and "07xxxxxxxxxx" normalize to 10 digits
    const raw = phone.trim().replace(/^(\+91|91|0)/, '')
    if (raw && !/^\d{10}$/.test(raw)) {
      setPhoneError('Enter a valid 10-digit mobile number (e.g. 98xxxxxxxx).')
      return
    }

    setIsSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({
        phone_number: raw || null,           // store the normalised 10-digit value
        college_id: collegeId.trim() || null,
      })
      .eq('id', userId)

    setIsSaving(false)

    if (error) {
      toast.error('Unable to save. Please try again.')
    } else {
      toast.success('Profile updated!')
    }
  }

  return (
    <div className="pt-4 border-t border-gray-100">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
        Additional Details
      </p>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="e.g. 98765 43210"
            className="input-base text-sm"
            maxLength={14}
          />
          <p className="text-[10px] text-gray-400 mt-1">10-digit number — +91 prefix is handled automatically</p>
          {phoneError && (
            <p className="text-xs text-red-500 mt-1">{phoneError}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">College ID</label>
          <input
            type="text"
            value={collegeId}
            onChange={e => setCollegeId(e.target.value)}
            placeholder="Your roll number or ID"
            className="input-base text-sm"
          />
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            'Save Changes'
          )}
        </button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────
export default function ProfileDrawer({ isOpen, onClose, user, profile }) {
  const initial = profile?.name?.charAt(0)?.toUpperCase() || '?'

  return (
    <>
      {/* Overlay — z-[58] sits above the sticky navbar (z-50) */}
      <div
        className={clsx(
          'fixed inset-0 z-[58] bg-black/40 backdrop-blur-sm transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer — z-[59] above overlay (z-[58]) and navbar (z-50) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="My Profile"
        className={clsx(
          'fixed top-0 right-0 h-full w-full sm:max-w-sm z-[59]',
          'bg-white shadow-2xl flex flex-col',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">My Profile</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
            aria-label="Close profile drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
          {/* Avatar + Identity */}
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full gradient-btn flex items-center justify-center text-white text-2xl font-black mb-3 shadow-md">
              {initial}
            </div>
            <p className="text-base font-bold text-gray-900 leading-tight">{profile?.name || 'Student'}</p>
            <p className="text-sm text-gray-400 mt-0.5">{user?.email || ''}</p>
            <span className="mt-2 badge bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider">
              {profile?.role || 'student'}
            </span>
          </div>

          {/* Editable Fields — Phase 2 */}
          {user?.id && <ProfileForm userId={user.id} />}

          {/* Orders Section — Phase 3/4/5 */}
          {user?.id && (
            <OrdersSection userId={user.id} isOpen={isOpen} onClose={onClose} />
          )}
        </div>
      </div>
    </>
  )
}
