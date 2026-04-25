import { CheckCircle2, Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function DeliverButton({ onClick, isDelivering, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isDelivering}
      className={clsx(
        "w-full max-w-sm flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg text-white transition-all shadow-xl mt-4",
        disabled 
          ? "bg-gray-300 cursor-not-allowed opacity-50"
          : "bg-gradient-to-r from-[#000F08] to-[#FB3640] hover:shadow-[0_0_25px_rgba(251,54,64,0.3)] active:scale-[0.98]"
      )}
    >
      {isDelivering ? (
        <>
          <Loader2 className="w-6 h-6 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <CheckCircle2 className="w-6 h-6" />
          {disabled ? 'Delivered' : 'Deliver Order'}
        </>
      )}
    </button>
  )
}
