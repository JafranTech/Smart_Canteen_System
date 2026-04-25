import { useState } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase.js'
import StockEditor from '../../components/admin/StockEditor.jsx'
import AdminLayout from '../../components/admin/AdminLayout.jsx'

export default function StockPage() {
  const { data: menuItems, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'stock_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('stock_quantity', { ascending: true }) // Lowest stock first
      
      if (error) throw error
      return data
    }
  })

  // Group by status for summary
  const outOfStockCount = menuItems?.filter(i => i.stock_quantity === 0).length || 0
  const lowStockCount = menuItems?.filter(i => i.stock_quantity > 0 && i.stock_quantity <= 10).length || 0

  return (
    <AdminLayout>
      <div className="animate-fade-in relative">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Stock Levels</h1>
            <p className="text-gray-500 font-medium mt-1">Manage kitchen inventory and item availability.</p>
          </div>
          
          <div className="flex gap-4">
             <div className="bg-red-50 px-4 py-2 rounded-xl border border-red-100 flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-[#FB3640] animate-pulse"></div>
               <span className="text-sm font-bold text-red-700">{outOfStockCount} Out of Stock</span>
             </div>
             <div className="bg-amber-50 px-4 py-2 rounded-xl border border-amber-100 flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-amber-500"></div>
               <span className="text-sm font-bold text-amber-700">{lowStockCount} Low Stock</span>
             </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold mb-8">
            Error loading stock: {error.message}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <Loader2 className="w-10 h-10 animate-spin text-[#FB3640]" />
            <p className="mt-4 text-gray-500 font-medium tracking-wide">Fetching stock...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {menuItems?.map(item => (
              <div 
                key={item.id} 
                className={`bg-white rounded-2xl p-6 border shadow-sm transition-all ${
                  item.stock_quantity === 0 ? 'border-red-200 bg-red-50/30' : 
                  item.stock_quantity <= 10 ? 'border-amber-200 bg-amber-50/30' : 
                  'border-gray-100 hover:shadow-md'
                }`}
              >
                <div className="flex items-start gap-4 mb-6">
                  <img 
                    src={item.image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=200'} 
                    alt={item.name} 
                    className="w-16 h-16 rounded-xl object-cover bg-gray-100 border border-gray-200 shadow-sm"
                  />
                  <div>
                    <h3 className="font-bold text-gray-900 leading-tight mb-1">{item.name}</h3>
                    <span className="inline-flex px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">
                      {item.category}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100/60">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Inventory Status</p>
                  <StockEditor item={item} onUpdate={refetch} />
                </div>
              </div>
            ))}
            
            {menuItems?.length === 0 && (
              <div className="col-span-full py-20 text-center">
                 <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                 <h3 className="text-lg font-bold text-gray-900 mb-2">No Items Found</h3>
                 <p className="text-gray-500">Go to the Menu Manager to create items before managing stock.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
