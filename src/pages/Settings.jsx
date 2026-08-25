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
        <p className="text-sm font-medium text-fg">{label}</p>
        {desc && <p className="text-xs text-fg-muted mt-0.5">{desc}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${checked ? 'bg-fg' : 'bg-bg-hover ring-1 ring-border'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow transition-transform ${checked ? 'bg-bg translate-x-5' : 'bg-fg-muted'}`} />
      </button>
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-fg-secondary" />
          <CardTitle>{title}</CardTitle>
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

  const statusColor = syncStatus?.phase === 'ok' ? 'text-success' : syncStatus?.phase === 'error' ? 'text-danger' : 'text-fg-muted'
  const statusLabel = syncStatus?.phase === 'ok' ? '● Sincronizado' : syncStatus?.phase === 'error' ? `● Erro: ${syncStatus.message}` : syncStatus?.phase === 'loading' ? '● Carregando...' : '● Aguardando'

  return (
    <Section icon={Cloud} title="Sincronização entre dispositivos">
      <div className={`text-xs mb-3 font-medium ${statusColor}`}>{statusLabel}</div>
      <p className="text-xs text-fg-muted mb-3">
        Use o código abaixo para sincronizar seus dados em outros dispositivos. Cole o código no outro dispositivo e clique em "Aplicar".
      </p>
      <div className="mb-3">
        <label className="text-xs font-medium text-fg-secondary mb-1.5 block">Seu código de sync</label>
        <div className="flex items-center gap-2">
          <code className="flex-1 px-3 py-2 bg-bg-elevated ring-1 ring-border rounded-btn text-xs text-fg truncate font-mono select-all">
            {userId || '...'}
          </code>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-2 rounded-btn bg-fg text-bg text-xs font-medium hover:bg-fg/90 transition-colors cursor-pointer"
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
          className="flex items-center gap-1.5 text-xs text-fg-secondary hover:text-fg font-medium cursor-pointer disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={12} className={saving ? 'animate-spin' : ''} />
          {saving ? 'Enviando...' : 'Forçar sincronização agora'}
        </button>
      </div>
      <div>
        <label className="text-xs font-medium text-fg-secondary mb-1.5 block">Aplicar código de outro dispositivo</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Cole o código aqui"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="flex-1 px-3 py-2 rounded-btn bg-bg-elevated ring-1 ring-border text-xs text-fg placeholder-fg-muted focus:outline-none focus:ring-border-strong transition-all"
          />
          <button
            onClick={handleApplyCode}
            className="px-3 py-2 rounded-btn bg-success/10 text-success text-xs font-medium hover:bg-success/20 transition-colors cursor-pointer ring-1 ring-success/20"
          >
            Aplicar
          </button>
        </div>
        {msg && <p className="text-xs mt-1.5 text-fg-secondary">{msg}</p>}
      </div>
    </Section>
  )
}

export default function Settings() {
  const { settings, updateSettings } = useStore()

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <Settings2 size={16} className="text-fg-muted" />
        <h1 className="text-lg font-semibold text-fg">Configurações</h1>
      </div>

      {/* Preferences */}
      <Section icon={Settings2} title="Preferências">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-fg-secondary mb-1.5 block">Moeda</label>
            <select
              value={settings.currency}
              onChange={(e) => updateSettings({ currency: e.target.value })}
              className="w-full px-3 py-2.5 rounded-btn bg-bg-elevated ring-1 ring-border text-sm text-fg focus:outline-none cursor-pointer"
            >
              <option value="BRL">🇧🇷 BRL - Real</option>
              <option value="USD">🇺🇸 USD - Dólar</option>
              <option value="EUR">🇪🇺 EUR - Euro</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-fg-secondary mb-1.5 block">Idioma</label>
            <select
              value={settings.language}
              onChange={(e) => updateSettings({ language: e.target.value })}
              className="w-full px-3 py-2.5 rounded-btn bg-bg-elevated ring-1 ring-border text-sm text-fg focus:outline-none cursor-pointer"
            >
              <option value="pt-BR">Português (BR)</option>
              <option value="en-US">English (US)</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={Bell} title="Notificações">
        <div className="divide-y divide-border-subtle">
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
        <div className="divide-y divide-border-subtle">
          <Toggle
            checked={settings.biometric_enabled}
            onChange={(v) => updateSettings({ biometric_enabled: v })}
            label="Autenticação biométrica"
            desc="Usar digital ou Face ID para acessar o app"
          />
          <div className="py-3">
            <button
              onClick={() => updateSettings({ onboarding_completed: false })}
              className="flex items-center gap-2 text-sm text-fg-secondary hover:text-fg cursor-pointer font-medium transition-colors"
            >
              <RefreshCw size={14} /> Revisar onboarding
            </button>
          </div>
          <div className="py-3">
            <button
              onClick={() => { localStorage.removeItem('ft_token'); window.location.reload() }}
              className="flex items-center gap-2 text-sm text-danger hover:text-danger/80 cursor-pointer font-medium transition-colors"
            >
              <LogOut size={14} /> Sair da conta
            </button>
          </div>
        </div>
      </Section>

      {/* Sync */}
      <SyncCodeSection />

      {/* About */}
      <div className="text-center py-6 text-fg-muted text-xs">
        <p className="font-medium text-fg-secondary mb-1">Finance Time v1.0</p>
        <p>Plataforma de gestão financeira com IA e Open Finance</p>
      </div>
    </div>
  )
}
