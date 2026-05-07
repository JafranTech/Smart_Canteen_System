import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Utensils, Package, FileText, ShieldAlert, LogOut } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'

export default function AdminLayout({ children }) {
  const location = useLocation()
  const currentPath = location.pathname
  const { signOut } = useAuth()

  const links = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/menu',      icon: Utensils,         label: 'Menu Manager' },
    { path: '/admin/stock',     icon: Package,          label: 'Stock Levels' },
    { path: '/admin/orders',    icon: FileText,         label: 'Order History' },
    { path: '/admin/fraud',     icon: ShieldAlert,      label: 'Fraud Logs' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Desktop */}
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

        <div className="p-4 border-t border-gray-100">
          <button
            onClick={signOut}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl font-bold text-red-500 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 mx-auto max-w-7xl w-full relative">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
          <h2 className="text-xl font-black text-[#000F08]">Canteen<span className="text-[#FB3640]">OS</span></h2>
          <div className="flex gap-2">
            <Link to="/admin/menu" className="p-2 bg-gray-100 rounded-full text-gray-600"><Utensils className="w-5 h-5"/></Link>
            <Link to="/admin/stock" className="p-2 bg-gray-100 rounded-full text-gray-600"><Package className="w-5 h-5"/></Link>
            <Link to="/admin/orders" className="p-2 bg-gray-100 rounded-full text-gray-600"><FileText className="w-5 h-5"/></Link>
            <button onClick={signOut} className="p-2 bg-red-100 rounded-full text-red-600 hover:bg-red-200">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {children}
      </main>
    </div>
  )
}
