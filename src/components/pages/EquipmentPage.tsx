'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Badge, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { fmtDate, fmt } from '@/lib/utils'
import { Plus, Trash2, PackageCheck } from 'lucide-react'

const STATES = [
  { value: 'new',      label: 'Neuf' },
  { value: 'used',     label: 'Usagé' },
  { value: 'worn',     label: 'Très usagé' },
]

function EquipmentForm({ candidates, onClose, onSaved }: {
  candidates: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const [f, setF] = useState({ candidateId: '', missionId: '', date: today, signed: false, notes: '' })
  const [items, setItems] = useState<{name:string;state:string;value:string}[]>([])
  const [newItem, setNewItem] = useState({ name: '', state: 'new', value: '' })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const { data: missionsData } = useQuery({
    queryKey: ['missions-by-candidate-eq', f.candidateId],
    queryFn: () => f.candidateId ? fetch(`${B}/api/missions?candidateId=${f.candidateId}&status=active`).then(r => r.json()) : Promise.resolve({ data: [] }),
    enabled: !!f.candidateId,
  })
  const missions: any[] = missionsData?.data ?? []

  const addItem = () => {
    if (!newItem.name) { showToast('Nom de l\'article requis', 'error'); return }
    setItems(p => [...p, { ...newItem }])
    setNewItem({ name: '', state: 'new', value: '' })
  }
  const removeItem = (i: number) => setItems(p => p.filter((_, j) => j !== i))
  const total = items.reduce((s, it) => s + Number(it.value ?? 0), 0)

  const save = async () => {
    if (!f.candidateId) { showToast('Employé requis', 'error'); return }
    if (items.length === 0) { showToast('Ajoutez au moins un article', 'error'); return }
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/equipment`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, items: items.map(it => ({ ...it, value: Number(it.value) })) }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal title="Nouvelle remise de matériels" onClose={onClose} size="md">
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Employé *" value={f.candidateId} onChange={u('candidateId')} options={[{value:'',label:'Sélectionner...'}, ...candidates.map(c=>({value:String(c.id),label:`${c.firstName} ${c.lastName}`}))]} />
          <Field label="Date *" type="date" value={f.date} onChange={u('date')} />
        </div>
        {missions.length > 0 && (
          <Field label="Mission (optionnel)" value={f.missionId} onChange={u('missionId')} options={[{value:'',label:'Aucune'}, ...missions.map((m:any)=>({value:String(m.id),label:m.client?.name??`Mission #${m.id}`}))]} />
        )}

        {/* Ajout d'articles */}
        <div className="border border-slate-200 rounded-lg p-3 space-y-2">
          <div className="text-xs font-semibold text-slate-600">Articles remis</div>
          <div className="flex gap-2 items-end">
            <div className="flex-1"><Field label="Nom" value={newItem.name} onChange={v => setNewItem(p=>({...p,name:v}))} placeholder="Ex: Uniforme, badge..." /></div>
            <div className="w-28"><Field label="État" value={newItem.state} onChange={v => setNewItem(p=>({...p,state:v}))} options={STATES} /></div>
            <div className="w-24"><Field label="Valeur" type="number" value={newItem.value} onChange={v => setNewItem(p=>({...p,value:v}))} /></div>
            <Btn size="sm" variant="secondary" onClick={addItem}>+ Ajouter</Btn>
          </div>
          {items.length > 0 && (
            <table className="w-full text-xs mt-2">
              <thead><tr className="border-b border-slate-100"><th className="text-left py-1">Article</th><th className="text-left py-1">État</th><th className="text-right py-1">Valeur</th><th></th></tr></thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-1.5 text-slate-700">{it.name}</td>
                    <td className="py-1.5 text-slate-500">{STATES.find(s=>s.value===it.state)?.label}</td>
                    <td className="py-1.5 text-right font-medium">{it.value ? fmt(Number(it.value)) : '—'}</td>
                    <td><button onClick={() => removeItem(i)} className="p-0.5 hover:text-red-500 text-slate-300"><Trash2 size={11}/></button></td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr className="bg-teal-50"><td colSpan={2} className="px-1 py-1.5 text-teal-700 font-semibold">Total</td><td className="text-right py-1.5 text-teal-700 font-bold pr-4">{fmt(total)}</td><td></td></tr></tfoot>
            </table>
          )}
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={f.signed} onChange={e => setF(p=>({...p,signed:e.target.checked}))} />
          <span className="text-sm text-slate-700">Document de remise signé par l&apos;employé</span>
        </label>
        <Field label="Notes" value={f.notes} onChange={u('notes')} textarea placeholder="Caution incluse, conditions particulières..." />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </Modal>
  )
}

export function EquipmentPage() {
  const { showToast, showConfirm } = useAppStore()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [stateF, setStateF] = useState('all')
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({ queryKey: ['equipment'], queryFn: () => fetch(`${B}/api/equipment`).then(r => r.json()) })
  const { data: candidatesData } = useQuery({ queryKey: ['candidates-all'], queryFn: () => fetch(`${B}/api/candidates`).then(r => r.json()) })

  const all: any[]        = data?.data ?? []
  const candidates: any[] = candidatesData?.data ?? []
  const records = all.filter(r => stateF === 'all' || (stateF === 'active' ? !r.returnedAt : !!r.returnedAt))
  const refresh = () => qc.refetchQueries({ queryKey: ['equipment'] })

  const markReturned = (r: any) => {
    showConfirm({
      title: 'Marquer comme restitué ?',
      message: `Les matériels de ${r.candidate?.firstName} ${r.candidate?.lastName} ont été rendus.`,
      danger: false,
      onConfirm: async () => {
        const res = await fetch(`${B}/api/equipment/${r.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ returnedAt: new Date().toISOString() }),
        })
        if (res.ok) { refresh(); showToast('Matériels marqués restitués') }
        else showToast('Erreur', 'error')
      },
    })
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Matériels remis"
        subtitle={`${all.length} dossier(s)`}
        actions={<Btn icon={<Plus size={14}/>} onClick={() => setCreating(true)}>Nouvelle remise</Btn>}
      />

      <div className="flex gap-2">
        <FilterSelect value={stateF} onChange={setStateF} options={[
          { value: 'all', label: 'Tous' },
          { value: 'active', label: 'En cours' },
          { value: 'returned', label: 'Restitués' },
        ]} />
      </div>

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : records.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">Aucun dossier matériel</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date remise','Employé','Client','Articles','Valeur','Signé','État',''].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => {
                const items = Array.isArray(r.items) ? r.items : []
                return (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-600">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.candidate?.firstName} {r.candidate?.lastName}</td>
                    <td className="px-4 py-3 text-slate-600">{r.mission?.client?.name ?? '—'}</td>
                    <td className="px-4 py-3"><Badge color="#0D9488">{items.length}</Badge></td>
                    <td className="px-4 py-3 font-medium text-slate-800 text-right">{fmt(r.totalValue)}</td>
                    <td className="px-4 py-3">
                      <Badge color={r.signed ? '#10B981' : '#F59E0B'}>{r.signed ? '✓ Signé' : 'Non signé'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.returnedAt
                        ? <Badge color="#10B981">Restitué {fmtDate(r.returnedAt)}</Badge>
                        : <Badge color="#0D9488">En cours</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      {!r.returnedAt && (
                        <button onClick={() => markReturned(r)} className="p-1.5 rounded-md hover:bg-amber-50 hover:text-amber-600 text-slate-300 transition-colors" title="Marquer restitué">
                          <PackageCheck size={13}/>
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <EquipmentForm candidates={candidates} onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Remise enregistrée'); setCreating(false) }} />
      )}
    </div>
  )
}
