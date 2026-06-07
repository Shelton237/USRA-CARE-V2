'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, StatusBadge } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate, currentPeriod, periodLabel } from '@/lib/utils'
import { Check } from 'lucide-react'

// ─── Attendance Form ──────────────────────────────────────────────────────────

function AttendanceForm({ record, mission, period, onClose, onSaved }: {
  record?: any; mission?: any; period: string; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)

  const prorataBase = mission?.prorataBase ?? record?.mission?.prorataBase ?? record?.prorataBase ?? 30
  const clientRate  = mission?.employeeRate ?? record?.mission?.employeeRate ?? 0
  const contractType = mission?.contractType ?? record?.mission?.contractType ?? 'placement'
  const sym         = mission?.country?.symbol ?? record?.mission?.country?.symbol ?? 'Ar'

  const [f, setF] = useState({
    daysWorked:     record?.daysWorked     ?? prorataBase,
    absJustified:   record?.absJustified   ?? 0,
    absUnjustified: record?.absUnjustified ?? 0,
    paidLeave:      record?.paidLeave      ?? 0,
    holidays:       record?.holidays       ?? 0,
    notes:          record?.notes          ?? '',
  })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const total = Number(f.daysWorked) + Number(f.absJustified) + Number(f.absUnjustified) + Number(f.paidLeave) + Number(f.holidays)
  const pct   = prorataBase > 0 ? Math.round((Number(f.daysWorked) / prorataBase) * 100) : 0
  const salaryPro = contractType === 'placement' && clientRate > 0
    ? Math.round(clientRate * (Number(f.daysWorked) / prorataBase))
    : null

  const candidateName = mission
    ? `${mission.candidate?.firstName ?? ''} ${mission.candidate?.lastName ?? ''}`.trim()
    : `${record?.candidate?.firstName ?? ''} ${record?.candidate?.lastName ?? ''}`.trim()
  const clientName = mission?.client?.name ?? record?.mission?.client?.name ?? ''
  const missionStart = mission?.startDate ?? record?.mission?.startDate

  const save = async (validate = false) => {
    setSaving(true)
    try {
      const body: any = {
        daysWorked:     Number(f.daysWorked),
        absJustified:   Number(f.absJustified),
        absUnjustified: Number(f.absUnjustified),
        paidLeave:      Number(f.paidLeave),
        holidays:       Number(f.holidays),
        notes:          f.notes || null,
        status:         validate ? 'validated' : 'pending',
      }

      let res: Response
      if (record?.id) {
        res = await fetch(`${B}/api/attendance/${record.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        res = await fetch(`${B}/api/attendance`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...body,
            missionId:   mission.id,
            candidateId: mission.candidateId,
            countryId:   mission.countryId,
            period,
            prorataBase,
          }),
        })
      }
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal
      title="Fiche de présence mensuelle"
      subtitle={`${candidateName}${clientName ? ` — ${clientName}` : ''} — ${periodLabel(period)}`}
      onClose={onClose}
      size="md"
    >
      <div className="space-y-3">
        {/* Info mission */}
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-0.5">
          <div>Base mission : <strong>{prorataBase} jours</strong> {prorataBase === 30 ? 'calendaires' : 'ouvrés'}</div>
          {missionStart && <div>Date début mission : <strong>{fmtDate(missionStart)}</strong></div>}
        </div>

        {/* Jours grid */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Jours travaillés" type="number" value={f.daysWorked} onChange={u('daysWorked')} />
          <Field label="Absences justifiées (maladie...)" type="number" value={f.absJustified} onChange={u('absJustified')} />
          <Field label="Absences non justifiées" type="number" value={f.absUnjustified} onChange={u('absUnjustified')} />
          <Field label="Congés payés pris" type="number" value={f.paidLeave} onChange={u('paidLeave')} />
          <Field label="Jours fériés" type="number" value={f.holidays} onChange={u('holidays')} />

          {/* Total box */}
          <div className="p-3 rounded-lg flex flex-col justify-center"
            style={{ background: total > 31 ? '#FFFBEB' : '#ECFDF5' }}>
            <div className="font-bold text-sm" style={{ color: total > 31 ? '#F59E0B' : '#10B981' }}>
              Total : {total} jours
            </div>
            {total > 31 && <div className="text-[11px] mt-0.5" style={{ color: '#F59E0B' }}>⚠️ Vérifiez les totaux</div>}
          </div>
        </div>

        <Field label="Notes" value={f.notes} onChange={u('notes')} textarea placeholder="Précisions (motifs des absences, suspensions...)" />

        {/* Aperçu prorata */}
        <div className="p-2.5 rounded-lg text-xs space-y-1" style={{ background: 'rgba(13,148,136,0.08)', color: '#0F766E' }}>
          <div>
            <strong>Aperçu prorata :</strong>{' '}
            {Number(f.daysWorked)} / {prorataBase} = <strong>{pct}%</strong>
          </div>
          {salaryPro !== null && (
            <div>→ Salaire proratisé : <strong>{salaryPro.toLocaleString('fr-FR')} {sym}</strong></div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn variant="secondary" onClick={() => save(false)} disabled={saving}>
            Enregistrer (brouillon)
          </Btn>
          <Btn variant="success" onClick={() => save(true)} disabled={saving}>
            Enregistrer et valider
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function periodOptions() {
  const opts = []
  for (let off = -3; off <= 1; off++) {
    const d = new Date()
    d.setMonth(d.getMonth() + off)
    const p = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    opts.push({ value: p, label: periodLabel(p) })
  }
  return opts
}

export function AttendancePage() {
  const { showToast } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canValidate = sessionStatus === 'authenticated' && role !== 'operator'

  const [period, setPeriod]   = useState(currentPeriod())
  const [creating, setCreating] = useState<any>(null)
  const [editing, setEditing]   = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', period],
    queryFn: () => fetch(`${B}/api/attendance?period=${period}`).then(r => r.json()),
  })
  const { data: missionsData } = useQuery({
    queryKey: ['missions-active'],
    queryFn: () => fetch(`${B}/api/missions?status=active`).then(r => r.json()),
  })

  const records: any[]  = data?.data ?? []
  const missions: any[] = missionsData?.data ?? []
  const refresh = () => qc.refetchQueries({ queryKey: ['attendance', period] })

  const withRecord = new Set(records.map((r: any) => r.missionId))
  const missing    = missions.filter(m => !withRecord.has(m.id))

  const validate = async (id: number) => {
    const res = await fetch(`${B}/api/attendance/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'validated' }),
    })
    if (res.ok) { refresh(); showToast('Fiche validée') }
    else showToast('Erreur validation', 'error')
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Fiches de présence"
        subtitle={`Période : ${periodLabel(period)}`}
        actions={
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
          >
            {periodOptions().map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        }
      />

      {/* Info banner */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
        ℹ️ La fiche de présence doit être validée par le DG/Admin <strong className="mx-1">avant</strong> la génération du bulletin de paie. Elle sert au calcul du prorata.
      </div>

      {/* Missions sans fiche */}
      {missing.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            Missions sans fiche de présence pour {periodLabel(period)} ({missing.length})
          </p>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {missing.map((m: any) => (
              <div key={m.id}
                className="flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg">
                <div>
                  <div className="text-[13px] font-semibold text-slate-800">
                    {m.candidate?.firstName} {m.candidate?.lastName}
                  </div>
                  <div className="text-[11px] text-slate-500">{m.client?.name}</div>
                </div>
                <Btn size="sm" onClick={() => setCreating(m)}>Créer</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table fiches du mois */}
      <Card noPad>
        <div className="px-4 py-3 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">Fiches du mois ({records.length})</span>
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucune fiche pour cette période</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Employé', 'Client', 'Jours travaillés', 'Abs. just.', 'Abs. non just.', 'Congés', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => {
                const pct = r.prorataBase > 0 ? Math.round((r.daysWorked / r.prorataBase) * 100) : 0
                const pctColor = pct >= 90 ? '#059669' : pct >= 50 ? '#D97706' : '#DC2626'
                return (
                  <tr key={r.id} onClick={() => setEditing(r)}
                    className="border-b border-slate-50 hover:bg-slate-50/60 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {r.candidate?.firstName} {r.candidate?.lastName}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-slate-600">{r.mission?.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-slate-800">{r.daysWorked}</span>
                      <span className="text-[10px] text-slate-400 ml-1">/{r.prorataBase}j</span>
                      <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ color: pctColor, background: pctColor + '18' }}>{pct}%</span>
                    </td>
                    <td className="px-4 py-3 text-center text-[12px] text-slate-600">{r.absJustified ?? 0}</td>
                    <td className="px-4 py-3 text-center text-[12px] text-slate-600">{r.absUnjustified ?? 0}</td>
                    <td className="px-4 py-3 text-center text-[12px] text-slate-600">{r.paidLeave ?? 0}</td>
                    <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canValidate && r.status === 'pending' && (
                          <button
                            onClick={e => { e.stopPropagation(); validate(r.id) }}
                            className="p-1.5 rounded-md hover:bg-emerald-50 hover:text-emerald-600 text-slate-300 transition-colors"
                            title="Valider">
                            <Check size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <AttendanceForm
          mission={creating}
          period={period}
          onClose={() => setCreating(null)}
          onSaved={async () => { await refresh(); showToast('Fiche enregistrée'); setCreating(null) }}
        />
      )}
      {editing && (
        <AttendanceForm
          record={editing}
          period={period}
          onClose={() => setEditing(null)}
          onSaved={async () => { await refresh(); showToast('Fiche mise à jour'); setEditing(null) }}
        />
      )}
    </div>
  )
}
