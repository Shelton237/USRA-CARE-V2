'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

// ─── Status badge avances ─────────────────────────────────────────────────────

const ADV_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:  { label: 'En attente', bg: '#FEF3C7', color: '#D97706' },
  approved: { label: 'À déduire',  bg: '#FEF9EC', color: '#D4A437' },
  deducted: { label: 'Déduite',    bg: '#CCFBF1', color: '#0D9488' },
  rejected: { label: 'Rejetée',   bg: '#FEE2E2', color: '#DC2626' },
}

function AdvBadge({ status }: { status: string }) {
  const s = ADV_STATUS[status] ?? { label: status, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function AdvanceForm({ candidates, onClose, onSaved }: {
  candidates: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ candidateId: '', amount: '0', requestDate: today, reason: '' })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.candidateId)          { showToast('Employé requis', 'error'); return }
    if (!f.amount || Number(f.amount) <= 0) { showToast('Montant requis', 'error'); return }
    if (!f.reason.trim())        { showToast('Motif requis', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/advances`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, amount: Number(f.amount) }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nouvelle demande d'avance" onClose={onClose} size="md">
      <div className="space-y-3">

        {/* Employé */}
        <Field label="Employé *" value={f.candidateId} onChange={u('candidateId')} options={[
          { value: '', label: '— Choisir —' },
          ...candidates.map(c => ({ value: String(c.id), label: `${c.firstName} ${c.lastName}` })),
        ]} />

        {/* Montant */}
        <Field label="Montant demandé *" type="number" value={f.amount} onChange={u('amount')} />

        {/* Date */}
        <Field label="Date" type="date" value={f.requestDate} onChange={u('requestDate')} />

        {/* Motif */}
        <Field label="Motif de la demande *" value={f.reason} onChange={u('reason')} textarea
          placeholder="Ex: Frais médicaux, scolarité, urgence familiale..." />

        {/* Warning */}
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          ⚠️ L&apos;avance sera soumise à approbation. Une fois approuvée, elle sera automatiquement déduite du prochain bulletin de paie de l&apos;employé.
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? 'Envoi...' : 'Soumettre la demande'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: 'all',      label: 'Tous statuts' },
  { value: 'pending',  label: 'En attente' },
  { value: 'approved', label: 'À déduire' },
  { value: 'deducted', label: 'Déduite' },
  { value: 'rejected', label: 'Rejetée' },
]

export function AdvancesPage() {
  const { showToast } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canApprove = sessionStatus === 'authenticated' && role !== 'operator'

  const [statusF, setStatusF] = useState('all')
  const [creating, setCreating] = useState(false)

  const { adminCountryFilter } = useAppStore()
  const countryQ = adminCountryFilter !== 'all' ? '?countryId=' + adminCountryFilter : ''
  const { data, isLoading } = useQuery({
    queryKey: ['advances', adminCountryFilter],
    queryFn: () => fetch(`${B}/api/advances${countryQ}`).then(r => r.json()),
  })
  const { data: candidatesData } = useQuery({
    queryKey: ['candidates-placed'],
    queryFn: () => fetch(`${B}/api/candidates?status=placed`).then(r => r.json()),
  })

  const all: any[]        = data?.data ?? []
  const candidates: any[] = candidatesData?.data ?? []
  const advances = all.filter(a => statusF === 'all' || a.status === statusF)
  const refresh = () => qc.refetchQueries({ queryKey: ['advances'] })

  const action = async (id: number, act: 'approve' | 'reject') => {
    const res = await fetch(`${B}/api/advances/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    if (res.ok) {
      refresh()
      showToast(act === 'approve' ? 'Avance approuvée' : 'Avance rejetée')
    } else showToast('Erreur', 'error')
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Avances sur salaire"
        subtitle={`${all.length} demande(s)`}
        actions={
          <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>
            Nouvelle avance
          </Btn>
        }
      />

      <div className="flex gap-2">
        <FilterSelect value={statusF} onChange={setStatusF} options={STATUS_OPTS} />
      </div>

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : advances.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucune demande d&apos;avance</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date demande', 'Employé', 'Montant', 'Motif', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {advances.map((a: any) => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">

                  {/* Date */}
                  <td className="px-4 py-3 text-[12px] text-slate-600 whitespace-nowrap">
                    {fmtDate(a.requestDate)}
                  </td>

                  {/* Employé */}
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-800">
                    {a.candidate?.firstName} {a.candidate?.lastName}
                  </td>

                  {/* Montant */}
                  <td className="px-4 py-3 text-[13px] font-bold text-slate-800 whitespace-nowrap">
                    {(a.amount ?? 0).toLocaleString('fr-FR')} Ar
                  </td>

                  {/* Motif */}
                  <td className="px-4 py-3 text-[12px] text-slate-400 max-w-[200px] truncate">
                    {a.reason ?? '—'}
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3"><AdvBadge status={a.status} /></td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {canApprove && a.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => action(a.id, 'approve')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white transition-colors"
                          style={{ background: '#0D9488' }}>
                          Approuver
                        </button>
                        <button
                          onClick={() => action(a.id, 'reject')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors"
                          style={{ color: '#DC2626', borderColor: '#FCA5A5', background: '#FFF5F5' }}>
                          Rejeter
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <AdvanceForm
          candidates={candidates}
          onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Demande enregistrée'); setCreating(false) }}
        />
      )}
    </div>
  )
}
