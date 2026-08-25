import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Sparkles, Plus, ArrowRight } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, formatDateShort, countsAsFlow, DEFAULT_CATEGORIES } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

const CHART_COLORS = ['#60a5fa', '#a78bfa', '#f472b6', '#fbbf24', '#4ade80', '#34d399']

const stagger = {
  animate: { transition: { staggerChildren: 0.06 } },
}
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.4 } },
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-overlay ring-1 ring-border rounded-card px-3 py-2 text-xs shadow-lg">
      <p className="text-fg-secondary mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
          <span className="text-fg-secondary">{p.name}:</span>
          <span className="text-fg font-medium">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { transactions, accounts, getTotalBalance, getMonthlyIncome, getMonthlyExpenses } = useStore()

  const totalBalance = getTotalBalance()
  const monthlyIncome = getMonthlyIncome()
  const monthlyExpenses = getMonthlyExpenses()
  const monthlySaving = monthlyIncome - monthlyExpenses
  const savingRate = monthlyIncome > 0 ? (monthlySaving / monthlyIncome) * 100 : 0
  const totalAccounts = accounts.filter((a) => a.is_active).length

  const areaData = useMemo(() => (
    Array.from({ length: 6 }, (_, i) => {
      const month = subMonths(new Date(), 5 - i)
      const monthStr = format(month, 'yyyy-MM')
      const income = transactions.filter((t) => t.type === 'income' && countsAsFlow(t) && t.date?.startsWith(monthStr)).reduce((s, t) => s + (t.amount || 0), 0)
      const expense = transactions.filter((t) => t.type === 'expense' && countsAsFlow(t) && t.date?.startsWith(monthStr)).reduce((s, t) => s + (t.amount || 0), 0)
      return { name: format(month, 'MMM', { locale: ptBR }), Receitas: income, Despesas: expense }
    })
  ), [transactions])

  const donutData = useMemo(() => {
    const monthStr = format(new Date(), 'yyyy-MM')
    const grouped = {}
    transactions.filter((t) => t.type === 'expense' && countsAsFlow(t) && t.date?.startsWith(monthStr)).forEach((t) => {
      grouped[t.category] = (grouped[t.category] || 0) + t.amount
    })
    return Object.entries(grouped).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))
  }, [transactions])

  const recentTransactions = useMemo(() =>
    [...transactions].filter((t) => t.date).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [transactions]
  )

  return (
    <div className="p-5 lg:p-7 max-w-7xl mx-auto">
      <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col gap-5">

        {/* Balance Hero */}
        <motion.div variants={fadeUp} className="relative overflow-hidden bg-bg-surface rounded-card ring-border p-6 lg:p-8">
          {/* Subtle grid lines */}
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="relative z-10">
            <p className="text-xs font-medium text-fg-muted uppercase tracking-widest mb-3">Patrimônio Total</p>
            <div className="flex items-end gap-4 flex-wrap">
              <h1 className="text-4xl lg:text-5xl font-bold text-fg tracking-tight tabular-nums">
                {formatCurrency(totalBalance)}
              </h1>
              <span className="text-fg-muted text-sm pb-1.5">{totalAccounts} conta{totalAccounts !== 1 ? 's' : ''}</span>
            </div>
            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={() => navigate('/transactions')}
                className="flex items-center gap-1.5 bg-fg text-bg text-xs font-semibold px-3.5 py-2 rounded-btn hover:bg-fg/90 transition-colors cursor-pointer"
              >
                <Plus size={13} />
                Nova Transação
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="flex items-center gap-1.5 bg-bg-elevated text-fg-secondary text-xs font-medium px-3.5 py-2 rounded-btn ring-1 ring-border hover:bg-bg-hover hover:text-fg transition-all cursor-pointer"
              >
                Relatórios
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'Receitas', value: monthlyIncome, type: 'income', Icon: TrendingUp },
            { label: 'Despesas', value: monthlyExpenses, type: 'expense', Icon: TrendingDown },
            { label: 'Economia', value: monthlySaving, type: monthlySaving >= 0 ? 'income' : 'expense', Icon: monthlySaving >= 0 ? ArrowUpRight : ArrowDownRight, sub: `${Math.abs(savingRate).toFixed(0)}% da receita` },
          ].map(({ label, value, type, Icon, sub }) => (
            <div key={label} className="bg-bg-surface rounded-card ring-border p-5">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-fg-muted font-medium">{label}</p>
                <div className={cn('w-7 h-7 rounded-btn flex items-center justify-center', type === 'income' ? 'bg-success-muted' : 'bg-danger-muted')}>
                  <Icon size={14} className={type === 'income' ? 'text-success' : 'text-danger'} />
                </div>
              </div>
              <p className={cn('text-2xl font-bold tabular-nums tracking-tight', type === 'income' ? 'text-success' : 'text-danger')}>
                {formatCurrency(value)}
              </p>
              {sub && <p className="text-2xs text-fg-muted mt-1">{sub}</p>}
            </div>
          ))}
        </motion.div>

        {/* Charts */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Area chart */}
          <Card>
            <CardHeader>
              <CardTitle>Últimos 6 Meses</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={areaData} margin={{ top: 5, right: 0, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f87171" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#f87171" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#555' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="Receitas" stroke="#4ade80" strokeWidth={1.5} fill="url(#gIncome)" />
                  <Area type="monotone" dataKey="Despesas" stroke="#f87171" strokeWidth={1.5} fill="url(#gExpense)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Donut */}
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent className="pt-1">
              {donutData.length > 0 ? (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={130} height={130}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={38} outerRadius={60} paddingAngle={2} dataKey="value" strokeWidth={0}>
                        {donutData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    {donutData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs text-fg-secondary truncate">{d.name}</span>
                        </div>
                        <span className="text-xs font-medium text-fg shrink-0">{formatCurrency(d.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-sm text-fg-muted">
                  Sem despesas este mês
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Transactions + AI */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Recent transactions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Transações Recentes</CardTitle>
                <button onClick={() => navigate('/transactions')} className="text-2xs text-fg-muted hover:text-fg transition-colors font-medium flex items-center gap-1 cursor-pointer">
                  Ver todas <ArrowRight size={11} />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col">
                {recentTransactions.length === 0 && (
                  <p className="text-sm text-fg-muted py-8 text-center">Nenhuma transação registrada</p>
                )}
                {recentTransactions.map((tx, idx) => {
                  const cat = DEFAULT_CATEGORIES.find((c) => c.name === tx.category)
                  const isTransfer = tx.is_transfer
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className={cn(
                        'flex items-center gap-3 py-3',
                        idx < recentTransactions.length - 1 && 'border-b border-border-subtle'
                      )}
                    >
                      <div className="w-8 h-8 rounded-btn bg-bg-elevated flex items-center justify-center text-base shrink-0">
                        {isTransfer ? '↔' : (cat?.icon || '📦')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-fg truncate">{tx.description || 'Sem descrição'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isTransfer
                            ? <Badge variant="default">Transferência</Badge>
                            : <Badge variant={tx.type === 'income' ? 'income' : 'expense'}>{tx.category || 'Outros'}</Badge>
                          }
                          <span className="text-2xs text-fg-muted">{formatDateShort(tx.date)}</span>
                        </div>
                      </div>
                      <span className={cn('text-sm font-semibold tabular-nums shrink-0', tx.type === 'income' ? 'text-success' : isTransfer ? 'text-fg-muted' : 'text-danger')}>
                        {tx.type === 'income' ? '+' : '−'}{formatCurrency(tx.amount)}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* AI Insight */}
          <div className="flex flex-col gap-3">
            <Card className="flex-1">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Sparkles size={13} className="text-violet" />
                  <CardTitle className="text-violet">IA & Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-col gap-2.5">
                  <div className="bg-bg-elevated rounded-btn p-3 ring-1 ring-border">
                    <p className="text-xs text-fg-secondary leading-relaxed">
                      Sua taxa de poupança este mês é de{' '}
                      <span className={savingRate >= 0 ? 'text-success font-medium' : 'text-danger font-medium'}>
                        {Math.abs(savingRate).toFixed(0)}%
                      </span>
                      {'. '}
                      {savingRate >= 20
                        ? 'Excelente disciplina financeira.'
                        : savingRate >= 0
                        ? 'Há espaço para crescer.'
                        : 'Atenção: despesas superam receitas.'}
                    </p>
                  </div>
                  {donutData[0] && (
                    <div className="bg-bg-elevated rounded-btn p-3 ring-1 ring-border">
                      <p className="text-xs text-fg-secondary leading-relaxed">
                        Maior gasto:{' '}
                        <span className="text-fg font-medium">{donutData[0].name}</span>
                        {' '}— {((donutData[0].value / monthlyExpenses) * 100).toFixed(0)}% das despesas.
                      </p>
                    </div>
                  )}
                  <button
                    onClick={() => navigate('/ai-insights')}
                    className="flex items-center justify-between w-full text-xs text-fg-muted hover:text-fg font-medium cursor-pointer transition-colors mt-1"
                  >
                    Conversar com a IA
                    <ArrowRight size={12} />
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
