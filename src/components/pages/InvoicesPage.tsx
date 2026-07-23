'use client'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  PageHeader, Btn, Modal, Field, Card, Badge, FilterSelect, SearchBox, Table,
} from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmt, fmtDate } from '@/lib/utils'
import { Plus, Zap, Printer, Mail, Bell, Clock } from 'lucide-react'
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

function InvoiceDetailModal({ id, onClose, canEdit, onEdit }: { id: number; onClose: () => void; canEdit: boolean; onEdit: (inv: any) => void }) {
  const qc = useQueryClient()
  const { showToast } = useAppStore()
  const [acting, setActing] = useState(false)
  const [sending, setSending] = useState(false)
  const [emailModal, setEmailModal] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [acompteModal, setAcompteModal] = useState(false)
  const [acompteForm, setAcompteForm] = useState({ amount: '', date: new Date().toISOString().slice(0, 10), method: 'cash' })
  const [savingAcompte, setSavingAcompte] = useState(false)
  const [relanceModal, setRelanceModal] = useState(false)
  const [relanceTo, setRelanceTo] = useState('')
  const [relanceNote, setRelanceNote] = useState('')
  const [sendingRelance, setSendingRelance] = useState(false)
  const [showRelances, setShowRelances] = useState(false)

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

  const sendRelance = async () => {
    if (!relanceTo.trim()) { showToast('Adresse email requise', 'error'); return }
    setSendingRelance(true)
    const res = await fetch(`${B}/api/invoices/${id}/relance`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: relanceTo.trim(), note: relanceNote.trim() || null }),
    })
    const json = await res.json()
    setSendingRelance(false)
    if (!json.success) { showToast(json.error ?? 'Erreur envoi relance', 'error'); return }
    showToast(`Relance n°${json.data.relanceNum} envoyée`)
    qc.refetchQueries({ queryKey: ['invoice-detail', id] })
    qc.refetchQueries({ queryKey: ['invoices'] })
    setRelanceModal(false)
    setRelanceNote('')
  }

  const saveAcompte = async () => {
    if (!acompteForm.amount || Number(acompteForm.amount) <= 0) { showToast('Montant requis', 'error'); return }
    setSavingAcompte(true)
    const res = await fetch(`${B}/api/invoices/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set-acompte', acompteAmount: Number(acompteForm.amount), acompteDate: acompteForm.date, acompteMethod: acompteForm.method }),
    })
    const json = await res.json()
    setSavingAcompte(false)
    if (!json.success) { showToast(json.error ?? 'Erreur', 'error'); return }
    showToast('Acompte enregistré')
    qc.refetchQueries({ queryKey: ['invoices'] })
    qc.refetchQueries({ queryKey: ['invoice-detail', id] })
    setAcompteModal(false)
  }

  const sendByEmail = async () => {
    if (!emailTo.trim()) { showToast('Adresse email requise', 'error'); return }
    setSending(true)
    const res = await fetch(`${B}/api/invoices/${id}/send-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: emailTo.trim() }),
    })
    const json = await res.json()
    setSending(false)
    if (!json.success) { showToast(json.error ?? "Erreur lors de l'envoi", 'error'); return }
    showToast(`Facture envoyée à ${json.data.to}`)
    setEmailModal(false)
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
        {inv.status === 'draft' && (
          <Btn size="sm" variant="secondary" onClick={() => onEdit(inv)}>Modifier</Btn>
        )}
        {inv.status === 'draft' && (
          <Btn size="sm" variant="success" onClick={() => doAction('mark-sent')} disabled={acting}>Émettre</Btn>
        )}
        {inv.status === 'sent' && (
          <Btn size="sm" variant="success" onClick={() => doAction('mark-paid')} disabled={acting}>Marquer payée</Btn>
        )}
        {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
          <Btn size="sm" variant="secondary" onClick={() => { setAcompteForm(p => ({ ...p, amount: inv.acompteAmount > 0 ? String(inv.acompteAmount) : '' })); setAcompteModal(true) }}>
            {(inv.acompteAmount ?? 0) > 0 ? 'Modifier acompte' : 'Enregistrer acompte'}
          </Btn>
        )}
        {['sent', 'partially_paid', 'overdue'].includes(inv.status) && (
          <Btn size="sm" variant="secondary" icon={<Bell size={13} />}
            onClick={() => { setRelanceTo(client?.email ?? ''); setRelanceModal(true) }}>
            Relance
            {(inv.relances?.length ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: '#FEF3C7', color: '#D97706' }}>
                {inv.relances.length}
              </span>
            )}
          </Btn>
        )}
        <Btn size="sm" variant="secondary" icon={<Mail size={13} />} onClick={() => { setEmailTo(client?.email ?? ''); setEmailModal(true) }}>
          Envoyer par email
        </Btn>
        <Btn size="sm" variant="secondary" icon={<Printer size={13} />} onClick={() => window.open(`${B}/api/invoices/${id}/pdf`, '_blank')}>
          Voir / Imprimer PDF
        </Btn>
      </div>

      {/* Invoice document */}
      <div className="p-6 bg-white rounded-lg border border-slate-200">
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
            {(inv.acompteAmount ?? 0) > 0 && (
              <>
                <div className="flex justify-between py-1.5 px-2 text-sm mt-1 rounded" style={{ background: '#FFFBEB', borderBottom: '1px solid #FDE68A' }}>
                  <span style={{ color: '#B45309' }} className="font-medium">
                    Acompte reçu {inv.acompteDate ? `(${fmtDate(inv.acompteDate)})` : ''}
                  </span>
                  <span style={{ color: '#B45309' }} className="font-bold">−{fmt(inv.acompteAmount, sym)}</span>
                </div>
                <div className="flex justify-between py-2 mt-1" style={{ borderTop: '2px solid #0D9488' }}>
                  <span className="font-bold text-base text-slate-900">NET À PAYER</span>
                  <span className="font-extrabold text-xl" style={{ color: '#0D9488' }}>{fmt(inv.total - inv.acompteAmount, sym)}</span>
                </div>
              </>
            )}
            {paidAmount > 0 && (inv.acompteAmount ?? 0) === 0 && (
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

      {/* Historique relances */}
      {(inv.relances?.length ?? 0) > 0 && (
        <div className="mt-4 border border-amber-200 rounded-xl overflow-hidden">
          <button
            onClick={() => setShowRelances(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-50 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors">
            <span className="flex items-center gap-1.5">
              <Clock size={13} />
              {inv.relances.length} relance(s) envoyée(s)
            </span>
            <span>{showRelances ? '▲' : '▼'}</span>
          </button>
          {showRelances && (
            <div className="divide-y divide-amber-100">
              {inv.relances.map((r: any, i: number) => (
                <div key={r.id} className="px-4 py-2.5 flex items-start justify-between bg-white">
                  <div>
                    <span className="text-[11px] font-bold text-amber-700">Relance n°{inv.relances.length - i}</span>
                    <span className="ml-2 text-[11px] text-slate-500">→ {r.to}</span>
                    {r.note && <div className="text-[11px] text-slate-400 mt-0.5 italic">{r.note}</div>}
                  </div>
                  <span className="text-[10px] text-slate-400 whitespace-nowrap ml-3">
                    {new Date(r.sentAt).toLocaleDateString('fr-FR')} {new Date(r.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {relanceModal && (
        <Modal title={`Envoyer une relance — ${inv.reference}`} onClose={() => setRelanceModal(false)} size="sm">
          <div className="space-y-3">
            {(inv.relances?.length ?? 0) > 0 && (
              <div className="p-2 rounded-lg text-xs" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309' }}>
                {inv.relances.length} relance(s) déjà envoyée(s) — dernière le {new Date(inv.relances[0].sentAt).toLocaleDateString('fr-FR')}
              </div>
            )}
            <Field label="Destinataire *" type="email" value={relanceTo} onChange={setRelanceTo} />
            <Field label="Note interne (optionnel)" value={relanceNote} onChange={setRelanceNote}
              placeholder="ex: appel téléphonique préalable..." textarea />
            <div className="p-2.5 rounded-lg text-xs text-slate-500" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
              Un email de relance avec la facture PDF en pièce jointe sera envoyé au destinataire.
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Btn size="sm" variant="secondary" onClick={() => setRelanceModal(false)}>Annuler</Btn>
              <Btn size="sm" onClick={sendRelance} disabled={sendingRelance}>
                {sendingRelance ? 'Envoi...' : 'Envoyer la relance'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {acompteModal && (
        <Modal title="Enregistrer un acompte" onClose={() => setAcompteModal(false)} size="sm">
          <div className="space-y-3">
            <p className="text-xs text-slate-500">
              L'acompte sera déduit du total sur la facture PDF et enregistré comme encaissement.
            </p>
            {(inv.acompteAmount ?? 0) > 0 && (
              <div className="p-2 rounded-lg text-xs" style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#B45309' }}>
                Acompte existant : <strong>{fmt(inv.acompteAmount, sym)}</strong> — {fmtDate(inv.acompteDate)}
              </div>
            )}
            <Field label="Montant *" type="number" value={acompteForm.amount} onChange={v => setAcompteForm(p => ({ ...p, amount: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date *" type="date" value={acompteForm.date} onChange={v => setAcompteForm(p => ({ ...p, date: v }))} />
              <Field label="Méthode" value={acompteForm.method} onChange={v => setAcompteForm(p => ({ ...p, method: v }))} options={[
                { value: 'cash', label: 'Espèces' },
                { value: 'mobile_money', label: 'Mobile Money' },
                { value: 'bank_transfer', label: 'Virement bancaire' },
                { value: 'cheque', label: 'Chèque' },
              ]} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Btn size="sm" variant="secondary" onClick={() => setAcompteModal(false)}>Annuler</Btn>
              <Btn size="sm" onClick={saveAcompte} disabled={savingAcompte}>
                {savingAcompte ? 'Enregistrement...' : 'Enregistrer'}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {emailModal && (
        <Modal title="Envoyer la facture par email" onClose={() => setEmailModal(false)} size="sm">
          <div className="space-y-3">
            <p className="text-sm text-slate-500">
              Facture <strong>{inv.reference}</strong> — {client?.name}
            </p>
            <Field
              label="Adresse email du destinataire *"
              type="email"
              value={emailTo}
              onChange={setEmailTo}
            />
            {!client?.email && (
              <p className="text-xs text-amber-600">Ce client n'a pas d'email enregistré — renseigne-le ci-dessus.</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Btn size="sm" variant="secondary" onClick={() => setEmailModal(false)}>Annuler</Btn>
              <Btn size="sm" onClick={sendByEmail} disabled={sending}>
                {sending ? 'Envoi...' : "Confirmer l'envoi"}
              </Btn>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  )
}

// ─── Nouvelle Facture Modal ───────────────────────────────────────────────────

function NouvelleFactureModal({ onClose, invoice }: { onClose: () => void; invoice?: any }) {
  const qc = useQueryClient()
  const { showToast } = useAppStore()
  const [saving, setSaving] = useState(false)
  const isEdit = !!invoice

  const { data: clientsData } = useQuery({
    queryKey: ['clients-for-invoices'],
    queryFn: () => fetch(`${B}/api/clients`).then(r => r.json()),
  })
  const clients: any[] = clientsData?.data ?? []

  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({
    clientId:    invoice ? String(invoice.clientId) : '',
    invoiceType: invoice?.invoiceType ?? 'placement',
    date:        invoice?.date ? invoice.date.slice(0, 10) : today,
    dueDate:     invoice?.dueDate ? invoice.dueDate.slice(0, 10) : '',
    period:      invoice?.period ?? new Date().toISOString().slice(0, 7),
    vatRate:     invoice?.vatRate ?? 20,
    notes:       invoice?.notes ?? '',
    lines: (invoice?.lines ?? []).map((l: any) => ({
      description: l.description, quantity: l.quantity,
      unitPrice: l.unitPrice, totalHT: l.totalHT,
      overtimeRecordId: l.overtimeRecords?.[0]?.id as number | undefined,
    })) as { description: string; quantity: number; unitPrice: number; totalHT: number; overtimeRecordId?: number }[],
  })

  const selectedClient = clients.find((c: any) => c.id === Number(f.clientId))

  const { data: overtimeData } = useQuery({
    queryKey: ['billable-overtime', f.clientId],
    queryFn: () => fetch(`${B}/api/overtime?clientId=${f.clientId}&billable=1`).then(r => r.json()),
    enabled: !!f.clientId,
  })
  const billableOvertime: any[] = (overtimeData?.data ?? []).filter(
    (o: any) => !f.lines.some(l => l.overtimeRecordId === o.id)
  )

  const addOvertimeLine = (o: any) => {
    const cand = `${o.candidate.firstName} ${o.candidate.lastName}`
    setF(prev => ({
      ...prev,
      lines: [...prev.lines, {
        description: `Heures sup. — ${cand} (${o.hours}h, ${o.date.slice(0, 10)})`,
        quantity: 1,
        unitPrice: Math.round(o.amount),
        totalHT: Math.round(o.amount),
        overtimeRecordId: o.id,
      }],
    }))
  }

  useEffect(() => {
    if (selectedClient?.paymentTermsDays && f.date && !isEdit) {
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
      countryId: selectedClient?.countryId ?? invoice?.countryId,
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
    const url    = isEdit ? `${B}/api/invoices/${invoice.id}` : `${B}/api/invoices`
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    setSaving(false)
    if (!json.success) { showToast(json.error ?? 'Erreur', 'error'); return }
    showToast(isEdit ? 'Facture modifiée' : 'Facture créée')
    qc.refetchQueries({ queryKey: ['invoices'] })
    if (isEdit) qc.refetchQueries({ queryKey: ['invoice-detail', invoice.id] })
    onClose()
  }

  return (
    <Modal title={isEdit ? `Modifier la facture` : 'Nouvelle facture'} onClose={onClose} size="xl">
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

      {/* Heures sup facturables */}
      {!!f.clientId && billableOvertime.length > 0 && (
        <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wide mb-2">
            Heures sup. validées non facturées ({billableOvertime.length})
          </div>
          <div className="space-y-1.5">
            {billableOvertime.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-amber-100">
                <div className="text-xs text-slate-700">
                  <span className="font-semibold">{o.candidate.firstName} {o.candidate.lastName}</span>
                  <span className="text-slate-400 ml-2">{o.hours}h · {fmtDate(o.date)} · {fmt(o.amount, selectedClient?.country?.symbol)}</span>
                </div>
                <Btn size="sm" variant="secondary" onClick={() => addOvertimeLine(o)}>+ Ajouter</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

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
  const [editingInvoice, setEditingInvoice] = useState<any>(null)
  const [generating, setGenerating] = useState(false)
  const [granularity, setGranularity] = useState('tous')
  const [periodValue, setPeriodValue] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const canEdit = (session?.user as any)?.role !== 'operator'

  const { data, isLoading } = useQuery({
    queryKey: ['invoices', statusF, typeF, adminCountryFilter],
    queryFn: () =>
      fetch(`${B}/api/invoices?status=${statusF === 'all' ? '' : statusF}&type=${typeF === 'all' ? '' : typeF}${countryQ ? '&' + countryQ : ''}`)
        .then(r => r.json()),
  })

  function getWeekBounds(d: Date) {
    const day = d.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const mon = new Date(d); mon.setDate(d.getDate() + diff); mon.setHours(0,0,0,0)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 7)
    return { mon, sun }
  }

  const invoices: any[] = (data?.data ?? []).filter((i: any) => {
    if (search && !`${i.reference} ${i.client?.name ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false
    if (granularity !== 'tous' && i.date) {
      const d = new Date(i.date)
      if (granularity === 'jour' && periodValue) {
        if (d.toISOString().slice(0, 10) !== periodValue) return false
      } else if (granularity === 'semaine' && periodValue) {
        const { mon, sun } = getWeekBounds(new Date(periodValue))
        if (d < mon || d >= sun) return false
      } else if (granularity === 'mois' && periodValue) {
        if (`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` !== periodValue) return false
      } else if (granularity === 'annee' && periodValue) {
        if (String(d.getFullYear()) !== periodValue) return false
      }
    }
    return true
  })

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
      key: 'relances', label: 'Relances', render: (r: any) => (
        r._count?.relances > 0
          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
              style={{ background: '#FEF3C7', color: '#D97706' }}>
              <Bell size={10} /> {r._count.relances}
            </span>
          : <span className="text-slate-300 text-xs">—</span>
      ),
    },
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
            <SearchBox value={search} onChange={setSearch} placeholder="Référence, client..." />
            <FilterSelect value={statusF} onChange={setStatusF} options={STATUS_OPTS} />
            <FilterSelect value={typeF} onChange={setTypeF} options={TYPE_OPTS} />
            <FilterSelect
              value={granularity}
              onChange={v => {
                setGranularity(v)
                const d = new Date()
                if (v === 'mois') setPeriodValue(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
                else if (v === 'annee') setPeriodValue(String(d.getFullYear()))
                else setPeriodValue(d.toISOString().slice(0,10))
              }}
              options={[
                { value: 'tous',    label: 'Toutes périodes' },
                { value: 'jour',    label: 'Jour' },
                { value: 'semaine', label: 'Semaine' },
                { value: 'mois',    label: 'Mois' },
                { value: 'annee',   label: 'Année' },
              ]}
            />
            {granularity === 'jour' && (
              <input type="date" value={periodValue} onChange={e => setPeriodValue(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400" />
            )}
            {granularity === 'semaine' && (
              <input type="date" value={periodValue} onChange={e => setPeriodValue(e.target.value)}
                title="Choisir un jour — toute la semaine sera affichée"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400" />
            )}
            {granularity === 'mois' && (
              <input type="month" value={periodValue} onChange={e => setPeriodValue(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-400" />
            )}
            {granularity === 'annee' && (
              <input type="number" value={periodValue} onChange={e => setPeriodValue(e.target.value)}
                min="2020" max="2099" placeholder="2026"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 w-24 focus:outline-none focus:ring-2 focus:ring-teal-400" />
            )}
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
        <InvoiceDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          canEdit={canEdit}
          onEdit={(inv) => { setEditingInvoice(inv); setSelectedId(null) }}
        />
      )}
      {creating && <NouvelleFactureModal onClose={() => setCreating(false)} />}
      {editingInvoice && (
        <NouvelleFactureModal
          invoice={editingInvoice}
          onClose={() => setEditingInvoice(null)}
        />
      )}
      {generating && <GénérationAutoModal onClose={() => setGenerating(false)} />}
    </div>
  )
}
