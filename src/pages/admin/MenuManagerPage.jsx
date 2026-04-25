import { useState } from 'react'
import { Plus, Edit2, Loader2, IndianRupee } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import MenuItemForm from '../../components/admin/MenuItemForm.jsx'
import AdminLayout from '../../components/admin/AdminLayout.jsx'

export default function MenuManagerPage() {
  const [editingItem, setEditingItem] = useState(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Fetch Menu Items
  const { data: menuItems, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'menu_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category')
        .order('name')
      
      if (error) throw error
      return data
    }
  })

  const handleEdit = (item) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleAddNew = () => {
    setEditingItem(null)
    setIsFormOpen(true)
  }

  const handleFormSuccess = () => {
    setIsFormOpen(false)
    refetch()
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in relative">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Menu Manager</h1>
            <p className="text-gray-500 font-medium mt-1">Add, edit, and organize canteen offerings.</p>
          </div>
          <button 
            onClick={handleAddNew}
            className="flex items-center justify-center gap-2 bg-[#000F08] hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold transition-transform active:scale-95 shadow-lg shadow-black/10"
          >
            <Plus className="w-5 h-5" /> New Item
          </button>
        </div>

        {/* Status Handling */}
        {error && (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold mb-8">
            Error loading menu: {error.message}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-[#FB3640]" />
            <p className="mt-4 text-gray-500 font-medium tracking-wide">Fetching catalogue...</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-100">
                    <th className="px-6 py-4 font-bold">Item</th>
                    <th className="px-6 py-4 font-bold">Category</th>
                    <th className="px-6 py-4 font-bold text-right">Price</th>
                    <th className="px-6 py-4 font-bold text-center">Status</th>
                    <th className="px-6 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {menuItems?.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <img 
                            src={item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200'} 
                            alt={item.name} 
                            className="w-12 h-12 rounded-xl object-cover bg-gray-100 border border-gray-200"
                          />
                          <div>
                            <p className="text-sm font-bold text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{item.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-gray-900 flex items-center justify-end">
                          <IndianRupee className="w-3 h-3 mr-0.5" />{item.price.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.is_available ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
                            Visible
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                            Hidden
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-[#FB3640] hover:border-[#FB3640]/30 hover:bg-red-50 transition-all shadow-sm group-hover:shadow"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {menuItems?.length === 0 && (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-400 font-medium">
                        No menu items found. Click 'New Item' to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Entry */}
        {isFormOpen && (
          <MenuItemForm 
            item={editingItem} 
            onClose={() => setIsFormOpen(false)} 
            onSuccess={handleFormSuccess} 
          />
        )}
      </div>
    </AdminLayout>
  )
}

