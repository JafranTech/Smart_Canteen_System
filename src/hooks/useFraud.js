import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ─── Fetch Fraud Logs ─────────────────────────────────────────
export function useFraudLogs({ page = 0, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['fraud_logs', page],
    queryFn: async () => {
      try {
        const from = page * pageSize
        const to   = from + pageSize - 1

        const { data, error, count } = await supabase
          .from('fraud_logs')
          .select('*, profiles(name), orders(id)', { count: 'exact' })
          .order('detected_at', { ascending: false })
          .range(from, to)
        if (error) throw error
        return { logs: data, total: count }
      } catch (err) {
        console.error('[useFraud] fetch failed:', err)
        throw new Error('Unable to load fraud logs.')
      }
    },
  })
}
