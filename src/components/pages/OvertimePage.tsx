'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate, fmt } from '@/lib/utils'
import { Plus } from 'lucide-react'

// ─── Status badge overtime ────────────────────────────────────────────────────

const OT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'En attente', bg: '#FEF3C7', color: '#D97706' },
  validated: { label: 'Disponible', bg: '#CCFBF1', color: '#0D9488' },
  approved:  { label: 'Disponible', bg: '#CCFBF1', color: '#0D9488' },
  rejected:  { label: 'Rejetée',   bg: '#FEE2E2', color: '#DC2626' },
}

function OtBadge({ status }: { status: string }) {
  const s = OT_STATUS[status] ?? { label: status, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function OvertimeForm({ missions, onClose, onSaved }: {
  missions: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ missionId: '', date: today, hours: '1', description: '' })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const selectedMission = missions.find(m => String(m.id) === f.missionId)
  const hourlyRate = selectedMission?.client?.overtimeRate ?? 0
  const sym        = selectedMission?.country?.symbol ?? 'Ar'
  const estimated  = hourlyRate > 0 && f.hours
    ? (Number(f.hours) * hourlyRate).toLocaleString('fr-FR')
    : null

  const save = async () => {
    if (!f.missionId)    { showToast('Mission requise', 'error'); return }
    if (!f.date)         { showToast('Date requise', 'error'); return }
    if (!f.hours || Number(f.hours) <= 0) { showToast('Nombre d\'heures requis', 'error'); return }
    if (!f.description.trim()) { showToast('Motif requis', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/overtime`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, hours: Number(f.hours) }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Saisir heures supplémentaires" onClose={onClose} size="md">
      <div className="space-y-3">

        {/* Mission */}
        <Field label="Mission *" value={f.missionId} onChange={u('missionId')} options={[
          { value: '', label: '— Choisir —' },
          ...missions.map(m => ({
            value: String(m.id),
            label: `${m.candidate?.firstName} ${m.candidate?.lastName} → ${m.client?.name}`,
          })),
        ]} />

        {/* Taux horaire (affiché après sélection mission) */}
        {selectedMission && (
          <div className="text-xs text-slate-500 -mt-1">
            Taux horaire client :{' '}
            <strong className="text-slate-700">
              {hourlyRate > 0 ? `${hourlyRate.toLocaleString('fr-FR')} ${sym}/h` : 'Non défini'}
            </strong>
          </div>
        )}

        {/* Date */}
        <Field label="Date *" type="date" value={f.date} onChange={u('date')} />

        {/* Nombre d'heures */}
        <Field label="Nombre d'heures" type="number" value={f.hours} onChange={u('hours')} placeholder="Ex: 2.5" />

        {/* Montant estimé */}
        {estimated && (
          <div className="text-xs font-medium" style={{ color: '#0D9488' }}>
            Montant estimé : <strong>{estimated} {sym}</strong>
          </div>
        )}

        {/* Motif */}
        <Field label="Motif *" value={f.description} onChange={u('description')} textarea
          placeholder="Ex: Déplacement nocturne, mission week-end..." />

        {/* Warning */}
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          ⚠️ Ces heures sup seront soumises à validation par le DG ou l&apos;Admin avant intégration aux factures et paies.
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: 'all',       label: 'Tous statuts' },
  { value: 'pending',   label: 'En attente' },
  { value: 'validated', label: 'Disponible' },
  { value: 'rejected',  label: 'Rejetées' },
]

export function OvertimePage() {
  const { showToast, adminCountryFilter } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canValidate = sessionStatus === 'authenticated' && role !== 'operator'
  const countryQ = adminCountryFilter !== 'all' ? '?countryId=' + adminCountryFilter : ''

  const [statusF, setStatusF] = useState('all')
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['overtime', adminCountryFilter],
    queryFn: () => fetch(`${B}/api/overtime${countryQ}`).then(r => r.json()),
  })
  const { data: missionsData } = useQuery({
    queryKey: ['missions-active'],
    queryFn: () => fetch(`${B}/api/missions?status=active`).then(r => r.json()),
  })

  const all: any[]      = data?.data ?? []
  const missions: any[] = missionsData?.data ?? []
  const records = all.filter(r => statusF === 'all' || r.status === statusF)
  const refresh = () => qc.refetchQueries({ queryKey: ['overtime'] })

  const action = async (id: number, act: 'validate' | 'reject') => {
    const res = await fetch(`${B}/api/overtime/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    if (res.ok) {
      refresh()
      showToast(act === 'validate' ? 'Heures sup validées' : 'Heures sup rejetées')
    } else showToast('Erreur', 'error')
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Heures supplémentaires"
        subtitle={`${all.length} enregistrement(s) · validation requise par DG/Admin`}
        actions={
          <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>
            Saisir heures sup
          </Btn>
        }
      />

      <div className="flex gap-2">
        <FilterSelect value={statusF} onChange={setStatusF} options={STATUS_OPTS} />
      </div>

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucun enregistrement</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Employé', 'Client', 'Heures', 'Taux', 'Total', 'Motif', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">

                  {/* Date */}
                  <td className="px-4 py-3 text-[12px] text-slate-600 whitespace-nowrap">
                    {fmtDate(r.date)}
                  </td>

                  {/* Employé — teal comme la référence */}
                  <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: '#0D9488' }}>
                    {r.candidate?.firstName} {r.candidate?.lastName}
                  </td>

                  {/* Client */}
                  <td className="px-4 py-3 text-[12px] text-slate-600">{r.mission?.client?.name ?? '—'}</td>

                  {/* Heures */}
                  <td className="px-4 py-3 text-[13px] font-bold text-slate-800">{r.hours}h</td>

                  {/* Taux */}
                  <td className="px-4 py-3 text-[12px] text-slate-600 whitespace-nowrap">
                    {(r.hourlyRate ?? 0).toLocaleString('fr-FR')} Ar
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 text-[13px] font-bold text-slate-800 whitespace-nowrap">
                    {(r.amount ?? 0).toLocaleString('fr-FR')} Ar
                  </td>

                  {/* Motif */}
                  <td className="px-4 py-3 text-[12px] text-slate-500 max-w-[160px] truncate">
                    {r.description ?? '—'}
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3"><OtBadge status={r.status} /></td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    {canValidate && r.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => action(r.id, 'validate')}
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold text-white transition-colors"
                          style={{ background: '#0D9488' }}>
                          Valider
                        </button>
                        <button
                          onClick={() => action(r.id, 'reject')}
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
        <OvertimeForm
          missions={missions}
          onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Heures sup enregistrées'); setCreating(false) }}
        />
      )}
    </div>
  )
}
