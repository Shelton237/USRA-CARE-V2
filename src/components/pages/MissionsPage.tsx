'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, SearchBox, Btn, Card, Table, StatusBadge, Badge, FilterSelect, Modal, Field } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { fmtDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

const STATUS_OPTS = [
  { value: 'all', label: 'Tous statuts' }, { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'Active' }, { value: 'completed', label: 'Terminée' },
  { value: 'cancelled', label: 'Annulée' }, { value: 'suspended', label: 'Suspendue' },
]
const TYPE_OPTS = [
  { value: 'all', label: 'Tous types' },
  { value: 'placement', label: 'Placement' },
  { value: 'mise_a_disposition', label: 'Mise à disposition' },
]

export function MissionsPage() {
  const { showToast } = useAppStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [typeF, setTypeF] = useState('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [viewing, setViewing] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['missions', statusF, typeF],
    queryFn: () => fetch(`/api/missions?status=${statusF === 'all' ? '' : statusF}&type=${typeF === 'all' ? '' : typeF}`).then(r => r.json()),
  })
  const missions = (data?.data ?? []).filter((m: any) =>
    !search || `${m.candidate?.firstName} ${m.candidate?.lastName} ${m.client?.name}`.toLowerCase().includes(search.toLowerCase())
  )

  const cols = [
    { key: 'ref', label: '#', render: (r: any) => <span className="font-mono font-bold text-xs">M-{String(r.id).padStart(4, '0')}</span> },
    { key: 'employee', label: 'Employé', render: (r: any) => (
      <div>
        <div className="font-semibold text-sm">{r.candidate?.firstName} {r.candidate?.lastName}</div>
        <div className="text-xs text-slate-400">{r.service?.icon} {r.service?.name}</div>
      </div>
    )},
    { key: 'client', label: 'Client', render: (r: any) => r.client?.name ?? '—' },
    { key: 'type', label: 'Type', render: (r: any) => (
      <Badge color={r.contractType === 'placement' ? '#3B82F6' : '#7C3AED'}>
        {r.contractType === 'placement' ? 'Placement' : 'MAD'}
      </Badge>
    )},
    { key: 'start', label: 'Début', render: (r: any) => fmtDate(r.startDate) },
    { key: 'trial', label: 'Essai', render: (r: any) => {
      if (!r.trialPeriodEnd) return '—'
      if (r.trialConfirmed) return <Badge color="#10B981">Confirmé</Badge>
      const days = Math.ceil((new Date(r.trialPeriodEnd).getTime() - Date.now()) / 86400000)
      if (days < 0) return <Badge color="#F59E0B">À confirmer</Badge>
      return <span className={`text-xs ${days <= 7 ? 'text-amber-600 font-semibold' : 'text-slate-400'}`}>{days}j</span>
    }},
    { key: 'status', label: 'Statut', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', align: 'right' as const, render: (r: any) => (
      <Btn variant="ghost" size="sm" onClick={() => setViewing(r)}>Voir →</Btn>
    )},
  ]

  return (
    <div className="fade-in space-y-4">
      <PageHeader title="Missions" subtitle={`${missions.length} mission(s)`}
        actions={<>
          <SearchBox value={search} onChange={setSearch} />
          <FilterSelect value={statusF} onChange={setStatusF} options={STATUS_OPTS} />
          <FilterSelect value={typeF} onChange={setTypeF} options={TYPE_OPTS} />
          <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>Nouvelle mission</Btn>
        </>}
      />
      <Card noPad>
        <Table columns={cols} data={missions} onRowClick={setViewing} empty={isLoading ? 'Chargement...' : 'Aucune mission'} />
      </Card>
      {(creating || editing) && (
        <MissionForm mission={editing} onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['missions'] }); showToast(editing ? 'Mission modifiée' : 'Mission créée') }} />
      )}
    </div>
  )
}

function MissionForm({ mission, onClose, onSaved }: { mission?: any; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useAppStore()
  const { data: candidatesData } = useQuery({ queryKey: ['candidates', '', 'validated'], queryFn: () => fetch('/api/candidates?status=validated').then(r => r.json()) })
  const { data: clientsData } = useQuery({ queryKey: ['clients', '', ''], queryFn: () => fetch('/api/clients').then(r => r.json()) })
  const candidates = candidatesData?.data ?? []
  const clients = clientsData?.data ?? []

  const [f, setF] = useState(mission ?? {
    countryId: 1, clientId: '', candidateId: '', serviceId: 1,
    contractType: 'placement', startDate: new Date().toISOString().slice(0, 10),
    endDate: '', status: 'pending', clientRate: 0, employeeRate: 0, agencyFee: 0,
    netSalary: 0, commissionRate: 12, prorataBase: 30, trialPeriodEnd: '', notes: '',
  })
  const u = (k: string) => (v: string) => setF((p: any) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.clientId || !f.candidateId) { showToast('Client et employé requis', 'error'); return }
    const res = await fetch(mission ? `/api/missions/${mission.id}` : '/api/missions', {
      method: mission ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    })
    if (res.ok) { onSaved(); onClose() }
    else showToast('Erreur', 'error')
  }

  return (
    <Modal title={mission ? 'Modifier mission' : 'Nouvelle mission'} onClose={onClose} size="lg">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Type de contrat" value={f.contractType} onChange={u('contractType')} options={[
          { value: 'placement', label: 'Placement (forfait)' }, { value: 'mise_a_disposition', label: 'Mise à disposition (MAD)' }
        ]} />
        <Field label="Statut" value={f.status} onChange={u('status')} options={STATUS_OPTS.slice(1)} />
        <Field label="Client" value={f.clientId} onChange={u('clientId')} required options={[{ value: '', label: '— Choisir —' }, ...clients.map((c: any) => ({ value: c.id, label: c.name }))]} />
        <Field label="Employé" value={f.candidateId} onChange={u('candidateId')} required options={[{ value: '', label: '— Choisir —' }, ...candidates.map((c: any) => ({ value: c.id, label: `${c.firstName} ${c.lastName}` }))]} />
        <Field label="Date de début" value={f.startDate} onChange={u('startDate')} type="date" required />
        <Field label="Fin de période d'essai" value={f.trialPeriodEnd} onChange={u('trialPeriodEnd')} type="date" />
        <Field label="Base prorata" value={f.prorataBase} onChange={u('prorataBase')} options={[
          { value: '30', label: '30 jours calendaires' }, { value: '26', label: '26 jours ouvrés' }, { value: '22', label: '22 jours ouvrés' }
        ]} />
        {f.contractType === 'placement' ? <>
          <Field label="Tarif client (mensuel)" value={f.clientRate} onChange={u('clientRate')} type="number" />
          <Field label="Salaire employé" value={f.employeeRate} onChange={u('employeeRate')} type="number" />
          <Field label="Frais agence" value={f.agencyFee} onChange={u('agencyFee')} type="number" />
        </> : <>
          <Field label="Salaire NET cible" value={f.netSalary} onChange={u('netSalary')} type="number" />
          <Field label="Commission USRA (%)" value={f.commissionRate} onChange={u('commissionRate')} type="number" suffix="%" />
        </>}
        <Field label="Notes" value={f.notes} onChange={u('notes')} textarea className="col-span-full" />
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn onClick={save}>{mission ? 'Enregistrer' : 'Créer la mission'}</Btn>
      </div>
    </Modal>
  )
}
