import clsx from 'clsx'

export default function Card({ children, className = '', onClick }) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl shadow-md',
        onClick && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200',
        className
      )}
    >
      {children}
    </div>
  )
}
