'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Badge, StatusBadge, StatCard, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate, COMPLAINT_TYPES } from '@/lib/utils'
import { Plus } from 'lucide-react'

const SEVERITY = [
  { value: 'low',      label: 'Faible',      color: '#94A3B8' },
  { value: 'moderate', label: 'Modérée',     color: '#F59E0B' },
  { value: 'high',     label: 'Grave',       color: '#EF4444' },
  { value: 'critical', label: 'Très grave',  color: '#7F1D1D' },
]
const CHANNELS = [
  { value: 'phone',   label: 'Téléphone' }, { value: 'sms', label: 'SMS' },
  { value: 'whatsapp',label: 'WhatsApp' }, { value: 'email', label: 'Email' },
  { value: 'visit',   label: 'Visite agence' },
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

function SeverityBadge({ s }: { s: string }) {
  const opt = SEVERITY.find(x => x.value === s) ?? SEVERITY[1]
  return <Badge color={opt.color}>{opt.label}</Badge>
}

const WORKFLOW_STEPS = ['received','in_progress','confrontation','resolved']

function ComplaintDetail({ complaint, canEdit, onClose, onUpdated }: {
  complaint: any; canEdit: boolean; onClose: () => void; onUpdated: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [decision, setDecision] = useState(complaint.decision ?? '')
  const [decisionDetail, setDecisionDetail] = useState(complaint.decisionDetail ?? '')
  const [saving, setSaving] = useState(false)

  const patch = async (status: string, extra: any = {}) => {
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/complaints/${complaint.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...extra }),
      })
      if (res.ok) { onUpdated(); showToast('Statut mis à jour') }
      else showToast('Erreur', 'error')
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  const candidateNames = (complaint.candidates ?? []).map((cc: any) => `${cc.candidate?.firstName} ${cc.candidate?.lastName}`).join(', ')

  return (
    <Modal title="Détail de la plainte" onClose={onClose} size="md">
      <div className="space-y-4">
        {/* Info */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-xs text-slate-500">Date</span><div className="font-medium">{fmtDate(complaint.date)}</div></div>
          <div><span className="text-xs text-slate-500">Canal</span><div className="font-medium">{CHANNELS.find(c=>c.value===complaint.receivedVia)?.label ?? complaint.receivedVia}</div></div>
          <div><span className="text-xs text-slate-500">Client</span><div className="font-medium">{complaint.client?.companyName ?? complaint.client?.name}</div></div>
          <div><span className="text-xs text-slate-500">Gravité</span><div className="mt-0.5"><SeverityBadge s={complaint.severity}/></div></div>
          <div><span className="text-xs text-slate-500">Type</span><div className="font-medium">{COMPLAINT_TYPES.find(t=>t.id===complaint.type)?.label ?? complaint.type}</div></div>
          <div><span className="text-xs text-slate-500">Statut</span><div className="mt-0.5"><StatusBadge status={complaint.status}/></div></div>
          {candidateNames && <div className="col-span-2"><span className="text-xs text-slate-500">Employé(s) concerné(s)</span><div className="font-medium">{candidateNames}</div></div>}
        </div>
        <div className="p-3 rounded-lg bg-slate-50 text-sm text-slate-700">{complaint.description}</div>

        {/* Workflow */}
        <div className="flex items-center gap-1">
          {WORKFLOW_STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className="flex-1 h-1.5 rounded-full" style={{ background: WORKFLOW_STEPS.indexOf(complaint.status) >= i ? '#0D9488' : '#E2E8F0' }} />
              {i === WORKFLOW_STEPS.length - 1 && <div className="w-2 h-2 rounded-full" style={{ background: complaint.status === s ? '#0D9488' : '#E2E8F0' }} />}
            </div>
          ))}
        </div>
        <div className="flex gap-2 text-xs text-slate-500 justify-between">
          <span>Reçue</span><span>Investigation</span><span>Confrontation</span><span>Résolue</span>
        </div>

        {/* Actions workflow */}
        {canEdit && (
          <div className="space-y-3">
            {['in_progress','confrontation'].includes(complaint.status) && (
              <>
                <Field label="Décision" value={decision} onChange={setDecision} options={[{value:'',label:'Sélectionner...'}, ...DECISIONS.map(d=>({value:d.value,label:d.label}))]} />
                {decision === 'financial' && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                    ⚠️ Une sanction financière sera automatiquement appliquée sur la prochaine paie de l&apos;employé.
                  </div>
                )}
                <Field label="Détail de la décision" value={decisionDetail} onChange={setDecisionDetail} textarea />
              </>
            )}
            <div className="flex flex-wrap gap-2">
              {complaint.status === 'received'      && <Btn size="sm" variant="warning" onClick={() => patch('in_progress')} disabled={saving}>Lancer investigation</Btn>}
              {complaint.status === 'in_progress'   && <Btn size="sm" variant="purple" onClick={() => patch('confrontation')} disabled={saving}>Confrontation</Btn>}
              {['in_progress','confrontation'].includes(complaint.status) && (
                <>
                  <Btn size="sm" variant="success" onClick={() => patch('resolved', { decision, decisionDetail })} disabled={saving}>Marquer résolue</Btn>
                  <Btn size="sm" variant="secondary" onClick={() => patch('unfounded', { decision, decisionDetail })} disabled={saving}>Classer sans suite</Btn>
                </>
              )}
            </div>
          </div>
        )}
        <div className="flex justify-end pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Fermer</Btn>
        </div>
      </div>
    </Modal>
  )
}

function ComplaintForm({ clients, candidates, onClose, onSaved }: {
  clients: any[]; candidates: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ clientId: '', date: today, receivedVia: 'phone', type: 'retard', severity: 'moderate', description: '' })
  const [selCandidates, setSelCandidates] = useState<number[]>([])
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const toggleCandidate = (id: number) => setSelCandidates(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id])

  const save = async () => {
    if (!f.clientId || !f.type || !f.severity || !f.description) { showToast('Champs requis manquants', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/complaints`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, clientId: Number(f.clientId), candidateIds: selCandidates }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Enregistrer une plainte" onClose={onClose} size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client plaignant *" value={f.clientId} onChange={u('clientId')} options={[{value:'',label:'Sélectionner...'}, ...clients.map(c=>({value:String(c.id),label:c.companyName??c.name}))]} />
          <Field label="Date *" type="date" value={f.date} onChange={u('date')} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Canal" value={f.receivedVia} onChange={u('receivedVia')} options={CHANNELS} />
          <Field label="Gravité *" value={f.severity} onChange={u('severity')} options={SEVERITY.map(s=>({value:s.value,label:s.label}))} />
        </div>
        <Field label="Type de plainte *" value={f.type} onChange={u('type')} options={COMPLAINT_TYPES.map(t=>({value:t.id,label:t.label}))} />

        {candidates.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-600 mb-1.5">Employé(s) concerné(s)</div>
            <div className="flex flex-wrap gap-2">
              {candidates.map(c => (
                <label key={c.id} className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" checked={selCandidates.includes(c.id)} onChange={() => toggleCandidate(c.id)} />
                  <span className="text-sm text-slate-700">{c.firstName} {c.lastName}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <Field label="Description des faits *" value={f.description} onChange={u('description')} textarea placeholder="Décrivez précisément les faits rapportés..." />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

export function ComplaintsPage() {
  const { showToast } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canEdit = sessionStatus === 'authenticated' && role !== 'operator'

  const [statusF, setStatusF] = useState('all')
  const [severityF, setSeverityF] = useState('all')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<any>(null)

  const { data, isLoading } = useQuery({ queryKey: ['complaints'], queryFn: () => fetch(`${B}/api/complaints`).then(r => r.json()) })
  const { data: clientsData }    = useQuery({ queryKey: ['clients-list'], queryFn: () => fetch(`${B}/api/clients`).then(r => r.json()) })
  const { data: candidatesData } = useQuery({ queryKey: ['candidates-placed'], queryFn: () => fetch(`${B}/api/candidates?status=placed`).then(r => r.json()) })

  const all: any[]     = data?.data ?? []
  const clients: any[] = clientsData?.data ?? []
  const candidates: any[] = candidatesData?.data ?? []

  const complaints = all.filter(c =>
    (statusF   === 'all' || c.status   === statusF) &&
    (severityF === 'all' || c.severity === severityF)
  )
  const refresh = () => qc.refetchQueries({ queryKey: ['complaints'] })

  const stats = {
    open:     all.filter(c => ['received','in_progress','confrontation'].includes(c.status)).length,
    critical: all.filter(c => ['high','critical'].includes(c.severity)).length,
    resolved: all.filter(c => c.status === 'resolved').length,
    unfounded:all.filter(c => c.status === 'unfounded').length,
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Plaintes clients"
        subtitle={`${all.length} plainte(s)`}
        actions={<Btn icon={<Plus size={14}/>} onClick={() => setCreating(true)}>Enregistrer plainte</Btn>}
      />

      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Ouvertes"    value={stats.open}      color="#F59E0B" />
        <StatCard label="Cas graves"  value={stats.critical}  color="#EF4444" />
        <StatCard label="Résolues"    value={stats.resolved}  color="#10B981" />
        <StatCard label="Sans suite"  value={stats.unfounded} color="#94A3B8" />
      </div>

      <div className="flex gap-2">
        <FilterSelect value={statusF} onChange={setStatusF} options={[
          { value:'all',label:'Tous statuts'}, {value:'received',label:'Reçue'},
          {value:'in_progress',label:'En investigation'},{value:'confrontation',label:'Confrontation'},
          {value:'resolved',label:'Résolue'},{value:'unfounded',label:'Sans suite'},
        ]} />
        <FilterSelect value={severityF} onChange={setSeverityF} options={[
          {value:'all',label:'Toutes gravités'}, ...SEVERITY.map(s=>({value:s.value,label:s.label})),
        ]} />
      </div>

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : complaints.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucune plainte</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date','Client','Employé(s)','Type','Gravité','Statut',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {complaints.map((c: any) => {
                const names = (c.candidates ?? []).map((cc: any) => `${cc.candidate?.firstName} ${cc.candidate?.lastName}`).join(', ')
                return (
                  <tr key={c.id} onClick={() => setViewing(c)} className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer">
                    <td className="px-4 py-3 text-xs text-slate-600">{fmtDate(c.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{c.client?.companyName ?? c.client?.name}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{names || '—'}</td>
                    <td className="px-4 py-3 text-slate-600 text-xs">{COMPLAINT_TYPES.find(t=>t.id===c.type)?.label ?? c.type}</td>
                    <td className="px-4 py-3"><SeverityBadge s={c.severity}/></td>
                    <td className="px-4 py-3"><StatusBadge status={c.status}/></td>
                    <td className="px-4 py-3 text-xs text-teal-600 font-medium">Voir →</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <ComplaintForm clients={clients} candidates={candidates} onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Plainte enregistrée'); setCreating(false) }} />
      )}
      {viewing && (
        <ComplaintDetail complaint={viewing} canEdit={canEdit} onClose={() => setViewing(null)}
          onUpdated={async () => { await refresh(); setViewing(null) }} />
      )}
    </div>
  )
}
