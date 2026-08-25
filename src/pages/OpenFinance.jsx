import { useState, useCallback, useRef, useEffect } from 'react'
import { format, differenceInDays, parseISO, subMonths } from 'date-fns'
import { Plus, RefreshCw, Unlink, AlertTriangle, X, ExternalLink, Loader2 } from 'lucide-react'
import { PluggyConnect } from 'react-pluggy-connect'
import { useStore } from '@/store/useStore'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'

async function fetchConnectToken(itemId = null) {
  const res = await fetch('/api/pluggy/connect-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(itemId ? { itemId } : {}),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erro ao criar token de conexão')
  return data.accessToken
}

async function fetchItemAccounts(itemId) {
  const res = await fetch(`/api/pluggy/accounts?itemId=${itemId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || data.error || `Pluggy error ${res.status}`)
  return data.results || []
}

async function fetchItem(itemId) {
  const res = await fetch(`/api/pluggy/items/${itemId}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || data.error || `Pluggy error ${res.status}`)
  return data
}

async function fetchPluggyTransactions(accountId, from, to) {
  const params = new URLSearchParams({ accountId, pageSize: '100', from, to })
  const res = await fetch(`/api/pluggy/transactions?${params}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || data.error || `Pluggy error ${res.status}`)
  return data.results || data.transactions || []
}

function mapAccountType(pluggyType) {
  return { BANK: 'checking', CREDIT: 'credit_card', SAVING: 'savings', INVESTMENT: 'investment' }[pluggyType] || 'checking'
}

function accountIcon(type) {
  return { checking: '🏦', savings: '🐷', credit_card: '💳', investment: '📈' }[type] || '🏦'
}

function autoCategory(description = '') {
  const d = description.toLowerCase()
  if (d.includes('supermercado') || d.includes('mercado') || d.includes('carrefour') || d.includes('pao de acucar')) return 'Supermercado'
  if (d.includes('restaurante') || d.includes('lanchonete') || d.includes('hamburger') || d.includes('pizza') || d.includes('ifood') || d.includes('rappi')) return 'Restaurante'
  if (d.includes('uber') || d.includes('99') || d.includes('combustivel') || d.includes('gasolina') || d.includes('onibus') || d.includes('metro')) return 'Transporte'
  if (d.includes('aluguel') || d.includes('condominio') || d.includes('iptu')) return 'Moradia'
  if (d.includes('farmacia') || d.includes('medico') || d.includes('hospital') || d.includes('plano de saude') || d.includes('unimed')) return 'Saúde'
  if (d.includes('netflix') || d.includes('spotify') || d.includes('cinema') || d.includes('amazon prime') || d.includes('youtube')) return 'Lazer'
  if (d.includes('curso') || d.includes('escola') || d.includes('faculdade') || d.includes('udemy') || d.includes('mensalidade')) return 'Educação'
  if (d.includes('salario') || d.includes('salário') || d.includes('folha')) return 'Salário'
  if (d.includes('freelance') || d.includes('projeto') || d.includes('servico')) return 'Freelance'
  if (d.includes('invest') || d.includes('renda fixa') || d.includes('cdb') || d.includes('tesouro')) return 'Investimentos'
  if (d.includes('roupa') || d.includes('calcado') || d.includes('vestuario') || d.includes('renner') || d.includes('riachuelo')) return 'Roupas'
  if (d.includes('celular') || d.includes('internet') || d.includes('tim') || d.includes('claro') || d.includes('vivo')) return 'Tecnologia'
  return 'Outros'
}

async function buildSyncPayload(pluggyAccounts) {
  const from = format(subMonths(new Date(), 3), 'yyyy-MM-dd')
  const to = format(new Date(), 'yyyy-MM-dd')

  const accountUpdates = pluggyAccounts.map((a) => ({
    pluggy_account_id: a.id,
    name: a.name,
    type: mapAccountType(a.type),
    balance: a.balance ?? 0,
    icon: accountIcon(mapAccountType(a.type)),
  }))

  const allTxs = []
  await Promise.all(pluggyAccounts.map(async (a) => {
    try {
      const txs = await fetchPluggyTransactions(a.id, from, to)
      for (const t of txs) {
        const isExpense = t.type === 'DEBIT'
        const rawDesc = t.description || t.merchant?.name || t.descriptionRaw || ''
        allTxs.push({
          pluggy_id: t.id,
          pluggy_account_id: a.id,
          date: t.date?.slice(0, 10) || to,
          description: rawDesc,
          amount: Math.abs(t.amount ?? 0),
          type: isExpense ? 'expense' : 'income',
          category: autoCategory(rawDesc),
        })
      }
    } catch (e) {
      console.warn('Failed to fetch txs for account', a.id, e)
    }
  }))

  return { transactions: allTxs, accountUpdates }
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
  const { bankConnections, addBankConnection, updateBankConnection, deleteBankConnection, importPluggySync } = useStore()
  const bankConnectionsRef = useRef(bankConnections)
  useEffect(() => { bankConnectionsRef.current = bankConnections }, [bankConnections])
  const [syncing, setSyncing] = useState(null)
  const [connecting, setConnecting] = useState(false)
  const [connectError, setConnectError] = useState(null)
  const [syncInfo, setSyncInfo] = useState(null)
  const [widgetToken, setWidgetToken] = useState(null)
  const [reconnectItemId, setReconnectItemId] = useState(null)

  const openWidget = useCallback(async (itemId = null) => {
    setConnecting(true)
    setConnectError(null)
    try {
      const token = await fetchConnectToken(itemId)
      setReconnectItemId(itemId)
      setWidgetToken(token)
    } catch (err) {
      setConnectError(err.message)
    } finally {
      setConnecting(false)
    }
  }, [])

  const closeWidget = () => {
    setWidgetToken(null)
    setReconnectItemId(null)
  }

  const handleSuccess = async (itemData) => {
    console.log('[Pluggy] onSuccess payload:', JSON.stringify(itemData))
    const id = itemData?.item?.id || itemData?.id
    if (!id) { closeWidget(); return }

    // Save a preliminary connection record immediately
    const existing = bankConnectionsRef.current.find((bc) => bc.pluggy_item_id === id)
    const prelimData = {
      bank_name: 'Carregando...', bank_code: '', account_type: 'checking',
      status: 'connected', last_sync: new Date().toISOString(),
      consent_expires: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      pluggy_item_id: id,
    }
    if (!existing) addBankConnection(prelimData)
    closeWidget()

    // Poll until item is UPDATED (Pluggy may still be syncing)
    setSyncInfo('⏳ Sincronizando dados do banco, aguarde...')
    let item, accounts
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        ;[item, accounts] = await Promise.all([fetchItem(id), fetchItemAccounts(id)])
        console.log('[Pluggy] item status:', item.status, 'accounts:', accounts.length)
        if (item.status === 'UPDATED' || accounts.length > 0) break
      } catch (err) {
        console.warn('[Pluggy] poll error:', err.message)
      }
      await new Promise((r) => setTimeout(r, 3000))
    }

    try {
      const connector = item?.connector || {}
      const mainAccount = (accounts || [])[0] || {}
      const pluggyAccounts = (accounts || []).map((a) => ({
        id: a.id, name: a.name, type: a.type, balance: a.balance, number: a.number,
      }))
      const connectionData = {
        bank_name: connector.name || 'Banco conectado',
        bank_code: String(connector.id || ''),
        account_type: mapAccountType(mainAccount.type),
        account_number: mainAccount.number ? `****${String(mainAccount.number).slice(-4)}` : '****',
        status: item?.status === 'UPDATED' ? 'connected' : item?.status === 'OUTDATED' ? 'expired' : 'connected',
        last_sync: new Date().toISOString(),
        consent_expires: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        balance: mainAccount.balance ?? 0,
        auto_sync: true,
        pluggy_item_id: id,
        pluggy_accounts: pluggyAccounts,
      }
      const found = bankConnectionsRef.current.find((bc) => bc.pluggy_item_id === id)
      if (found) updateBankConnection(found.id, connectionData)
      else addBankConnection(connectionData)

      if (pluggyAccounts.length > 0) {
        const payload = await buildSyncPayload(pluggyAccounts)
        importPluggySync(payload)
        setSyncInfo(`✅ ${payload.transactions.length} transações importadas com sucesso`)
      } else {
        setSyncInfo('✅ Banco conectado. Clique em "Sincronizar" para importar as transações.')
      }
    } catch (err) {
      console.error('[Pluggy] handleSuccess error:', err)
      setSyncInfo('⚠️ Banco conectado, mas houve um erro ao importar transações. Clique em "Sincronizar".')
    }
    setTimeout(() => setSyncInfo(null), 8000)
  }

  const handleSync = async (bc) => {
    const itemId = typeof bc.pluggy_item_id === 'string' ? bc.pluggy_item_id : bc.pluggy_item_id?.id || null
    if (!itemId) {
      updateBankConnection(bc.id, { last_sync: new Date().toISOString() })
      setSyncInfo('⚠️ ID do item Pluggy não encontrado. Reconecte o banco.')
      setTimeout(() => setSyncInfo(null), 6000)
      return
    }
    setSyncing(bc.id)
    console.log('[Sync] itemId:', itemId)
    try {
      console.log('[Sync] fetching item...')
      const item = await fetchItem(itemId)
      console.log('[Sync] item:', item)

      console.log('[Sync] fetching accounts...')
      const accounts = await fetchItemAccounts(itemId)
      console.log('[Sync] accounts:', accounts)

      const mainAccount = accounts[0] || {}
      const pluggyAccounts = accounts.map((a) => ({
        id: a.id, name: a.name, type: a.type, balance: a.balance, number: a.number,
      }))
      updateBankConnection(bc.id, {
        status: item.status === 'UPDATED' ? 'connected' : item.status === 'OUTDATED' ? 'expired' : 'error',
        balance: mainAccount.balance ?? bc.balance,
        last_sync: new Date().toISOString(),
        pluggy_accounts: pluggyAccounts,
      })

      console.log('[Sync] building payload for', pluggyAccounts.length, 'accounts')
      const payload = await buildSyncPayload(pluggyAccounts)
      console.log('[Sync] payload txs:', payload.transactions.length)
      importPluggySync(payload)
      setSyncInfo(`✅ ${payload.transactions.length} transações buscadas (novas adicionadas automaticamente)`)
      setTimeout(() => setSyncInfo(null), 6000)
    } catch (err) {
      console.error('[Sync] error:', err)
      setSyncInfo(`⚠️ Erro ao sincronizar: ${err.message}`)
      setTimeout(() => setSyncInfo(null), 8000)
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
        <Button onClick={() => openWidget()} size="sm" disabled={connecting || !!widgetToken}>
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

      {syncInfo && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <p className="text-sm text-emerald-700">{syncInfo}</p>
        </div>
      )}

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

      {/* Pluggy Connect Widget (inline, shown when token is ready) */}
      {widgetToken && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-slate-700">Selecione seu banco abaixo:</p>
            <button onClick={closeWidget} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={16} />
            </button>
          </div>
          <div className="rounded-2xl overflow-hidden border border-slate-200" style={{ minHeight: 580 }}>
            <PluggyConnect
              connectToken={widgetToken}
              includeSandbox={false}
              onSuccess={handleSuccess}
              onError={(err) => { setConnectError('Erro ao conectar. Tente novamente.'); closeWidget() }}
              onClose={closeWidget}
            />
          </div>
        </div>
      )}

      {bankConnections.length === 0 && !widgetToken ? (
        <div className="text-center py-20 text-slate-400">
          <p className="text-5xl mb-4">🏦</p>
          <p className="text-sm font-medium text-slate-600">Nenhum banco conectado</p>
          <p className="text-xs mt-1 mb-5">Conecte suas contas bancárias para sincronizar saldo e transações automaticamente via Open Finance.</p>
          <Button onClick={() => openWidget()} disabled={connecting || !!widgetToken}>
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
