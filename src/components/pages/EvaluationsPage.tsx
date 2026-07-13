'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Badge, StatusBadge } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { fmtDate, EVALUATION_CRITERIA } from '@/lib/utils'
import { Plus, Star, Trash2 } from 'lucide-react'

const RECOMMEND_OPTS = [
  { value: 'yes',    label: 'Oui — À garder',            color: '#10B981' },
  { value: 'maybe',  label: 'À reconsidérer',             color: '#F59E0B' },
  { value: 'no',     label: 'Non — À remplacer',          color: '#EF4444' },
]

function Stars({ value, onChange, readonly = false }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(i => (
        <button
          key={i} type="button"
          disabled={readonly}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110'}
        >
          <Star size={14} fill={(hover || value) >= i ? '#F59E0B' : 'none'} color={(hover || value) >= i ? '#F59E0B' : '#CBD5E1'} />
        </button>
      ))}
    </div>
  )
}

const CRITERIA_ICONS: Record<string,string> = {
  punctuality:'⏰', quality:'⭐', behavior:'🤝', appearance:'👔',
  instructions:'📋', discretion:'🤐', honesty:'💎', initiative:'💡', hygiene:'🧼',
}

function EvalForm({ candidates, onClose, onSaved, preselect }: {
  candidates: any[]; onClose: () => void; onSaved: () => void; preselect?: number
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState<any>({
    candidateId: preselect ?? '',
    clientId: '',
    date: today,
    recommend: 'yes',
    comment: '',
    ...Object.fromEntries(EVALUATION_CRITERIA.map(c => [c.id, 0])),
  })
  const u = (k: string) => (v: any) => setF((p: any) => ({ ...p, [k]: v }))

  const { data: missionsData } = useQuery({
    queryKey: ['missions-by-candidate', f.candidateId],
    queryFn: () => f.candidateId
      ? fetch(`${B}/api/missions?candidateId=${f.candidateId}&status=active`).then(r => r.json())
      : Promise.resolve({ data: [] }),
    enabled: !!f.candidateId,
  })
  const activeMissions: any[] = missionsData?.data ?? []

  const rated = EVALUATION_CRITERIA.map(c => Number(f[c.id])).filter(v => v > 0)
  const overall = rated.length ? rated.reduce((s,v) => s+v, 0) / rated.length : 0

  const save = async () => {
    if (!f.candidateId || !f.clientId) { showToast('Employé et client requis', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/evaluations`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, candidateId: Number(f.candidateId), clientId: Number(f.clientId) }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nouvelle évaluation" onClose={onClose} size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employé *" value={String(f.candidateId)} onChange={u('candidateId')} options={[
            { value: '', label: 'Sélectionner...' },
            ...candidates.map(c => ({ value: String(c.id), label: `${c.firstName} ${c.lastName}` })),
          ]} />
          <Field label="Date *" type="date" value={f.date} onChange={u('date')} />
        </div>
        <Field label="Client *" value={String(f.clientId)} onChange={u('clientId')} options={[
          { value: '', label: f.candidateId ? 'Sélectionner...' : '— choisir employé d\'abord —' },
          ...activeMissions.map((m: any) => ({ value: String(m.clientId), label: m.client?.name ?? `Client #${m.clientId}` })),
        ]} />

        <div className="border border-slate-100 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Critères d&apos;évaluation</div>
          {EVALUATION_CRITERIA.map(c => (
            <div key={c.id} className="flex items-center justify-between">
              <span className="text-sm text-slate-700">{CRITERIA_ICONS[c.id]} {c.label}</span>
              <Stars value={Number(f[c.id])} onChange={u(c.id)} />
            </div>
          ))}
          {overall > 0 && (
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Note globale</span>
              <span className="font-bold text-teal-600">{overall.toFixed(1)} / 5</span>
            </div>
          )}
        </div>

        <Field label="Recommandation" value={f.recommend} onChange={u('recommend')} options={RECOMMEND_OPTS.map(r => ({ value: r.value, label: r.label }))} />
        <Field label="Commentaire" value={f.comment} onChange={u('comment')} textarea placeholder="Observations, détails..." />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

export function EvaluationsPage() {
  const { showToast, showConfirm } = useAppStore()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [creating, setCreating] = useState(false)
  const [preselect, setPreselect] = useState<number | undefined>()

  const { data, isLoading } = useQuery({ queryKey: ['evaluations'], queryFn: () => fetch(`${B}/api/evaluations`).then(r => r.json()) })
  const { data: candidatesData } = useQuery({
    queryKey: ['candidates-placed'],
    queryFn: () => fetch(`${B}/api/candidates?status=placed`).then(r => r.json()),
  })
  const evals: any[]   = data?.data ?? []
  const candidates: any[] = candidatesData?.data ?? []
  const refresh = () => qc.refetchQueries({ queryKey: ['evaluations'] })

  // Rappels : candidats placés dont la dernière éval date de plus de 3 mois
  const threeMonthsAgo = new Date(); threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const reminders = candidates.filter(c => {
    const lastEval = evals.filter(e => e.candidateId === c.id).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    return !lastEval || new Date(lastEval.date) < threeMonthsAgo
  })

  const handleDelete = (e: any) => {
    showConfirm({
      title: 'Supprimer cette évaluation ?', message: 'Cette action est irréversible.', danger: true,
      onConfirm: async () => {
        const res = await fetch(`${B}/api/evaluations/${e.id}`, { method: 'DELETE' })
        if (res.ok) { refresh(); showToast('Évaluation supprimée') }
        else showToast('Erreur', 'error')
      },
    })
  }

  const RecBadge = ({ r }: { r: string }) => {
    const opt = RECOMMEND_OPTS.find(o => o.value === r) ?? RECOMMEND_OPTS[0]
    return <Badge color={opt.color}>{opt.label.split('—')[0].trim()}</Badge>
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Évaluations"
        subtitle={`${evals.length} évaluation(s)`}
        actions={<Btn icon={<Plus size={14}/>} onClick={() => { setPreselect(undefined); setCreating(true) }}>Nouvelle évaluation</Btn>}
      />

      {/* Rappels */}
      {reminders.length > 0 && (
        <div className="p-3 rounded-xl border border-amber-200 bg-amber-50">
          <div className="text-xs font-semibold text-amber-700 mb-2">⏰ {reminders.length} évaluation(s) périodique(s) à effectuer</div>
          <div className="flex flex-wrap gap-2">
            {reminders.map(c => (
              <button key={c.id}
                onClick={() => { setPreselect(c.id); setCreating(true) }}
                className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-xs text-amber-800 hover:bg-amber-100 transition-colors font-medium">
                {c.firstName} {c.lastName}
              </button>
            ))}
          </div>
        </div>
      )}

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : evals.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucune évaluation enregistrée</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date','Employé','Client','Note','Recommandation',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evals.map((e: any) => (
                <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-600">{fmtDate(e.date)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{e.candidate?.firstName} {e.candidate?.lastName}</td>
                  <td className="px-4 py-3 text-slate-600">{e.client?.companyName || e.client?.name || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Stars value={Math.round(e.overallRating)} readonly />
                      <span className="text-xs font-semibold text-slate-600">{Number(e.overallRating).toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RecBadge r={e.recommend} /></td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(e)} className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors"><Trash2 size={13}/></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <EvalForm candidates={candidates} preselect={preselect} onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Évaluation enregistrée'); setCreating(false) }} />
      )}
    </div>
  )
}
