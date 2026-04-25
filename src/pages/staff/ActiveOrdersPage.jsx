import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, Search, LogOut } from 'lucide-react'
import { useActiveOrders } from '../../hooks/useOrders.js'
import { useAuth } from '../../context/AuthContext.jsx'
import OrderVerifyCard from '../../components/staff/OrderVerifyCard.jsx'

export default function ActiveOrdersPage() {
  const { data: orders, isLoading, error } = useActiveOrders()
  const { signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center">
      {/* Header */}
      <header className="w-full max-w-sm flex items-center p-6 bg-white border-b border-gray-100 sticky top-0 z-10">
        <Link to="/staff/scanner" className="mr-4 p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-xl font-black text-gray-900 tracking-tight">Active Orders</h1>
        <button
          onClick={signOut}
          aria-label="Log out"
          className="ml-auto p-2 hover:bg-red-100 rounded-full transition-colors text-gray-400 hover:text-[#FB3640]"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 w-full max-w-sm px-6 py-6 pb-24">
        {/* Search Bar Stub (Optional Future Phase feature) */}
        <div className="relative mb-6">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search Order ID..."
            className="w-full bg-white border border-gray-200 rounded-full py-3 pl-12 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FB3640]/20 focus:border-[#FB3640]"
          />
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-gray-300" />
            <p className="text-sm text-gray-500 mt-4 font-medium">Fetching orders...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center">
            <p className="text-red-500 font-bold mb-2">Error Loading Orders</p>
            <p className="text-sm text-gray-500">{error.message}</p>
          </div>
        ) : orders?.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🍽️</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Active Orders</h3>
            <p className="text-sm text-gray-500">There are no pending orders right now.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">
              Currently Pending ({orders.length})
            </p>
            {orders.map((order) => (
              <OrderVerifyCard key={order.id} order={order} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
