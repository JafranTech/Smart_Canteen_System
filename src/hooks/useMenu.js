import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

export function useMenu() {
  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
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
