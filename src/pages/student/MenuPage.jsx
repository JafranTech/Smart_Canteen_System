import { useState, useMemo } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { useMenu } from '../../hooks/useMenu.js'
import MenuCard from '../../components/student/MenuCard.jsx'
import CartDrawer from '../../components/student/CartDrawer.jsx'
import clsx from 'clsx'

export default function MenuPage() {
  const { profile, signOut } = useAuth()
  const { menuItems, categories, isLoading, isError } = useMenu()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  // Filter items by category and search
  const filteredItems = useMemo(() => {
    if (!menuItems) return []
    let items = menuItems

    if (activeCategory !== 'All') {
      items = items.filter((item) => item.category === activeCategory)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      items = items.filter(
        (item) => item.name.toLowerCase().includes(q) || (item.description && item.description.toLowerCase().includes(q))
      )
    }

    return items
  }, [menuItems, activeCategory, searchQuery])

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Navbar pinned to top */}
      <nav className="sticky top-0 left-0 right-0 z-50 bg-night/95 backdrop-blur-md border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div>
            <span className="text-xl font-black bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Smart Canteen
            </span>
            <p className="text-xs text-gray-400">Hi, {profile?.name || 'Student'}</p>
          </div>
          <button 
            onClick={signOut}
            className="text-xs font-medium text-gray-400 hover:text-white px-3 py-1.5 border border-white/10 rounded-full hover:bg-white/5 transition-all"
          >
            Sign Out
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-6 animate-fade-in-up">
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search for food..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white shadow-sm border border-gray-100 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-imperial focus:border-transparent transition-all"
          />
        </div>

        {/* Categories (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={clsx(
                "whitespace-nowrap px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200",
                activeCategory === cat
                  ? "bg-gradient-to-r from-night to-imperial text-white shadow-md shadow-imperial/20"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Menu Grid */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-imperial" />
            <p>Loading menu...</p>
          </div>
        ) : isError ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-center">
            <p className="font-medium">Failed to load menu.</p>
            <p className="text-sm mt-1">Please try refreshing the page.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-gray-300" />
            </div>
            <p className="font-medium">No items found.</p>
            <p className="text-sm mt-1">Try searching for something else.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {filteredItems.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      {/* Cart Summary Drawer */}
      <CartDrawer />
    </div>
  )
}
