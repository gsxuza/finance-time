import { useState } from 'react'
import { TrendingUp, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Senha incorreta')
        return
      }
      localStorage.setItem('ft_token', data.token)
      onLogin()
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-card bg-bg-elevated ring-1 ring-border flex items-center justify-center mb-4">
            <TrendingUp size={22} className="text-fg" />
          </div>
          <h1 className="text-xl font-bold text-fg">Finance Time</h1>
          <p className="text-sm text-fg-muted mt-1">Gestão financeira pessoal</p>
        </div>

        {/* Card */}
        <div className="bg-bg-surface rounded-card ring-1 ring-border p-7">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={13} className="text-fg-muted" />
            <p className="text-xs font-medium text-fg-secondary">Acesso protegido</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-medium text-fg-secondary mb-1.5 block">Senha</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError('') }}
                  placeholder="Digite sua senha"
                  className="w-full px-4 py-2.5 pr-11 rounded-input bg-bg-elevated ring-1 ring-border text-sm text-fg placeholder-fg-muted focus:outline-none focus:ring-border-strong transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg cursor-pointer transition-colors"
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-danger mt-1.5">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full py-2.5 rounded-btn bg-fg text-bg font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:bg-fg/90 cursor-pointer"
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : null}
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-center text-2xs text-fg-muted mt-5">
          Finance Time · Acesso privado
        </p>
      </div>
    </div>
  )
}
