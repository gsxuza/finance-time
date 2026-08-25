import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Activity, Lightbulb } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { computeHealthScore, getImprovementTips } from '@/lib/healthScore'
import { cn } from '@/lib/utils'

const stagger = { animate: { transition: { staggerChildren: 0.06 } } }
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { ease: [0.16, 1, 0.3, 1], duration: 0.4 } },
}

function CircleGauge({ score, grade, gradeLabel, gradeColor }) {
  const radius = 72
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - score / 100)

  return (
    <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
      <svg width="180" height="180" className="-rotate-90">
        {/* Track */}
        <circle cx="90" cy="90" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="10" />
        {/* Progress */}
        <motion.circle
          cx="90" cy="90" r={radius}
          fill="none"
          stroke={gradeColor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: dashOffset }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 1.2, delay: 0.2 }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.5, delay: 0.4 }}
          className="text-5xl font-bold tabular-nums"
          style={{ color: gradeColor }}
        >
          {grade}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-2xs text-fg-muted mt-0.5"
        >
          {gradeLabel}
        </motion.span>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-lg font-bold tabular-nums text-fg mt-1"
        >
          {score}
          <span className="text-xs text-fg-muted font-normal">/100</span>
        </motion.span>
      </div>
    </div>
  )
}

function DimensionBar({ dimension, index }) {
  const pct = dimension.max > 0 ? (dimension.score / dimension.max) * 100 : 0
  const barColor = pct >= 80 ? '#4ade80' : pct >= 50 ? '#60a5fa' : pct >= 30 ? '#fbbf24' : '#f87171'

  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col gap-2 py-4 border-b border-border-subtle last:border-0"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{dimension.icon}</span>
          <div>
            <p className="text-sm font-medium text-fg">{dimension.label}</p>
            <p className="text-2xs text-fg-muted leading-relaxed max-w-xs">{dimension.note}</p>
          </div>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="text-sm font-bold tabular-nums" style={{ color: barColor }}>{dimension.score}</p>
          <p className="text-2xs text-fg-muted">/{dimension.max}</p>
        </div>
      </div>
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ background: barColor }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ ease: [0.16, 1, 0.3, 1], duration: 0.7, delay: 0.1 + index * 0.08 }}
        />
      </div>
    </motion.div>
  )
}

export default function HealthScore() {
  const transactions = useStore((s) => s.transactions)
  const accounts = useStore((s) => s.accounts)
  const budgets = useStore((s) => s.budgets)
  const goals = useStore((s) => s.goals)
  const recurringItems = useStore((s) => s.recurringItems)

  const scoreData = useMemo(
    () => computeHealthScore({ transactions, accounts, budgets: budgets || [], goals: goals || [], recurringItems: recurringItems || [] }),
    [transactions, accounts, budgets, goals, recurringItems]
  )

  const tips = useMemo(() => getImprovementTips(scoreData), [scoreData])

  return (
    <div className="p-5 lg:p-7 max-w-3xl mx-auto">
      <div className="flex items-center gap-2.5 mb-6">
        <Activity size={18} className="text-fg-secondary" />
        <h1 className="text-lg font-semibold text-fg">Score de Saúde Financeira</h1>
      </div>

      <motion.div variants={stagger} initial="initial" animate="animate" className="flex flex-col gap-4">

        {/* Hero gauge */}
        <motion.div variants={fadeUp} className="bg-bg-surface rounded-card ring-1 ring-border p-6 lg:p-8 flex flex-col sm:flex-row items-center gap-6">
          <CircleGauge
            score={scoreData.total}
            grade={scoreData.grade}
            gradeLabel={scoreData.gradeLabel}
            gradeColor={scoreData.gradeColor}
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-fg mb-1">
              Sua saúde financeira:{' '}
              <span style={{ color: scoreData.gradeColor }}>{scoreData.gradeLabel}</span>
            </p>
            <p className="text-xs text-fg-muted leading-relaxed mb-4">
              Seu score é calculado com base em 5 dimensões: taxa de poupança, controle de orçamentos, saúde do balanço, planejamento e fluxo mensal.
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {['A', 'B', 'C', 'D', 'F'].map((g) => {
                const colors = { A: '#4ade80', B: '#60a5fa', C: '#fbbf24', D: '#fb923c', F: '#f87171' }
                const labels = { A: '85+', B: '70–84', C: '55–69', D: '40–54', F: '<40' }
                const isActive = scoreData.grade === g
                return (
                  <div key={g} className={cn('flex items-center gap-2 px-2.5 py-1.5 rounded-btn', isActive ? 'bg-bg-elevated ring-1 ring-border' : '')}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[g] }} />
                    <span className={cn('text-xs', isActive ? 'text-fg font-semibold' : 'text-fg-muted')}>{g}: {labels[g]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        {/* Dimensions */}
        <motion.div variants={fadeUp} className="bg-bg-surface rounded-card ring-1 ring-border p-5">
          <p className="text-xs font-semibold text-fg mb-1">Detalhes por Dimensão</p>
          <motion.div variants={stagger} initial="initial" animate="animate">
            {scoreData.dimensions.map((dim, i) => (
              <DimensionBar key={dim.key} dimension={dim} index={i} />
            ))}
          </motion.div>
        </motion.div>

        {/* Tips */}
        {tips.length > 0 && (
          <motion.div variants={fadeUp} className="bg-bg-surface rounded-card ring-1 ring-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb size={13} className="text-warning" />
              <p className="text-xs font-semibold text-fg">Como melhorar seu score</p>
            </div>
            <div className="flex flex-col gap-3">
              {tips.map((tip, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex items-start gap-3 bg-bg-elevated rounded-btn p-3 ring-1 ring-border"
                >
                  <span className="text-lg shrink-0 mt-0.5">{tip.icon}</span>
                  <p className="text-xs text-fg-secondary leading-relaxed">{tip.text}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

      </motion.div>
    </div>
  )
}
