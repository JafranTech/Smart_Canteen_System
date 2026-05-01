import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase.js'
import { startOfDay, format, parseISO } from 'date-fns'

// ─── Constants ───────────────────────────────────────────────
const REFETCH_INTERVAL_MS = 60_000

// ─── useDailyRevenue ─────────────────────────────────────────
export function useDailyRevenue() {
  return useQuery({
    queryKey: ['analytics', 'daily_revenue'],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString()
      const { data, error } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'collected')
        .gte('created_at', today)

      if (error) throw new Error('Unable to load revenue data.')

      const totalRevenue = data.reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
      return { totalRevenue, totalOrders: data.length }
    },
    refetchInterval: REFETCH_INTERVAL_MS,
  })
}

// ─── useTopItems ─────────────────────────────────────────────
export function useTopItems() {
  return useQuery({
    queryKey: ['analytics', 'top_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_items')
        .select('quantity, menu_item_id, menu_items (name)')

      if (error) throw new Error('Unable to load top items data.')

      // Aggregate in JS since Supabase doesn't support GROUP BY directly
      const counts = data.reduce((acc, item) => {
        const name = item.menu_items?.name || 'Unknown'
        if (!acc[name]) acc[name] = 0
        acc[name] += item.quantity
        return acc
      }, {})

      return Object.entries(counts)
        .map(([name, totalQuantity]) => ({ name, totalQuantity }))
        .sort((a, b) => b.totalQuantity - a.totalQuantity)
        .slice(0, 5)
    },
    refetchInterval: REFETCH_INTERVAL_MS,
  })
}

// ─── useHourlyVolume ─────────────────────────────────────────
export function useHourlyVolume() {
  return useQuery({
    queryKey: ['analytics', 'hourly_volume'],
    queryFn: async () => {
      const today = startOfDay(new Date()).toISOString()
      const { data, error } = await supabase
        .from('orders')
        .select('created_at')
        .eq('status', 'collected')
        .gte('created_at', today)

      if (error) throw new Error('Unable to load hourly volume data.')

      // Build last-12-hour window
      const now = new Date()
      const result = []
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now)
        d.setHours(d.getHours() - i, 0, 0, 0)
        result.push({ hour: format(d, 'ha'), count: 0 })
      }

      data.forEach((order) => {
        const hourLabel = format(parseISO(order.created_at), 'ha')
        const slot = result.find((r) => r.hour === hourLabel)
        if (slot) slot.count += 1
      })

      return result
    },
    refetchInterval: REFETCH_INTERVAL_MS,
  })
}

// ─── useDashboardMetrics (legacy — kept for DashboardPage) ───
export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['admin', 'dashboard_metrics'],
    queryFn: async () => {
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

      if (ordersError) throw new Error('Unable to load dashboard metrics.')

      const dailyRevenue     = todayOrders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0)
      const activeOrdersCount = todayOrders.filter((o) => o.status === 'paid' || o.status === 'ready').length
      const hourlyData       = {}
      let totalItemsSold     = 0
      const itemCounts       = {}

      todayOrders.forEach((order) => {
        const hour = format(parseISO(order.created_at), 'hh a')
        if (!hourlyData[hour]) hourlyData[hour] = { name: hour, orders: 0 }
        hourlyData[hour].orders += 1

        order.order_items.forEach((item) => {
          totalItemsSold += item.quantity
          const itemName = item.menu_items?.name || 'Unknown'
          if (!itemCounts[itemName]) itemCounts[itemName] = 0
          itemCounts[itemName] += item.quantity
        })
      })

      const chartData = Object.values(hourlyData)
      const topItems  = Object.entries(itemCounts)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)

      return { dailyRevenue, activeOrdersCount, totalItemsSold, chartData, topItems }
    },
    refetchInterval: REFETCH_INTERVAL_MS,
  })
}
