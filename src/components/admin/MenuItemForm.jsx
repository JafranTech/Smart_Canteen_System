import { useState, useEffect } from 'react'
import { X, Save, Loader2, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase.js'

export default function MenuItemForm({ item, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Meals',
    stock_quantity: 0,
    is_available: true,
    image_url: ''
  })

  // Pre-fill form if editing
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price || '',
        category: item.category || 'Meals',
        stock_quantity: item.stock_quantity || 0,
        is_available: item.is_available ?? true,
        image_url: item.image_url || ''
      })
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Basic Validation
    if (!formData.name.trim() || !formData.price || isNaN(formData.price)) {
      toast.error('Please provide a valid name and price.')
      setIsSubmitting(false)
      return
    }

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        price: parseFloat(formData.price),
        category: formData.category,
        stock_quantity: parseInt(formData.stock_quantity, 10),
        is_available: formData.is_available,
        image_url: formData.image_url.trim() || null,
        updated_at: new Date().toISOString()
      }

      let error
      if (item?.id) {
        // UPDATE
        const { error: updateErr } = await supabase
          .from('menu_items')
          .update(payload)
          .eq('id', item.id)
        error = updateErr
      } else {
        // INSERT
        const { error: insertErr } = await supabase
          .from('menu_items')
          .insert([payload])
        error = insertErr
      }

      if (error) throw error

      toast.success(item ? 'Item updated successfully!' : 'Menu item created!')
      onSuccess()
    } catch (err) {
      console.error('[MenuItemForm] Submit error:', err)
      toast.error(err.message || 'Failed to save item.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-night/80 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-slide-up">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h2 className="text-lg font-black text-gray-900">
            {item ? 'Edit Menu Item' : 'New Menu Item'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-900 bg-white hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Item Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name} 
                onChange={handleChange}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FB3640]/30 focus:border-[#FB3640] transition-all"
                placeholder="e.g. Masala Dosa"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Price (₹)</label>
              <input 
                type="number" 
                name="price" 
                min="1" 
                step="0.01"
                value={formData.price} 
                onChange={handleChange}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FB3640]/30 focus:border-[#FB3640] transition-all"
                placeholder="e.g. 40.00"
              />
            </div>

            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
              <select 
                name="category" 
                value={formData.category} 
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FB3640]/30 focus:border-[#FB3640] transition-all"
              >
                <option value="Meals">Meals</option>
                <option value="Snacks">Snacks</option>
                <option value="Beverages">Beverages</option>
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                <ImageIcon className="w-4 h-4" /> Image URL
              </label>
              <input 
                type="url" 
                name="image_url" 
                value={formData.image_url} 
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FB3640]/30 focus:border-[#FB3640] transition-all placeholder:font-normal"
                placeholder="https://images.unsplash.com/..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
              <textarea 
                name="description" 
                value={formData.description} 
                onChange={handleChange}
                rows="2"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FB3640]/30 focus:border-[#FB3640] transition-all"
                placeholder="Short description of the item..."
              ></textarea>
            </div>

            <div className="col-span-1 flex items-center bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
              <input 
                type="checkbox" 
                name="is_available" 
                id="is_available"
                checked={formData.is_available} 
                onChange={handleChange}
                className="w-5 h-5 text-[#FB3640] rounded focus:ring-[#FB3640]"
              />
              <label htmlFor="is_available" className="ml-3 text-sm font-bold text-gray-700 cursor-pointer">
                Available on Menu
              </label>
            </div>

            <div className="col-span-1">
               <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Initial Stock</label>
               <input 
                type="number" 
                name="stock_quantity" 
                min="0"
                value={formData.stock_quantity} 
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#FB3640]/30 focus:border-[#FB3640] transition-all"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <button 
              type="button" 
              onClick={onClose}
              className="px-6 py-3 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-[#FB3640] hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg shadow-[#FB3640]/20"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {item ? 'Save Changes' : 'Create Item'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
