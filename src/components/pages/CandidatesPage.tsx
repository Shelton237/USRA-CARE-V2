'use client'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, SearchBox, Btn, Card, Table, StatusBadge, StarRating, FilterSelect, Modal, Field } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { CANDIDATE_STATUSES, fmtDate, fmt, periodLabel } from '@/lib/utils'
import {
  Plus, Pencil, Star, Phone, CreditCard, Calendar,
  Shield, FileText, CheckCircle, Clock, ThumbsUp, Shirt,
  ClipboardList, EyeOff, Gem, Lightbulb, Sparkles, Check, X,
  AlertTriangle, Banknote, Wallet, UserCheck,
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: 'all', label: 'Tous statuts' },
  ...CANDIDATE_STATUSES.map(s => ({ value: s.id, label: s.label })),
]

const SOURCE_OPTIONS = [
  { value: 'walk_in',  label: 'Visite agence' },
  { value: 'online',   label: 'En ligne' },
  { value: 'referral', label: 'Recommandation' },
  { value: 'social',   label: 'Réseaux sociaux' },
]

const EVAL_CRITERIA = [
  { id: 'punctuality',  label: 'Ponctualité',           Icon: Clock },
  { id: 'quality',      label: 'Qualité du travail',    Icon: Star },
  { id: 'behavior',     label: 'Comportement',          Icon: ThumbsUp },
  { id: 'appearance',   label: 'Présentation',          Icon: Shirt },
  { id: 'instructions', label: 'Respect des consignes', Icon: ClipboardList },
  { id: 'discretion',   label: 'Discrétion',            Icon: EyeOff },
  { id: 'honesty',      label: 'Honnêteté',             Icon: Gem },
  { id: 'initiative',   label: 'Initiative',            Icon: Lightbulb },
  { id: 'hygiene',      label: 'Hygiène personnelle',   Icon: Sparkles },
]

// ─── InterviewField ─────────────────────────────────────────────────────────
function InterviewField({ question, value, onChange, readonly = false }: {
  question: { label: string; type: string; options?: string[] }
  value: any; onChange?: (v: any) => void; readonly?: boolean
}) {
  const { type, label, options } = question
  const cls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 bg-white disabled:bg-slate-50 disabled:text-slate-500'

  if (readonly) {
    if (type === 'boolean') return (
      <span className={`inline-flex items-center gap-1 text-sm font-medium ${value ? 'text-emerald-600' : 'text-slate-400'}`}>
        {value ? <Check size={13} /> : <X size={13} />}
        {value ? 'Oui' : 'Non'}
      </span>
    )
    if (type === 'rating5') return (
      <span className="inline-flex items-center gap-0.5 text-amber-500">
        {[1,2,3,4,5].map(n => (
          <Star key={n} size={13} fill={n <= (value ?? 0) ? 'currentColor' : 'none'} />
        ))}
        <span className="text-xs text-slate-400 ml-1 font-normal">{value ?? 0}/5</span>
      </span>
    )
    if (type === 'rating20') return (
      <span className="font-semibold text-slate-800">{value ?? 0}<span className="text-slate-400 font-normal">/20</span></span>
    )
    if (type === 'multiselect') {
      const arr: string[] = Array.isArray(value) ? value : (value ? [value] : [])
      return arr.length ? (
        <div className="flex flex-wrap gap-1">
          {arr.map((v: string) => (
            <span key={v} className="px-2 py-0.5 text-xs rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium">{v}</span>
          ))}
        </div>
      ) : <span className="text-slate-400 text-xs">—</span>
    }
    return <span className="text-slate-700 text-sm">{value || '—'}</span>
  }

  if (type === 'boolean') {
    return (
      <label className="flex items-center gap-2 cursor-pointer mt-1">
        <input type="checkbox" checked={!!value} onChange={e => onChange?.(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 accent-teal-600" />
        <span className="text-sm text-slate-600">{label}</span>
      </label>
    )
  }
  if (type === 'rating5') {
    const v = Number(value ?? 0)
    return (
      <div className="flex gap-1 mt-1">
        {[1,2,3,4,5].map(n => (
          <button key={n} type="button" onClick={() => onChange?.(v === n ? 0 : n)}
            className="transition-transform hover:scale-110">
            <Star size={18} fill={n <= v ? '#F59E0B' : 'none'} color={n <= v ? '#F59E0B' : '#CBD5E1'} />
          </button>
        ))}
        {v > 0 && <span className="text-xs text-slate-400 self-center ml-1">{v}/5</span>}
      </div>
    )
  }
  if (type === 'rating20') {
    return (
      <div className="flex items-center gap-2">
        <input type="number" min={0} max={20} value={value ?? ''} onChange={e => onChange?.(Number(e.target.value))}
          className={`${cls} w-20`} />
        <span className="text-sm text-slate-400">/ 20</span>
      </div>
    )
  }
  if (type === 'multiselect' && options?.length) {
    const selected: string[] = Array.isArray(value) ? value : []
    const toggle = (opt: string) => {
      onChange?.(selected.includes(opt) ? selected.filter(x => x !== opt) : [...selected, opt])
    }
    return (
      <div className="flex flex-wrap gap-1.5 mt-1">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => toggle(opt)}
            className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${
              selected.includes(opt)
                ? 'bg-teal-50 border-teal-400 text-teal-700 font-medium'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            {selected.includes(opt) && <Check size={10} />}{opt}
          </button>
        ))}
      </div>
    )
  }
  if (type === 'textarea') {
    return <textarea rows={2} value={value ?? ''} onChange={e => onChange?.(e.target.value)}
      className={`${cls} resize-none`} />
  }
  if (type === 'select' && options?.length) {
    return (
      <select value={value ?? ''} onChange={e => onChange?.(e.target.value)} className={cls}>
        <option value="">— Choisir —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  return (
    <input type={type === 'date' ? 'date' : type === 'number' ? 'number' : 'text'}
      value={value ?? ''} onChange={e => onChange?.(type === 'number' ? Number(e.target.value) : e.target.value)}
      className={cls} />
  )
}

// ─── InterviewTab ────────────────────────────────────────────────────────────
type TQuestion = { label: string; type: string; options?: string[] }
type TSection  = { title: string; questions: TQuestion[] }

function InterviewTab({ serviceId, services, templates, answers, onChange }: {
  serviceId: string|number; services: any[]; templates: any[]
  answers: Record<string, any>; onChange: (answers: Record<string, any>) => void
}) {
  const service  = services.find((s: any) => String(s.id) === String(serviceId))
  const template = service?.interviewTemplate ? templates.find((t: any) => t.name === service.interviewTemplate) : null
  const sections: TSection[] = Array.isArray(template?.sections) ? template.sections : []

  if (!service) return (
    <div className="py-12 text-center text-slate-400 text-sm">Sélectionnez d&apos;abord un métier dans l&apos;onglet Identité.</div>
  )
  if (!template) return (
    <div className="py-12 text-center text-slate-400 text-sm">Aucun questionnaire défini pour ce métier.</div>
  )

  const set = (si: number, qi: number, v: any) => {
    onChange({ ...answers, [`${si}_${qi}`]: v })
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
        <FileText size={13} />
        <span>Questionnaire : <strong>{template.label}</strong> — {sections.reduce((s: number, sec: TSection) => s + sec.questions.length, 0)} questions</span>
      </div>
      {sections.map((sec, si) => (
        <div key={si}>
          <div className="text-sm font-bold text-slate-700 pb-2 mb-3 border-b border-slate-200">{sec.title}</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {sec.questions.map((q, qi) => {
              const fullWidth = q.type === 'textarea' || q.type === 'multiselect' || q.type === 'boolean'
              return (
                <div key={qi} className={fullWidth ? 'col-span-2' : ''}>
                  {q.type !== 'boolean' && (
                    <div className="text-xs font-medium text-slate-600 mb-1">{q.label}</div>
                  )}
                  <InterviewField question={q} value={answers[`${si}_${qi}`]} onChange={v => set(si, qi, v)} />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TabBar ──────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }: {
  tabs: { id: string; label: string }[]; active: string; onChange: (id: string) => void
}) {
  return (
    <div className="flex border-b border-slate-200 mb-4 -mx-6 px-6 overflow-x-auto">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)}
          className={`pb-2.5 mr-5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex-shrink-0 ${
            t.id === active ? 'border-teal-500 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}>
          {t.label}
        </button>
      ))}
    </div>
  )
}

// ─── CandidateForm ───────────────────────────────────────────────────────────
function CandidateForm({ candidateId, onClose, onSaved }: {
  candidateId?: number; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [tab, setTab] = useState('identity')
  const [saving, setSaving] = useState(false)

  const { data: cData } = useQuery({
    queryKey: ['candidate-edit', candidateId],
    queryFn: () => candidateId ? fetch(`${B}/api/candidates/${candidateId}`).then(r => r.json()) : Promise.resolve(null),
    enabled: !!candidateId,
  })
  const existing = cData?.data

  const { data: countriesData } = useQuery({ queryKey: ['countries'], queryFn: () => fetch(`${B}/api/countries`).then(r => r.json()) })
  const { data: servicesData }  = useQuery({ queryKey: ['services'],  queryFn: () => fetch(`${B}/api/services`).then(r => r.json()) })
  const { data: tplData }       = useQuery({ queryKey: ['interview-templates'], queryFn: () => fetch(`${B}/api/interview-templates`).then(r => r.json()) })

  const countries: any[] = countriesData?.data ?? []
  const services:  any[] = servicesData?.data  ?? []
  const templates: any[] = tplData?.data        ?? []

  const primarySvc = existing?.specialties?.find((s: any) => s.isPrimary)

  const [f, setF] = useState({
    countryId: existing?.countryId ?? 1,
    officeId:  existing?.officeId  ?? '',
    firstName: existing?.firstName ?? '',
    lastName:  existing?.lastName  ?? '',
    gender:    existing?.gender    ?? 'M',
    birthDate: existing?.birthDate ? existing.birthDate.slice(0, 10) : '',
    nationalId: existing?.nationalId ?? '',
    phone:     existing?.phone     ?? '',
    phone2:    existing?.phone2    ?? '',
    email:     existing?.email     ?? '',
    address:   existing?.address   ?? '',
    city:      existing?.city      ?? '',
    emergencyName1:     existing?.emergencyName1     ?? '',
    emergencyPhone1:    existing?.emergencyPhone1    ?? '',
    emergencyRelation1: existing?.emergencyRelation1 ?? '',
    emergencyName2:     existing?.emergencyName2     ?? '',
    emergencyPhone2:    existing?.emergencyPhone2    ?? '',
    emergencyRelation2: existing?.emergencyRelation2 ?? '',
    guarantorName:    existing?.guarantorName    ?? '',
    guarantorPhone:   existing?.guarantorPhone   ?? '',
    guarantorId:      existing?.guarantorId      ?? '',
    guarantorJob:     existing?.guarantorJob     ?? '',
    guarantorAddress: existing?.guarantorAddress ?? '',
    primarySpecialtyId: primarySvc?.serviceId ? String(primarySvc.serviceId) : '',
    status:             existing?.status             ?? 'applied',
    source:             existing?.source             ?? 'walk_in',
    paymentMethodPref:  existing?.paymentMethodPref  ?? 'mobile_money',
    mobileMoneyAccount: existing?.mobileMoneyAccount ?? '',
    bankAccount:        existing?.bankAccount        ?? '',
    notes:              existing?.notes              ?? '',
  })
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string,any>>(
    existing?.interview?.answers ?? {}
  )

  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))
  const selectedCountry = countries.find((c: any) => String(c.id) === String(f.countryId))
  const offices: any[] = selectedCountry?.offices ?? []

  const save = async () => {
    if (!f.firstName || !f.lastName || !f.phone) {
      showToast('Prénom, nom et téléphone requis', 'error'); return
    }
    setSaving(true)
    try {
      const primaryId = f.primarySpecialtyId ? Number(f.primarySpecialtyId) : null
      const body: any = {
        ...f,
        countryId: Number(f.countryId),
        officeId: f.officeId ? Number(f.officeId) : null,
        primarySpecialtyId: primaryId,
        specialties: primaryId ? [primaryId] : [],
      }
      if (f.primarySpecialtyId) {
        const svc = services.find((s: any) => String(s.id) === f.primarySpecialtyId)
        if (svc?.interviewTemplate && Object.keys(interviewAnswers).length > 0) {
          body.interview = { template: svc.interviewTemplate, answers: interviewAnswers }
        }
      }
      const url    = candidateId ? `${B}/api/candidates/${candidateId}` : `${B}/api/candidates`
      const method = candidateId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { onSaved(); onClose() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  const tabs = [
    { id: 'identity',  label: 'Identité' },
    { id: 'contact',   label: "Contacts d'urgence" },
    { id: 'guarantor', label: 'Garant' },
    { id: 'interview', label: 'Entretien' },
    { id: 'pro',       label: 'Statut & paiement' },
  ]

  return (
    <Modal title={candidateId && existing ? `Modifier ${existing.firstName} ${existing.lastName}` : 'Nouveau candidat'} onClose={onClose} size="xl">
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
      <div className="min-h-[320px]">
        {tab === 'identity' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prénom *" value={f.firstName} onChange={u('firstName')} />
            <Field label="Nom *"    value={f.lastName}  onChange={u('lastName')} />
            <Field label="Sexe" value={f.gender} onChange={u('gender')} options={[
              { value: 'M', label: 'Masculin' }, { value: 'F', label: 'Féminin' },
            ]} />
            <Field label="Date de naissance" value={f.birthDate} onChange={u('birthDate')} type="date" />
            <Field label="Numéro CNI" value={f.nationalId} onChange={u('nationalId')} />
            <Field label="Téléphone principal *" value={f.phone} onChange={u('phone')} />
            <Field label="Téléphone secondaire"  value={f.phone2} onChange={u('phone2')} />
            <Field label="Email" value={f.email} onChange={u('email')} type="email" />
            <Field label="Adresse" value={f.address} onChange={u('address')} />
            <Field label="Ville"   value={f.city}    onChange={u('city')} />
            <Field label="Pays" value={String(f.countryId)} onChange={v => setF(p => ({ ...p, countryId: v, officeId: '' }))}
              options={[{ value: '', label: 'Sélectionner...' }, ...countries.map((c: any) => ({ value: String(c.id), label: c.name }))]} />
            <Field label="Bureau" value={String(f.officeId)} onChange={u('officeId')}
              options={[{ value: '', label: offices.length ? 'Sélectionner...' : '(aucun bureau)' }, ...offices.map((o: any) => ({ value: String(o.id), label: o.name }))]}
              disabled={!offices.length} />
          </div>
        )}
        {tab === 'contact' && (
          <div className="space-y-5">
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-3">Contact d&apos;urgence n°1</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Nom complet"     value={f.emergencyName1}     onChange={u('emergencyName1')} />
                <Field label="Téléphone"       value={f.emergencyPhone1}    onChange={u('emergencyPhone1')} />
                <Field label="Lien de parenté" value={f.emergencyRelation1} onChange={u('emergencyRelation1')} />
              </div>
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-700 mb-3">Contact d&apos;urgence n°2</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Nom complet"     value={f.emergencyName2}     onChange={u('emergencyName2')} />
                <Field label="Téléphone"       value={f.emergencyPhone2}    onChange={u('emergencyPhone2')} />
                <Field label="Lien de parenté" value={f.emergencyRelation2} onChange={u('emergencyRelation2')} />
              </div>
            </div>
          </div>
        )}
        {tab === 'guarantor' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom du garant"              value={f.guarantorName}    onChange={u('guarantorName')} />
            <Field label="Téléphone du garant"        value={f.guarantorPhone}   onChange={u('guarantorPhone')} />
            <Field label="Pièce d'identité du garant" value={f.guarantorId}      onChange={u('guarantorId')} />
            <Field label="Profession du garant"       value={f.guarantorJob}     onChange={u('guarantorJob')} />
            <div className="col-span-2">
              <Field label="Adresse du garant" value={f.guarantorAddress} onChange={u('guarantorAddress')} textarea />
            </div>
          </div>
        )}
        {tab === 'interview' && (
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold text-slate-600 mb-1.5">Métier principal (définit le questionnaire)</div>
              <Field label="" value={f.primarySpecialtyId} onChange={v => u('primarySpecialtyId')(v)}
                options={[
                  { value: '', label: 'Sélectionner un métier...' },
                  ...services.map((s: any) => ({ value: String(s.id), label: s.name })),
                ]} />
            </div>
            <InterviewTab
              serviceId={f.primarySpecialtyId}
              services={services}
              templates={templates}
              answers={interviewAnswers}
              onChange={setInterviewAnswers}
            />
          </div>
        )}
        {tab === 'pro' && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Statut" value={f.status} onChange={u('status')}
              options={CANDIDATE_STATUSES.map(s => ({ value: s.id, label: s.label }))} />
            <Field label="Source" value={f.source} onChange={u('source')} options={SOURCE_OPTIONS} />
            <Field label="Mode de paiement préféré" value={f.paymentMethodPref} onChange={u('paymentMethodPref')} options={[
              { value: 'mobile_money',  label: 'Mobile Money' },
              { value: 'bank_transfer', label: 'Virement bancaire' },
              { value: 'cash',          label: 'Espèces' },
            ]} />
            {f.paymentMethodPref === 'mobile_money'  && <Field label="N° Mobile Money"       value={f.mobileMoneyAccount} onChange={u('mobileMoneyAccount')} />}
            {f.paymentMethodPref === 'bank_transfer' && <Field label="N° de compte bancaire" value={f.bankAccount}        onChange={u('bankAccount')} />}
            <div className="col-span-2">
              <Field label="Notes" value={f.notes} onChange={u('notes')} textarea placeholder="Observations, informations complémentaires..." />
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
        <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
        <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : candidateId ? 'Enregistrer' : 'Créer le candidat'}</Btn>
      </div>
    </Modal>
  )
}

// ─── CandidateDetail ─────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
      <Icon size={11} strokeWidth={2.5} />
      {label}
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5 border-b border-slate-50 last:border-0 gap-3">
      <span className="text-xs text-slate-400 shrink-0">{label}</span>
      <span className={`text-xs text-slate-800 font-medium text-right ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}

function UrgenceBlock({ index, name, phone, relation }: {
  index: number; name?: string; phone?: string; relation?: string
}) {
  if (!name && !phone) return null
  return (
    <div className="mb-3 last:mb-0">
      <div className="text-[10px] font-bold text-teal-600 uppercase tracking-wider mb-1.5">
        Urgence {index}
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-700">{name || '—'}</span>
        <span className="text-xs text-slate-500 text-right shrink-0">
          {phone}{relation ? ` (${relation})` : ''}
        </span>
      </div>
    </div>
  )
}

function CandidateDetail({ candidateId, onClose, onEdit }: {
  candidateId: number; onClose: () => void; onEdit: () => void
}) {
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [tab, setTab] = useState('identity')

  const { data: servicesData } = useQuery({ queryKey: ['services'], queryFn: () => fetch(`${B}/api/services`).then(r => r.json()) })
  const { data: tplData }      = useQuery({ queryKey: ['interview-templates'], queryFn: () => fetch(`${B}/api/interview-templates`).then(r => r.json()) })
  const { data: cData, isLoading } = useQuery({
    queryKey: ['candidate-detail', candidateId],
    queryFn: () => fetch(`${B}/api/candidates/${candidateId}`).then(r => r.json()),
  })

  const c         = cData?.data
  const services: any[] = servicesData?.data ?? []
  const templates: any[] = tplData?.data ?? []

  if (isLoading || !c) return (
    <Modal title="Chargement..." onClose={onClose} size="xl">
      <div className="py-20 text-center text-slate-400 text-sm">Chargement du dossier...</div>
    </Modal>
  )

  const primarySvc = c.specialties?.find((s: any) => s.isPrimary)
  const svcName    = primarySvc?.service?.name
  const evals      = c.evaluations ?? []
  const avgRating  = evals.length ? evals.reduce((s: number, e: any) => s + e.overallRating, 0) / evals.length : 0
  const missions   = c.missions ?? []
  const payrolls   = c.payrolls ?? []
  const complaints = (c.complaints ?? []).map((cc: any) => cc.complaint)

  const interview    = c.interview
  const svc          = services.find((s: any) => String(s.id) === String(primarySvc?.serviceId))
  const template     = svc?.interviewTemplate ? templates.find((t: any) => t.name === svc.interviewTemplate) : null
  const itSections: TSection[] = Array.isArray(template?.sections) ? template.sections : []
  const answers: Record<string,any> = interview?.answers ?? {}

  const payLabel = (m: string) =>
    m === 'mobile_money' ? 'Mobile Money' : m === 'bank_transfer' ? 'Virement bancaire' : 'Espèces'

  const tabs = [
    { id: 'identity',     label: 'Identité' },
    { id: 'interview',    label: 'Entretien' },
    { id: 'evals',        label: `Évaluations (${evals.length})` },
    { id: 'missions',     label: `Missions (${missions.length})` },
    { id: 'payrolls',     label: `Paies (${payrolls.length})` },
    { id: 'disciplinary', label: `Disciplinaire (${complaints.length})` },
  ]

  return (
    <Modal
      title={`${c.firstName} ${c.lastName}`}
      subtitle={[svcName, c.country?.name].filter(Boolean).join(' · ')}
      onClose={onClose}
      size="xl"
    >
      {/* ── Sous-header ── */}
      <div className="flex items-center gap-4 mb-5 pb-4 border-b border-slate-100">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold text-white flex-shrink-0 select-none"
          style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)' }}>
          {c.firstName[0]}{c.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={c.status} />
            {evals.length > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-500 text-sm font-semibold">
                <Star size={13} fill="currentColor" />
                {avgRating.toFixed(1)}
                <span className="text-xs text-slate-400 font-normal">({evals.length} éval.)</span>
              </span>
            )}
          </div>
          {svcName && (
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <UserCheck size={11} className="text-slate-400" />
              {svcName}
            </div>
          )}
        </div>
        <Btn variant="secondary" size="sm" icon={<Pencil size={12}/>} onClick={onEdit}>Modifier</Btn>
      </div>

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      {/* ── Identité ── */}
      {tab === 'identity' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <SectionLabel icon={Phone} label="Coordonnées" />
            <InfoRow label="Téléphone"   value={c.phone} />
            <InfoRow label="Téléphone 2" value={c.phone2} />
            <InfoRow label="Email"       value={c.email} />
            <InfoRow label="Adresse"     value={c.address} />
            <InfoRow label="Ville"       value={c.city} />
            <InfoRow label="CNI"         value={c.nationalId} mono />
            <InfoRow label="Né(e) le"    value={fmtDate(c.birthDate)} />
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <SectionLabel icon={Shield} label="Contacts d'urgence & garant" />
            <UrgenceBlock index={1} name={c.emergencyName1} phone={c.emergencyPhone1} relation={c.emergencyRelation1} />
            <UrgenceBlock index={2} name={c.emergencyName2} phone={c.emergencyPhone2} relation={c.emergencyRelation2} />
            {c.guarantorName && (
              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Garant</div>
                <InfoRow label="Nom"        value={c.guarantorName} />
                <InfoRow label="Téléphone"  value={c.guarantorPhone} />
                <InfoRow label="Profession" value={c.guarantorJob} />
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <SectionLabel icon={Wallet} label="Paiement" />
            <InfoRow label="Mode préféré"    value={payLabel(c.paymentMethodPref)} />
            {c.mobileMoneyAccount && <InfoRow label="Compte MM"       value={c.mobileMoneyAccount} />}
            {c.bankAccount        && <InfoRow label="Compte bancaire" value={c.bankAccount} mono />}
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <SectionLabel icon={FileText} label="Notes" />
            <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
              {c.notes || <span className="text-slate-400">Aucune note</span>}
            </p>
          </div>
        </div>
      )}

      {/* ── Entretien ── */}
      {tab === 'interview' && (
        <div>
          {!interview ? (
            <div className="py-12 text-center">
              <FileText size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">Aucun entretien réalisé</p>
            </div>
          ) : !itSections.length ? (
            <div className="py-12 text-center text-slate-400 text-sm">Template introuvable</div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
                <FileText size={13} className="text-slate-400" />
                Questionnaire : <strong className="text-slate-800 ml-1">{template?.label}</strong>
              </div>
              {itSections.map((sec, si) => (
                <div key={si}>
                  <div className="text-sm font-bold text-slate-700 pb-2 mb-3 border-b border-slate-200">{sec.title}</div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {sec.questions.map((q, qi) => {
                      const fullWidth = q.type === 'textarea' || q.type === 'multiselect'
                      return (
                        <div key={qi} className={fullWidth ? 'col-span-2' : ''}>
                          <div className="text-xs text-slate-500 mb-0.5">{q.label}</div>
                          <InterviewField question={q} value={answers[`${si}_${qi}`]} readonly />
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Évaluations ── */}
      {tab === 'evals' && (
        <div className="space-y-4">
          {evals.length === 0 ? (
            <div className="py-12 text-center">
              <Star size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">Aucune évaluation</p>
            </div>
          ) : (
            <>
              <div className="p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-end gap-2 mb-1">
                  <span className="text-4xl font-bold text-slate-800">{avgRating.toFixed(1)}</span>
                  <span className="text-lg text-slate-400 mb-1">/5</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">Basé sur {evals.length} évaluation(s)</p>
                <StarRating value={Math.round(avgRating)} readonly size={18} />
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {EVAL_CRITERIA.map(cr => {
                    const scores = evals.map((e: any) => e[cr.id] ?? 0).filter(Boolean)
                    const avg = scores.length ? scores.reduce((a: number, b: number) => a + b, 0) / scores.length : 0
                    if (!scores.length) return null
                    const { Icon } = cr
                    return (
                      <div key={cr.id} className="bg-slate-50 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                          <Icon size={11} strokeWidth={2} className="text-slate-400" />
                          {cr.label}
                        </div>
                        <StarRating value={Math.round(avg)} readonly size={11} />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="text-xs font-bold text-slate-700 mb-2">Historique</div>
              <div className="space-y-2">
                {evals.map((e: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-semibold text-slate-800">{e.client?.name ?? '—'}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{fmtDate(e.date)}</span>
                        <StarRating value={Math.round(e.overallRating)} readonly size={13} />
                      </div>
                    </div>
                    {e.comment && <p className="text-xs text-slate-500 italic mt-0.5">&ldquo;{e.comment}&rdquo;</p>}
                    {e.recommend && (
                      <span className={`mt-1.5 inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        e.recommend === 'yes'  ? 'bg-emerald-50 text-emerald-700'
                        : e.recommend === 'no' ? 'bg-red-50 text-red-700'
                        : 'bg-amber-50 text-amber-700'
                      }`}>
                        {e.recommend === 'yes' ? <Check size={10}/> : e.recommend === 'no' ? <X size={10}/> : null}
                        {e.recommend === 'yes' ? 'Recommande' : e.recommend === 'no' ? 'Ne recommande pas' : 'À voir'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Missions ── */}
      {tab === 'missions' && (
        <div>
          {missions.length === 0 ? (
            <div className="py-12 text-center">
              <Banknote size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">Aucune mission</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['#', 'Client', 'Service', 'Début', 'Statut'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {missions.map((m: any) => (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 text-slate-400 text-xs font-medium">#{m.id}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-800">{m.client?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-600">{m.service?.name ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{fmtDate(m.startDate)}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={m.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Paies ── */}
      {tab === 'payrolls' && (
        <div>
          {payrolls.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-slate-400 text-sm">Aucune paie enregistrée</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  {['Période', 'Jours / Base', 'Net à payer', 'Statut'].map(h => (
                    <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrolls.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-2.5 font-medium text-slate-700">{periodLabel(p.period)}</td>
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{p.daysWorked}/{p.prorataBase} j.</td>
                    <td className="px-3 py-2.5 font-bold text-slate-800">{fmt(p.netSalary)}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── Disciplinaire ── */}
      {tab === 'disciplinary' && (
        <div>
          {complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle size={28} className="text-emerald-500 mb-2" />
              <p className="text-sm text-emerald-700 font-semibold">Dossier propre</p>
              <p className="text-xs text-emerald-600 mt-0.5">Aucune plainte enregistrée</p>
            </div>
          ) : (
            <div className="space-y-3">
              {complaints.map((cp: any, i: number) => (
                <div key={i} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="flex items-start justify-between mb-1.5">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                        <span className="text-sm font-semibold text-slate-800">{cp.type ?? cp.complaintType ?? '—'}</span>
                      </div>
                      <span className="text-xs text-slate-400 mt-0.5 block">
                        {cp.client?.name ?? ''}{cp.client?.name ? ' · ' : ''}{fmtDate(cp.createdAt)}
                      </span>
                    </div>
                    <StatusBadge status={cp.status} />
                  </div>
                  {cp.description && <p className="text-xs text-slate-600 leading-relaxed">{cp.description}</p>}
                  {cp.decision && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-100 rounded-lg text-xs text-red-700">
                      Décision : <strong>{cp.decision}</strong>{cp.decisionDetail ? ` — ${cp.decisionDetail}` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function CandidatesPage() {
  const { showToast, adminCountryFilter } = useAppStore()
  const qc = useQueryClient()
  const B  = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const countryQ = adminCountryFilter !== 'all' ? 'countryId=' + adminCountryFilter : ''

  const [search,    setSearch]    = useState('')
  const [statusF,   setStatusF]   = useState('all')
  const [serviceF,  setServiceF]  = useState('all')
  const [creating,  setCreating]  = useState(false)
  const [editingId, setEditingId] = useState<number|null>(null)
  const [viewingId, setViewingId] = useState<number|null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['candidates', search, statusF, adminCountryFilter],
    queryFn: () => fetch(
      `${B}/api/candidates?search=${encodeURIComponent(search)}&status=${statusF === 'all' ? '' : statusF}${countryQ ? '&' + countryQ : ''}`
    ).then(r => r.json()),
  })
  const { data: servicesData } = useQuery({
    queryKey: ['services'], queryFn: () => fetch(`${B}/api/services`).then(r => r.json()),
  })

  const services: any[] = servicesData?.data ?? []
  let candidates: any[] = data?.data ?? []
  if (serviceF !== 'all') {
    candidates = candidates.filter((c: any) =>
      c.specialties?.some((sp: any) => String(sp.serviceId) === serviceF)
    )
  }

  const refresh = () => qc.refetchQueries({ queryKey: ['candidates'] })

  const cols = [
    { key: 'name', label: 'Nom', render: (r: any) => (
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 select-none"
          style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0891B2 100%)' }}>
          {r.firstName?.[0]}{r.lastName?.[0]}
        </div>
        <div>
          <div className="font-semibold text-sm text-slate-800">{r.firstName} {r.lastName}</div>
          <div className="text-xs text-slate-400">{r.phone}</div>
        </div>
      </div>
    )},
    { key: 'service', label: 'Métier', render: (r: any) => {
      const sp = r.specialties?.find((s: any) => s.isPrimary) ?? r.specialties?.[0]
      return sp
        ? <span className="text-sm text-slate-700">{sp.service?.name}</span>
        : <span className="text-slate-400">—</span>
    }},
    { key: 'country', label: 'Pays', render: (r: any) => (
      <span className="text-sm text-slate-600">{r.country?.name ?? '—'}</span>
    )},
    { key: 'rating', label: 'Note', render: (r: any) => {
      const ev = r.evaluations ?? []
      if (!ev.length) return <span className="text-xs text-slate-400">—</span>
      const avg = ev.reduce((s: number, e: any) => s + e.overallRating, 0) / ev.length
      return (
        <span className="inline-flex items-center gap-1 text-amber-500 text-sm font-semibold">
          <Star size={12} fill="currentColor" /> {avg.toFixed(1)}
        </span>
      )
    }},
    { key: 'status', label: 'Statut', render: (r: any) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', align: 'right' as const, render: (r: any) => (
      <Btn variant="ghost" size="sm" onClick={() => setViewingId(r.id)}>Voir →</Btn>
    )},
  ]

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Candidats / Employés"
        subtitle={`${candidates.length} dossier(s)`}
        actions={
          <div className="flex flex-wrap gap-2">
            <SearchBox value={search} onChange={setSearch} placeholder="Nom, téléphone..." />
            <FilterSelect value={statusF}  onChange={setStatusF}  options={STATUS_OPTIONS} />
            <FilterSelect value={serviceF} onChange={setServiceF} options={[
              { value: 'all', label: 'Tous services' },
              ...services.map((s: any) => ({ value: String(s.id), label: s.name })),
            ]} />
            <Btn icon={<Plus size={14}/>} onClick={() => setCreating(true)}>Nouveau candidat</Btn>
          </div>
        }
      />
      <Card noPad>
        <Table
          columns={cols}
          data={candidates}
          onRowClick={r => setViewingId(r.id)}
          empty={isLoading ? 'Chargement...' : 'Aucun candidat trouvé'}
        />
      </Card>

      {(creating || editingId !== null) && (
        <CandidateForm
          candidateId={editingId ?? undefined}
          onClose={() => { setCreating(false); setEditingId(null) }}
          onSaved={async () => {
            await refresh()
            showToast(editingId ? 'Candidat modifié' : 'Candidat créé')
            setCreating(false); setEditingId(null)
          }}
        />
      )}
      {viewingId !== null && (
        <CandidateDetail
          candidateId={viewingId}
          onClose={() => setViewingId(null)}
          onEdit={() => { setEditingId(viewingId); setViewingId(null) }}
        />
      )}
    </div>
  )
}
