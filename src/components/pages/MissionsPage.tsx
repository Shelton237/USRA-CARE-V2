'use client'
import { useState, useRef, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, SearchBox, Btn, Card, FilterSelect, Modal, Field, InfoRow } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { fmtDate } from '@/lib/utils'
import {
  Plus, Pencil, ArrowRight, ChevronDown,
  Shield, ShieldCheck, Eye, Lock,
  Home, Sparkles, Sofa, Wind,
  Baby, HeartHandshake, Heart,
  Car, Truck,
  UtensilsCrossed, ChefHat, Coffee,
  Zap, Wrench, Hammer, Pipette, Paintbrush, Sprout, Flower2,
  Calculator, BarChart3, ClipboardList, FileText,
  Monitor, Code, Cpu, Database,
  Phone, Headphones, Mail,
  Package, Briefcase, Building2, Users, Star,
} from 'lucide-react'

// ─── Service Icon ─────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  shield: Shield, shield_check: ShieldCheck, eye: Eye, lock: Lock,
  home: Home, sparkles: Sparkles, sofa: Sofa, wind: Wind,
  baby: Baby, heart_hand: HeartHandshake, heart: Heart,
  car: Car, truck: Truck,
  utensils: UtensilsCrossed, chef: ChefHat, coffee: Coffee,
  zap: Zap, wrench: Wrench, hammer: Hammer, pipette: Pipette,
  paintbrush: Paintbrush, sprout: Sprout, flower: Flower2,
  calculator: Calculator, chart: BarChart3, clipboard: ClipboardList, file: FileText,
  monitor: Monitor, code: Code, cpu: Cpu, database: Database,
  phone: Phone, headphones: Headphones, mail: Mail,
  package: Package, briefcase: Briefcase, building: Building2, users: Users, star: Star,
}

const EMOJI_TO_SLUG: Record<string, string> = {
  '🔒': 'lock', '🛡': 'shield', '👶': 'baby', '🤝': 'heart_hand',
  '🚗': 'car', '🚛': 'truck', '🍴': 'utensils', '👨‍🍳': 'chef',
  '⚡': 'zap', '🔧': 'wrench', '🔨': 'hammer', '🎨': 'paintbrush',
  '🌱': 'sprout', '✨': 'sparkles', '🏠': 'home', '🏢': 'building',
  '💻': 'monitor', '📊': 'chart', '📋': 'clipboard', '📞': 'phone',
  '👥': 'users', '💼': 'briefcase', '⭐': 'star',
  '🧹': 'sparkles', '🌿': 'sprout', '🔍': 'eye',
}

function resolveSlug(icon?: string | null): string {
  if (!icon) return 'briefcase'
  if (ICON_MAP[icon]) return icon
  return EMOJI_TO_SLUG[icon] ?? 'briefcase'
}

function ServiceIcon({ slug, size = 14 }: { slug: string; size?: number }) {
  const Comp = ICON_MAP[resolveSlug(slug)] ?? Briefcase
  return <Comp size={size} />
}

function ServiceSelect({ value, onChange, services }: {
  value: string; onChange: (v: string) => void; services: any[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selected = services.find((s: any) => String(s.id) === value)

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen(p => !p)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm text-left hover:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200 transition-colors">
        {selected ? (
          <>
            <span className="text-slate-500 flex-shrink-0">
              <ServiceIcon slug={selected.icon} size={15} />
            </span>
            <span className="text-slate-800 flex-1">{selected.name}</span>
          </>
        ) : (
          <span className="text-slate-400 flex-1">— Sélectionner —</span>
        )}
        <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          <button type="button" onClick={() => { onChange(''); setOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-slate-400 hover:bg-slate-50 border-b border-slate-100">
            — Sélectionner —
          </button>
          {services.map((s: any) => (
            <button key={s.id} type="button"
              onClick={() => { onChange(String(s.id)); setOpen(false) }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors ${String(s.id) === value ? 'bg-teal-50 text-teal-700 font-medium' : 'text-slate-700 hover:bg-slate-50'}`}>
              <span className={`flex-shrink-0 ${String(s.id) === value ? 'text-teal-600' : 'text-slate-400'}`}>
                <ServiceIcon slug={s.icon} size={15} />
              </span>
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: 'all',        label: 'Tous statuts' },
  { value: 'pending',    label: 'En attente' },
  { value: 'active',     label: 'Actif' },
  { value: 'completed',  label: 'Terminée' },
  { value: 'terminated', label: 'Résiliée' },
  { value: 'suspended',  label: 'Suspendue' },
]

const TYPE_OPTS = [
  { value: 'all',                label: 'Tous types' },
  { value: 'placement',          label: 'Placement' },
  { value: 'mise_a_disposition', label: 'Mise à disposition' },
]

const PRORATA_OPTS = [
  { value: '30', label: '30 jours calendaires (personnel maison)' },
  { value: '26', label: '26 jours ouvrés' },
  { value: '22', label: '22 jours ouvrés' },
]

const MISSION_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  active:     { label: 'Actif',      bg: '#D1FAE5', color: '#059669' },
  pending:    { label: 'En attente', bg: '#FEF3C7', color: '#D97706' },
  completed:  { label: 'Terminée',   bg: '#F1F5F9', color: '#64748B' },
  terminated: { label: 'Résiliée',   bg: '#FEE2E2', color: '#DC2626' },
  suspended:  { label: 'Suspendue',  bg: '#F1F5F9', color: '#94A3B8' },
}

const OVERTIME_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'En attente', bg: '#FEF3C7', color: '#D97706' },
  validated: { label: 'Validé',     bg: '#D1FAE5', color: '#059669' },
  approved:  { label: 'Validé',     bg: '#D1FAE5', color: '#059669' },
  rejected:  { label: 'Rejeté',     bg: '#FEE2E2', color: '#DC2626' },
}

const CONTRACT_TYPE: Record<string, { label: string; short: string; bg: string; color: string }> = {
  placement:          { label: 'Placement simple',   short: 'Placement', bg: '#EFF6FF', color: '#3B82F6' },
  mise_a_disposition: { label: 'Mise à disposition', short: 'MAD',       bg: '#F5F3FF', color: '#7C3AED' },
}

const BILLING_LABELS: Record<string, string> = {
  monthly: 'Mensuelle', bimonthly: 'À la quinzaine',
}

// ─── Badges helpers ───────────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const s = MISSION_STATUS[status] ?? { label: status, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: s.bg, color: s.color }}>{s.label}</span>
  )
}

function TypePill({ type, short = false }: { type: string; short?: boolean }) {
  const t = CONTRACT_TYPE[type] ?? { label: type, short: type, bg: '#F1F5F9', color: '#64748B' }
  return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: t.bg, color: t.color }}>{short ? t.short : t.label}</span>
  )
}

function EssaiBadge({ trialPeriodEnd, trialConfirmed }: { trialPeriodEnd?: string | null; trialConfirmed?: boolean }) {
  if (!trialPeriodEnd) return <span className="text-slate-300 text-[11px]">—</span>
  if (trialConfirmed) return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: '#D1FAE5', color: '#059669' }}>Confirmé</span>
  )
  const days = Math.ceil((new Date(trialPeriodEnd).getTime() - Date.now()) / 86400000)
  if (days < 0) return (
    <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={{ background: '#FEF3C7', color: '#D97706' }}>À confirmer</span>
  )
  return (
    <span className={`text-[11px] font-medium ${days <= 7 ? 'text-amber-600' : 'text-slate-400'}`}>{days}j</span>
  )
}

// ─── Mission Detail Modal ─────────────────────────────────────────────────────

function MissionDetailModal({ mission, onClose, onEdit }: {
  mission: any; onClose: () => void; onEdit: () => void
}) {
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data: otData } = useQuery({
    queryKey: ['mission-overtime', mission.id],
    queryFn: () => fetch(`${B}/api/overtime?missionId=${mission.id}`).then(r => r.json()),
  })
  const overtime: any[] = otData?.data ?? []

  const { candidate, client, service, country } = mission
  const ct = CONTRACT_TYPE[mission.contractType] ?? { label: mission.contractType, short: mission.contractType, bg: '#F1F5F9', color: '#64748B' }
  const st = MISSION_STATUS[mission.status]      ?? { label: mission.status, bg: '#F1F5F9', color: '#64748B' }
  const sym = country?.symbol ?? ''

  const isPlacement = mission.contractType === 'placement'
  const marge = isPlacement
    ? (mission.clientRate ?? 0) - (mission.employeeRate ?? 0) - (mission.agencyFee ?? 0)
    : (mission.netSalary ?? 0) * ((mission.commissionRate ?? 0) / 100)

  return (
    <Modal
      title={`Mission #${mission.id}`}
      subtitle={`${candidate?.firstName ?? ''} ${candidate?.lastName ?? ''} chez ${client?.name ?? ''}`}
      onClose={onClose}
      size="xl"
    >
      {/* Type + Statut badges + Modifier */}
      <div className="flex items-center justify-between -mt-1 mb-5">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
            style={{ background: ct.bg, color: ct.color }}>{ct.label}</span>
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold"
            style={{ background: st.bg, color: st.color }}>{st.label}</span>
        </div>
        <Btn icon={<Pencil size={13} />} variant="secondary" size="sm" onClick={onEdit}>
          Modifier
        </Btn>
      </div>

      {/* Two-column cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">

        {/* Détails */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Détails</p>
          <InfoRow label="Employé"             value={`${candidate?.firstName ?? ''} ${candidate?.lastName ?? ''}`} />
          <InfoRow label="Client"              value={client?.name} />
          <InfoRow label="Service"             value={service?.name} />
          <InfoRow label="Pays"                value={country?.name} />
          <InfoRow label="Début"               value={fmtDate(mission.startDate)} />
          <InfoRow label="Fin"                 value={mission.endDate ? fmtDate(mission.endDate) : 'En cours'} />
          <InfoRow label="Facturation"         value={BILLING_LABELS[client?.billingFreq] ?? client?.billingFreq ?? '—'} />
          <InfoRow label="Base prorata"        value={`${mission.prorataBase} jours`} />
          <InfoRow label="Fin période d'essai" value={fmtDate(mission.trialPeriodEnd)} />
          <InfoRow label="Essai confirmé"      value={mission.trialConfirmed ? 'Confirmé' : 'En attente'} />
        </div>

        {/* Décomposition financière */}
        <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Décomposition financière</p>
          {isPlacement ? (
            <>
              <InfoRow label="Tarif client"    value={`${(mission.clientRate ?? 0).toLocaleString('fr-FR')} ${sym}`} />
              <InfoRow label="Salaire employé" value={`${(mission.employeeRate ?? 0).toLocaleString('fr-FR')} ${sym}`} />
              <InfoRow label="Frais agence"    value={`${(mission.agencyFee ?? 0).toLocaleString('fr-FR')} ${sym}`} />
            </>
          ) : (
            <>
              <InfoRow label="Salaire NET cible" value={`${(mission.netSalary ?? 0).toLocaleString('fr-FR')} ${sym}`} />
              <InfoRow label="Commission USRA"   value={`${mission.commissionRate ?? 0}%`} />
            </>
          )}

          {/* Marge USRA — highlighted row */}
          <div className="flex items-center justify-between py-2 px-3 -mx-3 mt-2 rounded-lg"
            style={{ background: '#F0FDF9' }}>
            <span className="text-[12px] font-bold text-teal-700">Marge USRA</span>
            <span className="text-[13px] font-bold text-teal-700">
              {marge.toLocaleString('fr-FR')} {sym}
            </span>
          </div>

          {/* Taux heures sup from client */}
          {client?.overtimeRate != null && (
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-400 leading-relaxed">
              Taux heures sup (défini par{' '}
              <span className="font-medium text-slate-600">{client.name}</span>) :{' '}
              <span className="font-semibold text-slate-700">
                {Number(client.overtimeRate).toLocaleString('fr-FR')} {sym}/h
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Heures supplémentaires */}
      <div className="mb-5">
        <h4 className="text-sm font-bold text-slate-700 mb-3">
          Heures supplémentaires ({overtime.length})
        </h4>
        {overtime.length === 0 ? (
          <p className="text-[12px] text-slate-400 py-1">Aucune heure supplémentaire enregistrée.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Heures', 'Montant', 'Motif', 'Statut'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {overtime.map((ot: any) => {
                const os = OVERTIME_STATUS[ot.status] ?? { label: ot.status, bg: '#FEF3C7', color: '#D97706' }
                return (
                  <tr key={ot.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 text-[12px] text-slate-600">{fmtDate(ot.date)}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600">{ot.hours}h</td>
                    <td className="px-3 py-2.5 text-[12px] font-semibold text-slate-700">
                      {(ot.amount ?? 0).toLocaleString('fr-FR')} {sym}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{ot.description ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ background: os.bg, color: os.color }}>{os.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Notes */}
      {mission.notes && (
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-2">Notes</h4>
          <div className="bg-slate-50 rounded-lg border border-slate-100 p-3 text-[12px] text-slate-600 leading-relaxed">
            {mission.notes}
          </div>
        </div>
      )}
    </Modal>
  )
}

// ─── Mission Form ─────────────────────────────────────────────────────────────

function calcTrialEnd(startDate: string): string {
  if (!startDate) return ''
  const d = new Date(startDate)
  d.setDate(d.getDate() + 30)
  return d.toISOString().slice(0, 10)
}

function MissionForm({ mission, onClose, onSaved }: {
  mission?: any; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)

  const { data: candidatesData } = useQuery({
    queryKey: ['candidates-form'],
    queryFn: () => fetch(`${B}/api/candidates`).then(r => r.json()),
  })
  const { data: clientsData } = useQuery({
    queryKey: ['clients'],
    queryFn: () => fetch(`${B}/api/clients`).then(r => r.json()),
  })
  const { data: countriesData } = useQuery({
    queryKey: ['countries-list'],
    queryFn: () => fetch(`${B}/api/countries`).then(r => r.json()),
  })
  const { data: servicesData } = useQuery({
    queryKey: ['services'],
    queryFn: () => fetch(`${B}/api/services`).then(r => r.json()),
  })

  const allCandidates: any[] = candidatesData?.data ?? []
  const candidates = allCandidates.filter(c => ['validated', 'placed'].includes(c.status))
  const clients:    any[] = clientsData?.data    ?? []
  const countries:  any[] = countriesData?.data  ?? []
  const services:   any[] = servicesData?.data   ?? []

  const today = new Date().toISOString().slice(0, 10)

  const [f, setF] = useState(() => ({
    countryId:      mission?.countryId      ? String(mission.countryId)   : '1',
    clientId:       mission?.clientId       ? String(mission.clientId)    : '',
    candidateId:    mission?.candidateId    ? String(mission.candidateId) : '',
    serviceId:      mission?.serviceId      ? String(mission.serviceId)   : '',
    contractType:   mission?.contractType   ?? 'placement',
    status:         mission?.status         ?? 'pending',
    startDate:      mission?.startDate      ? new Date(mission.startDate).toISOString().slice(0, 10)      : today,
    endDate:        mission?.endDate        ? new Date(mission.endDate).toISOString().slice(0, 10)        : '',
    prorataBase:    mission?.prorataBase    ? String(mission.prorataBase) : '30',
    trialPeriodEnd: mission?.trialPeriodEnd ? new Date(mission.trialPeriodEnd).toISOString().slice(0, 10) : calcTrialEnd(today),
    clientRate:     mission?.clientRate     ?? 0,
    employeeRate:   mission?.employeeRate   ?? 0,
    agencyFee:      mission?.agencyFee      ?? 0,
    netSalary:      mission?.netSalary      ?? 0,
    commissionRate: mission?.commissionRate ?? 12,
    notes:          mission?.notes          ?? '',
  }))

  const u = (k: string) => (v: string) => setF(p => ({ ...p, [k]: v }))

  const handleStartDateChange = (v: string) => {
    setF(p => ({
      ...p,
      startDate: v,
      trialPeriodEnd: p.trialPeriodEnd ? p.trialPeriodEnd : calcTrialEnd(v),
    }))
  }

  const handleClientChange = (v: string) => {
    const c = clients.find((c: any) => String(c.id) === v)
    setF(p => ({ ...p, clientId: v, ...(c ? { countryId: String(c.countryId) } : {}) }))
  }

  const save = async () => {
    if (!f.clientId || !f.candidateId) { showToast('Client et employé requis', 'error'); return }
    if (!f.serviceId) { showToast('Service requis', 'error'); return }
    if (!f.startDate) { showToast('Date de début requise', 'error'); return }
    setSaving(true)
    try {
      const body = {
        countryId:      Number(f.countryId),
        clientId:       Number(f.clientId),
        candidateId:    Number(f.candidateId),
        serviceId:      Number(f.serviceId),
        contractType:   f.contractType,
        status:         f.status,
        startDate:      f.startDate,
        endDate:        f.endDate || null,
        prorataBase:    Number(f.prorataBase),
        trialPeriodEnd: f.trialPeriodEnd || null,
        clientRate:     Number(f.clientRate),
        employeeRate:   Number(f.employeeRate),
        agencyFee:      Number(f.agencyFee),
        netSalary:      Number(f.netSalary),
        commissionRate: Number(f.commissionRate),
        notes:          f.notes || null,
      }
      const url    = mission ? `${B}/api/missions/${mission.id}` : `${B}/api/missions`
      const method = mission ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (res.ok) { onSaved(); onClose() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  const isNew = !mission

  return (
    <Modal title={isNew ? 'Nouvelle mission' : 'Modifier mission'} onClose={onClose} size="lg">
      <div className="space-y-3">

        {/* Pays | Type de contrat */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pays" value={f.countryId} onChange={u('countryId')}
            options={[
              { value: '', label: 'Sélectionner...' },
              ...countries.map((c: any) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <Field label="Type de contrat" value={f.contractType} onChange={u('contractType')} options={[
            { value: 'placement',          label: 'Placement (forfait)' },
            { value: 'mise_a_disposition', label: 'Mise à disposition (MAD)' },
          ]} />
        </div>

        {/* Client * | Employé * */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Client" required value={f.clientId} onChange={handleClientChange}
            options={[
              { value: '', label: '— Choisir —' },
              ...clients.map((c: any) => ({ value: String(c.id), label: c.name })),
            ]}
          />
          <Field label="Employé" required value={f.candidateId} onChange={u('candidateId')}
            options={[
              { value: '', label: '— Choisir —' },
              ...candidates.map((c: any) => ({ value: String(c.id), label: `${c.firstName} ${c.lastName}` })),
            ]}
          />
        </div>

        {/* Service | Statut */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Service
            </label>
            <ServiceSelect value={f.serviceId} onChange={u('serviceId')} services={services} />
          </div>
          <Field label="Statut" value={f.status} onChange={u('status')} options={[
            { value: 'pending',    label: 'En attente' },
            { value: 'active',     label: 'Actif' },
            { value: 'completed',  label: 'Terminée' },
            { value: 'terminated', label: 'Résiliée' },
            { value: 'suspended',  label: 'Suspendue' },
          ]} />
        </div>

        {/* Date de début * | Date de fin */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date de début" required type="date" value={f.startDate} onChange={handleStartDateChange} />
          <Field label="Date de fin (optionnel)" type="date" value={f.endDate} onChange={u('endDate')} />
        </div>

        {/* Base prorata | Fin période d'essai */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Base prorata" value={f.prorataBase} onChange={u('prorataBase')} options={PRORATA_OPTS} />
          <Field label="Fin période d'essai" type="date" value={f.trialPeriodEnd} onChange={u('trialPeriodEnd')} />
        </div>

        {/* Financier — selon type de contrat */}
        {f.contractType === 'placement' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tarif client (forfait mensuel)" type="number" value={f.clientRate}   onChange={u('clientRate')} />
              <Field label="Salaire employé"                type="number" value={f.employeeRate} onChange={u('employeeRate')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Frais agence (si payés en sus)" type="number" value={f.agencyFee} onChange={u('agencyFee')} />
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Salaire NET cible"   type="number" value={f.netSalary}      onChange={u('netSalary')} />
            <Field label="Commission USRA (%)" type="number" value={f.commissionRate} onChange={u('commissionRate')} suffix="%" />
          </div>
        )}

        {/* Notes */}
        <Field label="Notes" value={f.notes} onChange={u('notes')} textarea />

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? 'Enregistrement...' : isNew ? 'Créer la mission' : 'Enregistrer'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function MissionsPage() {
  const { showToast, adminCountryFilter } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const countryQ = adminCountryFilter !== 'all' ? 'countryId=' + adminCountryFilter : ''
  const role = (session?.user?.role ?? 'operator') as string
  const canEdit = sessionStatus === 'authenticated' && role !== 'operator'

  const [search, setSearch]     = useState('')
  const [statusF, setStatusF]   = useState('all')
  const [typeF, setTypeF]       = useState('all')
  const [viewing, setViewing]   = useState<any>(null)
  const [editing, setEditing]   = useState<any>(null)
  const [creating, setCreating] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['missions', statusF, typeF, adminCountryFilter],
    queryFn: () =>
      fetch(`${B}/api/missions?status=${statusF === 'all' ? '' : statusF}&type=${typeF === 'all' ? '' : typeF}${countryQ ? '&' + countryQ : ''}`)
        .then(r => r.json()),
  })

  const all: any[] = data?.data ?? []
  const missions = all.filter(m =>
    !search ||
    `${m.candidate?.firstName} ${m.candidate?.lastName} ${m.client?.name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  const refresh = () => qc.refetchQueries({ queryKey: ['missions'] })

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Missions"
        subtitle={`${missions.length} mission(s)`}
        actions={
          <div className="flex items-center gap-2">
            <SearchBox value={search} onChange={setSearch} placeholder="Rechercher..." />
            {canEdit && (
              <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>
                Nouvelle mission
              </Btn>
            )}
          </div>
        }
      />

      {/* Filtres */}
      <div className="flex items-center gap-2">
        <FilterSelect value={statusF} onChange={setStatusF} options={STATUS_OPTS} />
        <FilterSelect value={typeF}   onChange={setTypeF}   options={TYPE_OPTS} />
      </div>

      {/* Table */}
      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : missions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">Aucune mission trouvée</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['#', 'Employé', 'Client', 'Type', 'Début', 'Essai', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {missions.map((m: any) => (
                <tr key={m.id} onClick={() => setViewing(m)}
                  className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors cursor-pointer group">

                  {/* # */}
                  <td className="px-4 py-3 font-mono font-bold text-[12px] text-slate-500">
                    M-{String(m.id).padStart(4, '0')}
                  </td>

                  {/* Employé */}
                  <td className="px-4 py-3">
                    <div className="font-semibold text-[13px] text-slate-800">
                      {m.candidate?.firstName} {m.candidate?.lastName}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-teal-600 italic mt-0.5">
                      {m.service?.name && (
                        <ServiceIcon slug={m.service.icon} size={12} />
                      )}
                      {m.service?.name ?? '—'}
                    </div>
                  </td>

                  {/* Client */}
                  <td className="px-4 py-3 text-[12px] text-slate-600">{m.client?.name ?? '—'}</td>

                  {/* Type */}
                  <td className="px-4 py-3"><TypePill type={m.contractType} short /></td>

                  {/* Début */}
                  <td className="px-4 py-3 text-[12px] text-slate-600">{fmtDate(m.startDate)}</td>

                  {/* Essai */}
                  <td className="px-4 py-3">
                    <EssaiBadge trialPeriodEnd={m.trialPeriodEnd} trialConfirmed={m.trialConfirmed} />
                  </td>

                  {/* Statut */}
                  <td className="px-4 py-3"><StatusPill status={m.status} /></td>

                  {/* Voir → */}
                  <td className="px-4 py-3 text-right">
                    <span className="flex items-center justify-end gap-1 text-[12px] text-slate-300 group-hover:text-teal-500 transition-colors font-medium">
                      Voir <ArrowRight size={12} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modals */}
      {creating && (
        <MissionForm
          onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Mission créée'); setCreating(false) }}
        />
      )}
      {editing && (
        <MissionForm
          mission={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => { await refresh(); showToast('Mission modifiée'); setEditing(null) }}
        />
      )}
      {viewing && (
        <MissionDetailModal
          mission={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null) }}
        />
      )}
    </div>
  )
}
