'use client'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PageHeader, Btn, Modal, Field, Card, Badge, FilterSelect, SearchBox, Table,
} from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmt, fmtDate } from '@/lib/utils'
import { Plus, Zap, Printer } from 'lucide-react'
import Image from 'next/image'

const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

const FR_MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
function periodLabel(period: string) {
  if (!period) return '—'
  const parts = period.split('-')
  if (parts.length < 2) return period
  const y = parseInt(parts[0]), m = parseInt(parts[1])
  if (isNaN(y) || isNaN(m)) return period
  return `${FR_MONTHS[m - 1]} ${y}`
}

// ─── Badges ──────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  draft:          { label: 'Brouillon',    bg: '#F1F5F9', color: '#64748B' },
  sent:           { label: 'Émise',        bg: '#EFF6FF', color: '#3B82F6' },
  partially_paid: { label: 'Part. payée',  bg: '#FEF3C7', color: '#D97706' },
  paid:           { label: 'Payée',        bg: '#CCFBF1', color: '#0D9488' },
  overdue:        { label: 'En retard',    bg: '#FEE2E2', color: '#DC2626' },
}

function InvBadge({ status }: { status: string }) {
  const s = STATUS_MAP[status] ?? { label: status, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}

function TypeBadge({ type }: { type: string }) {
  const isMad = type === 'mise_a_disposition'
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: isMad ? '#F5F3FF' : '#EFF6FF', color: isMad ? '#7C3AED' : '#3B82F6' }}>
      {isMad ? 'MAD' : 'Placement'}
    </span>
  )
}

// ─── Invoice Detail Modal ─────────────────────────────────────────────────────

function InvoiceDetailModal({ id, onClose, canEdit }: { id: number; onClose: () => void; canEdit: boolean }) {
  const qc = useQueryClient()
  const { showToast } = useAppStore()
  const [acting, setActing] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['invoice-detail', id],
    queryFn: () => fetch(`${B}/api/invoices/${id}`).then(r => r.json()),
  })
  const inv = data?.data

  const doAction = async (action: string) => {
    setActing(true)
    const res = await fetch(`${B}/api/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    const json = await res.json()
    setActing(false)
    if (!json.success) { showToast(json.error ?? 'Erreur', 'error'); return }
    showToast('Statut mis à jour')
    qc.refetchQueries({ queryKey: ['invoices'] })
    qc.refetchQueries({ queryKey: ['invoice-detail', id] })
  }

  if (isLoading || !inv) {
    return (
      <Modal title="Facture" onClose={onClose} size="xl">
        <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Chargement...</div>
      </Modal>
    )
  }

  const client = inv.client
  const country = inv.country
  const sym = country?.symbol ?? '€'
  const paidAmount = (inv.payments ?? []).reduce((s: number, p: any) => s + p.amount, 0)
  const isOverdue = inv.status !== 'paid' && inv.dueDate && new Date(inv.dueDate) < new Date()

  return (
    <Modal title={`Facture ${inv.reference}`} subtitle={client?.name} onClose={onClose} size="xl">
      {/* Actions */}
      <div className="flex justify-end gap-2 mb-4 flex-wrap no-print">
        {canEdit && inv.status === 'draft' && (
          <Btn size="sm" variant="success" onClick={() => doAction('mark-sent')} disabled={acting}>Émettre</Btn>
        )}
        {canEdit && inv.status === 'sent' && (
          <Btn size="sm" variant="success" onClick={() => doAction('mark-paid')} disabled={acting}>Marquer payée</Btn>
        )}
        <Btn size="sm" variant="secondary" icon={<Printer size={13} />} onClick={() => window.print()}>Imprimer</Btn>
      </div>

      {/* Invoice document */}
      <div id="print-area" className="p-6 bg-white rounded-lg border border-slate-200 print:border-0 print:rounded-none print:p-0 print:shadow-none">
        {/* Header */}
        <div className="flex justify-between mb-6 pb-5" style={{ borderBottom: '3px solid #0D9488' }}>
          <div>
            <Image src="/v2/logo.png" alt="USRA Care" width={100} height={100} unoptimized className="object-contain mb-3" />
            <div className="text-xs text-slate-500 leading-relaxed mt-1">
              {country?.entityName && <div className="font-bold text-base text-slate-900">{country.entityName}</div>}
              {country?.address && <div>{country.address}</div>}
              {country?.city && <div>{country.city}</div>}
              {country?.entityPhone && <div>Tél : {country.entityPhone}</div>}
              {country?.entityEmail && <div>Email : {country.entityEmail}</div>}
              {(country?.taxId || country?.statId) && <div className="mt-1">{[country.taxId, country.statId].filter(Boolean).join(' · ')}</div>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-4xl font-extrabold mb-2 tracking-wide" style={{ color: '#0D9488' }}>FACTURE</div>
            <div className="font-mono font-bold text-slate-800 text-base">{inv.reference}</div>
            <div className="text-sm text-slate-500 mt-2">
              Date : <strong className="text-slate-700">{fmtDate(inv.date)}</strong>
            </div>
            <div className="text-sm text-slate-500">
              Échéance : <strong className={isOverdue ? 'text-red-600' : 'text-slate-700'}>{fmtDate(inv.dueDate)}</strong>
            </div>
            <div className="mt-2 flex justify-end gap-2 flex-wrap">
              <InvBadge status={inv.status} />
              <TypeBadge type={inv.invoiceType} />
            </div>
          </div>
        </div>

        {/* Client + Period */}
        <div className="flex justify-between mb-5">
          <div className="flex-1">
            <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Facturé à</div>
            <div className="font-bold text-slate-900 text-base">{client?.name}</div>
            {client?.companyName && <div className="text-sm text-slate-600">{client.companyName}</div>}
            {client?.address && <div className="text-sm text-slate-500">{client.address}</div>}
            {client?.phone && <div className="text-sm text-slate-500">Tél : {client.phone}</div>}
            {client?.nif && <div className="text-sm text-slate-500">NIF : {client.nif}</div>}
          </div>
          {inv.period && (
            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wide mb-1.5">Période</div>
              <div className="font-bold text-slate-900 text-base">{periodLabel(inv.period)}</div>
            </div>
          )}
        </div>

        {/* Notes */}
        {inv.notes && (
          <div className="text-xs text-slate-600 italic mb-4 p-3 rounded-lg" style={{ background: '#F0FDFA' }}>
            {inv.notes}
          </div>
        )}

        {/* Lines table */}
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr style={{ background: '#0D9488', color: '#fff' }}>
              <th className="px-4 py-3 text-left text-sm font-semibold">Description</th>
              <th className="px-4 py-3 text-center text-sm font-semibold w-20">Qté</th>
              <th className="px-4 py-3 text-right text-sm font-semibold w-36">P.U.</th>
              <th className="px-4 py-3 text-right text-sm font-semibold w-40">Total HT</th>
            </tr>
          </thead>
          <tbody>
            {(inv.lines ?? []).map((l: any, j: number) => (
              <tr key={j} className="border-b border-slate-100">
                <td className="px-4 py-3 text-sm text-slate-700">{l.description}</td>
                <td className="px-4 py-3 text-center text-sm text-slate-600">{l.quantity}</td>
                <td className="px-4 py-3 text-right text-sm text-slate-600">{fmt(l.unitPrice, sym)}</td>
                <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">{fmt(l.totalHT, sym)}</td>
              </tr>
            ))}
            {(inv.lines ?? []).length === 0 && (
              <tr><td colSpan={4} className="px-3 py-4 text-center text-xs text-slate-400">Aucune ligne</td></tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-5">
          <div className="w-72">
            <div className="flex justify-between py-2 text-sm border-b border-slate-100">
              <span className="text-slate-500">Sous-total HT</span>
              <span className="font-medium text-slate-800">{fmt(inv.subtotalHT, sym)}</span>
            </div>
            {(inv.vatRate ?? 0) > 0 && (
              <div className="flex justify-between py-2 text-sm border-b border-slate-100">
                <span className="text-slate-500">TVA ({inv.vatRate}%)</span>
                <span className="font-medium text-slate-800">{fmt(inv.vatAmount, sym)}</span>
              </div>
            )}
            {(inv.syntheticTax ?? 0) > 0 && (
              <div className="flex justify-between py-2 text-sm border-b border-slate-100">
                <span className="text-slate-500">Impôt synthétique</span>
                <span className="font-medium text-slate-800">{fmt(inv.syntheticTax, sym)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 mt-1" style={{ borderTop: '2px solid #0D9488' }}>
              <span className="font-bold text-base text-slate-900">TOTAL TTC</span>
              <span className="font-extrabold text-xl" style={{ color: '#0D9488' }}>{fmt(inv.total, sym)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between py-1 text-xs mt-1">
                <span className="text-slate-500">Encaissé</span>
                <span className="text-teal-600 font-semibold">{fmt(paidAmount, sym)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-4 border-t border-slate-200">
          <div className="grid grid-cols-2 gap-6 text-sm text-slate-500 leading-relaxed">
            <div>
              <div className="font-bold text-slate-700 mb-1.5 text-sm">Modalités de paiement</div>
              {client?.paymentTermsDays != null && (
                <div>Délai : {client.paymentTermsDays} jours à compter de la date de facture.</div>
              )}
              {country?.bankName && country?.bankAccount && (
                <div className="mt-1">{country.bankName} — {country.bankAccount}</div>
              )}
            </div>
            <div>
              <div className="font-bold text-slate-700 mb-1.5 text-sm">Mentions légales</div>
              <div>{country?.legalMention ?? '—'}</div>
            </div>
          </div>
          <div className="text-center mt-4 text-xs text-slate-400">
            {[country?.entityName, country?.taxId, country?.statId].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Nouvelle Facture Modal ───────────────────────────────────────────────────

function NouvelleFactureModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useAppStore()
  const [saving, setSaving] = useState(false)

  const { data: clientsData } = useQuery({
    queryKey: ['clients-for-invoices'],
    queryFn: () => fetch(`${B}/api/clients`).then(r => r.json()),
  })
  const clients: any[] = clientsData?.data ?? []

  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({
    clientId: '', invoiceType: 'placement',
    date: today, dueDate: '',
    period: new Date().toISOString().slice(0, 7),
    vatRate: 20, notes: '',
    lines: [] as { description: string; quantity: number; unitPrice: number; totalHT: number }[],
  })

  const selectedClient = clients.find((c: any) => c.id === Number(f.clientId))

  useEffect(() => {
    if (selectedClient?.paymentTermsDays && f.date) {
      const d = new Date(f.date)
      d.setDate(d.getDate() + selectedClient.paymentTermsDays)
      setF(prev => ({ ...prev, dueDate: d.toISOString().slice(0, 10) }))
    }
  }, [f.clientId, f.date])

  const subtotalHT = f.lines.reduce((s, l) => s + (l.totalHT || 0), 0)
  const vatAmount  = Math.round(subtotalHT * (f.vatRate || 0) / 100)
  const total      = subtotalHT + vatAmount
  const sym        = selectedClient?.country?.symbol ?? '—'

  const addLine = () => setF(prev => ({
    ...prev, lines: [...prev.lines, { description: '', quantity: 1, unitPrice: 0, totalHT: 0 }],
  }))
  const updLine = (i: number, field: string, val: any) => {
    const ls = [...f.lines] as any[]
    ls[i] = { ...ls[i], [field]: val }
    if (field === 'quantity' || field === 'unitPrice') {
      ls[i].totalHT = Math.round((ls[i].quantity || 0) * (ls[i].unitPrice || 0))
    }
    setF(prev => ({ ...prev, lines: ls }))
  }
  const delLine = (i: number) => setF(prev => ({ ...prev, lines: prev.lines.filter((_, j) => j !== i) }))

  const save = async () => {
    if (!f.clientId) { showToast('Client requis', 'error'); return }
    if (f.lines.length === 0) { showToast('Au moins une ligne requise', 'error'); return }
    setSaving(true)
    const payload = {
      clientId: Number(f.clientId),
      countryId: selectedClient?.countryId,
      invoiceType: f.invoiceType,
      date: f.date,
      dueDate: f.dueDate || null,
      period: f.period || null,
      status: 'draft',
      subtotalHT,
      vatRate: f.vatRate,
      vatAmount,
      syntheticTax: 0,
      total,
      notes: f.notes || null,
      autoGenerated: false,
      lines: f.lines,
    }
    const res = await fetch(`${B}/api/invoices`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    setSaving(false)
    if (!json.success) { showToast(json.error ?? 'Erreur', 'error'); return }
    showToast('Facture créée')
    qc.refetchQueries({ queryKey: ['invoices'] })
    onClose()
  }

  return (
    <Modal title="Nouvelle facture" onClose={onClose} size="xl">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Field label="Client" value={f.clientId} onChange={v => setF(p => ({ ...p, clientId: v }))} required
          options={[{ value: '', label: '— Choisir —' }, ...clients.map((c: any) => ({ value: String(c.id), label: c.name }))]} />
        <Field label="Type" value={f.invoiceType} onChange={v => setF(p => ({ ...p, invoiceType: v }))}
          options={[{ value: 'placement', label: 'Placement' }, { value: 'mise_a_disposition', label: 'Mise à disposition' }]} />
        <Field label="Date" value={f.date} onChange={v => setF(p => ({ ...p, date: v }))} type="date" />
        <Field label="Échéance" value={f.dueDate} onChange={v => setF(p => ({ ...p, dueDate: v }))} type="date" />
        <Field label="Période" value={f.period} onChange={v => setF(p => ({ ...p, period: v }))} placeholder="2026-06" />
        <Field label="TVA (%)" value={f.vatRate} onChange={v => setF(p => ({ ...p, vatRate: Number(v) }))} type="number" suffix="%" />
      </div>

      {/* Lines */}
      <div className="flex justify-between items-center mb-2 mt-1">
        <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Lignes de facturation</h4>
        <Btn size="sm" variant="secondary" onClick={addLine} icon={<Plus size={12} />}>Ajouter</Btn>
      </div>
      {f.lines.length === 0 && (
        <div className="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg mb-3">
          Aucune ligne — cliquez sur Ajouter
        </div>
      )}
      {f.lines.map((l, i) => (
        <div key={i} className="grid gap-2 mb-2 items-end" style={{ gridTemplateColumns: '4fr 1fr 1.3fr 1.3fr auto' }}>
          <input value={l.description} onChange={e => updLine(i, 'description', e.target.value)}
            placeholder="Description"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400" />
          <input type="number" value={l.quantity} onChange={e => updLine(i, 'quantity', Number(e.target.value))}
            placeholder="Qté"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400" />
          <input type="number" value={l.unitPrice} onChange={e => updLine(i, 'unitPrice', Number(e.target.value))}
            placeholder="Prix unitaire"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400" />
          <input value={fmt(l.totalHT, sym)} disabled
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-50" />
          <button onClick={() => delLine(i)}
            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
            </svg>
          </button>
        </div>
      ))}

      {/* Totals */}
      <div className="mt-4 p-4 rounded-lg bg-slate-50 border border-slate-100">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">Sous-total HT</span>
          <span className="font-medium text-slate-800">{fmt(subtotalHT, sym)}</span>
        </div>
        {(f.vatRate || 0) > 0 && (
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">TVA ({f.vatRate}%)</span>
            <span className="font-medium text-slate-800">{fmt(vatAmount, sym)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-bold pt-2 border-t border-slate-200 mt-1">
          <span className="text-slate-900">TOTAL TTC</span>
          <span style={{ color: '#0D9488' }}>{fmt(total, sym)}</span>
        </div>
      </div>

      <Field label="Notes / Objet" value={f.notes} onChange={v => setF(p => ({ ...p, notes: v }))} textarea className="mt-3" />

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Créer la facture'}</Btn>
      </div>
    </Modal>
  )
}

// ─── Génération Auto Modal ────────────────────────────────────────────────────

function GénérationAutoModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useAppStore()

  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [preview, setPreview] = useState<any[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const periodOptions = [-3, -2, -1, 0].map(off => {
    const d = new Date()
    d.setMonth(d.getMonth() + off)
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { value: p, label: periodLabel(p) }
  })

  const compute = async () => {
    setLoading(true)
    setPreview(null)
    try {
      const res = await fetch(`${B}/api/invoices/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, create: false }),
      })
      const json = await res.json()
      if (!json.success) { showToast(json.error ?? 'Erreur', 'error'); return }
      setPreview(json.data)
      if (json.data.length === 0) showToast('Aucune facture à générer pour cette période', 'warning')
    } finally {
      setLoading(false)
    }
  }

  const confirm = async () => {
    if (!preview || preview.length === 0) return
    setCreating(true)
    try {
      const res = await fetch(`${B}/api/invoices/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, create: true }),
      })
      const json = await res.json()
      if (!json.success) { showToast(json.error ?? 'Erreur', 'error'); return }
      showToast(`${json.data.length} facture(s) générée(s)`)
      qc.refetchQueries({ queryKey: ['invoices'] })
      onClose()
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal title="Génération automatique de factures" subtitle={`Période : ${periodLabel(period)}`} onClose={onClose} size="lg">
      {/* Blue info box */}
      <div className="rounded-lg p-3 mb-4 text-xs leading-relaxed" style={{ background: '#EFF6FF', color: '#3B82F6', border: '1px solid #BFDBFE' }}>
        ℹ️ Cette fonction regroupe les missions actives par client et génère une facture par client par type (Placement ou MAD), en appliquant le prorata selon les fiches de présence validées.
      </div>

      <Field label="Période à facturer" value={period} onChange={v => { setPeriod(v); setPreview(null) }} options={periodOptions} />

      {!preview && (
        <div className="flex justify-end mt-4">
          <Btn icon={<Zap size={14} color="#fff" />} onClick={compute} disabled={loading}>
            {loading ? 'Calcul en cours...' : 'Calculer les factures'}
          </Btn>
        </div>
      )}

      {preview !== null && preview.length === 0 && (
        <div className="mt-4 py-8 text-center text-slate-400 text-xs bg-slate-50 rounded-lg border border-slate-100">
          Aucune nouvelle facture à créer pour {periodLabel(period)}.
          <div className="mt-1 text-slate-300">Vérifiez que les missions actives ont des fiches de présence validées.</div>
        </div>
      )}

      {preview !== null && preview.length > 0 && (
        <>
          <div className="mt-4 mb-3 p-3 rounded-lg text-xs font-semibold" style={{ background: '#F0FDFA', color: '#0D9488', border: '1px solid #99F6E4' }}>
            {preview.length} facture(s) à créer · Total estimé :{' '}
            {fmt(preview.reduce((s: number, p: any) => s + p.total, 0), preview[0]?.symbol ?? '')}
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {preview.map((inv: any, i: number) => (
              <div key={i} className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                    {inv.clientName}
                    <TypeBadge type={inv.invoiceType} />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Échéance : {fmtDate(inv.dueDate)} · {inv.lines.length} ligne(s)
                  </div>
                  {inv.lines.slice(0, 3).map((l: any, j: number) => (
                    <div key={j} className="text-[10px] text-slate-500 mt-0.5 truncate">
                      • {l.description} : {fmt(l.totalHT, inv.symbol)}
                    </div>
                  ))}
                  {inv.lines.length > 3 && (
                    <div className="text-[10px] text-slate-400 mt-0.5">+ {inv.lines.length - 3} ligne(s)…</div>
                  )}
                </div>
                <div className="text-sm font-extrabold flex-shrink-0" style={{ color: '#0D9488' }}>
                  {fmt(inv.total, inv.symbol)}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
            <Btn variant="secondary" onClick={() => setPreview(null)}>Recalculer</Btn>
            <Btn variant="success" onClick={confirm} disabled={creating}>
              {creating ? 'Création...' : `Créer les ${preview.length} facture(s)`}
            </Btn>
          </div>
        </>
      )}
    </Modal>
  )
}

// ─── Filtres ─────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: 'all', label: 'Tous statuts' }, { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Émise' }, { value: 'partially_paid', label: 'Partiellement payée' },
  { value: 'paid', label: 'Payée' }, { value: 'overdue', label: 'En retard' },
]
const TYPE_OPTS = [
  { value: 'all', label: 'Tous types' },
  { value: 'placement', label: 'Placement' },
  { value: 'mise_a_disposition', label: 'Mise à disposition' },
]

// ─── Main Page ────────────────────────────────────────────────────────────────

export function InvoicesPage() {
  const { data: session } = useSession()
  const { adminCountryFilter } = useAppStore()
  const countryQ = adminCountryFilter !== 'all' ? 'countryId=' + adminCountryFilter : ''
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [typeF, setTypeF] = useState('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [generating, setGenerating] = useState(false)

  const canEdit = (session?.user as any)?.role !== 'operator'

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusF, typeF, adminCountryFilter],
    queryFn: () =>
      fetch(`${B}/api/invoices?status=${statusF === 'all' ? '' : statusF}&type=${typeF === 'all' ? '' : typeF}${countryQ ? '&' + countryQ : ''}`)
        .then(r => r.json()),
  })

  const invoices: any[] = (data?.data ?? []).filter((i: any) =>
    !search || `${i.reference} ${i.client?.name ?? ''}`.toLowerCase().includes(search.toLowerCase())
  )

  const cols = [
    {
      key: 'ref', label: 'Référence', render: (r: any) => (
        <div className="flex items-center gap-2">
          <span className="font-mono font-bold text-xs">{r.reference}</span>
          {r.autoGenerated && <Badge color="#7C3AED">AUTO</Badge>}
        </div>
      ),
    },
    { key: 'date', label: 'Date', render: (r: any) => fmtDate(r.date) },
    { key: 'client', label: 'Client', render: (r: any) => r.client?.name ?? '—' },
    { key: 'type', label: 'Type', render: (r: any) => <TypeBadge type={r.invoiceType} /> },
    {
      key: 'total', label: 'Total', align: 'right' as const,
      render: (r: any) => <strong>{fmt(r.total, r.country?.symbol)}</strong>,
    },
    {
      key: 'due', label: 'Échéance', render: (r: any) => {
        const isLate = r.status !== 'paid' && r.dueDate && new Date(r.dueDate) < new Date()
        return (
          <span style={{ color: isLate ? '#DC2626' : undefined, fontWeight: isLate ? 600 : undefined }}>
            {fmtDate(r.dueDate)}
          </span>
        )
      },
    },
    { key: 'status', label: 'Statut', render: (r: any) => <InvBadge status={r.status} /> },
    {
      key: 'actions', label: '', align: 'right' as const,
      render: (r: any) => (
        <div onClick={e => e.stopPropagation()}>
          <Btn size="sm" variant="ghost" onClick={() => setSelectedId(r.id)}>Voir →</Btn>
        </div>
      ),
    },
  ]

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Factures"
        subtitle={`${invoices.length} facture(s)`}
        actions={
          <>
            <SearchBox value={search} onChange={setSearch} />
            <FilterSelect value={statusF} onChange={setStatusF} options={STATUS_OPTS} />
            <FilterSelect value={typeF} onChange={setTypeF} options={TYPE_OPTS} />
            <Btn variant="purple" icon={<Zap size={13} color="#fff" />} onClick={() => setGenerating(true)}>
              Générer auto période
            </Btn>
            <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>Nouvelle facture</Btn>
          </>
        }
      />
      <Card noPad>
        <Table
          columns={cols}
          data={invoices}
          onRowClick={(r: any) => setSelectedId(r.id)}
          empty={isLoading ? 'Chargement...' : 'Aucune facture'}
        />
      </Card>

      {selectedId !== null && (
        <InvoiceDetailModal id={selectedId} onClose={() => setSelectedId(null)} canEdit={canEdit} />
      )}
      {creating && <NouvelleFactureModal onClose={() => setCreating(false)} />}
      {generating && <GénérationAutoModal onClose={() => setGenerating(false)} />}
    </div>
  )
}
