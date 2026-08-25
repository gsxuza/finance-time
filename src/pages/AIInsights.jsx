import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, Loader2, User, Bot } from 'lucide-react'
import { useStore } from '@/store/useStore'

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
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-blue-500' : 'bg-gradient-to-br from-violet-500 to-blue-500'}`}>
        {isUser ? <User size={14} className="text-white" /> : <Bot size={14} className="text-white" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed space-y-0.5 ${isUser ? 'bg-blue-500 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-700 rounded-tl-sm shadow-sm'}`}>
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
          financialData: { accounts, transactions, budgets },
        }),
      })
      const data = await res.json()
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
      <div className="flex items-center gap-3 px-4 lg:px-6 py-4 border-b border-slate-100 bg-white shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-slate-900">Finance AI</h1>
          <p className="text-xs text-slate-400">Assistente financeiro pessoal</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-6 py-4 space-y-4 bg-slate-50">
        {messages.map((msg, i) => (
          <Message key={i} msg={msg} />
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <Loader2 size={16} className="animate-spin text-violet-400" />
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-xs text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-2">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick actions */}
      {messages.length <= 1 && (
        <div className="px-4 lg:px-6 py-3 bg-white border-t border-slate-100 shrink-0">
          <p className="text-xs text-slate-400 mb-2">Sugestões rápidas:</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action}
                onClick={() => sendMessage(action)}
                disabled={loading}
                className="text-xs bg-violet-50 text-violet-600 border border-violet-100 rounded-full px-3 py-1.5 hover:bg-violet-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 lg:px-6 py-3 bg-white border-t border-slate-100 shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre suas finanças..."
            rows={1}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent max-h-32 overflow-y-auto"
            style={{ minHeight: '42px' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="text-white animate-spin" /> : <Send size={16} className="text-white" />}
          </button>
        </div>
        <p className="text-xs text-slate-300 mt-1.5 text-center">Enter para enviar · Shift+Enter para nova linha</p>
      </div>
    </div>
  )
}
