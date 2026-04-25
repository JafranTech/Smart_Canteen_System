import { AlertCircle } from 'lucide-react'

export default function EmptyState({ message = 'Nothing here yet.', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <AlertCircle size={28} className="text-gray-400" />
      </div>
      <p className="text-gray-500 text-base">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
