'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Badge } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { fmtDate, EVALUATION_CRITERIA } from '@/lib/utils'
import { Plus, Star } from 'lucide-react'

const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

// ─── Constants ─────────────────────────────────────────────────────────────

const RECOMMEND_OPTS = [
  { value: 'yes', label: 'Oui, à garder' },
  { value: 'see', label: 'À voir / À reconsidérer' },
  { value: 'no',  label: 'Non, à remplacer' },
]

const REC_BADGE: Record<string, { label: string; color: string }> = {
  yes:   { label: 'Oui',    color: '#10B981' },
  see:   { label: 'À voir', color: '#F59E0B' },
  maybe: { label: 'À voir', color: '#F59E0B' },
  no:    { label: 'Non',    color: '#EF4444' },
}

const REC_DETAIL: Record<string, { label: string; color: string }> = {
  yes:   { label: 'À garder',       color: '#10B981' },
  see:   { label: 'À reconsidérer', color: '#F59E0B' },
  maybe: { label: 'À reconsidérer', color: '#F59E0B' },
  no:    { label: 'À remplacer',    color: '#EF4444' },
}

const CRITERIA_META: Record<string, { icon: string }> = {
  punctuality:  { icon: '⏰' },
  quality:      { icon: '⭐' },
  behavior:     { icon: '🤝' },
  appearance:   { icon: '👔' },
  instructions: { icon: '📋' },
  discretion:   { icon: '🤐' },
  honesty:      { icon: '💎' },
  initiative:   { icon: '💡' },
  hygiene:      { icon: '🧼' },
}

// ─── Stars ─────────────────────────────────────────────────────────────────

function Stars({ value, onChange, size = 14, readonly = false }: {
  value: number; onChange?: (v: number) => void; size?: number; readonly?: boolean
}) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" disabled={readonly}
          onClick={() => onChange?.(i)}
          onMouseEnter={() => !readonly && setHover(i)}
          onMouseLeave={() => !readonly && setHover(0)}
          className={readonly ? 'cursor-default' : 'cursor-pointer transition-transform hover:scale-110'}>
          <Star size={size}
            fill={(hover || value) >= i ? '#F59E0B' : 'none'}
            color={(hover || value) >= i ? '#F59E0B' : '#CBD5E1'} />
        </button>
      ))}
    </div>
  )
}

// ─── EvaluationDetail ──────────────────────────────────────────────────────

function EvaluationDetail({ ev, onClose }: { ev: any; onClose: () => void }) {
  const rec = REC_DETAIL[ev.recommend] ?? REC_DETAIL['yes']
  const clientName = ev.client?.name ?? ev.client?.companyName ?? '—'

  return (
    <Modal
      title={`Évaluation — ${ev.candidate?.firstName ?? ''} ${ev.candidate?.lastName ?? ''}`}
      subtitle={`${fmtDate(ev.date)} — ${clientName}`}
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4">
        {/* Header: Note globale + badge */}
        <div className="flex items-center justify-between px-5 py-4 rounded-xl"
          style={{ background: '#F0FDFA', border: '1px solid #CCFBF1' }}>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#5EEAD4' }}>
              Note globale
            </div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <span className="text-4xl font-black" style={{ color: '#0D9488' }}>
                {Number(ev.overallRating ?? 0).toFixed(1)}
              </span>
              <span className="text-sm text-slate-400">/ 5</span>
            </div>
            <Stars value={Math.round(Number(ev.overallRating ?? 0))} readonly size={18} />
          </div>
          <Badge color={rec.color} solid>{rec.label}</Badge>
        </div>

        {/* Critères 2 colonnes */}
        <div className="grid grid-cols-2 gap-2">
          {EVALUATION_CRITERIA.map(c => {
            const meta = CRITERIA_META[c.id] ?? { icon: '•' }
            return (
              <div key={c.id}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                style={{ background: '#F8FAFC' }}>
                <span className="text-[12.5px] text-slate-700">
                  <span className="mr-1.5">{meta.icon}</span>{c.label}
                </span>
                <Stars value={Number(ev[c.id] ?? 0)} readonly size={14} />
              </div>
            )
          })}
        </div>

        {/* Commentaire */}
        {ev.comment && (
          <div className="px-4 py-3 rounded-xl" style={{ background: '#F8FAFC' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Commentaire
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">{ev.comment}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}

// ─── EvalForm ──────────────────────────────────────────────────────────────

function EvalForm({ candidates, onClose, onSaved, preselectId }: {
  candidates: any[]; onClose: () => void; onSaved: () => void; preselectId?: number
}) {
  const { showToast } = useAppStore()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState<any>({
    candidateId: preselectId ? String(preselectId) : '',
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
  const seenClients = new Map<string, string>()
  activeMissions.forEach(m => {
    if (m.clientId) seenClients.set(String(m.clientId), m.client?.name ?? m.client?.companyName ?? `Client #${m.clientId}`)
  })
  const clientOptions = Array.from(seenClients.entries()).map(([value, label]) => ({ value, label }))

  const updateCriterion = (key: string, val: number) =>
    setF((p: any) => ({ ...p, [key]: val }))

  const overall = (() => {
    const vals = EVALUATION_CRITERIA.map(c => Number(f[c.id])).filter(v => v > 0)
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0
  })()

  const save = async () => {
    if (!f.candidateId) { showToast('Employé requis', 'error'); return }
    if (!f.clientId)    { showToast('Client requis', 'error');  return }
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
    <Modal
      title="Nouvelle évaluation"
      subtitle="Évaluation périodique ou de fin de mission"
      onClose={onClose}
      size="lg"
    >
      <div className="space-y-4">
        {/* Row 1 : 3 colonnes */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date" type="date" value={f.date} onChange={u('date')} />
          <Field label="Employé *" value={f.candidateId}
            onChange={v => setF((p: any) => ({ ...p, candidateId: v, clientId: '' }))}
            options={[
              { value: '', label: 'Sélectionner...' },
              ...candidates.map(c => ({ value: String(c.id), label: `${c.firstName} ${c.lastName}` })),
            ]} />
          <Field label="Client (mission) *" value={f.clientId} onChange={u('clientId')}
            disabled={!f.candidateId}
            options={[
              { value: '', label: f.candidateId ? 'Sélectionner...' : '— choisir employé d\'abord —' },
              ...clientOptions,
            ]} />
        </div>

        {/* Critères d'évaluation */}
        <div>
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2.5">
            Critères d&apos;évaluation
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EVALUATION_CRITERIA.map(c => {
              const meta = CRITERIA_META[c.id] ?? { icon: '•' }
              return (
                <div key={c.id}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg"
                  style={{ background: '#F1F5F9' }}>
                  <span className="text-[12.5px] text-slate-700">
                    <span className="mr-1.5">{meta.icon}</span>{c.label}
                  </span>
                  <Stars value={Number(f[c.id])} onChange={v => updateCriterion(c.id, v)} size={17} />
                </div>
              )
            })}
          </div>
        </div>

        {/* Note globale */}
        <div className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: '#F0FDFA', border: '1px solid #CCFBF1' }}>
          <span className="text-sm font-bold text-slate-700">Note globale</span>
          <div className="flex items-center gap-3">
            <Stars value={overall} readonly size={18} />
            <span className="text-xl font-black" style={{ color: '#0D9488' }}>
              {overall.toFixed(1)}
            </span>
          </div>
        </div>

        {/* Recommandation */}
        <Field
          label="Recommanderiez-vous de garder cet employé ?"
          value={f.recommend}
          onChange={u('recommend')}
          options={RECOMMEND_OPTS.map(r => ({ value: r.value, label: r.label }))}
        />

        {/* Commentaire */}
        <Field
          label="Commentaire"
          value={f.comment}
          onChange={u('comment')}
          textarea
          placeholder="Observations particulières, points forts, axes d'amélioration..."
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────

export function EvaluationsPage() {
  const qc = useQueryClient()
  const { showToast, adminCountryFilter } = useAppStore()
  const [creating, setCreating] = useState<false | number | true>(false)
  const [viewing, setViewing] = useState<any>(null)
  const countryQ = adminCountryFilter !== 'all' ? '?countryId=' + adminCountryFilter : ''

  const { data, isLoading } = useQuery({
    queryKey: ['evaluations', adminCountryFilter],
    queryFn: () => fetch(`${B}/api/evaluations${countryQ}`).then(r => r.json()),
  })
  const { data: candidatesData } = useQuery({
    queryKey: ['candidates-placed'],
    queryFn: () => fetch(`${B}/api/candidates?status=placed`).then(r => r.json()),
  })
  const evals: any[]      = data?.data ?? []
  const candidates: any[] = candidatesData?.data ?? []
  const refresh = () => qc.refetchQueries({ queryKey: ['evaluations'] })

  // Rappels : placés sans éval récente (> 3 mois)
  const cutoff = new Date(); cutoff.setMonth(cutoff.getMonth() - 3)
  const reminders = candidates.filter(c => {
    const last = evals
      .filter(e => e.candidateId === c.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
    return !last || new Date(last.date) < cutoff
  })

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Évaluations"
        subtitle={`${evals.length} évaluation(s)`}
        actions={
          <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>
            Nouvelle évaluation
          </Btn>
        }
      />

      {/* Rappels périodiques */}
      {reminders.length > 0 && (
        <Card title={`${reminders.length} évaluation(s) périodique(s) à effectuer`}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 8 }}>
            {reminders.slice(0, 9).map(c => {
              const last = evals
                .filter(e => e.candidateId === c.id)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
              return (
                <div key={c.id}
                  onClick={() => setCreating(c.id)}
                  className="cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                  style={{ padding: '9px 11px', background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 12.5, color: '#0F172A' }}>
                    {c.firstName} {c.lastName}
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                    Dernière éval : {last ? fmtDate(last.date) : 'jamais'}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Table */}
      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : evals.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucune évaluation enregistrée</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Employé', 'Client', 'Note', 'Garde'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evals.map((e: any) => {
                const rec = REC_BADGE[e.recommend] ?? REC_BADGE['yes']
                const clientName = e.client?.name ?? e.client?.companyName ?? '—'
                return (
                  <tr key={e.id}
                    onClick={() => setViewing(e)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(e.date)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#0D9488' }}>
                      {e.candidate?.firstName} {e.candidate?.lastName}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{clientName}</td>
                    <td className="px-4 py-3">
                      <Stars value={Math.round(Number(e.overallRating ?? 0))} readonly size={14} />
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={rec.color}>{rec.label}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modals */}
      {creating !== false && (
        <EvalForm
          candidates={candidates}
          preselectId={typeof creating === 'number' ? creating : undefined}
          onClose={() => setCreating(false)}
          onSaved={async () => {
            await refresh()
            showToast('Évaluation enregistrée')
            setCreating(false)
          }}
        />
      )}
      {viewing && (
        <EvaluationDetail ev={viewing} onClose={() => setViewing(null)} />
      )}
    </div>
  )
}
