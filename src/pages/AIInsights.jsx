import { useState, useMemo } from 'react'
import { format, subMonths } from 'date-fns'
import { Sparkles, RefreshCw, TrendingUp, TrendingDown, AlertCircle, Lightbulb, Target } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

function InsightCard({ icon: Icon, title, content, type = 'info' }) {
  const styles = {
    info: 'border-blue-100 bg-blue-50',
    success: 'border-emerald-100 bg-emerald-50',
    warning: 'border-amber-100 bg-amber-50',
    danger: 'border-red-100 bg-red-50',
    ai: 'border-violet-100 bg-violet-50',
  }
  const iconStyles = {
    info: 'text-blue-500',
    success: 'text-emerald-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    ai: 'text-violet-500',
  }
  return (
    <div className={`rounded-2xl border p-4 ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <Icon size={20} className={`shrink-0 mt-0.5 ${iconStyles[type]}`} />
        <div>
          <p className="text-sm font-semibold text-slate-800 mb-1">{title}</p>
          <p className="text-xs text-slate-600 leading-relaxed">{content}</p>
        </div>
      </div>
    </div>
  )
}

export default function AIInsights() {
  const { transactions, budgets, getBudgetSpent } = useStore()
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [whatIf, setWhatIf] = useState({ income: 0, expense: 0, days: 30 })

  const thisMonth = format(new Date(), 'yyyy-MM')
  const lastMonth = format(subMonths(new Date(), 1), 'yyyy-MM')

  const income = transactions.filter((t) => t.type === 'income' && t.date?.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0)
  const expenses = transactions.filter((t) => t.type === 'expense' && t.date?.startsWith(thisMonth)).reduce((s, t) => s + t.amount, 0)
  const lastIncome = transactions.filter((t) => t.type === 'income' && t.date?.startsWith(lastMonth)).reduce((s, t) => s + t.amount, 0)
  const lastExpenses = transactions.filter((t) => t.type === 'expense' && t.date?.startsWith(lastMonth)).reduce((s, t) => s + t.amount, 0)

  const savingRate = income > 0 ? ((income - expenses) / income) * 100 : 0
  const topCategory = useMemo(() => {
    const map = {}
    transactions.filter((t) => t.type === 'expense' && t.date?.startsWith(thisMonth)).forEach((t) => {
      map[t.category] = (map[t.category] || 0) + t.amount
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]
  }, [transactions])

  const overBudgets = budgets.filter((b) => {
    const spent = getBudgetSpent(b.category, b.period, b.start_date)
    return spent > b.amount
  })

  const insights = useMemo(() => {
    const list = []
    if (savingRate >= 20) list.push({ icon: TrendingUp, title: 'Excelente taxa de poupança!', content: `Você está poupando ${savingRate.toFixed(0)}% da sua renda este mês. Continue assim — a meta ideal é manter acima de 20%.`, type: 'success' })
    else if (savingRate < 0) list.push({ icon: AlertCircle, title: 'Atenção: despesas superam receitas', content: `Suas despesas (${formatCurrency(expenses)}) superaram suas receitas (${formatCurrency(income)}) em ${formatCurrency(expenses - income)}. Revise seus gastos.`, type: 'danger' })
    else list.push({ icon: TrendingDown, title: 'Taxa de poupança abaixo do ideal', content: `Você poupou ${savingRate.toFixed(0)}% da renda. Tente reduzir despesas para atingir pelo menos 20% de poupança.`, type: 'warning' })

    if (topCategory) list.push({ icon: Target, title: `Maior gasto: ${topCategory[0]}`, content: `Você gastou ${formatCurrency(topCategory[1])} em ${topCategory[0]} este mês, representando ${((topCategory[1] / expenses) * 100).toFixed(0)}% das despesas. Avalie se há espaço para redução.`, type: 'info' })

    if (overBudgets.length > 0) list.push({ icon: AlertCircle, title: `${overBudgets.length} orçamento(s) estourado(s)`, content: `As categorias ${overBudgets.map((b) => b.category).join(', ')} ultrapassaram o limite definido. Considere ajustar os orçamentos ou reduzir os gastos.`, type: 'warning' })

    const expenseChange = lastExpenses > 0 ? ((expenses - lastExpenses) / lastExpenses) * 100 : 0
    if (expenseChange > 10) list.push({ icon: TrendingUp, title: 'Despesas aumentaram vs mês passado', content: `Suas despesas cresceram ${expenseChange.toFixed(0)}% em relação ao mês anterior. Verifique quais categorias tiveram maior aumento.`, type: 'warning' })
    else if (expenseChange < -10) list.push({ icon: TrendingDown, title: 'Ótimo! Despesas reduziram', content: `Suas despesas diminuíram ${Math.abs(expenseChange).toFixed(0)}% em relação ao mês anterior. Ótimo trabalho controlando os gastos!`, type: 'success' })

    if (generated) list.push({ icon: Sparkles, title: 'Dica personalizada da IA', content: 'Com base no seu padrão de gastos, você poderia economizar até R$ 200/mês reduzindo refeições fora de casa para 2x por semana. Isso equivale a R$ 2.400/ano — suficiente para uma viagem!', type: 'ai' })
    if (generated) list.push({ icon: Lightbulb, title: 'Oportunidade de investimento', content: 'Você tem potencial de poupar R$ 500/mês. Investir em Tesouro Direto (IPCA+6%) renderia aproximadamente R$ 6.200 em 12 meses, considerando juros compostos.', type: 'ai' })

    return list
  }, [savingRate, topCategory, overBudgets, generated])

  const handleGenerate = () => {
    setLoading(true)
    setTimeout(() => { setLoading(false); setGenerated(true) }, 1500)
  }

  // What-If calculation
  const whatIfBalance = (income + whatIf.income - expenses - whatIf.expense)
  const projectedSaving = whatIfBalance > 0 ? whatIfBalance * (whatIf.days / 30) : 0

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-violet-500" />
          <h1 className="text-xl font-bold text-slate-900">IA & Insights</h1>
        </div>
        <Button onClick={handleGenerate} disabled={loading} variant={generated ? 'outline' : 'default'} size="sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Analisando...' : generated ? 'Atualizar' : 'Gerar insights'}
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-3 text-white">
          <p className="text-xs text-white/80">Receitas</p>
          <p className="text-sm font-bold mt-0.5">{formatCurrency(income)}</p>
        </div>
        <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-3 text-white">
          <p className="text-xs text-white/80">Despesas</p>
          <p className="text-sm font-bold mt-0.5">{formatCurrency(expenses)}</p>
        </div>
        <div className={`bg-gradient-to-br rounded-2xl p-3 text-white ${savingRate >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-red-600'}`}>
          <p className="text-xs text-white/80">Poupança</p>
          <p className="text-sm font-bold mt-0.5">{savingRate.toFixed(0)}%</p>
        </div>
      </div>

      {/* Insights list */}
      <div className="flex flex-col gap-3 mb-6">
        {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
        {!generated && insights.length < 3 && (
          <div className="text-center py-6 bg-violet-50 rounded-2xl border border-violet-100">
            <Sparkles size={24} className="text-violet-400 mx-auto mb-2" />
            <p className="text-sm text-violet-600 font-medium">Clique em "Gerar insights" para análise avançada</p>
            <p className="text-xs text-violet-400 mt-1">A IA irá analisar seus padrões e gerar recomendações personalizadas</p>
          </div>
        )}
      </div>

      {/* What-If simulator */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target size={16} className="text-blue-500" />
            <CardTitle className="text-blue-600">Simulador What-If</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-xs text-slate-500 mb-4">Simule cenários financeiros e veja o impacto no seu saldo.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">+ Receita extra (R$)</label>
              <input type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={whatIf.income} onChange={(e) => setWhatIf((w) => ({ ...w, income: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">− Reduzir despesas (R$)</label>
              <input type="number" min="0" className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" value={whatIf.expense} onChange={(e) => setWhatIf((w) => ({ ...w, expense: parseFloat(e.target.value) || 0 }))} />
            </div>
            <div>
              <label className="text-xs text-slate-500 font-medium block mb-1">Período</label>
              <select className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" value={whatIf.days} onChange={(e) => setWhatIf((w) => ({ ...w, days: parseInt(e.target.value) }))}>
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-violet-50 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">Saldo projetado em {whatIf.days} dias:</p>
            <p className={`text-2xl font-bold ${projectedSaving >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {formatCurrency(projectedSaving)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Economia mensal simulada: {formatCurrency(whatIfBalance)} · Saldo adicional: {formatCurrency(projectedSaving - (income - expenses) * (whatIf.days / 30))}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
