import { useState } from 'react'
import { LayoutDashboard, Utensils, Package, FileText, Loader2, Filter, IndianRupee } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import { format, isToday } from 'date-fns'
import ExportPanel from '../../components/admin/ExportPanel.jsx'

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all') // all, pending, paid, ready, collected, cancelled
  const [dateFilter, setDateFilter] = useState('today') // all, today

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['admin', 'orders', statusFilter, dateFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          *,
          profiles:student_id (name, email, college_id),
          order_items (
            quantity,
            unit_price,
            menu_items (name)
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (dateFilter === 'today') {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        query = query.gte('created_at', start.toISOString())
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })

  const getStatusStyle = (status) => {
    switch(status) {
      case 'paid': return 'bg-blue-100 text-blue-700'
      case 'ready': return 'bg-amber-100 text-amber-700'
      case 'collected': return 'bg-green-100 text-green-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      case 'pending': default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order History</h1>
            <p className="text-gray-500 font-medium mt-1">Comprehensive view of all transactions.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between mb-8 gap-4 overflow-x-auto">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg text-sm font-bold text-gray-500">
              <Filter className="w-4 h-4" /> Filter by Status
            </div>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FB3640]/30"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="ready">Ready</option>
              <option value="collected">Collected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-1 border border-gray-200">
             <button
                onClick={() => setDateFilter('today')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${dateFilter === 'today' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
             >
                Today
             </button>
             <button
                onClick={() => setDateFilter('all')}
                className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${dateFilter === 'all' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
             >
                All Time
             </button>
          </div>
        </div>

        {/* Table */}
        {error && (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold mb-8">
            Error loading orders: {error.message}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-[#FB3640]" />
            <p className="mt-4 text-gray-500 font-medium tracking-wide">Fetching global records...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4 font-bold">Order ID</th>
                    <th className="px-6 py-4 font-bold">Student</th>
                    <th className="px-6 py-4 font-bold">Items</th>
                    <th className="px-6 py-4 font-bold">Date & Time</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders?.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {order.id.split('-')[0].toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold text-gray-900">{order.profiles?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400">{order.profiles?.email}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                           {order.order_items?.map((item, idx) => (
                             <span key={idx} className="inline-flex bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md font-medium border border-gray-200">
                               {item.quantity}x {item.menu_items?.name || 'Item'}
                             </span>
                           ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {isToday(new Date(order.created_at)) 
                          ? `Today, ${format(new Date(order.created_at), 'HH:mm')}`
                          : format(new Date(order.created_at), 'dd MMM, HH:mm')
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className="text-sm font-black text-gray-900 flex items-center justify-end">
                          <IndianRupee className="w-3 h-3 mr-0.5" />{parseFloat(order.total_amount).toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {orders?.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-medium h-32">
                        No orders match the selected filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Export & Archive Panel */}
        <ExportPanel />
      </div>
    </AdminLayout>
  )
}

// ─── Reusable Admin Layout Wrapper ───────────────────────────
function AdminLayout({ children }) {
  const currentPath = window.location.pathname

  const links = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/menu', icon: Utensils, label: 'Menu Manager' },
    { path: '/admin/stock', icon: Package, label: 'Stock Levels' },
    { path: '/admin/orders', icon: FileText, label: 'Order History' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-64 bg-white border-r border-gray-100 hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6">
          <h2 className="text-2xl font-black tracking-tight text-[#000F08]">Canteen<span className="text-[#FB3640]">OS</span></h2>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest ml-1">Admin Portal</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1">
          {links.map((link) => {
            const isActive = currentPath === link.path
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                  isActive 
                    ? 'bg-[#FB3640] text-white shadow-md shadow-[#FB3640]/20' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <link.icon className={`w-5 h-5 ${isActive ? 'text-white' : ''}`} />
                {link.label}
              </Link>
            )
          })}
        </nav>
      </aside>
      <main className="flex-1 p-6 md:p-10 mx-auto max-w-7xl w-full">
        <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-black text-[#000F08]">Canteen<span className="text-[#FB3640]">OS</span></h2>
          <div className="flex gap-2">
            <Link to="/admin/menu" className="p-2 bg-gray-100 rounded-full text-gray-600"><Utensils className="w-5 h-5"/></Link>
            <Link to="/admin/stock" className="p-2 bg-gray-100 rounded-full text-gray-600"><Package className="w-5 h-5"/></Link>
            <Link to="/admin/orders" className="p-2 bg-gray-100 rounded-full text-gray-600"><FileText className="w-5 h-5"/></Link>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
