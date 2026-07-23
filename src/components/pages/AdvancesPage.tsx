'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, StatusBadge, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate, fmt } from '@/lib/utils'
import { Plus, Check, X } from 'lucide-react'

function AdvanceForm({ candidates, onClose, onSaved }: {
  candidates: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ candidateId: '', amount: '', requestDate: today, reason: '', paymentMethod: 'mobile_money' })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.candidateId || !f.amount) { showToast('Employé et montant requis', 'error'); return }
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
    <Modal title="Nouvelle avance sur salaire" onClose={onClose} size="sm">
      <div className="space-y-3">
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          ⚠️ L&apos;avance sera soumise à approbation. Une fois approuvée, elle sera automatiquement déduite du prochain bulletin de paie de l&apos;employé.
        </div>
        <Field label="Employé *" value={f.candidateId} onChange={u('candidateId')} options={[
          {value:'',label:'Sélectionner...'},
          ...candidates.map(c => ({value:String(c.id),label:`${c.firstName} ${c.lastName}`})),
        ]} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant demandé *" type="number" value={f.amount} onChange={u('amount')} />
          <Field label="Date" type="date" value={f.requestDate} onChange={u('requestDate')} />
        </div>
        <Field label="Méthode de versement" value={f.paymentMethod} onChange={u('paymentMethod')} options={[
          {value:'mobile_money',label:'Mobile Money'},{value:'cash',label:'Espèces'},{value:'bank_transfer',label:'Virement'},
        ]} />
        <Field label="Motif de la demande *" value={f.reason} onChange={u('reason')} textarea placeholder="Ex: Frais médicaux, scolarité, urgence familiale..." />
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

const STATUS_LABELS: Record<string,string> = {
  pending: 'En attente', approved: 'Approuvée (à déduire)', deducted: 'Déduite', rejected: 'Rejetée',
}

export function AdvancesPage() {
  const { showToast } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const role = (session?.user?.role ?? 'operator') as string
  const canApprove = sessionStatus === 'authenticated' && role !== 'operator'

  const [statusF, setStatusF] = useState('all')
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['advances'], queryFn: () => fetch(`${B}/api/advances`).then(r => r.json()) })
  const { data: candidatesData } = useQuery({ queryKey: ['candidates-placed'], queryFn: () => fetch(`${B}/api/candidates?status=placed`).then(r => r.json()) })

  const all: any[]        = data?.data ?? []
  const candidates: any[] = candidatesData?.data ?? []
  const advances = all.filter(a => statusF === 'all' || a.status === statusF)
  const refresh = () => qc.refetchQueries({ queryKey: ['advances'] })

  const pending = all.filter(a => a.status === 'pending').length

  const action = async (id: number, act: 'approve' | 'reject') => {
    const res = await fetch(`${B}/api/advances/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    if (res.ok) { refresh(); showToast(act === 'approve' ? 'Avance approuvée' : 'Avance rejetée') }
    else showToast('Erreur', 'error')
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Avances sur salaire"
        subtitle={`${all.length} demande(s)${pending > 0 ? ` · ${pending} en attente` : ''}`}
        actions={<Btn icon={<Plus size={14}/>} onClick={() => setCreating(true)}>Nouvelle avance</Btn>}
      />

      <div className="flex gap-2">
        <FilterSelect value={statusF} onChange={setStatusF} options={[
          {value:'all',label:'Tous statuts'},{value:'pending',label:'En attente'},
          {value:'approved',label:'Approuvée (à déduire)'},{value:'deducted',label:'Déduite'},
          {value:'rejected',label:'Rejetée'},
        ]} />
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
                {['Date','Employé','Montant','Motif','Statut',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {advances.map((a: any) => (
                <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 text-xs text-slate-600">{fmtDate(a.requestDate)}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{a.candidate?.firstName} {a.candidate?.lastName}</td>
                  <td className="px-4 py-3 font-bold text-slate-800 text-right">{fmt(a.amount)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px] truncate">{a.reason ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={a.status}/></td>
                  <td className="px-4 py-3">
                    {canApprove && a.status === 'pending' && (
                      <div className="flex gap-1">
                        <button onClick={() => action(a.id,'approve')} className="p-1.5 rounded-md hover:bg-emerald-50 hover:text-emerald-600 text-slate-300 transition-colors" title="Approuver"><Check size={13}/></button>
                        <button onClick={() => action(a.id,'reject')}  className="p-1.5 rounded-md hover:bg-red-50 hover:text-red-500 text-slate-300 transition-colors"   title="Rejeter"><X size={13}/></button>
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
        <AdvanceForm candidates={candidates} onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Demande enregistrée'); setCreating(false) }} />
      )}
    </div>
  )
}
