'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Badge } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { fmtDate, fmt } from '@/lib/utils'
import { Plus } from 'lucide-react'

const METHODS = [
  { value: 'mobile_money',    label: 'Mobile Money' },
  { value: 'bank_transfer',   label: 'Virement bancaire' },
  { value: 'cash',            label: 'Espèces' },
  { value: 'cheque',          label: 'Chèque' },
]
const METHOD_COLORS: Record<string,string> = {
  mobile_money: '#0D9488', bank_transfer: '#3B82F6', cash: '#10B981', cheque: '#7C3AED',
}

function PaymentForm({ invoices, onClose, onSaved }: {
  invoices: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ invoiceId: '', amount: '', date: today, paymentMethod: 'mobile_money', reference: '', notes: '' })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const selectedInv = invoices.find(i => String(i.id) === f.invoiceId)

  const save = async () => {
    if (!f.invoiceId || !f.amount || !f.paymentMethod) { showToast('Champs requis manquants', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, amount: Number(f.amount) }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Enregistrer un paiement" onClose={onClose} size="sm">
      <div className="space-y-3">
        <Field label="Facture à régler *" value={f.invoiceId} onChange={u('invoiceId')} options={[
          { value: '', label: 'Sélectionner une facture...' },
          ...invoices.map(i => ({ value: String(i.id), label: `${i.reference} — ${i.client?.name} (${fmt(i.total, i.country?.symbol ?? '')})` })),
        ]} />
        {selectedInv && (
          <div className="p-2.5 rounded-lg bg-teal-50 border border-teal-100 text-xs text-teal-700">
            Reste à payer : <strong>{fmt(selectedInv.total, selectedInv.country?.symbol ?? '')}</strong>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant *" type="number" value={f.amount} onChange={u('amount')} />
          <Field label="Date *" type="date" value={f.date} onChange={u('date')} />
        </div>
        <Field label="Méthode *" value={f.paymentMethod} onChange={u('paymentMethod')} options={METHODS} />
        <Field label="Référence (n° transaction)" value={f.reference} onChange={u('reference')} />
        <Field label="Notes" value={f.notes} onChange={u('notes')} textarea />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

export function PaymentsPage() {
  const { showToast } = useAppStore()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => fetch(`${B}/api/payments`).then(r => r.json()) })
  const { data: invData } = useQuery({
    queryKey: ['invoices-pending'],
    queryFn: () => fetch(`${B}/api/invoices?status=sent,partially_paid`).then(r => r.json()),
  })

  const payments: any[] = data?.data ?? []
  const invoices: any[] = (invData?.data ?? []).filter((i: any) => ['sent','partially_paid'].includes(i.status))
  const refresh = () => qc.refetchQueries({ queryKey: ['payments'] })

  const total = payments.reduce((s, p) => s + (p.amount ?? 0), 0)

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Paiements reçus"
        subtitle={`${payments.length} paiement(s)`}
        actions={<Btn icon={<Plus size={14}/>} onClick={() => setCreating(true)}>Enregistrer paiement</Btn>}
      />

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucun paiement enregistré</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date','Facture','Client','Montant','Méthode','Référence'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 text-xs">{fmtDate(p.date)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-teal-700">{p.invoice?.reference ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-700">{p.invoice?.client?.companyName ?? p.invoice?.client?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-right">{fmt(p.amount, p.invoice?.country?.symbol ?? '')}</td>
                  <td className="px-4 py-3">
                    <Badge color={METHOD_COLORS[p.paymentMethod] ?? '#94A3B8'}>
                      {METHODS.find(m => m.value === p.paymentMethod)?.label ?? p.paymentMethod}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{p.reference ?? '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-slate-500">Total</td>
                <td className="px-4 py-2 font-bold text-slate-800 text-right">{fmt(total, '€')}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </Card>

      {creating && (
        <PaymentForm invoices={invoices} onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Paiement enregistré'); setCreating(false) }} />
      )}
    </div>
  )
}
