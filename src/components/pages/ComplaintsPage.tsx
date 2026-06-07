'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Badge, StatCard, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate, COMPLAINT_TYPES } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'

const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

// ─── Constants ─────────────────────────────────────────────────────────────

const SEVERITY = [
  { value: 'low',      label: 'Faible',     color: '#94A3B8' },
  { value: 'moderate', label: 'Modérée',    color: '#F59E0B' },
  { value: 'high',     label: 'Grave',      color: '#EF4444' },
  { value: 'critical', label: 'Très grave', color: '#7F1D1D' },
]
const CHANNELS = [
  { value: 'phone',    label: 'Téléphone' },
  { value: 'sms',      label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email',    label: 'Email' },
  { value: 'visit',    label: 'Visite agence' },
]
const DECISIONS = [
  { value: 'warning',        label: 'Avertissement simple' },
  { value: 'formal_warning', label: 'Avertissement formel écrit' },
  { value: 'suspension',     label: 'Mise à pied temporaire' },
  { value: 'financial',      label: 'Sanction financière' },
  { value: 'replacement',    label: 'Remplacement chez le client' },
  { value: 'training',       label: 'Formation imposée' },
  { value: 'end_mission',    label: 'Fin de mission chez ce client' },
  { value: 'termination',    label: 'Licenciement / fin de collaboration' },
  { value: 'client_gesture', label: 'Geste commercial envers le client' },
  { value: 'apology',        label: 'Excuses formelles' },
  { value: 'unfounded',      label: 'Plainte non fondée — classée' },
]
const WORKFLOW_STEPS = [
  { key: 'received',      label: 'Reçue' },
  { key: 'in_progress',   label: 'En Investigation' },
  { key: 'confrontation', label: 'Confrontation' },
  { key: 'resolved',      label: 'Résolue' },
  { key: 'unfounded',     label: 'Classée sans suite' },
]

function sevLabel(s: string) {
  return SEVERITY.find(x => x.value === s)?.label ?? s
}
function sevColor(s: string) {
  return SEVERITY.find(x => x.value === s)?.color ?? '#94A3B8'
}
function statusLabel(s: string) {
  return WORKFLOW_STEPS.find(x => x.key === s)?.label ?? s
}
const STATUS_COLORS: Record<string, string> = {
  received:      '#3B82F6',
  in_progress:   '#F59E0B',
  confrontation: '#8B5CF6',
  resolved:      '#10B981',
  unfounded:     '#94A3B8',
}

// ─── ComplaintForm (create + edit) ─────────────────────────────────────────

function ComplaintForm({ complaint, clients, onClose, onSaved, canEdit }: {
  complaint?: any; clients: any[]; onClose: () => void; onSaved: () => void; canEdit: boolean
}) {
  const { showToast } = useAppStore()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const isEdit = !!complaint

  const [f, setF] = useState({
    date:         isEdit ? (complaint.date ?? '').slice(0, 10) : today,
    receivedVia:  complaint?.receivedVia  ?? 'phone',
    severity:     complaint?.severity     ?? 'moderate',
    clientId:     complaint?.clientId     ? String(complaint.clientId) : '',
    type:         complaint?.type         ?? 'retard',
    description:  complaint?.description  ?? '',
    decision:     complaint?.decision     ?? '',
    decisionDetail: complaint?.decisionDetail ?? '',
    status:       complaint?.status       ?? 'received',
  })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  // Candidates checked (candidateId numbers)
  const [selCandidates, setSelCandidates] = useState<number[]>(
    isEdit ? (complaint.candidates ?? []).map((cc: any) => cc.candidateId ?? cc.candidate?.id).filter(Boolean) : []
  )

  // Load candidates with missions at selected client
  const { data: missionsData } = useQuery({
    queryKey: ['missions-by-client', f.clientId],
    queryFn: () => f.clientId
      ? fetch(`${B}/api/missions?clientId=${f.clientId}&status=active`).then(r => r.json())
      : Promise.resolve({ data: [] }),
    enabled: !!f.clientId,
  })
  const clientMissions: any[] = missionsData?.data ?? []
  const seenIds = new Set<number>()
  const candidatesForClient = clientMissions
    .filter(m => { if (!m.candidateId || seenIds.has(m.candidateId)) return false; seenIds.add(m.candidateId); return true })
    .map(m => ({ id: m.candidateId, ...m.candidate }))

  const toggleCandidate = (id: number) =>
    setSelCandidates(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  const isResolving = isEdit && (f.status === 'in_progress' || f.status === 'confrontation')
  const isAlreadyDone = isEdit && (f.status === 'resolved' || f.status === 'unfounded')

  const save = async (newStatus?: string) => {
    if (!f.clientId)    { showToast('Client requis', 'error');      return }
    if (!f.description) { showToast('Description requise', 'error'); return }
    setSaving(true)
    try {
      if (isEdit) {
        const body: any = {
          date: f.date, receivedVia: f.receivedVia, severity: f.severity,
          type: f.type, description: f.description,
          decision: f.decision || null, decisionDetail: f.decisionDetail || null,
          candidateIds: selCandidates,
        }
        if (newStatus) {
          body.status = newStatus
          if (f.decision) body.decision = f.decision
          if (f.decisionDetail) body.decisionDetail = f.decisionDetail
        }
        const res = await fetch(`${B}/api/complaints/${complaint.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (res.ok) { onSaved() }
        else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
      } else {
        const res = await fetch(`${B}/api/complaints`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...f, clientId: Number(f.clientId), candidateIds: selCandidates }),
        })
        if (res.ok) { onSaved() }
        else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
      }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal
      title={isEdit ? 'Plainte client' : 'Nouvelle plainte'}
      subtitle={isEdit ? `Reçue le ${fmtDate(complaint.date)}` : "Enregistrement d'une plainte client"}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-4">
        {/* Row 1 : 3 colonnes */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date" type="date" value={f.date} onChange={u('date')} />
          <Field label="Canal" value={f.receivedVia} onChange={u('receivedVia')} options={CHANNELS} />
          <Field label="Gravité" value={f.severity} onChange={u('severity')}
            options={SEVERITY.map(s => ({ value: s.value, label: s.label }))} />
        </div>

        {/* Row 2 : 2 colonnes */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client plaignant *" value={f.clientId}
            onChange={v => setF(p => ({ ...p, clientId: v }))}
            options={[{ value: '', label: 'Sélectionner...' }, ...clients.map(c => ({ value: String(c.id), label: c.companyName ?? c.name }))]} />
          <Field label="Type de plainte" value={f.type} onChange={u('type')}
            options={COMPLAINT_TYPES.map(t => ({ value: t.id, label: t.label }))} />
        </div>

        {/* Employé(s) concerné(s) */}
        {f.clientId && (
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-2">
              Employé(s) concerné(s) <span className="text-red-500">*</span>
            </div>
            {candidatesForClient.length === 0 ? (
              <div className="px-3 py-2.5 rounded-lg text-xs text-slate-400" style={{ background: '#F8FAFC' }}>
                Aucun employé en mission active chez ce client
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 7 }}>
                {candidatesForClient.map(c => {
                  const checked = selCandidates.includes(c.id)
                  return (
                    <label key={c.id}
                      className="flex items-center gap-2 cursor-pointer transition-colors"
                      style={{
                        padding: '8px 11px', borderRadius: 6,
                        background: checked ? '#F0FDFA' : '#F8FAFC',
                        border: `1px solid ${checked ? '#0D9488' : '#E2E8F0'}`,
                      }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleCandidate(c.id)} className="accent-teal-600" />
                      <span className="text-[12.5px] text-slate-700">{c.firstName} {c.lastName}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        <Field label="Description des faits *" value={f.description} onChange={u('description')} textarea
          placeholder="Décrivez précisément les faits rapportés par le client, dates, contexte..." />

        {/* Workflow (mode édition seulement) */}
        {isEdit && (
          <div className="px-4 py-3 rounded-lg" style={{ background: '#F8FAFC' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2.5">
              Workflow de traitement
            </div>
            <div className="flex flex-wrap gap-2">
              {WORKFLOW_STEPS.map(step => {
                const active = f.status === step.key
                return (
                  <span key={step.key} style={{
                    padding: '5px 11px',
                    background: active ? '#0D9488' : '#fff',
                    color: active ? '#fff' : '#94A3B8',
                    border: `1px solid ${active ? '#0D9488' : '#E2E8F0'}`,
                    borderRadius: 5, fontSize: 11.5, fontWeight: active ? 700 : 500,
                  }}>
                    {step.label}
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Décision et résolution (in_progress ou confrontation) */}
        {isResolving && canEdit && (
          <div className="px-4 py-3 rounded-lg space-y-3"
            style={{ background: '#F0FDF4', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#10B981' }}>
              Décision et résolution
            </div>
            <Field label="Décision" value={f.decision} onChange={u('decision')}
              options={[{ value: '', label: 'Sélectionner...' }, ...DECISIONS.map(d => ({ value: d.value, label: d.label }))]} />
            {f.decision === 'financial' && (
              <div className="px-3 py-2 rounded-lg text-xs font-semibold text-amber-700"
                style={{ background: '#FFFBEB' }}>
                ⚠ Une sanction financière sera automatiquement appliquée sur la prochaine paie de l&apos;employé.
              </div>
            )}
            <Field label="Détail de la décision" value={f.decisionDetail} onChange={u('decisionDetail')} textarea
              placeholder="Précisez : montant si sanction financière, durée si mise à pied, date de remplacement..." />
          </div>
        )}

        {/* Affichage résolution existante (déjà résolu) */}
        {isAlreadyDone && complaint.decision && (
          <div className="px-4 py-3 rounded-lg" style={{ background: '#F8FAFC' }}>
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Résolution</div>
            <div className="text-sm text-slate-700 space-y-1">
              <div><span className="text-xs text-slate-400">Décision : </span>{DECISIONS.find(d => d.value === complaint.decision)?.label ?? complaint.decision}</div>
              {complaint.decisionDetail && <div><span className="text-xs text-slate-400">Détail : </span>{complaint.decisionDetail}</div>}
              {complaint.resolvedAt && <div><span className="text-xs text-slate-400">Résolue le : </span>{fmtDate(complaint.resolvedAt)}</div>}
            </div>
          </div>
        )}

        {/* Boutons action */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {isEdit && canEdit && f.status === 'received' && (
              <Btn variant="warning" onClick={() => save('in_progress')} disabled={saving}>
                Lancer investigation
              </Btn>
            )}
            {isEdit && canEdit && f.status === 'in_progress' && (
              <Btn variant="warning" onClick={() => save('confrontation')} disabled={saving}>
                Organiser confrontation
              </Btn>
            )}
            {isEdit && canEdit && (f.status === 'in_progress' || f.status === 'confrontation') && (
              <>
                <Btn variant="success" onClick={() => save('resolved')} disabled={saving}>
                  Marquer résolue
                </Btn>
                <Btn variant="ghost" onClick={() => save('unfounded')} disabled={saving}
                  className="!text-red-500 hover:!bg-red-50">
                  Classer sans suite
                </Btn>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
            {(!isEdit || canEdit) && (
              <Btn onClick={() => save()} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Btn>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export function ComplaintsPage() {
  const { data: session, status: sessionStatus } = useSession()
  const { showToast } = useAppStore()
  const qc = useQueryClient()
  const role = (session?.user?.role ?? 'operator') as string
  const canEdit = sessionStatus === 'authenticated' && role !== 'operator'

  const [search, setSearch] = useState('')
  const { adminCountryFilter } = useAppStore()
  const [statusF, setStatusF] = useState('all')
  const [severityF, setSeverityF] = useState('all')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const countryQ = adminCountryFilter !== 'all' ? '?countryId=' + adminCountryFilter : ''

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', adminCountryFilter],
    queryFn: () => fetch(`${B}/api/complaints${countryQ}`).then(r => r.json()),
  })
  const { data: clientsData } = useQuery({
    queryKey: ['clients-list'],
    queryFn: () => fetch(`${B}/api/clients`).then(r => r.json()),
  })

  const all: any[]     = data?.data ?? []
  const clients: any[] = clientsData?.data ?? []
  const refresh = () => qc.refetchQueries({ queryKey: ['complaints'] })

  const complaints = all.filter(c => {
    const clientName = (c.client?.companyName ?? c.client?.name ?? '').toLowerCase()
    const empNames = (c.candidates ?? [])
      .map((cc: any) => `${cc.candidate?.firstName ?? ''} ${cc.candidate?.lastName ?? ''}`).join(' ').toLowerCase()
    return (
      (statusF   === 'all' || c.status   === statusF) &&
      (severityF === 'all' || c.severity === severityF) &&
      (!search || clientName.includes(search.toLowerCase()) || empNames.includes(search.toLowerCase()))
    )
  })

  const stats = {
    open:      all.filter(c => ['received','in_progress','confrontation'].includes(c.status)).length,
    critical:  all.filter(c => ['high','critical'].includes(c.severity)).length,
    resolved:  all.filter(c => c.status === 'resolved').length,
    unfounded: all.filter(c => c.status === 'unfounded').length,
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Plaintes clients"
        subtitle={`${all.length} plainte(s)`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text" placeholder="Rechercher..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 w-44"
              />
            </div>
            <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>
              Enregistrer plainte
            </Btn>
          </div>
        }
      />

      {/* KPI */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Plaintes ouvertes" value={stats.open}      color="#F59E0B" />
        <StatCard label="Cas graves"        value={stats.critical}  color="#EF4444" />
        <StatCard label="Résolues"          value={stats.resolved}  color="#10B981" />
        <StatCard label="Sans suite"        value={stats.unfounded} color="#94A3B8" />
      </div>

      {/* Filtres */}
      <div className="flex gap-2">
        <FilterSelect value={statusF} onChange={setStatusF} options={[
          { value: 'all',          label: 'Tous statuts' },
          { value: 'received',     label: 'Reçue' },
          { value: 'in_progress',  label: 'En investigation' },
          { value: 'confrontation',label: 'Confrontation' },
          { value: 'resolved',     label: 'Résolue' },
          { value: 'unfounded',    label: 'Sans suite' },
        ]} />
        <FilterSelect value={severityF} onChange={setSeverityF} options={[
          { value: 'all',      label: 'Toutes gravités' },
          ...SEVERITY.map(s => ({ value: s.value, label: s.label })),
        ]} />
      </div>

      {/* Table */}
      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : complaints.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucune plainte</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Client', 'Employé(s)', 'Type', 'Gravité', 'Statut'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {complaints.map((c: any) => {
                const names = (c.candidates ?? [])
                  .map((cc: any) => `${cc.candidate?.firstName ?? ''} ${cc.candidate?.lastName ?? ''}`.trim())
                  .filter(Boolean).join(', ')
                return (
                  <tr key={c.id}
                    onClick={() => setViewing(c)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(c.date)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#0D9488' }}>
                      {c.client?.companyName ?? c.client?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{names || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">
                      {COMPLAINT_TYPES.find(t => t.id === c.type)?.label ?? c.type}
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={sevColor(c.severity)}>{sevLabel(c.severity)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge color={STATUS_COLORS[c.status] ?? '#94A3B8'}>{statusLabel(c.status)}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modals */}
      {creating && (
        <ComplaintForm
          clients={clients}
          canEdit={canEdit}
          onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Plainte enregistrée'); setCreating(false) }}
        />
      )}
      {viewing && (
        <ComplaintForm
          complaint={viewing}
          clients={clients}
          canEdit={canEdit}
          onClose={() => setViewing(null)}
          onSaved={async () => { await refresh(); showToast('Plainte mise à jour'); setViewing(null) }}
        />
      )}
    </div>
  )
}
