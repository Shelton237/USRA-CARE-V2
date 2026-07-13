'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, StatusBadge, Badge } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate, currentPeriod, periodLabel } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Check, Plus } from 'lucide-react'

function AttendanceForm({ record, mission, period, canValidate, onClose, onSaved }: {
  record?: any; mission?: any; period: string; canValidate: boolean; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const prorataBase = mission?.prorataBase ?? record?.prorataBase ?? 30
  const [f, setF] = useState({
    daysWorked:       record?.daysWorked       ?? prorataBase,
    absJustified:     record?.absJustified     ?? 0,
    absUnjustified:   record?.absUnjustified   ?? 0,
    paidLeave:        record?.paidLeave        ?? 0,
    holidays:         record?.holidays         ?? 0,
    notes:            record?.notes            ?? '',
  })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const total = Number(f.daysWorked) + Number(f.absJustified) + Number(f.absUnjustified) + Number(f.paidLeave) + Number(f.holidays)
  const pct = prorataBase > 0 ? Math.round((Number(f.daysWorked) / prorataBase) * 100) : 0

  const save = async (validate = false) => {
    setSaving(true)
    try {
      const body: any = {
        missionId:   mission?.id ?? record?.missionId,
        candidateId: mission?.candidateId ?? record?.candidateId,
        countryId:   mission?.countryId ?? record?.countryId,
        period,
        prorataBase,
        daysWorked:  Number(f.daysWorked),
        notes:       f.notes,
        status:      validate ? 'validated' : 'pending',
      }
      let res: Response
      if (record) {
        res = await fetch(`${B}/api/attendance/${record.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ daysWorked: Number(f.daysWorked), notes: f.notes, status: validate ? 'validated' : 'pending' }),
        })
      } else {
        res = await fetch(`${B}/api/attendance`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title={record ? 'Modifier fiche de présence' : 'Nouvelle fiche de présence'} onClose={onClose} size="sm">
      <div className="space-y-3">
        <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 space-y-0.5">
          <div>Base mission : <strong>{prorataBase} jours</strong></div>
          {mission?.startDate && <div>Début mission : <strong>{fmtDate(mission.startDate)}</strong></div>}
          <div>Période : <strong>{periodLabel(period)}</strong></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Jours travaillés" type="number" value={f.daysWorked} onChange={u('daysWorked')} />
          <Field label="Absences justifiées" type="number" value={f.absJustified} onChange={u('absJustified')} hint="Maladie, motif valide..." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Absences non justifiées" type="number" value={f.absUnjustified} onChange={u('absUnjustified')} />
          <Field label="Congés payés" type="number" value={f.paidLeave} onChange={u('paidLeave')} />
        </div>
        <Field label="Jours fériés" type="number" value={f.holidays} onChange={u('holidays')} />

        {/* Aperçu prorata */}
        <div className="p-2.5 rounded-lg border border-teal-100 bg-teal-50">
          <div className="text-xs text-teal-700 space-y-0.5">
            <div>Total jours déclarés : <strong>{total}</strong> {total > 31 && <span className="text-amber-600">⚠️ &gt; 31</span>}</div>
            <div>Coefficient prorata : <strong>{Number(f.daysWorked)}/{prorataBase} = {pct}%</strong></div>
          </div>
        </div>

        <Field label="Notes" value={f.notes} onChange={u('notes')} textarea placeholder="Motifs d'absences, suspensions..." />

        <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
          ℹ️ La fiche doit être validée par le DG/Admin avant la génération du bulletin de paie.
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn variant="secondary" onClick={() => save(false)} disabled={saving}>Enregistrer brouillon</Btn>
          {canValidate && (
            <Btn variant="success" onClick={() => save(true)} disabled={saving}>Enregistrer et valider</Btn>
          )}
        </div>
      </div>
    </Modal>
  )
}

export function AttendancePage() {
  const { showToast } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canValidate = sessionStatus === 'authenticated' && role !== 'operator'

  const [period, setPeriod] = useState(currentPeriod())
  const [creating, setCreating] = useState<any>(null)
  const [editing, setEditing] = useState<any>(null)
  const [showPicker, setShowPicker] = useState(false)

  // Navigation de période
  const movePeriod = (dir: number) => {
    const [y, m] = period.split('-').map(Number)
    const d = new Date(y, m - 1 + dir, 1)
    setPeriod(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`)
  }

  const { data, isLoading } = useQuery({
    queryKey: ['attendance', period],
    queryFn: () => fetch(`${B}/api/attendance?period=${period}`).then(r => r.json()),
  })
  const { data: missionsData } = useQuery({
    queryKey: ['missions-active'],
    queryFn: () => fetch(`${B}/api/missions?status=active`).then(r => r.json()),
  })

  const records: any[]  = (data?.data ?? []).filter((r: any) => r.period === period)
  const missions: any[] = missionsData?.data ?? []
  const refresh = () => qc.refetchQueries({ queryKey: ['attendance', period] })

  // Missions sans fiche pour cette période
  const withRecord = new Set(records.map((r: any) => r.missionId))
  const missing = missions.filter(m => !withRecord.has(m.id))

  const validate = async (id: number) => {
    const res = await fetch(`${B}/api/attendance/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'validated' }),
    })
    if (res.ok) { refresh(); showToast('Fiche validée') }
    else showToast('Erreur', 'error')
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Fiches de présence"
        subtitle={`Période : ${periodLabel(period)}`}
        actions={
          <Btn icon={<Plus size={14}/>} onClick={() => setShowPicker(true)}>
            Nouvelle fiche
          </Btn>
        }
      />

      {/* Sélecteur de période */}
      <div className="flex items-center gap-3">
        <button onClick={() => movePeriod(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronLeft size={16}/></button>
        <span className="font-semibold text-slate-700 text-sm min-w-[140px] text-center">{periodLabel(period)}</span>
        <button onClick={() => movePeriod(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><ChevronRight size={16}/></button>
      </div>

      {/* Missions sans fiche */}
      {missing.length > 0 && (
        <div>
          <div className="text-xs font-semibold text-amber-700 mb-2">⚠️ {missing.length} mission(s) sans fiche de présence pour {periodLabel(period)}</div>
          <div className="flex flex-wrap gap-2">
            {missing.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                <span className="text-amber-800 font-medium">{m.candidate?.firstName} {m.candidate?.lastName} → {m.client?.name}</span>
                <Btn size="sm" variant="warning" onClick={() => setCreating(m)}>Créer</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucune fiche pour {periodLabel(period)}</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Employé','Client','Jours travaillés','Base','Coef','Statut',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => {
                const pct = r.prorataBase > 0 ? Math.round((r.daysWorked / r.prorataBase) * 100) : 0
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.candidate?.firstName} {r.candidate?.lastName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.mission?.client?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 text-center">{r.daysWorked}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs text-center">{r.prorataBase}j</td>
                    <td className="px-4 py-3">
                      <Badge color={pct >= 90 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444'}>{pct}%</Badge>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={r.status}/></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {r.status !== 'validated' && (
                          <button onClick={() => setEditing(r)} className="text-xs text-teal-600 hover:underline font-medium">Modifier</button>
                        )}
                        {canValidate && r.status === 'pending' && (
                          <button onClick={() => validate(r.id)} className="p-1.5 rounded-md hover:bg-emerald-50 hover:text-emerald-600 text-slate-300 transition-colors" title="Valider"><Check size={13}/></button>
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

      {showPicker && (
        <Modal title="Choisir une mission" onClose={() => setShowPicker(false)} size="md">
          <div className="space-y-2">
            {missions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-sm">Aucune mission active</div>
            ) : (
              missions.map((m: any) => (
                <button key={m.id}
                  onClick={() => { setCreating(m); setShowPicker(false) }}
                  className="w-full text-left px-4 py-3 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50 transition-colors">
                  <div className="font-semibold text-slate-800 text-sm">{m.candidate?.firstName} {m.candidate?.lastName}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{m.client?.name}</div>
                </button>
              ))
            )}
          </div>
        </Modal>
      )}
      {creating && (
        <AttendanceForm mission={creating} period={period} canValidate={canValidate} onClose={() => setCreating(null)}
          onSaved={async () => { await refresh(); showToast('Fiche enregistrée'); setCreating(null) }} />
      )}
      {editing && (
        <AttendanceForm record={editing} period={period} canValidate={canValidate} onClose={() => setEditing(null)}
          onSaved={async () => { await refresh(); showToast('Fiche mise à jour'); setEditing(null) }} />
      )}
    </div>
  )
}
