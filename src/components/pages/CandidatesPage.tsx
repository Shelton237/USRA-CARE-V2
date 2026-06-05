'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, SearchBox, Btn, Card, Table, StatusBadge, StarRating, FilterSelect, Modal, Tabs, Field } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { CANDIDATE_STATUSES, fmtDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

const STATUS_OPTIONS = [{ value: 'all', label: 'Tous statuts' }, ...CANDIDATE_STATUSES.map(s => ({ value: s.id, label: s.label }))]

export function CandidatesPage() {
  const { showToast } = useAppStore()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusF, setStatusF] = useState('all')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [viewing, setViewing] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, statusF],
    queryFn: () => fetch(`/api/candidates?search=${search}&status=${statusF === 'all' ? '' : statusF}`).then(r => r.json()),
  })

  const candidates = data?.data ?? []

  const cols = [
    { key: 'name', label: 'Nom', render: (r: any) => (
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#0D9488' }}>
          {r.firstName[0]}{r.lastName[0]}
        </div>
        <div>
          <div className="font-semibold text-sm">{r.firstName} {r.lastName}</div>
          <div className="text-xs text-slate-400">{r.phone}</div>
        </div>
      </div>
    )},
    { key: 'service', label: 'Métier', render: (r: any) => {
      const s = r.specialties?.find((sp: any) => sp.isPrimary)
      return s ? <span>{s.service.icon} {s.service.name}</span> : '—'
    }},
    { key: 'country', label: 'Pays', render: (r: any) => r.country?.name ?? '—' },
    { key: 'rating', label: 'Note', render: (r: any) => {
      const evals = r.evaluations ?? []
      if (!evals.length) return <span className="text-xs text-slate-400">Aucune</span>
      const avg = evals.reduce((s: number, e: any) => s + e.overallRating, 0) / evals.length
      return <StarRating value={Math.round(avg)} readonly size={14} />
    }},
    { key: 'status', label: 'Statut', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', align: 'right' as const, render: (r: any) => (
      <Btn variant="ghost" size="sm" onClick={() => setViewing(r)}>Voir →</Btn>
    )},
  ]

  return (
    <div className="fade-in space-y-4">
      <PageHeader title="Candidats / Employés" subtitle={`${candidates.length} dossier(s)`}
        actions={<>
          <SearchBox value={search} onChange={setSearch} placeholder="Nom, téléphone..." />
          <FilterSelect value={statusF} onChange={setStatusF} options={STATUS_OPTIONS} />
          <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>Nouveau candidat</Btn>
        </>}
      />
      <Card noPad>
        <Table columns={cols} data={candidates} onRowClick={setViewing} empty={isLoading ? 'Chargement...' : 'Aucun candidat trouvé'} />
      </Card>

      {(creating || editing) && (
        <CandidateForm candidate={editing} onClose={() => { setCreating(false); setEditing(null) }}
          onSaved={() => { qc.invalidateQueries({ queryKey: ['candidates'] }); showToast(editing ? 'Candidat modifié' : 'Candidat créé') }} />
      )}
      {viewing && (
        <CandidateDetail candidate={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null) }} />
      )}
    </div>
  )
}

// ─── FORM ──────────────────────────────────────────────────────────────
function CandidateForm({ candidate, onClose, onSaved }: { candidate?: any; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useAppStore()
  const [tab, setTab] = useState('identity')
  const [f, setF] = useState(candidate ?? {
    countryId: 1, officeId: 1, firstName: '', lastName: '', gender: 'M', phone: '',
    phone2: '', email: '', address: '', city: '', nationalId: '',
    emergencyName1: '', emergencyPhone1: '', emergencyRelation1: '',
    emergencyName2: '', emergencyPhone2: '', emergencyRelation2: '',
    guarantorName: '', guarantorPhone: '', guarantorId: '', guarantorAddress: '', guarantorJob: '',
    primarySpecialtyId: 1, status: 'applied', source: 'walk_in',
    paymentMethodPref: 'mobile_money', mobileMoneyAccount: '', bankAccount: '', notes: '',
  })

  const u = (k: string) => (v: string) => setF((p: any) => ({ ...p, [k]: v }))

  const save = async () => {
    if (!f.firstName || !f.lastName || !f.phone) { showToast('Prénom, nom et téléphone requis', 'error'); return }
    const res = await fetch(candidate ? `/api/candidates/${candidate.id}` : '/api/candidates', {
      method: candidate ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, specialties: [f.primarySpecialtyId] }),
    })
    if (res.ok) { onSaved(); onClose() }
    else showToast('Erreur lors de la sauvegarde', 'error')
  }

  return (
    <Modal title={candidate ? `Modifier ${candidate.firstName} ${candidate.lastName}` : 'Nouveau candidat'} onClose={onClose} size="xl">
      <Tabs tabs={[
        { id: 'identity', label: 'Identité' }, { id: 'contact', label: 'Urgence' },
        { id: 'guarantor', label: 'Garant' }, { id: 'pro', label: 'Statut & Paie' },
      ]} active={tab} onChange={setTab} />

      {tab === 'identity' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Prénom" value={f.firstName} onChange={u('firstName')} required />
          <Field label="Nom" value={f.lastName} onChange={u('lastName')} required />
          <Field label="Sexe" value={f.gender} onChange={u('gender')} options={[{ value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' }]} />
          <Field label="Date de naissance" value={f.birthDate} onChange={u('birthDate')} type="date" />
          <Field label="Numéro CNI" value={f.nationalId} onChange={u('nationalId')} />
          <Field label="Téléphone principal" value={f.phone} onChange={u('phone')} required />
          <Field label="Téléphone secondaire" value={f.phone2} onChange={u('phone2')} />
          <Field label="Email" value={f.email} onChange={u('email')} type="email" />
          <Field label="Adresse" value={f.address} onChange={u('address')} className="col-span-full" />
          <Field label="Ville" value={f.city} onChange={u('city')} />
        </div>
      )}
      {tab === 'contact' && (
        <div className="space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2">Contact d'urgence n°1</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Nom complet" value={f.emergencyName1} onChange={u('emergencyName1')} />
              <Field label="Téléphone" value={f.emergencyPhone1} onChange={u('emergencyPhone1')} />
              <Field label="Lien de parenté" value={f.emergencyRelation1} onChange={u('emergencyRelation1')} />
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2">Contact d'urgence n°2</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Nom complet" value={f.emergencyName2} onChange={u('emergencyName2')} />
              <Field label="Téléphone" value={f.emergencyPhone2} onChange={u('emergencyPhone2')} />
              <Field label="Lien de parenté" value={f.emergencyRelation2} onChange={u('emergencyRelation2')} />
            </div>
          </div>
        </div>
      )}
      {tab === 'guarantor' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Nom complet du garant" value={f.guarantorName} onChange={u('guarantorName')} />
          <Field label="Téléphone" value={f.guarantorPhone} onChange={u('guarantorPhone')} />
          <Field label="Numéro CNI garant" value={f.guarantorId} onChange={u('guarantorId')} />
          <Field label="Profession" value={f.guarantorJob} onChange={u('guarantorJob')} />
          <Field label="Adresse du garant" value={f.guarantorAddress} onChange={u('guarantorAddress')} className="col-span-full" />
        </div>
      )}
      {tab === 'pro' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Statut" value={f.status} onChange={u('status')} options={CANDIDATE_STATUSES.map(s => ({ value: s.id, label: s.label }))} />
          <Field label="Source" value={f.source} onChange={u('source')} options={[
            { value: 'walk_in', label: 'Venue spontanée' }, { value: 'referral', label: 'Référencement' },
            { value: 'social_media', label: 'Réseaux sociaux' }, { value: 'partner', label: 'Partenaire' }, { value: 'web', label: 'Site web' },
          ]} />
          <Field label="Mode de paiement préféré" value={f.paymentMethodPref} onChange={u('paymentMethodPref')} options={[
            { value: 'mobile_money', label: 'Mobile Money' }, { value: 'bank_transfer', label: 'Virement bancaire' }, { value: 'cash', label: 'Espèces' },
          ]} />
          <Field label="N° Mobile Money" value={f.mobileMoneyAccount} onChange={u('mobileMoneyAccount')} />
          <Field label="N° Compte bancaire" value={f.bankAccount} onChange={u('bankAccount')} />
          <Field label="Notes" value={f.notes} onChange={u('notes')} textarea className="col-span-full" />
        </div>
      )}

      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn onClick={save}>{candidate ? 'Enregistrer' : 'Créer le candidat'}</Btn>
      </div>
    </Modal>
  )
}

// ─── DETAIL ────────────────────────────────────────────────────────────
function CandidateDetail({ candidate, onClose, onEdit }: { candidate: any; onClose: () => void; onEdit: () => void }) {
  const [tab, setTab] = useState('info')
  return (
    <Modal title={`${candidate.firstName} ${candidate.lastName}`} subtitle={candidate.country?.name} onClose={onClose} size="xl">
      <div className="flex justify-end mb-3">
        <Btn variant="secondary" size="sm" onClick={onEdit}>Modifier</Btn>
      </div>
      <Tabs tabs={[
        { id: 'info', label: 'Informations' },
        { id: 'missions', label: `Missions (${candidate.missions?.length ?? 0})` },
        { id: 'evals', label: `Évaluations (${candidate.evaluations?.length ?? 0})` },
      ]} active={tab} onChange={setTab} />

      {tab === 'info' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Identité</p>
            {[['Statut', <StatusBadge key="s" status={candidate.status} />], ['Téléphone', candidate.phone], ['Email', candidate.email || '—'], ['CNI', candidate.nationalId || '—'], ['Né(e) le', fmtDate(candidate.birthDate)], ['Adresse', `${candidate.address ?? ''} ${candidate.city ?? ''}`.trim() || '—']].map(([l, v]: any) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-xs text-slate-500">{l}</span>
                <span className="text-xs text-slate-800 font-medium">{v}</span>
              </div>
            ))}
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Garant</p>
            {[['Nom', candidate.guarantorName], ['Téléphone', candidate.guarantorPhone], ['CNI', candidate.guarantorId], ['Profession', candidate.guarantorJob]].map(([l, v]: any) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-slate-50">
                <span className="text-xs text-slate-500">{l}</span>
                <span className="text-xs text-slate-800">{v || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {tab === 'evals' && (
        <div className="space-y-2">
          {(candidate.evaluations ?? []).length === 0 && <p className="text-sm text-slate-400 text-center py-8">Aucune évaluation</p>}
          {(candidate.evaluations ?? []).map((e: any, i: number) => (
            <div key={i} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">{fmtDate(e.date)}</span>
                <StarRating value={Math.round(e.overallRating)} readonly size={14} />
              </div>
              {e.comment && <p className="text-xs text-slate-500 mt-1">{e.comment}</p>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
