'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Table } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { fmtDate, fmt } from '@/lib/utils'
import { Plus } from 'lucide-react'

const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

const METHODS = [
  { value: 'mobile_money',  label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Virement bancaire' },
  { value: 'cash',          label: 'Espèces' },
  { value: 'cheque',        label: 'Chèque' },
]

function methodLabel(paymentMethod: string, mobileProvider?: string | null) {
  if (paymentMethod === 'mobile_money') return mobileProvider ? `MM (${mobileProvider})` : 'Mobile Money'
  if (paymentMethod === 'bank_transfer') return 'Virement'
  if (paymentMethod === 'cash') return 'Espèces'
  if (paymentMethod === 'cheque') return 'Chèque'
  return paymentMethod
}

// ─── Formulaire d'enregistrement de paiement ─────────────────────────────────

function PaymentForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useAppStore()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)

  const [f, setF] = useState({
    invoiceId: '', amount: 0, date: today,
    paymentMethod: 'mobile_money', mobileProvider: '',
    reference: '', notes: '',
  })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  // Factures en attente de paiement
  const { data: invData } = useQuery({
    queryKey: ['invoices-for-payment'],
    queryFn: () => fetch(`${B}/api/invoices`).then(r => r.json()),
  })
  // Pays pour récupérer les opérateurs mobile money
  const { data: countriesData } = useQuery({
    queryKey: ['countries'],
    queryFn: () => fetch(`${B}/api/countries`).then(r => r.json()),
  })

  const unpaidInvoices: any[] = (invData?.data ?? []).filter(
    (i: any) => ['sent', 'partially_paid'].includes(i.status)
  )
  const countries: any[] = countriesData?.data ?? []

  const selectedInv = unpaidInvoices.find(i => String(i.id) === f.invoiceId)
  const country = countries.find((c: any) => c.id === selectedInv?.countryId)
  const sym = selectedInv?.country?.symbol ?? ''

  const paidSoFar = (selectedInv?.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0)
  const remaining = selectedInv ? selectedInv.total - paidSoFar : 0

  const providers: string[] = (country?.mobileMoneyProviders ?? '')
    .split(',').map((p: string) => p.trim()).filter(Boolean)

  const onSelectInvoice = (v: string) => {
    const inv = unpaidInvoices.find(i => String(i.id) === v)
    const paid = (inv?.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0)
    setF(prev => ({ ...prev, invoiceId: v, amount: inv ? inv.total - paid : 0, mobileProvider: '' }))
  }

  const save = async () => {
    if (!f.invoiceId) { showToast('Sélectionnez une facture', 'error'); return }
    if (!f.amount || f.amount <= 0) { showToast('Montant invalide', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/payments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId:      Number(f.invoiceId),
          amount:         Number(f.amount),
          date:           f.date,
          paymentMethod:  f.paymentMethod,
          mobileProvider: f.mobileProvider || null,
          reference:      f.reference || null,
          notes:          f.notes || null,
        }),
      })
      const json = await res.json()
      if (!json.success) { showToast(json.error ?? 'Erreur', 'error'); return }
      showToast('Paiement enregistré')
      qc.refetchQueries({ queryKey: ['payments'] })
      qc.refetchQueries({ queryKey: ['invoices'] })
      qc.refetchQueries({ queryKey: ['invoices-for-payment'] })
      onClose()
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Enregistrer paiement" onClose={onClose} size="md">
      <div className="space-y-3">
        {/* Facture */}
        <Field label="Facture à régler" value={f.invoiceId} onChange={onSelectInvoice} required
          options={[
            { value: '', label: '— Choisir —' },
            ...unpaidInvoices.map(i => {
              const paid = (i.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0)
              const rem = i.total - paid
              return {
                value: String(i.id),
                label: `${i.reference} — ${i.client?.name ?? ''} (${fmt(rem, i.country?.symbol ?? '')})`,
              }
            }),
          ]}
        />

        {/* Info reste à régler */}
        {selectedInv && (
          <div className="px-3 py-2 rounded-lg text-xs leading-relaxed"
            style={{ background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4' }}>
            Reste à régler : <strong>{fmt(remaining, sym)}</strong>
            {paidSoFar > 0 && (
              <span className="ml-2 text-slate-500">· Déjà encaissé : {fmt(paidSoFar, sym)}</span>
            )}
          </div>
        )}

        {/* Montant */}
        <Field label="Montant" type="number" value={f.amount}
          onChange={v => setF(p => ({ ...p, amount: Number(v) }))} suffix={sym} />

        {/* Date */}
        <Field label="Date" type="date" value={f.date} onChange={u('date')} />

        {/* Méthode */}
        <Field label="Méthode" value={f.paymentMethod}
          onChange={v => setF(p => ({ ...p, paymentMethod: v, mobileProvider: '' }))}
          options={METHODS} />

        {/* Opérateur (Mobile Money uniquement) */}
        {f.paymentMethod === 'mobile_money' && (
          <Field label="Opérateur" value={f.mobileProvider} onChange={u('mobileProvider')}
            options={[
              { value: '', label: '— Choisir —' },
              ...providers.map(p => ({ value: p, label: p })),
            ]}
          />
        )}

        {/* Référence */}
        <Field label="Référence (n° transaction)" value={f.reference} onChange={u('reference')} />

        {/* Notes */}
        <Field label="Notes" value={f.notes} onChange={u('notes')} textarea />

        {/* Boutons */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────

export function PaymentsPage() {
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => fetch(`${B}/api/payments`).then(r => r.json()),
  })
  const payments: any[] = data?.data ?? []

  const cols = [
    {
      key: 'date', label: 'Date',
      render: (r: any) => <span className="text-xs text-slate-600">{fmtDate(r.date)}</span>,
    },
    {
      key: 'invoice', label: 'Facture',
      render: (r: any) => (
        <span className="font-mono text-xs font-semibold" style={{ color: '#0D9488' }}>
          {r.invoice?.reference ?? '—'}
        </span>
      ),
    },
    {
      key: 'client', label: 'Client',
      render: (r: any) => (
        <span className="text-sm" style={{ color: '#0D9488' }}>
          {r.invoice?.client?.name ?? '—'}
        </span>
      ),
    },
    {
      key: 'amount', label: 'Montant', align: 'right' as const,
      render: (r: any) => (
        <strong className="text-slate-800">
          {fmt(r.amount, r.invoice?.country?.symbol ?? '')}
        </strong>
      ),
    },
    {
      key: 'method', label: 'Méthode',
      render: (r: any) => (
        <span className="text-sm text-slate-700">
          {methodLabel(r.paymentMethod, r.mobileProvider)}
        </span>
      ),
    },
    {
      key: 'reference', label: 'Référence',
      render: (r: any) => (
        <span className="font-mono text-xs text-slate-400">{r.reference ?? '—'}</span>
      ),
    },
  ]

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Paiements reçus"
        subtitle={`${payments.length} paiement(s)`}
        actions={
          <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>
            + Enregistrer paiement
          </Btn>
        }
      />

      <Card noPad>
        <Table
          columns={cols}
          data={payments}
          empty={isLoading ? 'Chargement...' : 'Aucun paiement enregistré'}
        />
      </Card>

      {creating && <PaymentForm onClose={() => setCreating(false)} />}
    </div>
  )
}
