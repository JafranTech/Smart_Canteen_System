import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

// ─── Fetch Stock for Admin ────────────────────────────────────
export function useStock() {
  return useQuery({
    queryKey: ['stock'],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('menu_items')
          .select('id, name, stock_quantity, is_available')
          .order('name')
        if (error) throw error
        return data
      } catch (err) {
        console.error('[useStock] fetch failed:', err)
        throw new Error('Unable to load stock data.')
      }
    },
  })
}

// ─── Update Stock Level ───────────────────────────────────────
export function useUpdateStock() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ itemId, quantity }) => {
      const { error } = await supabase
        .from('menu_items')
        .update({ stock_quantity: quantity, updated_at: new Date().toISOString() })
        .eq('id', itemId)
      if (error) throw new Error('Failed to update stock.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock'] })
      queryClient.invalidateQueries({ queryKey: ['menu_items'] })
    },
  })
}
