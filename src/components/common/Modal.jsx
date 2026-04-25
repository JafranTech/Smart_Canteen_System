// Modal.jsx — Phase 2+ implementation stub
// Full bottom-sheet modal implemented when needed
export default function Modal({ isOpen, onClose, children, title }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        {title && <h2 className="text-xl font-bold text-night mb-4">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
