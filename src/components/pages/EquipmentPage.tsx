'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, Badge, FilterSelect } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { fmtDate, fmt } from '@/lib/utils'
import { Plus, Search, Check, X } from 'lucide-react'

const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

// ─── Constants ─────────────────────────────────────────────────────────────

const STATES = [
  { value: 'neuf',       label: 'Neuf' },
  { value: 'usagé',      label: 'Usagé' },
  { value: 'très usagé', label: 'Très usagé' },
]

type Item = { name: string; condition: string; value: string | number }

// ─── EquipmentForm (create + edit) ─────────────────────────────────────────

function EquipmentForm({ equipment, candidates, onClose, onSaved }: {
  equipment?: any; candidates: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const [saving, setSaving] = useState(false)
  const today = new Date().toISOString().slice(0, 10)
  const isEdit = !!equipment

  const [f, setF] = useState({
    candidateId: isEdit ? String(equipment.candidateId) : '',
    missionId:   isEdit && equipment.missionId ? String(equipment.missionId) : '',
    date:        isEdit ? (equipment.date ?? '').slice(0, 10) : today,
    signed:      isEdit ? Boolean(equipment.signed) : false,
    notes:       isEdit ? (equipment.notes ?? '') : '',
  })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const [items, setItems] = useState<Item[]>(
    isEdit && Array.isArray(equipment.items) ? equipment.items : []
  )
  const [newItem, setNewItem] = useState<Item>({ name: '', condition: 'neuf', value: '' })

  // Missions de l'employé sélectionné
  const { data: missionsData } = useQuery({
    queryKey: ['missions-by-candidate-eq', f.candidateId],
    queryFn: () => f.candidateId
      ? fetch(`${B}/api/missions?candidateId=${f.candidateId}&status=active`).then(r => r.json())
      : Promise.resolve({ data: [] }),
    enabled: !!f.candidateId,
  })
  const missions: any[] = missionsData?.data ?? []

  // Symbole monnaie (depuis la mission ou le candidat)
  const sym = (() => {
    if (isEdit && equipment.country?.symbol) return equipment.country.symbol
    const m = missions.find(m => String(m.id) === f.missionId)
    return m?.country?.symbol ?? ''
  })()

  const total = items.reduce((s, it) => s + Number(it.value ?? 0), 0)

  const addItem = () => {
    if (!newItem.name.trim()) { showToast('Nom du matériel requis', 'error'); return }
    setItems(p => [...p, { ...newItem, value: Number(newItem.value) || 0 }])
    setNewItem({ name: '', condition: 'neuf', value: '' })
  }
  const removeItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx))

  const save = async () => {
    if (!f.candidateId) { showToast('Employé requis', 'error'); return }
    if (items.length === 0) { showToast('Ajoutez au moins un article', 'error'); return }
    setSaving(true)
    try {
      const payload = {
        ...f,
        items: items.map(it => ({ ...it, value: Number(it.value) })),
        totalValue: items.reduce((s, it) => s + Number(it.value ?? 0), 0),
      }
      const res = isEdit
        ? await fetch(`${B}/api/equipment/${equipment.id}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`${B}/api/equipment`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  const markReturned = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${B}/api/equipment/${equipment.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnedAt: new Date().toISOString() }),
      })
      if (res.ok) { onSaved(); showToast('Matériels marqués comme restitués') }
      else showToast('Erreur', 'error')
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  return (
    <Modal
      title={isEdit ? 'Matériels remis' : 'Nouvelle remise de matériels'}
      onClose={onClose}
      size="xl"
    >
      <div className="space-y-4">
        {/* Row 1 : 3 colonnes */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Date" type="date" value={f.date} onChange={u('date')} />
          <Field label="Employé *" value={f.candidateId}
            onChange={v => setF(p => ({ ...p, candidateId: v, missionId: '' }))}
            options={[
              { value: '', label: 'Sélectionner...' },
              ...candidates.map(c => ({ value: String(c.id), label: `${c.firstName} ${c.lastName}` })),
            ]} />
          <Field label="Mission (optionnel)" value={f.missionId}
            onChange={u('missionId')}
            disabled={!f.candidateId}
            options={[
              { value: '', label: 'Aucune' },
              ...missions.map((m: any) => ({
                value: String(m.id),
                label: m.client?.companyName ?? m.client?.name ?? `Mission #${m.id}`,
              })),
            ]} />
        </div>

        {/* Ajouter un matériel */}
        <div className="rounded-lg p-3 space-y-3" style={{ background: '#F8FAFC' }}>
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Ajouter un matériel
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'end' }}>
            <Field label="Nom" value={newItem.name}
              onChange={v => setNewItem(p => ({ ...p, name: v }))}
              placeholder="Ex: Uniforme, téléphone, badge..." />
            <Field label="État" value={newItem.condition}
              onChange={v => setNewItem(p => ({ ...p, condition: v }))}
              options={STATES} />
            <Field label="Valeur" type="number" value={String(newItem.value)}
              onChange={v => setNewItem(p => ({ ...p, value: v }))}
              suffix={sym || 'Ar'} />
            <div className="pb-0.5">
              <Btn onClick={addItem}>+ Ajouter</Btn>
            </div>
          </div>
        </div>

        {/* Liste des articles */}
        {items.length > 0 && (
          <div className="rounded-lg overflow-hidden border border-slate-100">
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Matériel', 'État', 'Valeur', ''].map(h => (
                    <th key={h} className={`px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide ${h === 'Valeur' ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="px-3 py-2.5 text-slate-700">{it.name}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">
                      {STATES.find(s => s.value === it.condition)?.label ?? it.condition}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium text-slate-800">
                      {fmt(Number(it.value), sym || 'Ar')}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {(!isEdit || !equipment.returnedAt) && (
                        <button onClick={() => removeItem(i)}
                          className="text-slate-300 hover:text-red-400 transition-colors">
                          <X size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F0FDFA' }}>
                  <td colSpan={2} className="px-3 py-2.5 font-bold text-teal-700">Total</td>
                  <td className="px-3 py-2.5 text-right font-bold text-teal-700">
                    {fmt(total, sym || 'Ar')}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
            </div>
          </div>
        )}

        {/* Signé + Notes */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={f.signed}
            onChange={e => setF(p => ({ ...p, signed: e.target.checked }))}
            className="accent-teal-600 w-4 h-4" />
          <span className="text-sm text-slate-700">Document de remise signé par l&apos;employé</span>
        </label>

        <Field label="Notes" value={f.notes} onChange={u('notes')} textarea
          placeholder="Caution incluse, conditions particulières..." />

        {/* Section Restitution (mode édition, pas encore restitué) */}
        {isEdit && !equipment.returnedAt && (
          <div className="px-4 py-3 rounded-xl" style={{ background: '#FFFBEB', border: '1px solid rgba(245,158,11,0.3)' }}>
            <div className="text-sm font-bold mb-1.5" style={{ color: '#D97706' }}>Restitution</div>
            <p className="text-xs text-slate-500 mb-3">
              Si l&apos;employé a rendu les matériels (fin de mission, démission, licenciement), cliquez ci-dessous.
            </p>
            <Btn variant="warning" onClick={markReturned} disabled={saving}>
              Marquer comme restitué
            </Btn>
          </div>
        )}

        {/* Déjà restitué */}
        {isEdit && equipment.returnedAt && (
          <div className="px-4 py-3 rounded-xl" style={{ background: '#F0FDF4', border: '1px solid rgba(16,185,129,0.2)' }}>
            <div className="flex items-center gap-2 text-sm font-bold" style={{ color: '#10B981' }}>
              <Check size={14} />
              Matériels restitués le {fmtDate(equipment.returnedAt)}
            </div>
          </div>
        )}

        {/* Boutons */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          {(!isEdit || !equipment.returnedAt) && (
            <Btn onClick={save} disabled={saving}>
              {saving ? 'Enregistrement...' : 'Enregistrer'}
            </Btn>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Main page ──────────────────────────────────────────────────────────────

export function EquipmentPage() {
  const { showToast } = useAppStore()
  const qc = useQueryClient()
  const { adminCountryFilter } = useAppStore()
  const [stateF, setStateF] = useState('all')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing] = useState<any>(null)
  const countryQ = adminCountryFilter !== 'all' ? '?countryId=' + adminCountryFilter : ''

  const { data, isLoading } = useQuery({
    queryKey: ['equipment', adminCountryFilter],
    queryFn: () => fetch(`${B}/api/equipment${countryQ}`).then(r => r.json()),
  })
  const { data: candidatesData } = useQuery({
    queryKey: ['candidates-all'],
    queryFn: () => fetch(`${B}/api/candidates`).then(r => r.json()),
  })

  const all: any[]        = data?.data ?? []
  const candidates: any[] = candidatesData?.data ?? []
  const refresh = () => qc.refetchQueries({ queryKey: ['equipment'] })

  const records = all.filter(r => {
    const name = `${r.candidate?.firstName ?? ''} ${r.candidate?.lastName ?? ''}`.toLowerCase()
    const client = (r.mission?.client?.companyName ?? r.mission?.client?.name ?? '').toLowerCase()
    return (
      (stateF === 'all'      ? true
        : stateF === 'active' ? !r.returnedAt
        : !!r.returnedAt) &&
      (!search || name.includes(search.toLowerCase()) || client.includes(search.toLowerCase()))
    )
  })

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Matériels remis"
        subtitle={`${all.length} dossier(s)`}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder="Rechercher..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="pl-7 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-teal-400 w-44" />
            </div>
            <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>
              Nouvelle remise
            </Btn>
          </div>
        }
      />

      <div className="flex gap-2">
        <FilterSelect value={stateF} onChange={setStateF} options={[
          { value: 'all',      label: 'Tous' },
          { value: 'active',   label: 'En cours' },
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
                {['Date remise', 'Employé', 'Client', 'Matériels', 'Valeur', 'Signé', 'État'].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r: any) => {
                const items = Array.isArray(r.items) ? r.items : []
                const sym = r.country?.symbol ?? ''
                const clientName = r.mission?.client?.companyName ?? r.mission?.client?.name ?? '—'
                return (
                  <tr key={r.id}
                    onClick={() => setViewing(r)}
                    className="border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(r.date)}</td>
                    <td className="px-4 py-3 font-medium" style={{ color: '#0D9488' }}>
                      {r.candidate?.firstName} {r.candidate?.lastName}
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{clientName}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">{items.length} article(s)</td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {fmt(r.totalValue, sym)}
                    </td>
                    <td className="px-4 py-3">
                      {r.signed
                        ? <Check size={15} className="text-teal-500" />
                        : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {r.returnedAt
                        ? <Badge color="#10B981">Restitué {fmtDate(r.returnedAt)}</Badge>
                        : <Badge color="#0D9488">En cours</Badge>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <EquipmentForm
          candidates={candidates}
          onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Remise enregistrée'); setCreating(false) }}
        />
      )}
      {viewing && (
        <EquipmentForm
          equipment={viewing}
          candidates={candidates}
          onClose={() => setViewing(null)}
          onSaved={async () => { await refresh(); showToast('Dossier mis à jour'); setViewing(null) }}
        />
      )}
    </div>
  )
}
