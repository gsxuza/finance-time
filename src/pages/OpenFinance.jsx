import { useState, useEffect, useRef, useCallback } from 'react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { Plus, RefreshCw, Unlink, AlertTriangle, X, ExternalLink, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'

// Load Pluggy Connect Widget script once
function usePluggyScript() {
  const [ready, setReady] = useState(!!window.PluggyConnect)
  useEffect(() => {
    if (window.PluggyConnect) return
    const script = document.createElement('script')
    script.src = 'https://cdn.pluggy.ai/pluggy-connect/v2.js'
    script.onload = () => setReady(true)
    script.onerror = () => console.error('Failed to load Pluggy Connect script')
    document.head.appendChild(script)
  }, [])
  return ready
}

async function fetchConnectToken(itemId = null) {
  const res = await fetch('/api/pluggy/connect-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: itemId ? JSON.stringify({ itemId }) : JSON.stringify({}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao criar token de conexão')
  return data.accessToken
}

async function fetchItemAccounts(itemId) {
  const res = await fetch(`/api/pluggy/accounts?itemId=${itemId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar contas')
  return data.results || []
}

async function fetchItem(itemId) {
  const res = await fetch(`/api/pluggy/items/${itemId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao buscar item')
  return data
}

function mapAccountType(pluggyType) {
  const map = { BANK: 'checking', CREDIT: 'credit_card', SAVING: 'savings', INVESTMENT: 'investment' }
  return map[pluggyType] || 'checking'
}

function ConnectionCard({ bc, onSync, onReconnect, onRevoke, onDelete, isSyncing }) {
  const expiryDays = bc.consent_expires
    ? differenceInDays(parseISO(bc.consent_expires), new Date())
    : null

  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-xl shrink-0 font-bold text-slate-600">
              {bc.bank_name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <p className="font-semibold text-slate-800">{bc.bank_name}</p>
                <StatusBadge status={bc.status} />
                {expiryDays !== null && expiryDays < 7 && (
                  <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={10} />
                    {expiryDays < 0 ? 'Expirado' : `Expira em ${expiryDays}d`}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {bc.account_number || '****'} ·{' '}
                {bc.account_type === 'checking' ? 'Conta Corrente' : bc.account_type === 'savings' ? 'Poupança' : bc.account_type === 'credit_card' ? 'Cartão' : 'Investimento'}
              </p>
              {bc.balance !== undefined && (
                <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(bc.balance)}</p>
              )}
              <p className="text-xs text-slate-400 mt-0.5">
                Sync: {bc.last_sync ? new Date(bc.last_sync).toLocaleString('pt-BR') : 'Nunca'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <button onClick={onSync} disabled={isSyncing} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer transition-colors disabled:opacity-50">
              {isSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Sincronizar
            </button>
            {bc.pluggy_item_id && (
              <button onClick={onReconnect} className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 cursor-pointer transition-colors">
                <ExternalLink size={12} /> Reconectar
              </button>
            )}
            <button onClick={onRevoke} className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-600 cursor-pointer transition-colors">
              <Unlink size={12} /> Revogar
            </button>
            <button onClick={onDelete} className="flex items-center gap-1 text-xs text-slate-300 hover:text-red-500 cursor-pointer transition-colors">
              <X size={12} /> Remover
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function OpenFinance() {
  const { bankConnections, addBankConnection, updateBankConnection, deleteBankConnection } = useStore()
  const scriptReady = usePluggyScript()
  const instanceRef = useRef(null)
  const [syncing, setSyncing] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState(null)

  const openWidget = useCallback(async (itemId = null) => {
    if (!scriptReady) return
    setConnecting(true)
    setConnectError(null)
    try {
      const token = await fetchConnectToken(itemId)

      instanceRef.current?.destroy?.()

      instanceRef.current = new window.PluggyConnect({
        connectToken: token,
        includeSandbox: true,
        onSuccess: async (itemData) => {
          const id = itemData?.item?.id || itemData?.id
          if (!id) return
          try {
            const [item, accounts] = await Promise.all([fetchItem(id), fetchItemAccounts(id)])
            const connector = item.connector || {}
            const mainAccount = accounts[0] || {}
            const existing = bankConnections.find((bc) => bc.pluggy_item_id === id)
            const connectionData = {
              bank_name: connector.name || 'Banco',
              bank_code: String(connector.id || ''),
              account_type: mapAccountType(mainAccount.type),
              account_number: mainAccount.number ? `****${String(mainAccount.number).slice(-4)}` : '****',
              status: item.status === 'UPDATED' ? 'connected' : item.status === 'OUTDATED' ? 'expired' : 'error',
              last_sync: new Date().toISOString(),
              consent_expires: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
              balance: mainAccount.balance ?? 0,
              auto_sync: true,
              pluggy_item_id: id,
              pluggy_accounts: accounts.map((a) => ({
                id: a.id,
                name: a.name,
                type: mapAccountType(a.type),
                balance: a.balance,
                number: a.number,
                currencyCode: a.currencyCode,
              })),
            }
            if (existing) {
              updateBankConnection(existing.id, connectionData)
            } else {
              addBankConnection(connectionData)
            }
          } catch (err) {
            console.error('Error fetching Pluggy data:', err)
            addBankConnection({
              bank_name: 'Banco conectado',
              bank_code: '',
              account_type: 'checking',
              status: 'connected',
              last_sync: new Date().toISOString(),
              consent_expires: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
              pluggy_item_id: id,
            })
          }
        },
        onError: (err) => {
          console.error('Pluggy Connect error:', err)
          setConnectError('Erro ao conectar com o banco. Tente novamente.')
        },
        onClose: () => {
          setConnecting(false)
        },
      })

      instanceRef.current.open()
    } catch (err) {
      setConnectError(err.message)
      setConnecting(false)
    }
  }, [scriptReady, bankConnections, addBankConnection, updateBankConnection])

  const handleSync = async (bc) => {
    if (!bc.pluggy_item_id) {
      updateBankConnection(bc.id, { last_sync: new Date().toISOString() })
      return
    }
    setSyncing(bc.id)
    try {
      const [item, accounts] = await Promise.all([
        fetchItem(bc.pluggy_item_id),
        fetchItemAccounts(bc.pluggy_item_id),
      ])
      const mainAccount = accounts[0] || {}
      updateBankConnection(bc.id, {
        status: item.status === 'UPDATED' ? 'connected' : item.status === 'OUTDATED' ? 'expired' : 'error',
        balance: mainAccount.balance ?? bc.balance,
        last_sync: new Date().toISOString(),
        pluggy_accounts: accounts.map((a) => ({
          id: a.id, name: a.name, type: mapAccountType(a.type), balance: a.balance, number: a.number,
        })),
      })
    } catch (err) {
      console.error('Sync error:', err)
    } finally {
      setSyncing(null)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Open Finance</h1>
          <p className="text-xs text-slate-400 mt-0.5">Powered by Pluggy</p>
        </div>
        <Button onClick={() => openWidget()} size="sm" disabled={!scriptReady || connecting}>
          {connecting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {connecting ? 'Abrindo...' : 'Conectar banco'}
        </Button>
      </div>

      {/* Security info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Conexão segura via Pluggy</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Open Finance regulamentado pelo Banco Central · OAuth 2.0 · Criptografia ponta a ponta · Consentimento revogável a qualquer momento
            </p>
            <a href="https://pluggy.ai" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline mt-1 flex items-center gap-1">
              Saiba mais sobre a Pluggy <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      {connectError && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-5 flex items-start gap-3">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">Erro ao conectar</p>
            <p className="text-xs text-red-600 mt-0.5">{connectError}</p>
          </div>
          <button onClick={() => setConnectError(null)} className="ml-auto text-red-400 hover:text-red-600 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {bankConnections.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-5xl mb-4">🏦</p>
          <p className="text-sm font-medium text-slate-600">Nenhum banco conectado</p>
          <p className="text-xs mt-1 mb-5">Conecte suas contas bancárias para sincronizar saldo e transações automaticamente via Open Finance.</p>
          <Button onClick={() => openWidget()} disabled={!scriptReady || connecting}>
            {connecting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Conectar primeiro banco
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bankConnections.map((bc) => (
            <ConnectionCard
              key={bc.id}
              bc={bc}
              isSyncing={syncing === bc.id}
              onSync={() => handleSync(bc)}
              onReconnect={() => openWidget(bc.pluggy_item_id || null)}
              onRevoke={() => updateBankConnection(bc.id, { status: 'expired' })}
              onDelete={() => deleteBankConnection(bc.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
