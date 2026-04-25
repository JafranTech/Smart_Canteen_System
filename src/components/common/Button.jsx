import clsx from 'clsx'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-imperial focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97]'

  const variants = {
    primary:   'gradient-btn text-white shadow-lg hover:scale-[1.02]',
    secondary: 'border-2 border-imperial text-imperial hover:bg-imperial hover:text-white',
    ghost:     'text-gray-600 hover:bg-gray-100',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
    >
      {children}
    </button>
  )
}
