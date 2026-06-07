'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Badge, StatCard, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { fmtDate, fmt } from '@/lib/utils'
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet } from 'lucide-react'

const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

const TYPES = [
  { value: 'income',  label: 'Entrée' },
  { value: 'expense', label: 'Sortie' },
]

const CATEGORIES = [
  { value: 'encaissement', label: 'Encaissement client' },
  { value: 'salaire',      label: 'Salaire employé' },
  { value: 'charge',       label: 'Charge' },
  { value: 'capital',      label: 'Capital / Apport' },
]

function CashForm({ countries, onClose, onSaved }: {
  countries: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({
    countryId: '', type: 'income', category: 'encaissement',
    amount: '', date: today, description: '', reference: '',
  })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const sym = countries.find(c => String(c.id) === f.countryId)?.symbol ?? ''

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
    <Modal title="Nouvelle opération de caisse" onClose={onClose} size="md">
      <div className="space-y-3">
        <Field label="Pays *" value={f.countryId} onChange={u('countryId')}
          options={[{ value: '', label: 'Sélectionner un pays...' }, ...countries.map(c => ({ value: String(c.id), label: c.name }))]} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" value={f.type} onChange={u('type')} options={TYPES} />
          <Field label="Catégorie" value={f.category} onChange={u('category')} options={CATEGORIES} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant *" type="number" value={f.amount} onChange={u('amount')} suffix={sym} />
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
  const { showToast, showConfirm, adminCountryFilter } = useAppStore()
  const qc = useQueryClient()
  const [typeF, setTypeF] = useState('all')
  const [creating, setCreating] = useState(false)
  const countryQ = adminCountryFilter !== 'all' ? '?countryId=' + adminCountryFilter : ''

  const { data, isLoading } = useQuery({
    queryKey: ['cash', adminCountryFilter],
    queryFn: () => fetch(`${B}/api/cash${countryQ}`).then(r => r.json()),
  })
  const { data: countriesData } = useQuery({
    queryKey: ['countries-list'],
    queryFn: () => fetch(`${B}/api/countries`).then(r => r.json()),
  })
  const countries = countriesData?.data ?? []

  const all: any[] = data?.data ?? []
  const entries = all.filter(e => typeF === 'all' || e.type === typeF)
  const refresh = () => qc.refetchQueries({ queryKey: ['cash'] })

  const totalIncome  = all.filter(e => e.type === 'income') .reduce((s, e) => s + (e.amount * (e.country?.exchangeToEur ?? 1)), 0)
  const totalExpense = all.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount * (e.country?.exchangeToEur ?? 1)), 0)
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
        subtitle={`Solde consolidé : ${fmt(balance, '€')}`}
        actions={<Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>Nouvelle opération</Btn>}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Entrées"  value={fmt(totalIncome,  '€')} color="#10B981" icon={<TrendingUp size={16} />} />
        <StatCard label="Sorties"  value={fmt(totalExpense, '€')} color="#EF4444" icon={<TrendingDown size={16} />} />
        <StatCard label="Solde"    value={fmt(balance,      '€')} color={balance >= 0 ? '#0D9488' : '#EF4444'} icon={<Wallet size={16} />} />
      </div>

      <div className="flex gap-2">
        <FilterSelect value={typeF} onChange={setTypeF} options={[
          { value: 'all',     label: 'Toutes opérations' },
          { value: 'income',  label: 'Entrées' },
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
                {[
                  { h: 'Date',        cls: '' },
                  { h: 'Type',        cls: '' },
                  { h: 'Catégorie',   cls: '' },
                  { h: 'Description', cls: '' },
                  { h: 'Montant',     cls: 'text-right' },
                  { h: 'Référence',   cls: '' },
                  { h: '',            cls: '' },
                ].map(({ h, cls }) => (
                  <th key={h} className={`px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide ${cls}`}>{h}</th>
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
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {CATEGORIES.find(c => c.value === e.category)?.label ?? e.category ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{e.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-bold"
                    style={{ color: e.type === 'income' ? '#10B981' : '#EF4444' }}>
                    {e.type === 'income' ? '+' : '−'}{fmt(e.amount, e.country?.symbol ?? '')}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{e.reference ?? '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(e)}
                      className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <CashForm
          countries={countries}
          onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Opération enregistrée'); setCreating(false) }}
        />
      )}
    </div>
  )
}
