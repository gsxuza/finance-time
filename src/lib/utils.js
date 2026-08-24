import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
  }).format(value ?? 0)
}

export function formatDate(date) {
  if (!date) return ''
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return String(date).slice(0, 10)
    return new Intl.DateTimeFormat('pt-BR').format(d)
  } catch {
    return String(date).slice(0, 10)
  }
}

export function formatDateShort(date) {
  if (!date) return ''
  try {
    const d = new Date(date)
    if (isNaN(d.getTime())) return String(date).slice(0, 10)
    return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(d)
  } catch {
    return String(date).slice(0, 10)
  }
}

export function generateId() {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

export function generateLinkCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase()
}

export function calcInterest(amount, ratePercent, daysLate) {
  if (daysLate <= 0) return amount
  return amount + amount * (ratePercent / 100) * daysLate
}

export function getDaysLate(dueDate) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)
  const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24))
  return diff > 0 ? diff : 0
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export const CATEGORY_ICONS = {
  Alimentação: '🍽️',
  Transporte: '🚗',
  Moradia: '🏠',
  Saúde: '💊',
  Educação: '📚',
  Lazer: '🎮',
  Roupas: '👕',
  Tecnologia: '💻',
  Viagem: '✈️',
  Restaurante: '🍕',
  Supermercado: '🛒',
  Beleza: '💄',
  Outros: '📦',
  Salário: '💰',
  Freelance: '💼',
  Investimentos: '📈',
  'Outros Rendimentos': '💵',
}

export const DEFAULT_CATEGORIES = [
  { id: 'cat-1', name: 'Alimentação', type: 'expense', icon: '🍽️', color: '#f97316', is_default: true },
  { id: 'cat-2', name: 'Transporte', type: 'expense', icon: '🚗', color: '#06b6d4', is_default: true },
  { id: 'cat-3', name: 'Moradia', type: 'expense', icon: '🏠', color: '#8b5cf6', is_default: true },
  { id: 'cat-4', name: 'Saúde', type: 'expense', icon: '💊', color: '#ec4899', is_default: true },
  { id: 'cat-5', name: 'Educação', type: 'expense', icon: '📚', color: '#3b82f6', is_default: true },
  { id: 'cat-6', name: 'Lazer', type: 'expense', icon: '🎮', color: '#10b981', is_default: true },
  { id: 'cat-7', name: 'Roupas', type: 'expense', icon: '👕', color: '#f43f5e', is_default: true },
  { id: 'cat-8', name: 'Tecnologia', type: 'expense', icon: '💻', color: '#6366f1', is_default: true },
  { id: 'cat-9', name: 'Viagem', type: 'expense', icon: '✈️', color: '#0ea5e9', is_default: true },
  { id: 'cat-10', name: 'Restaurante', type: 'expense', icon: '🍕', color: '#f59e0b', is_default: true },
  { id: 'cat-11', name: 'Supermercado', type: 'expense', icon: '🛒', color: '#84cc16', is_default: true },
  { id: 'cat-12', name: 'Beleza', type: 'expense', icon: '💄', color: '#d946ef', is_default: true },
  { id: 'cat-13', name: 'Outros', type: 'expense', icon: '📦', color: '#94a3b8', is_default: true },
  { id: 'cat-14', name: 'Salário', type: 'income', icon: '💰', color: '#10b981', is_default: true },
  { id: 'cat-15', name: 'Freelance', type: 'income', icon: '💼', color: '#3b82f6', is_default: true },
  { id: 'cat-16', name: 'Investimentos', type: 'income', icon: '📈', color: '#8b5cf6', is_default: true },
  { id: 'cat-17', name: 'Outros Rendimentos', type: 'income', icon: '💵', color: '#06b6d4', is_default: true },
]

export const ACCOUNT_TYPE_LABELS = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  cash: 'Dinheiro',
  investment: 'Investimento',
}

export const ACCOUNT_TYPE_ICONS = {
  checking: '🏦',
  savings: '🐷',
  credit_card: '💳',
  cash: '💵',
  investment: '📈',
}

export const BANKS = [
  { code: 'nubank', name: 'Nubank', color: '#820ad1', icon: '💜' },
  { code: 'inter', name: 'Banco Inter', color: '#ff7a00', icon: '🧡' },
  { code: 'itau', name: 'Itaú', color: '#003d7a', icon: '🔵' },
  { code: 'bradesco', name: 'Bradesco', color: '#cc0000', icon: '🔴' },
  { code: 'santander', name: 'Santander', color: '#ec0000', icon: '🔴' },
  { code: 'caixa', name: 'Caixa', color: '#005ca9', icon: '🔵' },
  { code: 'bb', name: 'Banco do Brasil', color: '#f8c300', icon: '🟡' },
  { code: 'c6', name: 'C6 Bank', color: '#242424', icon: '⚫' },
  { code: 'pagbank', name: 'PagBank', color: '#00b33c', icon: '🟢' },
  { code: 'neon', name: 'Neon', color: '#00e5b4', icon: '🩵' },
  { code: 'btg', name: 'BTG Pactual', color: '#003366', icon: '🔷' },
  { code: 'xp', name: 'XP Investimentos', color: '#000000', icon: '⬛' },
]
