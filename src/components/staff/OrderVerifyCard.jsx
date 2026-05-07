import { format } from 'date-fns'

export default function OrderVerifyCard({ order }) {
  if (!order) return null;

  return (
    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in mt-6">
      <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Order Found</span>
        <span className="font-mono text-gray-900 font-bold text-sm bg-white px-2 py-1 rounded shadow-sm border border-gray-100">
          {order.id.split('-')[0].toUpperCase()}
        </span>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-black text-gray-900 mb-1">{order.profiles?.name ?? 'Unknown Student'}</h3>
        <p className="text-sm text-gray-500 mb-6">{format(new Date(order.created_at), "MMM d, h:mm a")}</p>

        <div className="space-y-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Items</h4>
          <ul className="space-y-3">
            {order.order_items?.map((item, idx) => (
              <li key={idx} className="flex justify-between items-start text-sm">
                <div className="flex gap-2 text-gray-700">
                  <span className="font-bold text-gray-900">{item.quantity}x</span>
                  <span>{item.menu_items?.name || 'Item'}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-between items-center">
          <span className="font-bold text-gray-400 uppercase text-xs tracking-wider">Total</span>
          <span className="text-xl font-black text-[#FB3640]">₹{Number(order.total_amount).toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}
