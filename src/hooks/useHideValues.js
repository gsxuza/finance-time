import { useStore } from '@/store/useStore'
import { formatCurrency } from '@/lib/utils'

export function useHideValues() {
  return useStore((s) => s.valuesHidden)
}

// Returns formatted currency or "•••••" depending on hide state
export function useCurrency(value, currency) {
  const hidden = useStore((s) => s.valuesHidden)
  if (hidden) return '•••••'
  return formatCurrency(value, currency)
}
