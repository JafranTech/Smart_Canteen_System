import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { startOfDay, format, parseISO } from 'date-fns'

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['admin', 'dashboard_metrics'],
    queryFn: async () => {
      // Fetch all paid, ready, and collected orders for TODAY
      const today = startOfDay(new Date()).toISOString()
      
      const { data: todayOrders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id, 
          total_amount, 
          status, 
          created_at,
          order_items (
            quantity,
            menu_item_id,
            menu_items (name)
          )
        `)
        .gte('created_at', today)
        .in('status', ['paid', 'ready', 'collected'])

      if (ordersError) throw ordersError

      // 1. Daily Revenue
      const dailyRevenue = todayOrders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0)

      // 2. Active Orders
      const activeOrdersCount = todayOrders.filter(o => o.status === 'paid' || o.status === 'ready').length

      // 3. Hourly Volume for Chart
      const hourlyData = {}
      let totalItemsSold = 0
      const itemCounts = {}

      todayOrders.forEach(order => {
        // Hourly parsing
        const hour = format(parseISO(order.created_at), 'hh a')
        if (!hourlyData[hour]) hourlyData[hour] = { name: hour, orders: 0 }
        hourlyData[hour].orders += 1

        // Top Items parsing
        order.order_items.forEach(item => {
          totalItemsSold += item.quantity
          const itemName = item.menu_items?.name || 'Unknown'
          if (!itemCounts[itemName]) itemCounts[itemName] = 0
          itemCounts[itemName] += item.quantity
        })
      })

      // Convert hourly map to sorted array (based on actual time order, simplest is to just sort keys if formatted carefully, or rely on JS Object insertion order for today)
      // For a robust approach, we can generate a 12-hour array from 8 AM to 8 PM and fill it, but dynamic is fine if we return values
      const chartData = Object.values(hourlyData)

      // 4. Top Items Array
      const topItems = Object.entries(itemCounts)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5) // Top 5

      return {
        dailyRevenue,
        activeOrdersCount,
        totalItemsSold,
        chartData,
        topItems
      }
    },
    refetchInterval: 60000 // Refresh every minute
  })
}
