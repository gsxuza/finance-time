import { useMemo, useState } from 'react'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { FileDown, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, countsAsFlow, DEFAULT_CATEGORIES } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

const CHART_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e', '#84cc16']

export default function Reports() {
  const { transactions } = useStore()
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  const months = Array.from({ length: 12 }, (_, i) => {
    const m = subMonths(new Date(), i)
    return { value: format(m, 'yyyy-MM'), label: format(m, 'MMMM yyyy', { locale: ptBR }) }
  })

  const monthlyData = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(new Date(), 5 - i)
      const ms = format(m, 'yyyy-MM')
      const income = transactions.filter((t) => t.type === 'income' && countsAsFlow(t) && t.date?.startsWith(ms)).reduce((s, t) => s + (t.amount || 0), 0)
      const expenses = transactions.filter((t) => t.type === 'expense' && countsAsFlow(t) && t.date?.startsWith(ms)).reduce((s, t) => s + (t.amount || 0), 0)
      return { name: format(m, 'MMM', { locale: ptBR }), Receitas: income, Despesas: expenses }
    }),
    [transactions]
  )

  const selectedData = useMemo(() => {
    const txs = transactions.filter((t) => t.date?.startsWith(selectedMonth))
    const income = txs.filter((t) => t.type === 'income' && countsAsFlow(t)).reduce((s, t) => s + (t.amount || 0), 0)
    const expenses = txs.filter((t) => t.type === 'expense' && countsAsFlow(t)).reduce((s, t) => s + (t.amount || 0), 0)

    const catMap = {}
    txs.filter((t) => t.type === 'expense' && countsAsFlow(t)).forEach((t) => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount
    })
    const byCategory = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))

    return { income, expenses, balance: income - expenses, byCategory, txs }
  }, [transactions, selectedMonth])

  const handleExport = () => window.print()

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto print:p-0">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-lg font-semibold text-fg">Relatórios</h1>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-btn bg-bg-elevated ring-1 ring-border text-sm text-fg focus:outline-none cursor-pointer"
          >
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <FileDown size={14} /> Exportar
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-bg-surface ring-1 ring-border rounded-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={13} className="text-success" />
            <p className="text-2xs font-medium text-fg-muted">Receitas</p>
          </div>
          <p className="text-xl font-bold text-success tabular-nums">{formatCurrency(selectedData.income)}</p>
        </div>
        <div className="bg-bg-surface ring-1 ring-border rounded-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={13} className="text-danger" />
            <p className="text-2xs font-medium text-fg-muted">Despesas</p>
          </div>
          <p className="text-xl font-bold text-danger tabular-nums">{formatCurrency(selectedData.expenses)}</p>
        </div>
        <div className="bg-bg-surface ring-1 ring-border rounded-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={13} className={selectedData.balance >= 0 ? 'text-success' : 'text-danger'} />
            <p className="text-2xs font-medium text-fg-muted">Saldo</p>
          </div>
          <p className={`text-xl font-bold tabular-nums ${selectedData.balance >= 0 ? 'text-success' : 'text-danger'}`}>{formatCurrency(selectedData.balance)}</p>
        </div>
      </div>

      {/* Bar chart */}
      <Card className="mb-5">
        <CardHeader><CardTitle>Receitas vs Despesas (últimos 6 meses)</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData} barGap={4}>
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#555555' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ borderRadius: 8, border: '1px solid #222', background: '#161616', fontSize: 12, color: '#f0f0f0' }} />
              <Bar dataKey="Receitas" fill="#4ade80" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Despesas" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Pie chart */}
        <Card>
          <CardHeader><CardTitle>Despesas por Categoria</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {selectedData.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={selectedData.byCategory} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {selectedData.byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-sm text-fg-muted">Sem despesas no período</div>
            )}
          </CardContent>
        </Card>

        {/* Category table */}
        <Card>
          <CardHeader><CardTitle>Por Categoria</CardTitle></CardHeader>
          <CardContent className="pt-0">
            {selectedData.byCategory.length === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">Sem dados</p>
            ) : (
              <div className="flex flex-col divide-y divide-border-subtle">
                {selectedData.byCategory.map((c, i) => {
                  const cat = DEFAULT_CATEGORIES.find((x) => x.name === c.name)
                  const pct = selectedData.expenses > 0 ? (c.value / selectedData.expenses) * 100 : 0
                  return (
                    <div key={c.name} className="flex items-center gap-2 py-2.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-xs text-fg-muted mr-1">{cat?.icon}</span>
                      <span className="text-xs text-fg-secondary flex-1 truncate">{c.name}</span>
                      <span className="text-2xs text-fg-muted">{pct.toFixed(0)}%</span>
                      <span className="text-xs font-semibold text-fg w-24 text-right tabular-nums">{formatCurrency(c.value)}</span>
                    </div>
                  )
                })}
                <div className="flex items-center justify-between pt-2.5">
                  <span className="text-xs font-medium text-fg-secondary">Total despesas</span>
                  <span className="text-sm font-bold text-danger tabular-nums">{formatCurrency(selectedData.expenses)}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transaction list */}
      <Card>
        <CardHeader>
          <CardTitle>Todas as Transações do Mês</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {selectedData.txs.length === 0 ? (
            <p className="text-sm text-fg-muted py-8 text-center">Sem transações no período</p>
          ) : (
            <div className="divide-y divide-border-subtle">
              {[...selectedData.txs].sort((a, b) => b.date.localeCompare(a.date)).map((tx) => {
                const cat = DEFAULT_CATEGORIES.find((c) => c.name === tx.category)
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-2.5">
                    <span className="text-base">{cat?.icon || '📦'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-fg truncate">{tx.description || tx.category}</p>
                      <p className="text-2xs text-fg-muted">{tx.category} · {tx.date}</p>
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
