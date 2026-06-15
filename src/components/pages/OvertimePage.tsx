'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, StatusBadge, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate, fmt } from '@/lib/utils'
import { Plus, Check, X } from 'lucide-react'

function OvertimeForm({ missions, onClose, onSaved }: {
  missions: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ missionId: '', date: today, hours: '', description: '' })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const selectedMission = missions.find(m => String(m.id) === f.missionId)
  const hourlyRate = selectedMission?.client?.overtimeRate ?? 0
  const estimated = hourlyRate > 0 && f.hours ? fmt(Number(f.hours) * hourlyRate) : null

  const save = async () => {
    if (!f.missionId || !f.date || !f.hours) { showToast('Champs requis manquants', 'error'); return }
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
    <Modal title="Saisir heures supplémentaires" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          ⚠️ Ces heures sup seront soumises à validation par le DG ou l&apos;Admin avant intégration aux factures et paies.
        </div>
        <Field label="Mission *" value={f.missionId} onChange={u('missionId')} options={[
          {value:'',label:'Sélectionner...'},
          ...missions.map(m => ({value:String(m.id),label:`${m.candidate?.firstName} ${m.candidate?.lastName} → ${m.client?.name}`})),
        ]} />
        {selectedMission && hourlyRate > 0 && (
          <div className="text-xs text-slate-500">Taux horaire client : <strong className="text-slate-700">{fmt(hourlyRate)}/h</strong></div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date *" type="date" value={f.date} onChange={u('date')} />
          <Field label="Heures *" type="number" value={f.hours} onChange={u('hours')} placeholder="Ex: 2.5" />
        </div>
        {estimated && <div className="text-xs text-teal-600 font-medium">Montant estimé : {estimated}</div>}
        <Field label="Motif *" value={f.description} onChange={u('description')} textarea placeholder="Ex: Déplacement nocturne, mission week-end..." />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

export function OvertimePage() {
  const { showToast } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canValidate = sessionStatus === 'authenticated' && role !== 'operator'

  const [statusF, setStatusF] = useState('all')
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['overtime'], queryFn: () => fetch(`${B}/api/overtime`).then(r => r.json()) })
  const { data: missionsData } = useQuery({ queryKey: ['missions-active'], queryFn: () => fetch(`${B}/api/missions?status=active`).then(r => r.json()) })

  const all: any[]      = data?.data ?? []
  const missions: any[] = missionsData?.data ?? []
  const records = all.filter(r => statusF === 'all' || r.status === statusF)
  const refresh = () => qc.refetchQueries({ queryKey: ['overtime'] })

  const pending = all.filter(r => r.status === 'pending').length

  const action = async (id: number, act: 'validate' | 'reject') => {
    const res = await fetch(`${B}/api/overtime/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    if (res.ok) { refresh(); showToast(act === 'validate' ? 'Heures sup validées' : 'Heures sup rejetées') }
    else showToast('Erreur', 'error')
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Heures supplémentaires"
        subtitle={`${all.length} enregistrement(s)${pending > 0 ? ` · ${pending} en attente de validation` : ''}`}
        actions={<Btn icon={<Plus size={14}/>} onClick={() => setCreating(true)}>Saisir heures sup</Btn>}
      />

      <div className="flex gap-2">
        <FilterSelect value={statusF} onChange={setStatusF} options={[
          {value:'all',label:'Tous statuts'},{value:'pending',label:'En attente'},
          {value:'validated',label:'Validées'},{value:'rejected',label:'Rejetées'},
        ]} />
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
                {['Date','Employé','Client','Heures','Taux','Total','Motif','Statut',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => (
                <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-600">{fmtDate(r.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.candidate?.firstName} {r.candidate?.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{r.mission?.client?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-slate-800">{r.hours}h</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{fmt(r.hourlyRate)}/h</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-right">{fmt(r.amount)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[160px] truncate">{r.description ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status}/></td>
                  <td className="px-4 py-3">
                    {canValidate && r.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => action(r.id,'validate')} className="p-1.5 rounded-md hover:bg-emerald-50 hover:text-emerald-600 text-slate-300 transition-colors" title="Valider"><Check size={13}/></button>
                        <button onClick={() => action(r.id,'reject')}   className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors" title="Rejeter"><X size={13}/></button>
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
        <OvertimeForm missions={missions} onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Heures sup enregistrées'); setCreating(false) }} />
      )}
    </div>
  )
}
