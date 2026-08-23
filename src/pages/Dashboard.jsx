import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrendingUp, TrendingDown, Plus, ArrowUpRight, ArrowDownRight, Sparkles, Wallet } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, formatDateShort, DEFAULT_CATEGORIES } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'

function StatCard({ label, value, delta, icon: Icon, color, bg }) {
  const isPositive = delta >= 0
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{formatCurrency(value)}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
            <Icon size={18} className={color} />
          </div>
        </div>
        {delta !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {isPositive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            <span>{Math.abs(delta).toFixed(1)}% vs mês anterior</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#84cc16']

export default function Dashboard() {
  const navigate = useNavigate()
  const { transactions, accounts, getTotalBalance, getMonthlyIncome, getMonthlyExpenses } = useStore()

  const totalBalance = getTotalBalance()
  const monthlyIncome = getMonthlyIncome()
  const monthlyExpenses = getMonthlyExpenses()
  const monthlySaving = monthlyIncome - monthlyExpenses

  // Chart: last 6 months balance evolution
  const areaData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), 5 - i)
      const monthStr = format(month, 'yyyy-MM')
      const income = transactions.filter((t) => t.type === 'income' && t.date?.startsWith(monthStr)).reduce((s, t) => s + t.amount, 0)
      const expense = transactions.filter((t) => t.type === 'expense' && t.date?.startsWith(monthStr)).reduce((s, t) => s + t.amount, 0)
      return {
        name: format(month, 'MMM', { locale: ptBR }),
        Receitas: income,
        Despesas: expense,
        Saldo: income - expense,
      }
    })
  }, [transactions])

  // Chart: expenses by category
  const donutData = useMemo(() => {
    const today = new Date()
    const monthStr = format(today, 'yyyy-MM')
    const grouped = {}
    transactions.filter((t) => t.type === 'expense' && t.date?.startsWith(monthStr)).forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount
    })
    return Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }, [transactions])

  const recentTransactions = useMemo(() =>
    [...transactions].sort((a, b) => b.date?.localeCompare(a.date)).slice(0, 6),
    [transactions]
  )

  const totalAccounts = accounts.filter((a) => a.is_active).length

  return (
    <div className="p-4 lg:p-6 max-w-7xl mx-auto">
      {/* Hero balance card */}
      <div className="gradient-primary rounded-3xl p-6 mb-5 text-white relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full" />
        <div className="absolute -right-2 bottom-2 w-20 h-20 bg-white/5 rounded-full" />
        <p className="text-sm font-medium text-white/80 mb-1">Saldo Total</p>
        <p className="text-4xl font-bold mb-1">{formatCurrency(totalBalance)}</p>
        <p className="text-sm text-white/70">{totalAccounts} conta{totalAccounts !== 1 ? 's' : ''} ativa{totalAccounts !== 1 ? 's' : ''}</p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => navigate('/transactions')} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer">
            <Plus size={14} /> Nova Transação
          </button>
          <button onClick={() => navigate('/reports')} className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer">
            <ArrowUpRight size={14} /> Ver Relatórios
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <StatCard label="Receitas do Mês" value={monthlyIncome} icon={TrendingUp} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard label="Despesas do Mês" value={monthlyExpenses} icon={TrendingDown} color="text-rose-500" bg="bg-rose-50" />
        <StatCard label="Economia do Mês" value={monthlySaving} icon={Wallet} color={monthlySaving >= 0 ? 'text-blue-600' : 'text-red-500'} bg="bg-blue-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Area chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução dos Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={areaData} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 12 }} />
                <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="Despesas" stroke="#f43f5e" strokeWidth={2} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Donut chart */}
        <Card>
          <CardHeader>
            <CardTitle>Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {donutData.length > 0 ? (
              <div className="flex items-center gap-4">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                      {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 flex-1">
                  {donutData.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs text-slate-600 truncate max-w-[90px]">{d.name}</span>
                      </div>
                      <span className="text-xs font-medium text-slate-700">{formatCurrency(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-36 text-sm text-slate-400">
                Sem despesas este mês
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions + AI insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Transações Recentes</CardTitle>
              <button onClick={() => navigate('/transactions')} className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer font-medium">Ver todas</button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col divide-y divide-slate-50">
              {recentTransactions.length === 0 && <p className="text-sm text-slate-400 py-6 text-center">Nenhuma transação registrada</p>}
              {recentTransactions.map((tx) => {
                const cat = DEFAULT_CATEGORIES.find((c) => c.name === tx.category)
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center text-lg shrink-0">
                      {cat?.icon || '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{tx.description}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant={tx.type === 'income' ? 'income' : 'expense'}>{tx.category}</Badge>
                        <span className="text-xs text-slate-400">{formatDateShort(tx.date)}</span>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Insight card */}
        <Card className="border-t-4 border-t-violet-400">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-violet-500" />
              <CardTitle className="text-violet-600">IA & Insights</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col gap-3">
              <div className="bg-violet-50 rounded-xl p-3">
                <p className="text-xs text-violet-800 leading-relaxed">
                  💡 Seus gastos com <strong>Restaurante</strong> representam {donutData.find(d => d.name === 'Restaurante') ? ((donutData.find(d => d.name === 'Restaurante').value / monthlyExpenses * 100).toFixed(0)) : 0}% das despesas do mês. Considere cozinhar mais em casa para economizar.
                </p>
              </div>
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-800 leading-relaxed">
                  📈 Sua taxa de poupança este mês é de {monthlyIncome > 0 ? ((monthlySaving / monthlyIncome) * 100).toFixed(0) : 0}%. {monthlySaving >= 0 ? 'Ótimo trabalho!' : 'Atenção: despesas superaram receitas.'}
                </p>
              </div>
              <button onClick={() => navigate('/ai-insights')} className="text-xs text-violet-600 font-medium hover:text-violet-800 cursor-pointer transition-colors flex items-center gap-1">
                Ver todos os insights <ArrowUpRight size={12} />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
