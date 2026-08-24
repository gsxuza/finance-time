import { useState, useEffect, useRef } from 'react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { Plus, RefreshCw, Unlink, AlertTriangle, X, ExternalLink, Info } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'

// Load Pluggy Connect Widget script once
function usePluggyConnect() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (window.PluggyConnect) { setReady(true); return }
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
    body: itemId ? JSON.stringify({ itemId }) : undefined,
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

// Map Pluggy account type to our types
function mapAccountType(pluggyType) {
  const map = {
    BANK: 'checking',
    CREDIT: 'credit_card',
    SAVING: 'savings',
    INVESTMENT: 'investment',
  }
  return map[pluggyType] || 'checking'
}

function ConnectWidget({ onSuccess, onClose, itemId = null }) {
  const widgetReady = usePluggyConnect()
  const containerRef = useRef(null)
  const instanceRef = useRef(null)
  const [token, setToken] = useState(null)
  const [tokenError, setTokenError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchConnectToken(itemId)
      .then(setToken)
      .catch((e) => setTokenError(e.message))
      .finally(() => setLoading(false))
  }, [itemId])

  useEffect(() => {
    if (!widgetReady || !token || !containerRef.current) return

    // Destroy previous instance if any
    instanceRef.current?.destroy?.()

    instanceRef.current = new window.PluggyConnect({
      connectToken: token,
      includeSandbox: true,
      onSuccess: async (itemData) => {
        onSuccess(itemData)
      },
      onError: (err) => {
        console.error('Pluggy Connect error:', err)
      },
      onClose: () => {
        onClose()
      },
    })

    instanceRef.current.init(containerRef.current)

    return () => {
      instanceRef.current?.destroy?.()
    }
  }, [widgetReady, token])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-slate-500">Carregando Connect...</p>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
          <AlertTriangle size={20} className="text-red-500" />
        </div>
        <p className="text-sm font-medium text-slate-800">Erro ao conectar</p>
        <p className="text-xs text-slate-500 text-center">{tokenError}</p>
        {tokenError.includes('not configured') && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
            <strong>Configure as variáveis de ambiente no Vercel:</strong><br />
            PLUGGY_CLIENT_ID e PLUGGY_CLIENT_SECRET<br />
            <a href="https://vercel.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline flex items-center gap-1 mt-1">
              Acessar Vercel Dashboard <ExternalLink size={10} />
            </a>
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <div ref={containerRef} className="min-h-[500px]" />
    </div>
  )
}

function ConnectionCard({ bc, onSync, onReconnect, onRevoke, onDelete }) {
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
              {bc.pluggy_item_id && (
                <p className="text-xs text-slate-300">ID: {bc.pluggy_item_id}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 shrink-0">
            <button onClick={onSync} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 cursor-pointer transition-colors">
              <RefreshCw size={12} /> Sincronizar
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
  const [connectModal, setConnectModal] = useState(false)
  const [reconnectItemId, setReconnectItemId] = useState(null)
  const [syncing, setSyncing] = useState(null)

  const handleConnectSuccess = async (itemData) => {
    const itemId = itemData?.item?.id
    setConnectModal(false)
    setReconnectItemId(null)

    if (!itemId) return

    try {
      // Fetch item details and accounts from Pluggy
      const [item, accounts] = await Promise.all([
        fetchItem(itemId),
        fetchItemAccounts(itemId),
      ])

      const connector = item.connector || {}
      const mainAccount = accounts[0] || {}

      // Check if this item already exists (reconnect case)
      const existing = bankConnections.find((bc) => bc.pluggy_item_id === itemId)

      const connectionData = {
        bank_name: connector.name || 'Banco',
        bank_code: String(connector.id || ''),
        account_type: mapAccountType(mainAccount.type),
        account_number: mainAccount.number ? `****${mainAccount.number.slice(-4)}` : '****',
        status: item.status === 'UPDATED' ? 'connected' : item.status === 'OUTDATED' ? 'expired' : 'error',
        last_sync: new Date().toISOString(),
        consent_expires: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        balance: mainAccount.balance || 0,
        auto_sync: true,
        pluggy_item_id: itemId,
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
      console.error('Error fetching Pluggy data after connect:', err)
      // Still save the connection with minimal data
      addBankConnection({
        bank_name: 'Banco conectado',
        bank_code: '',
        account_type: 'checking',
        status: 'connected',
        last_sync: new Date().toISOString(),
        consent_expires: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        pluggy_item_id: itemId,
      })
    }
  }

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
        balance: mainAccount.balance || bc.balance,
        last_sync: new Date().toISOString(),
        pluggy_accounts: accounts.map((a) => ({
          id: a.id,
          name: a.name,
          type: mapAccountType(a.type),
          balance: a.balance,
          number: a.number,
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
        <Button onClick={() => setConnectModal(true)} size="sm">
          <Plus size={16} /> Conectar banco
        </Button>
      </div>

      {/* Security + Pluggy info */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <span className="text-xl">🔒</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Conexão segura via Pluggy</p>
            <p className="text-xs text-blue-600 mt-0.5">
              Open Finance regulamentado pelo Banco Central · OAuth 2.0 · Criptografia ponta a ponta · Consentimento revogável a qualquer momento
            </p>
            <a
              href="https://pluggy.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 underline mt-1 flex items-center gap-1"
            >
              Saiba mais sobre a Pluggy <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>

      {/* Credentials warning */}
      {!import.meta.env.PROD && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <div className="flex items-start gap-2">
            <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Configuração necessária</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Para usar o Open Finance real, adicione <code className="bg-amber-100 px-1 rounded">PLUGGY_CLIENT_ID</code> e <code className="bg-amber-100 px-1 rounded">PLUGGY_CLIENT_SECRET</code> nas variáveis de ambiente do Vercel.
                Obtenha as credenciais em <a href="https://dashboard.pluggy.ai" target="_blank" rel="noopener noreferrer" className="underline">dashboard.pluggy.ai</a>.
              </p>
            </div>
          </div>
        </div>
      )}

      {bankConnections.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-5xl mb-4">🏦</p>
          <p className="text-sm font-medium text-slate-600">Nenhum banco conectado</p>
          <p className="text-xs mt-1 mb-5">Conecte suas contas bancárias para sincronizar saldo e transações automaticamente via Open Finance.</p>
          <Button onClick={() => setConnectModal(true)}>
            <Plus size={16} /> Conectar primeiro banco
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bankConnections.map((bc) => (
            <ConnectionCard
              key={bc.id}
              bc={bc}
              onSync={() => handleSync(bc)}
              onReconnect={() => { setReconnectItemId(bc.pluggy_item_id || null); setConnectModal(true) }}
              onRevoke={() => updateBankConnection(bc.id, { status: 'expired' })}
              onDelete={() => deleteBankConnection(bc.id)}
            />
          ))}
        </div>
      )}

      {/* Pluggy Connect Modal */}
      <Modal
        open={connectModal}
        onClose={() => { setConnectModal(false); setReconnectItemId(null) }}
        title={reconnectItemId ? 'Reconectar banco' : 'Conectar banco'}
        size="lg"
      >
        <ConnectWidget
          onSuccess={handleConnectSuccess}
          onClose={() => { setConnectModal(false); setReconnectItemId(null) }}
          itemId={reconnectItemId}
        />
      </Modal>
    </div>
  )
}
