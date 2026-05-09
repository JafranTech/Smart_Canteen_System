import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function useMenu() {
  const queryClient = useQueryClient()

  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, name, description, price, category, image_url, stock_quantity, daily_stock_limit, daily_extra_stock, is_available')
      .eq('is_available', true)
      .order('category')
      .order('name')

    if (error) {
      console.error('[useMenu] Error fetching menu:', error)
      throw new Error('Failed to load menu items.')
    }
    return data
  }

  const { data: menuItems, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['menu_items'],
    queryFn: fetchMenu,
  })

  // Subscribe to realtime changes on menu_items
  useEffect(() => {
    const channel = supabase
      .channel('menu_updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'menu_items' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['menu_items'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Extract unique categories for filter chips
  const categories = menuItems
    ? ['All', ...new Set(menuItems.map((item) => item.category))]
    : ['All']

  return {
    menuItems,
    categories,
    isLoading,
    isError,
    error,
    refetch,
  }
}
