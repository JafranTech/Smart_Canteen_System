export default function StatsCard({ title, value, icon: Icon, trend, trendLabel, colorClass }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-400 tracking-wider uppercase">{title}</h3>
        <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
        </div>
      </div>
      <div>
        <p className="text-4xl font-black text-gray-900 mb-1">{value}</p>
        <p className="text-sm font-medium text-gray-500">
          {trend && (
            <span className={trend > 0 ? 'text-green-500' : 'text-red-500'}>
              {trend > 0 ? '+' : ''}{trend}%
            </span>
          )}{' '}
          {trendLabel}
        </p>
      </div>
    </div>
  )
}
