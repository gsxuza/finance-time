import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, User, Bot } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { currentMonth } from '@/lib/utils'

const QUICK_ACTIONS = [
  'Resumo financeiro do mês',
  'Onde estou gastando mais?',
  'Estou no azul esse mês?',
  'Como posso economizar?',
  'Quais categorias ultrapassaram o orçamento?',
]

// The model is told to avoid markdown, but it still slips **bold** and #
// headings in. Render those rather than letting the raw syntax reach the screen.
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : part
  )
}

function FormattedText({ text }) {
  const lines = String(text || '').split('\n')

  return lines.map((raw, i) => {
    const line = raw.replace(/^#{1,6}\s*/, '').trimEnd()

    if (!line.trim()) return <div key={i} className="h-2" />

    const bullet = line.match(/^\s*[-•*]\s+(.*)$/)
    if (bullet) {
      return (
        <div key={i} className="flex gap-2 pl-1">
          <span className="text-violet-400 shrink-0">•</span>
          <span>{renderInline(bullet[1])}</span>
        </div>
      )
    }

    return <div key={i}>{renderInline(line)}</div>
  })
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-btn flex items-center justify-center shrink-0 ${isUser ? 'bg-fg' : 'bg-bg-elevated ring-1 ring-border'}`}>
        {isUser ? <User size={13} className="text-bg" /> : <Bot size={13} className="text-fg-secondary" />}
      </div>
      <div className={`max-w-[82%] rounded-card px-4 py-3 text-sm leading-relaxed space-y-0.5 ${isUser ? 'bg-fg text-bg rounded-tr-sm font-medium' : 'bg-bg-surface ring-1 ring-border text-fg-secondary rounded-tl-sm'}`}>
        {isUser ? msg.content : <FormattedText text={msg.content} />}
      </div>
    </div>
  )
}

export default function AIInsights() {
  const { accounts, transactions, budgets } = useStore()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Olá! Sou o Finance AI, seu assistente financeiro. Posso analisar suas transações, orçamentos e contas para te ajudar a entender melhor sua saúde financeira. O que você gostaria de saber?' },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setError(null)

    const userMsg = { role: 'user', content: msg }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    const history = newMessages.slice(1, -1)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          history,
          month: currentMonth(),
          financialData: { accounts, transactions, budgets },
        }),
      })

      // A crashed function replies with an HTML error page, and parsing that
      // throws a browser-internal message that means nothing to the user.
      let data
      try {
        data = JSON.parse(await res.text())
      } catch {
        throw new Error(`O assistente falhou (erro ${res.status}). Tente novamente em instantes.`)
      }

      if (!res.ok) throw new Error(data.error || 'Erro ao consultar IA')
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message)
      setMessages((prev) => prev.slice(0, -1))
      // Put the text back so a transient failure doesn't cost the user their message
      setInput(msg)
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] lg:h-screen max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 lg:px-6 py-4 border-b border-border bg-bg-surface shrink-0">
        <div className="w-8 h-8 rounded-btn bg-violet-muted ring-1 ring-violet/20 flex items-center justify-center">
          <Sparkles size={14} className="text-violet" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-fg">Finance AI</h1>
          <p className="text-2xs text-fg-muted">Assistente financeiro pessoal</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-dark px-4 lg:px-6 py-5 space-y-4 bg-bg">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-btn bg-bg-elevated ring-1 ring-border flex items-center justify-center shrink-0">
              <Bot size={13} className="text-fg-secondary" />
            </div>
            <div className="bg-bg-surface ring-1 ring-border rounded-card rounded-tl-sm px-4 py-3">
              <Loader2 size={14} className="animate-spin text-violet" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-xs text-danger bg-danger-muted ring-1 ring-danger/20 rounded-btn px-4 py-2">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && (
        <div className="px-4 lg:px-6 py-3 bg-bg-surface border-t border-border shrink-0">
          <p className="text-2xs text-fg-muted mb-2">Sugestões:</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => sendMessage(action)}
                disabled={loading}
                className="text-2xs bg-bg-elevated text-fg-secondary ring-1 ring-border rounded-pill px-3 py-1.5 hover:bg-bg-hover hover:text-fg transition-colors cursor-pointer disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 lg:px-6 py-3 bg-bg-surface border-t border-border shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre suas finanças..."
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-btn bg-bg-elevated ring-1 ring-border text-sm text-fg placeholder-fg-muted resize-none focus:outline-none focus:ring-border-strong transition-all max-h-32 overflow-y-auto scrollbar-dark"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-btn bg-fg flex items-center justify-center shrink-0 disabled:opacity-40 hover:bg-fg/90 transition-colors cursor-pointer"
          >
            {loading ? <Loader2 size={15} className="text-bg animate-spin" /> : <Send size={15} className="text-bg" />}
          </button>
        </div>
        <p className="text-2xs text-fg-muted mt-1.5 text-center">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}
