import { useState, useRef } from 'react'
import { Upload, FileText, Check, AlertCircle, X, Loader2 } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { formatCurrency, DEFAULT_CATEGORIES } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

const FORMATS = [
  { id: 'nubank_card', label: 'Nubank (Cartão)', hint: 'Data, Descrição, Valor' },
  { id: 'nubank_account', label: 'Nubank (Conta)', hint: 'Data, Valor, Identificador, Descrição' },
  { id: 'inter', label: 'Banco Inter', hint: 'Data Lançamento; Histórico; Débito; Crédito' },
  { id: 'itau', label: 'Itaú / Bradesco', hint: 'Data; Histórico; Crédito; Débito' },
  { id: 'generic', label: 'Genérico (auto)', hint: 'Detecta automaticamente' },
]

function autoCategory(description = '') {
  const d = description.toLowerCase()
  if (d.includes('mercado') || d.includes('supermercado') || d.includes('extra') || d.includes('carrefour') || d.includes('atacadão')) return 'Supermercado'
  if (d.includes('restaurante') || d.includes('lanchonete') || d.includes('pizza') || d.includes('burger') || d.includes('mc donald') || d.includes('subway') || d.includes('ifood')) return 'Restaurante'
  if (d.includes('alimenta') || d.includes('padaria') || d.includes('açougue')) return 'Alimentação'
  if (d.includes('uber') || d.includes('99') || d.includes('combustível') || d.includes('gasolina') || d.includes('posto') || d.includes('estacionamento') || d.includes('ônibus') || d.includes('metro') || d.includes('bilhete')) return 'Transporte'
  if (d.includes('aluguel') || d.includes('condomínio') || d.includes('iptu') || d.includes('água') || d.includes('luz') || d.includes('energia') || d.includes('gás')) return 'Moradia'
  if (d.includes('médico') || d.includes('farmácia') || d.includes('drogaria') || d.includes('consulta') || d.includes('hospital') || d.includes('saúde') || d.includes('remédio')) return 'Saúde'
  if (d.includes('netflix') || d.includes('spotify') || d.includes('cinema') || d.includes('teatro') || d.includes('prime video') || d.includes('disney') || d.includes('youtube premium')) return 'Lazer'
  if (d.includes('curso') || d.includes('escola') || d.includes('faculdade') || d.includes('universidade') || d.includes('mensalidade') || d.includes('udemy') || d.includes('alura')) return 'Educação'
  if (d.includes('amazon') || d.includes('shopee') || d.includes('magazine') || d.includes('americanas') || d.includes('roupa') || d.includes('calçado') || d.includes('tênis') || d.includes('camisa')) return 'Roupas'
  if (d.includes('apple') || d.includes('google') || d.includes('samsung') || d.includes('informática') || d.includes('celular') || d.includes('notebook')) return 'Tecnologia'
  if (d.includes('hotel') || d.includes('airbnb') || d.includes('passagem') || d.includes('viagem') || d.includes('latam') || d.includes('gol') || d.includes('azul')) return 'Viagem'
  if (d.includes('salão') || d.includes('barbearia') || d.includes('beleza') || d.includes('estética') || d.includes('manicure') || d.includes('cabelereiro')) return 'Beleza'
  if (d.includes('salário') || d.includes('pagamento') || d.includes('vencimento') || d.includes('proventos')) return 'Salário'
  if (d.includes('freelance') || d.includes('projeto') || d.includes('serviço prestado')) return 'Freelance'
  if (d.includes('dividend') || d.includes('rendimento') || d.includes('cdb') || d.includes('tesouro') || d.includes('investimento')) return 'Investimentos'
  return 'Outros'
}

function parseDateBR(str = '') {
  // dd/MM/yyyy or dd/MM/yy
  const parts = str.trim().split('/')
  if (parts.length === 3) {
    const [d, m, y] = parts
    const year = y.length === 2 ? `20${y}` : y
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return str.trim().slice(0, 10) // assume yyyy-MM-dd
}

function parseAmount(str = '') {
  // Handle Brazilian format: 1.234,56 → 1234.56 or 1234.56
  const cleaned = str.trim().replace(/[R$\s]/g, '')
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // 1.234,56
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  if (cleaned.includes(',')) {
    // 1234,56
    return parseFloat(cleaned.replace(',', '.'))
  }
  return parseFloat(cleaned) || 0
}

function parseCSV(text, format) {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const isInterOrItau = format === 'inter' || format === 'itau'
  const delimiter = isInterOrItau ? ';' : ','

  const splitLine = (line) => {
    // Handle quoted fields
    const result = []
    let current = ''
    let inQuotes = false
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue }
      if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ''; continue }
      current += char
    }
    result.push(current.trim())
    return result
  }

  const rows = lines.slice(1).map(splitLine)

  if (format === 'nubank_card') {
    // Data, Descrição, Valor
    return rows.map((cols) => {
      const amount = parseAmount(cols[2])
      const isExpense = amount < 0 || (amount > 0 && !cols[1]?.toLowerCase().includes('pagamento'))
      return {
        date: parseDateBR(cols[0]),
        description: cols[1]?.replace(/"/g, '').trim() || '',
        amount: Math.abs(amount),
        type: isExpense ? 'expense' : 'income',
        category: isExpense ? autoCategory(cols[1]) : 'Outros Rendimentos',
      }
    }).filter((r) => r.amount > 0 && r.date)
  }

  if (format === 'nubank_account') {
    // Data, Valor, Identificador, Descrição
    return rows.map((cols) => {
      const amount = parseAmount(cols[1])
      return {
        date: parseDateBR(cols[0]),
        description: cols[3]?.replace(/"/g, '').trim() || cols[2]?.trim() || '',
        amount: Math.abs(amount),
        type: amount < 0 ? 'expense' : 'income',
        category: amount < 0 ? autoCategory(cols[3] || cols[2]) : 'Outros Rendimentos',
      }
    }).filter((r) => r.amount > 0 && r.date)
  }

  if (format === 'inter') {
    // Data Lançamento; Histórico; Débito; Crédito
    return rows.map((cols) => {
      const debit = parseAmount(cols[2])
      const credit = parseAmount(cols[3])
      const isExpense = debit > 0
      return {
        date: parseDateBR(cols[0]),
        description: cols[1]?.replace(/"/g, '').trim() || '',
        amount: isExpense ? debit : credit,
        type: isExpense ? 'expense' : 'income',
        category: isExpense ? autoCategory(cols[1]) : 'Outros Rendimentos',
      }
    }).filter((r) => r.amount > 0 && r.date)
  }

  if (format === 'itau') {
    // Data; Histórico; Crédito; Débito; Saldo (or similar)
    return rows.map((cols) => {
      const credit = parseAmount(cols[2])
      const debit = parseAmount(cols[3])
      const isExpense = debit > 0
      return {
        date: parseDateBR(cols[0]),
        description: cols[1]?.replace(/"/g, '').trim() || '',
        amount: isExpense ? debit : credit,
        type: isExpense ? 'expense' : 'income',
        category: isExpense ? autoCategory(cols[1]) : 'Outros Rendimentos',
      }
    }).filter((r) => r.amount > 0 && r.date)
  }

  // Generic: try to detect date, description, amount columns from header
  const header = splitLine(lines[0]).map((h) => h.toLowerCase().replace(/"/g, ''))
  const dateIdx = header.findIndex((h) => h.includes('data') || h.includes('date'))
  const descIdx = header.findIndex((h) => h.includes('descri') || h.includes('histórico') || h.includes('histor') || h.includes('desc'))
  const amtIdx = header.findIndex((h) => h.includes('valor') || h.includes('amount') || h.includes('value'))
  const debitIdx = header.findIndex((h) => h.includes('débit') || h.includes('debit') || h.includes('saída'))
  const creditIdx = header.findIndex((h) => h.includes('crédit') || h.includes('credit') || h.includes('entrada'))

  return rows.map((cols) => {
    let amount = 0
    let type = 'expense'
    if (debitIdx >= 0 || creditIdx >= 0) {
      const debit = debitIdx >= 0 ? parseAmount(cols[debitIdx]) : 0
      const credit = creditIdx >= 0 ? parseAmount(cols[creditIdx]) : 0
      amount = debit > 0 ? debit : credit
      type = debit > 0 ? 'expense' : 'income'
    } else if (amtIdx >= 0) {
      const raw = parseAmount(cols[amtIdx])
      amount = Math.abs(raw)
      type = raw < 0 ? 'expense' : 'income'
    }
    const desc = descIdx >= 0 ? (cols[descIdx] || '').replace(/"/g, '').trim() : ''
    return {
      date: dateIdx >= 0 ? parseDateBR(cols[dateIdx]) : '',
      description: desc,
      amount,
      type,
      category: type === 'expense' ? autoCategory(desc) : 'Outros Rendimentos',
    }
  }).filter((r) => r.amount > 0 && r.date)
}

export function ImportCSVButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload size={14} /> Importar extrato
      </Button>
      <ImportCSVModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function ImportCSVModal({ open, onClose }) {
  const { accounts, addTransaction } = useStore()
  const [format, setFormat] = useState('nubank_card')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [done, setDone] = useState(false)
  const fileRef = useRef(null)

  const handlePDF = (file) => {
    setParsing(true)
    setError('')
    setRows(null)
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const base64 = e.target.result.split(',')[1]
        const res = await fetch('/api/ai/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pdfBase64: base64 }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao processar PDF')
        const withCategories = (data.transactions || []).map((t) => ({
          ...t,
          category: t.type === 'income' ? 'Outros Rendimentos' : autoCategory(t.description),
        }))
        if (withCategories.length === 0) {
          setError('Nenhuma transação encontrada no PDF.')
          return
        }
        setRows(withCategories)
      } catch (err) {
        setError(err.message)
      } finally {
        setParsing(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCSV = (file) => {
    setError('')
    setRows(null)
    setDone(false)
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result, format)
        if (parsed.length === 0) {
          setError('Nenhuma transação encontrada. Verifique o formato selecionado.')
          return
        }
        setRows(parsed)
      } catch (err) {
        setError('Erro ao ler o arquivo: ' + err.message)
      }
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleFile = (file) => {
    if (!file) return
    setDone(false)
    if (file.name.endsWith('.pdf')) handlePDF(file)
    else handleCSV(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleImport = () => {
    if (!rows?.length) return
    setImporting(true)
    rows.forEach((r) => {
      addTransaction({ ...r, account_id: accountId })
    })
    setTimeout(() => { setImporting(false); setDone(true) }, 500)
  }

  const handleClose = () => {
    setRows(null); setError(''); setDone(false); setImporting(false)
    onClose()
  }

  const expenseCount = rows?.filter((r) => r.type === 'expense').length || 0
  const incomeCount = rows?.filter((r) => r.type === 'income').length || 0

  return (
    <Modal open={open} onClose={handleClose} title="Importar Extrato (CSV ou PDF)">
      {done ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check size={28} className="text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-slate-800">{rows.length} transações importadas!</p>
          <p className="text-sm text-slate-400 mt-1">Elas já aparecem na sua lista de transações.</p>
          <Button className="mt-6" onClick={handleClose}>Concluir</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Format selector */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Formato do banco</label>
            <div className="grid grid-cols-1 gap-1.5">
              {FORMATS.map((f) => (
                <label key={f.id} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${format === f.id ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input type="radio" name="format" value={f.id} checked={format === f.id} onChange={() => { setFormat(f.id); setRows(null); setError('') }} className="accent-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{f.label}</p>
                    <p className="text-xs text-slate-400">{f.hint}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Account selector */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1.5 block">Conta destino</label>
            {accounts.filter((a) => a.is_active).length === 0 ? (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">Você precisa criar uma conta em <strong>Contas</strong> antes de importar transações.</p>
              </div>
            ) : (
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                {accounts.filter((a) => a.is_active).map((a) => (
                  <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* File drop zone */}
          {!rows && !parsing && (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <Upload size={24} className="text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-600">Arraste o arquivo ou clique para selecionar</p>
              <p className="text-xs text-slate-400 mt-1">Aceita <strong>.csv</strong> e <strong>.pdf</strong> · PDF é processado com IA automaticamente</p>
              <input ref={fileRef} type="file" accept=".csv,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
            </div>
          )}

          {parsing && (
            <div className="border-2 border-dashed border-violet-200 rounded-2xl p-8 text-center bg-violet-50">
              <Loader2 size={24} className="text-violet-400 mx-auto mb-2 animate-spin" />
              <p className="text-sm font-medium text-violet-700">Analisando PDF com IA...</p>
              <p className="text-xs text-violet-400 mt-1">Isso pode levar alguns segundos</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          {/* Preview */}
          {rows && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText size={14} className="text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">{rows.length} transações detectadas</p>
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{incomeCount} receitas</span>
                  <span className="text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{expenseCount} despesas</span>
                </div>
                <button onClick={() => { setRows(null); setError('') }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X size={16} />
                </button>
              </div>
              <div className="border border-slate-100 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Data</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Descrição</th>
                      <th className="text-left px-3 py-2 text-slate-500 font-medium">Categoria</th>
                      <th className="text-right px-3 py-2 text-slate-500 font-medium">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{r.date}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-[160px] truncate">{r.description || '—'}</td>
                        <td className="px-3 py-2 text-slate-500">{r.category}</td>
                        <td className={`px-3 py-2 text-right font-medium whitespace-nowrap ${r.type === 'income' ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {r.type === 'income' ? '+' : '-'}{formatCurrency(r.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => { setRows(null); setError('') }}>
                Trocar arquivo
              </Button>
              <Button className="flex-1" onClick={handleImport} disabled={importing || !accountId}>
                {importing ? <Loader2 size={14} className="animate-spin" /> : null}
                {importing ? 'Importando...' : `Importar ${rows.length} transações`}
              </Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
