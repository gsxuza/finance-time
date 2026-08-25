import { useEffect, useRef } from 'react'
import { useStore } from '@/store/useStore'
import { markTransfers } from '@/lib/utils'

const UID_KEY = 'finance-time-uid'
const STATUS_KEY = 'finance-time-sync-status'

export function getOrCreateUserId() {
  let uid = localStorage.getItem(UID_KEY)
  if (!uid) {
    uid = crypto.randomUUID()
    localStorage.setItem(UID_KEY, uid)
  }
  return uid
}

export function getSyncUserId() {
  return localStorage.getItem(UID_KEY) || null
}

export function setSyncUserId(uid) {
  localStorage.setItem(UID_KEY, uid)
}

export function getSyncStatus() {
  try { return JSON.parse(localStorage.getItem(STATUS_KEY) || 'null') } catch { return null }
}

function setSyncStatus(s) {
  localStorage.setItem(STATUS_KEY, JSON.stringify(s))
}

const SYNC_KEYS = ['accounts', 'transactions', 'budgets', 'goals', 'recurringItems', 'categories', 'bankConnections', 'settings']

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

    setSyncStatus({ phase: 'loading', ts: Date.now() })

    fetch('/api/data/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
      .then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error || `HTTP ${r.status}`) })
        return r.json()
      })
      .then((d) => {
        if (d.state && typeof d.state === 'object') {
          const local = useStore.getState()
          // Cloud is ground truth. Merge: cloud wins on all SYNC_KEYS;
          // any key not yet in cloud (new feature rollout) falls back to local.
          const merged = {}
          for (const k of SYNC_KEYS) {
            merged[k] = d.state[k] !== undefined ? d.state[k] : local[k]
          }
          useStore.setState({
            ...merged,
            transactions: markTransfers(merged.transactions ?? [], merged.accounts ?? []),
          })
        }
        setSyncStatus({ phase: 'ok', ts: Date.now() })
        loadedRef.current = true
      })
      .catch((err) => {
        setSyncStatus({ phase: 'error', message: err.message, ts: Date.now() })
        loadedRef.current = true
      })

    const unsub = useStore.subscribe((state) => {
      if (!loadedRef.current) return
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => {
        const uid = userIdRef.current
        if (!uid) return
        fetch('/api/data/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: uid, state: pickState(state) }),
        })
          .then((r) => {
            if (!r.ok) return r.json().then((d) => { throw new Error(d.error || `HTTP ${r.status}`) })
            setSyncStatus({ phase: 'ok', ts: Date.now() })
          })
          .catch((err) => {
            setSyncStatus({ phase: 'error', message: err.message, ts: Date.now() })
          })
      }, 2000)
    })

    return () => {
      unsub()
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])
}

export function forceSaveToCloud() {
  const uid = getSyncUserId()
  if (!uid) return Promise.reject(new Error('Sem código de sync'))
  return fetch('/api/data/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: uid, state: pickState(useStore.getState()) }),
  }).then((r) => {
    if (!r.ok) return r.json().then((d) => { throw new Error(d.error || `HTTP ${r.status}`) })
    setSyncStatus({ phase: 'ok', ts: Date.now() })
  })
}
