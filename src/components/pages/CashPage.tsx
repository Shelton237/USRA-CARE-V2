'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Badge, StatCard, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate, fmt } from '@/lib/utils'
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

const CATEGORIES = [
  { value: 'encaissement', label: 'Encaissement client' },
  { value: 'salaire',      label: 'Salaire employé' },
  { value: 'charge',       label: 'Charge' },
  { value: 'capital',      label: 'Capital / Apport' },
]

function CashForm({ countries, onClose, onSaved, userCountryId, isOperator }: {
  countries: any[]; onClose: () => void; onSaved: () => void; userCountryId?: string; isOperator?: boolean
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ countryId: userCountryId ?? '', type: 'income', category: 'encaissement', amount: '', date: today, description: '', reference: '' })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.countryId || !f.amount) { showToast('Pays et montant requis', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/cash`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, amount: Number(f.amount) }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nouvelle opération" onClose={onClose} size="sm">
      <div className="space-y-3">
        <Field label="Pays" value={f.countryId} onChange={u('countryId')} disabled={isOperator} options={[{value:'',label:'Sélectionner...'}, ...countries.map(c=>({value:String(c.id),label:c.name}))]} />
        <div className="flex gap-3">
          {[{v:'income',l:'Entrée'},{v:'expense',l:'Sortie'}].map(opt => (
            <label key={opt.v} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="type" value={opt.v} checked={f.type===opt.v} onChange={() => setF(p=>({...p,type:opt.v}))} />
              <span className="text-sm text-slate-700">{opt.l}</span>
            </label>
          ))}
        </div>
        <Field label="Catégorie" value={f.category} onChange={u('category')} options={CATEGORIES} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant *" type="number" value={f.amount} onChange={u('amount')} />
          <Field label="Date" type="date" value={f.date} onChange={u('date')} />
        </div>
        <Field label="Description" value={f.description} onChange={u('description')} />
        <Field label="Référence" value={f.reference} onChange={u('reference')} />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

export function CashPage() {
  const { showToast, showConfirm } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const isOperator = sessionStatus === 'authenticated' && role === 'operator'
  const [typeF, setTypeF] = useState('all')
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['cash'], queryFn: () => fetch(`${B}/api/cash`).then(r => r.json()) })
  const { data: countriesData } = useQuery({ queryKey: ['countries-list'], queryFn: () => fetch(`${B}/api/countries`).then(r => r.json()) })
  const countries = countriesData?.data ?? []

  const all: any[] = data?.data ?? []
  const entries = all.filter(e => typeF === 'all' || e.type === typeF)
  const refresh = () => qc.refetchQueries({ queryKey: ['cash'] })

  // Admin : consolidé en EUR ; DG + Opérateur : devise locale du pays rattaché
  const useLocal = role !== 'admin'
  const userCountryId = Number((session?.user as any)?.countryId)
  const userCountry = countries.find((c: any) => c.id === userCountryId)
  const countrySym = useLocal ? (userCountry?.symbol ?? all[0]?.country?.symbol ?? '') : '€'
  const totalIncome  = all.filter(e => e.type === 'income').reduce((s, e) => s + (useLocal ? e.amount : e.amount * (e.country?.exchangeToEur ?? 1)), 0)
  const totalExpense = all.filter(e => e.type === 'expense').reduce((s, e) => s + (useLocal ? e.amount : e.amount * (e.country?.exchangeToEur ?? 1)), 0)
  const balance = totalIncome - totalExpense

  const handleDelete = (e: any) => {
    showConfirm({
      title: 'Supprimer cette opération ?',
      message: 'Cette action est irréversible.',
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`${B}/api/cash/${e.id}`, { method: 'DELETE' })
        if (res.ok) { refresh(); showToast('Opération supprimée') }
        else showToast('Erreur', 'error')
      },
    })
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Trésorerie"
        subtitle={`Solde consolidé : ${fmt(balance, countrySym)}`}
        actions={<Btn icon={<Plus size={14}/>} onClick={() => setCreating(true)}>Nouvelle opération</Btn>}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Entrées" value={fmt(totalIncome, countrySym)} color="#10B981" icon={<TrendingUp size={16}/>} />
        <StatCard label="Sorties" value={fmt(totalExpense, countrySym)} color="#EF4444" icon={<TrendingDown size={16}/>} />
        <StatCard label="Solde" value={fmt(balance, countrySym)} color={balance >= 0 ? '#10B981' : '#EF4444'} icon={<Wallet size={16}/>} />
      </div>

      <div className="flex gap-2">
        <FilterSelect value={typeF} onChange={setTypeF} options={[
          { value: 'all', label: 'Toutes opérations' },
          { value: 'income', label: 'Entrées' },
          { value: 'expense', label: 'Sorties' },
        ]} />
      </div>

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : entries.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucune opération</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date','Type','Catégorie','Description','Montant','Référence',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((e: any) => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <Badge color={e.type === 'income' ? '#10B981' : '#EF4444'}>
                      {e.type === 'income' ? 'Entrée' : 'Sortie'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{CATEGORIES.find(c=>c.value===e.category)?.label ?? e.category ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{e.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-bold" style={{ color: e.type === 'income' ? '#10B981' : '#EF4444' }}>
                    {e.type === 'income' ? '+' : '−'}{fmt(e.amount, e.country?.symbol ?? '')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{e.reference ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(e)} className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors"><Trash2 size={13}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <CashForm countries={countries} onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Opération enregistrée'); setCreating(false) }}
          userCountryId={String(session?.user?.countryId ?? '')}
          isOperator={isOperator} />
      )}
    </div>
  )
}
