import { Loader2, Utensils, IndianRupee, Activity, TrendingUp } from 'lucide-react'
import { useDashboardMetrics } from '../../hooks/useAnalytics.js'
import StatsCard from '../../components/admin/StatsCard.jsx'
import SalesChart from '../../components/admin/SalesChart.jsx'
import AdminLayout from '../../components/admin/AdminLayout.jsx'
import StorageWidget from '../../components/admin/StorageWidget.jsx'

export default function DashboardPage() {
  const { data, isLoading, error } = useDashboardMetrics()

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center py-40">
          <Loader2 className="w-10 h-10 animate-spin text-[#FB3640]" />
          <p className="mt-4 text-gray-500 font-medium">Loading Dashboard Metrics...</p>
        </div>
      </AdminLayout>
    )
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="bg-red-50 text-red-600 p-6 rounded-2xl border border-red-100 font-bold max-w-lg mx-auto mt-20 text-center">
          Failed to load analytics engine. Please check your connection.
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="animate-fade-in relative">
        {/* Header Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Today's Overview</h1>
          <p className="text-gray-500 font-medium mt-1">Live metrics and performance for the canteen.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Daily Revenue"
            value={`₹${data.dailyRevenue.toLocaleString('en-IN')}`}
            icon={IndianRupee}
            colorClass="bg-green-500"
            trendLabel="collected today"
          />
          <StatsCard
            title="Active Orders"
            value={data.activeOrdersCount}
            icon={Activity}
            colorClass="bg-imperial"
            trendLabel="pending pickup"
          />
          <StatsCard
            title="Items Sold"
            value={data.totalItemsSold}
            icon={Utensils}
            colorClass="bg-blue-500"
            trendLabel="items today"
          />
          <StatsCard
            title="Top Item"
            value={data.topItems[0]?.name || 'N/A'}
            icon={TrendingUp}
            colorClass="bg-amber-500"
            trendLabel={`${data.topItems[0]?.quantity || 0} sold today`}
          />
        </div>

        {/* Storage Widget */}
        <div className="mb-8">
          <StorageWidget />
        </div>

        {/* Charts & Lists Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-2">Hourly Order Volume</h3>
            <p className="text-sm text-gray-400 mb-6">Number of orders placed per hour today.</p>
            <SalesChart data={data.chartData} />
          </div>

          {/* Top Items List */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-bold text-gray-900 mb-6">Top Selling Items</h3>
            {data.topItems.length === 0 ? (
              <p className="text-gray-400 text-sm italic">No sales recorded yet.</p>
            ) : (
              <div className="space-y-5">
                {data.topItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                      </div>
                      <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                    </div>
                    <span className="text-sm font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                      {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </AdminLayout>
  )
}

