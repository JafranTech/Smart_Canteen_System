import { useState, useEffect } from 'react'
import { X, Save, Loader2, Upload, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase.js'

// ─── Constants ───────────────────────────────────────────────
const STORAGE_BUCKET   = 'food-images'
const ACCEPTED_TYPES   = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_SIZE_MB = 2
const CATEGORIES       = ['Meals', 'Snacks', 'Beverages']

// ─── Helpers ─────────────────────────────────────────────────
function validateImageFile(file) {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Only JPEG, PNG, or WebP images are allowed.'
  }
  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `Image must be under ${MAX_FILE_SIZE_MB}MB.`
  }
  return null
}

async function uploadFoodImage(file, itemId) {
  const ext      = file.name.split('.').pop()
  const filename = `${itemId}.${ext}`

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(filename, file, { upsert: true, contentType: file.type })

  if (uploadErr) {
    // Friendly message if bucket doesn't exist
    if (uploadErr.message?.includes('Bucket not found')) {
      throw new Error(`Storage bucket "${STORAGE_BUCKET}" not found. Please create it in your Supabase dashboard.`)
    }
    throw new Error(`Image upload failed: ${uploadErr.message}`)
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filename)
  return data.publicUrl
}

// ─── Main Component ───────────────────────────────────────────
export default function MenuItemForm({ item, onClose, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageFile, setImageFile]       = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [formData, setFormData]         = useState({
    name:           '',
    description:    '',
    price:          '',
    category:       'Meals',
    stock_quantity: 0,
    is_available:   true,
    image_url:      '',
  })

  // Pre-fill form when editing
  useEffect(() => {
    if (item) {
      setFormData({
        name:           item.name           || '',
        description:    item.description    || '',
        price:          item.price          || '',
        category:       item.category       || 'Meals',
        stock_quantity: item.stock_quantity  || 0,
        is_available:   item.is_available    ?? true,
        image_url:      item.image_url       || '',
      })
      if (item.image_url) setImagePreview(item.image_url)
    }
  }, [item])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleImagePick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = validateImageFile(file)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // ── Validation before any Supabase call
    if (!formData.name.trim()) {
      toast.error('Item name is required.')
      return
    }
    if (!formData.price || isNaN(formData.price) || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price greater than 0.')
      return
    }

    setIsSubmitting(true)
    const toastId = toast.loading(item ? 'Saving changes...' : 'Creating item...')

    try {
      // Use existing item ID for edits, generate new UUID for new items
      const itemId = item?.id || crypto.randomUUID()

      // ── Upload image to Supabase Storage if a new file was picked
      let imageUrl = formData.image_url
      if (imageFile) {
        imageUrl = await uploadFoodImage(imageFile, itemId)
      }

      const payload = {
        name:           formData.name.trim(),
        description:    formData.description.trim(),
        price:          parseFloat(formData.price),
        category:       formData.category,
        stock_quantity: parseInt(formData.stock_quantity, 10),
        is_available:   formData.is_available,
        image_url:      imageUrl || null,
        updated_at:     new Date().toISOString(),
      }

      let dbError
      if (item?.id) {
        const { error } = await supabase.from('menu_items').update(payload).eq('id', item.id)
        dbError = error
      } else {
        const { error } = await supabase.from('menu_items').insert([{ id: itemId, ...payload }])
        dbError = error
      }

      if (dbError) throw dbError

      toast.success(item ? 'Item updated!' : 'Menu item created!', { id: toastId })
      onSuccess()
    } catch (err) {
      console.error('[MenuItemForm] Submit error:', err)
      toast.error(err.message || 'Failed to save item. Please try again.', { id: toastId })
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
            aria-label="Close form"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <ImageIcon className="w-4 h-4" /> Food Image
            </label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-20 h-20 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                {imagePreview ? (
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="w-8 h-8 text-gray-300" />
                )}
              </div>
              {/* File picker */}
              <label className="flex-1 flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-200 rounded-xl p-4 cursor-pointer hover:border-imperial hover:bg-red-50 transition-all">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-xs font-bold text-gray-500">
                  {imageFile ? imageFile.name : 'Click to upload image'}
                </span>
                <span className="text-xs text-gray-400">JPEG, PNG, WebP — max {MAX_FILE_SIZE_MB}MB</span>
                <input
                  type="file"
                  accept={ACCEPTED_TYPES.join(',')}
                  onChange={handleImagePick}
                  className="sr-only"
                  aria-label="Upload food image"
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Name */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Item Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-imperial/30 focus:border-imperial transition-all"
                placeholder="e.g. Masala Dosa"
              />
            </div>

            {/* Price */}
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-imperial/30 focus:border-imperial transition-all"
                placeholder="e.g. 40.00"
              />
            </div>

            {/* Category */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-imperial/30 focus:border-imperial transition-all"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="2"
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-imperial/30 focus:border-imperial transition-all"
                placeholder="Short description of the item..."
              />
            </div>

            {/* Available toggle */}
            <div className="col-span-1 flex items-center bg-gray-50 px-4 py-3 rounded-xl border border-gray-200">
              <input
                type="checkbox"
                name="is_available"
                id="is_available"
                checked={formData.is_available}
                onChange={handleChange}
                className="w-5 h-5 text-imperial rounded focus:ring-imperial"
              />
              <label htmlFor="is_available" className="ml-3 text-sm font-bold text-gray-700 cursor-pointer">
                Available on Menu
              </label>
            </div>

            {/* Initial Stock */}
            <div className="col-span-1">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Initial Stock</label>
              <input
                type="number"
                name="stock_quantity"
                min="0"
                value={formData.stock_quantity}
                onChange={handleChange}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-imperial/30 focus:border-imperial transition-all"
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
              className="flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold text-white bg-imperial hover:bg-red-600 disabled:opacity-50 transition-colors shadow-lg shadow-imperial/20"
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
