import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'

const STORAGE_KEY = 'finance-time-uid'

function getOrCreateUserId() {
  let uid = localStorage.getItem(STORAGE_KEY)
  if (!uid) {
    uid = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, uid)
  }
  return uid
}

const SYNC_KEYS = ['accounts', 'transactions', 'budgets', 'categories', 'bankConnections', 'settings']

function pickState(s) {
  const out = {}
  for (const k of SYNC_KEYS) out[k] = s[k]
  return out
}

export function useNeonSync() {
  const loadedRef = useRef(false)
  const saveTimer = useRef(null)
  const userIdRef = useRef(null)

  useEffect(() => {
    const userId = getOrCreateUserId()
    userIdRef.current = userId

    // Load from cloud once on mount
    fetch('/api/data/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.state && typeof d.state === 'object') {
          useStore.setState((current) => {
            // Merge: cloud wins unless local has newer data
            // Simple strategy: cloud state replaces local if cloud has more transactions
            const cloudTxCount = d.state.transactions?.length ?? 0
            const localTxCount = current.transactions?.length ?? 0
            if (cloudTxCount >= localTxCount) {
              return { ...d.state }
            }
            return {}
          })
        }
        loadedRef.current = true
      })
      .catch(() => {
        loadedRef.current = true
      })

    // Subscribe to store changes and debounce-save to cloud
    const unsub = useStore.subscribe((state) => {
      if (!loadedRef.current) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const userId = userIdRef.current
        if (!userId) return
        fetch('/api/data/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, state: pickState(state) }),
        }).catch(() => {})
      }, 2000)
    })

    return () => {
      unsub()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  return userIdRef
}

export function getSyncUserId() {
  return localStorage.getItem(STORAGE_KEY) || null
}
