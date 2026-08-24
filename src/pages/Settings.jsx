import { Settings2, Bell, Shield, RefreshCw, LogOut } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

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

      {/* About */}
      <div className="text-center py-6 text-slate-400 text-xs">
        <p className="font-semibold text-slate-500 mb-1">Finance Time v1.0</p>
        <p>Plataforma de gestão financeira com IA e Open Finance</p>
      </div>
    </div>
  )
}
