import { useState } from 'react'
import { Plus, Minus, Check, Loader2, Edit3 } from 'lucide-react'
import { supabase } from '../../lib/supabase.js'
import toast from 'react-hot-toast'

export default function StockEditor({ item, onUpdate }) {
  const [stock, setStock] = useState(item.stock_quantity)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleIncrement = () => setStock(prev => prev + 1)
  const handleDecrement = () => setStock(prev => Math.max(0, prev - 1))

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock_quantity: stock })
        .eq('id', item.id)

      if (error) throw error
      
      toast.success(`Stock updated for ${item.name}`)
      setIsEditing(false)
      if (onUpdate) onUpdate()
    } catch (err) {
      console.error('[StockEditor] Save failed:', err)
      toast.error('Failed to update stock.')
      setStock(item.stock_quantity) // Revert
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setStock(item.stock_quantity)
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-3">
        <span className={`font-black text-lg ${stock === 0 ? 'text-[#FB3640]' : stock < 10 ? 'text-amber-500' : 'text-gray-900'}`}>
          {stock}
        </span>
        <button 
          onClick={() => setIsEditing(true)}
          className="p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
        >
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
        <button 
          type="button"
          onClick={handleDecrement}
          disabled={isSaving || stock === 0}
          className="p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 active:bg-gray-200 transition-colors"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="w-12 text-center font-bold text-gray-900 text-sm py-1 border-x border-gray-200">
          {stock}
        </div>
        <button 
          type="button"
          onClick={handleIncrement}
          disabled={isSaving}
          className="p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50 active:bg-gray-200 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-1">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center min-w-[36px]"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        </button>
        {!isSaving && (
          <button 
            onClick={handleCancel}
            className="p-2 bg-white border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 rounded-lg shadow-sm transition-colors"
          >
            <Minus className="w-4 h-4 rotate-45" /> {/* Makes a nice X cross using Minus scaled */}
          </button>
        )}
      </div>
    </div>
  )
}
