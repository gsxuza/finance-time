import { useState, useEffect } from 'react'
import { Settings2, Bell, Shield, RefreshCw, LogOut, Cloud, Copy, Check } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getSyncUserId, setSyncUserId, getSyncStatus, forceSaveToCloud } from '@/hooks/useNeonSync'

function Toggle({ checked, onChange, label, desc }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {desc && <p className="text-xs text-slate-400 mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${checked ? 'bg-blue-500' : 'bg-slate-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-blue-500" />
          <CardTitle className="text-blue-600">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  )
}

function SyncCodeSection() {
  const [userId, setUserId] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [copied, setCopied] = useState(false)
  const [msg, setMsg] = useState('')
  const [saving, setSaving] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)

  useEffect(() => {
    setUserId(getSyncUserId() || '')
    setSyncStatus(getSyncStatus())
    const id = setInterval(() => setSyncStatus(getSyncStatus()), 3000)
    return () => clearInterval(id)
  }, [])

  function handleCopy() {
    if (!userId) return
    navigator.clipboard.writeText(userId).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleApplyCode() {
    const code = inputCode.trim()
    if (!code || code.length < 8) { setMsg('Código inválido.'); return }
    setSyncUserId(code)
    setMsg('Código aplicado! Recarregando...')
    setTimeout(() => window.location.reload(), 1200)
  }

  async function handleForceSave() {
    setSaving(true)
    setMsg('')
    try {
      await forceSaveToCloud()
      setMsg('✅ Dados enviados para a nuvem com sucesso!')
    } catch (err) {
      setMsg(`⚠️ Erro: ${err.message}`)
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(''), 6000)
    }
  }

  const statusColor = syncStatus?.phase === 'ok' ? 'text-green-600' : syncStatus?.phase === 'error' ? 'text-red-500' : 'text-slate-400'
  const statusLabel = syncStatus?.phase === 'ok' ? '● Sincronizado' : syncStatus?.phase === 'error' ? `● Erro: ${syncStatus.message}` : syncStatus?.phase === 'loading' ? '● Carregando...' : '● Aguardando'

  return (
    <Section icon={Cloud} title="Sincronização entre dispositivos">
      <div className={`text-xs mb-3 font-medium ${statusColor}`}>{statusLabel}</div>
      <p className="text-xs text-slate-500 mb-3">
        Use o código abaixo para sincronizar seus dados em outros dispositivos. Cole o código no outro dispositivo e clique em "Aplicar".
      </p>
      <div className="mb-3">
        <label className="text-xs font-medium text-slate-600 mb-1 block">Seu código de sync</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-slate-100 rounded-xl text-xs text-slate-700 truncate font-mono select-all">
            {userId || '...'}
          </code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition-colors cursor-pointer"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      </div>
      <div className="mb-3">
        <button
          onClick={handleForceSave}
          disabled={saving}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={12} className={saving ? 'animate-spin' : ''} />
          {saving ? 'Enviando...' : 'Forçar sincronização agora'}
        </button>
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600 mb-1 block">Aplicar código de outro dispositivo</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Cole o código aqui"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleApplyCode}
            className="px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-medium hover:bg-green-600 transition-colors cursor-pointer"
          >
            Aplicar
          </button>
        </div>
        {msg && <p className="text-xs mt-1.5 text-blue-600">{msg}</p>}
      </div>
    </Section>
  )
}

export default function Settings() {
  const { settings, updateSettings } = useStore()

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings2 size={20} className="text-slate-500" />
        <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
      </div>

      {/* Preferences */}
      <Section icon={Settings2} title="Preferências">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Moeda</label>
            <select
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BRL">🇧🇷 BRL - Real</option>
              <option value="USD">🇺🇸 USD - Dólar</option>
              <option value="EUR">🇪🇺 EUR - Euro</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Idioma</label>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="pt-BR">Português (BR)</option>
              <option value="en-US">English (US)</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notificações">
        <div className="divide-y divide-slate-50">
          <Toggle
            checked={settings.notifications_enabled}
            onChange={(v) => updateSettings({ notifications_enabled: v })}
            label="Notificações ativas"
            desc="Receber alertas de orçamentos e saldo"
          />
        </div>
      </Section>

      {/* Security */}
      <Section icon={Shield} title="Segurança">
        <div className="divide-y divide-slate-50">
          <Toggle
            checked={settings.biometric_enabled}
            onChange={(v) => updateSettings({ biometric_enabled: v })}
            label="Autenticação biométrica"
            desc="Usar digital ou Face ID para acessar o app"
          />
          <div className="py-3">
            <button
              onClick={() => updateSettings({ onboarding_completed: false })}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer font-medium transition-colors"
            >
              <RefreshCw size={14} /> Revisar onboarding
            </button>
          </div>
          <div className="py-3">
            <button
              onClick={() => { localStorage.removeItem('ft_token'); window.location.reload() }}
              className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 cursor-pointer font-medium transition-colors"
            >
              <LogOut size={14} /> Sair da conta
            </button>
          </div>
        </div>
      </Section>

      {/* Sync */}
      <SyncCodeSection />

      {/* About */}
      <div className="text-center py-6 text-slate-400 text-xs">
        <p className="font-semibold text-slate-500 mb-1">Finance Time v1.0</p>
        <p>Plataforma de gestão financeira com IA e Open Finance</p>
      </div>
    </div>
  )
}
