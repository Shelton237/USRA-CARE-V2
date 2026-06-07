'use client'
import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { PageHeader, Btn, Modal, Field, Card, SearchBox, FilterSelect, InfoRow } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useSession } from 'next-auth/react'
import { Plus, Trash2, Building2, User, ArrowRight, Pencil, CheckCircle } from 'lucide-react'

const BILLING_FREQ = [
  { value: 'monthly',   label: 'Mensuelle' },
  { value: 'bimonthly', label: 'À la quinzaine' },
]
const TYPE_OPTS = [
  { value: 'individual', label: 'Particulier' },
  { value: 'company',    label: 'Entreprise'  },
]
const CONTRACT_TYPE_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  placement:          { label: 'Placement', bg: '#EFF6FF', color: '#3B82F6' },
  mise_a_disposition: { label: 'MAD',       bg: '#F5F3FF', color: '#7C3AED' },
}
const MISSION_STATUS: Record<string, { label: string; color: string }> = {
  active:     { label: 'En cours',   color: '#059669' },
  pending:    { label: 'En attente', color: '#F59E0B' },
  completed:  { label: 'Terminée',   color: '#6B7280' },
  terminated: { label: 'Résiliée',   color: '#EF4444' },
}
const INVOICE_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft:   { label: 'Brouillon', bg: '#F1F5F9', color: '#64748B' },
  sent:    { label: 'Envoyée',   bg: '#EFF6FF', color: '#3B82F6' },
  partial: { label: 'Partielle', bg: '#FEF3C7', color: '#D97706' },
  paid:    { label: 'Payée',     bg: '#D1FAE5', color: '#059669' },
  overdue: { label: 'En retard', bg: '#FEE2E2', color: '#DC2626' },
}
const COMPLAINT_SEVERITY: Record<string, { label: string; bg: string; color: string }> = {
  low:      { label: 'Faible',   bg: '#F1F5F9', color: '#64748B' },
  medium:   { label: 'Moyen',    bg: '#FEF3C7', color: '#D97706' },
  high:     { label: 'Élevé',    bg: '#FEE2E2', color: '#DC2626' },
  critical: { label: 'Critique', bg: '#FEE2E2', color: '#991B1B' },
}
const COMPLAINT_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  received:      { label: 'Reçue',       bg: '#EFF6FF', color: '#3B82F6' },
  investigating: { label: 'En enquête',  bg: '#FEF3C7', color: '#D97706' },
  resolved:      { label: 'Résolue',     bg: '#D1FAE5', color: '#059669' },
  closed:        { label: 'Fermée',      bg: '#F1F5F9', color: '#64748B' },
}
const BILLING_LABELS: Record<string, string> = {
  monthly: 'Mensuelle', bimonthly: 'À la quinzaine',
}
const COMPLAINT_TYPE_LABELS: Record<string, string> = {
  absence: 'Absence', behavior: 'Comportement', quality: 'Qualité',
  delay: 'Retard', other: 'Autre',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  const isCompany = type === 'company'
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold"
      style={isCompany
        ? { background: '#F5F3FF', color: '#7C3AED' }
        : { background: '#EFF6FF', color: '#3B82F6' }}>
      {isCompany ? <Building2 size={10} /> : <User size={10} />}
      {isCompany ? 'Entreprise' : 'Particulier'}
    </span>
  )
}

function MissionsBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold"
      style={count > 0
        ? { background: '#CCFBF1', color: '#0D9488' }
        : { background: '#F1F5F9', color: '#94A3B8' }}>
      {count}
    </span>
  )
}

function fmtDate(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('fr-FR')
}

// ─── Client Detail Modal ───────────────────────────────────────────────────────

function ClientDetailModal({ client, countries, onClose, onEdit }: {
  client: any; countries: any[]; onClose: () => void; onEdit: () => void
}) {
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [tab, setTab] = useState<'info' | 'missions' | 'invoices' | 'complaints'>('info')

  const { data: mData } = useQuery({
    queryKey: ['client-missions', client.id],
    queryFn: () => fetch(`${B}/api/missions?clientId=${client.id}`).then(r => r.json()),
  })
  const { data: iData } = useQuery({
    queryKey: ['client-invoices', client.id],
    queryFn: () => fetch(`${B}/api/invoices?clientId=${client.id}`).then(r => r.json()),
  })
  const { data: cData } = useQuery({
    queryKey: ['client-complaints', client.id],
    queryFn: () => fetch(`${B}/api/complaints?clientId=${client.id}`).then(r => r.json()),
  })

  const missions   = mData?.data   ?? []
  const invoices   = iData?.data   ?? []
  const complaints = cData?.data   ?? []

  const mCount = client._count?.missions   ?? 0
  const iCount = client._count?.invoices   ?? 0
  const cCount = client._count?.complaints ?? 0

  const country = countries.find(c => c.id === client.countryId)

  const TABS = [
    { key: 'info',       label: 'Informations' },
    { key: 'missions',   label: `Missions (${mCount})` },
    { key: 'invoices',   label: `Factures (${iCount})` },
    { key: 'complaints', label: `Plaintes (${cCount})` },
  ] as const

  const subtitle = client.companyName
    || (client.type === 'company' ? 'Entreprise' : 'Particulier')

  return (
    <Modal title={client.name} subtitle={subtitle} onClose={onClose} size="xl">
      {/* Tab bar + Modifier button */}
      <div className="flex items-center justify-between -mx-5 px-5 border-b border-slate-100 mb-5">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                tab === t.key
                  ? 'border-teal-600 text-teal-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
        <Btn icon={<Pencil size={13} />} variant="secondary" size="sm" onClick={onEdit}>
          Modifier
        </Btn>
      </div>

      {/* ── TAB: Informations ── */}
      {tab === 'info' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Coordonnées */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Coordonnées
            </p>
            <InfoRow label="Téléphone"    value={client.phone} />
            <InfoRow label="Email"        value={client.email} />
            <InfoRow label="Adresse"      value={client.address} />
            {client.contactPerson && <InfoRow label="Contact"      value={client.contactPerson} />}
            {client.nif           && <InfoRow label="NIF"          value={client.nif} />}
            {client.stat          && <InfoRow label="STAT / RCCM"  value={client.stat} />}
          </div>

          {/* Conditions commerciales */}
          <div className="bg-slate-50 rounded-xl border border-slate-100 p-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
              Conditions commerciales
            </p>
            <InfoRow label="Commission"           value={`${client.commissionRate}%`} />
            <InfoRow label="Délai de paiement"    value={`${client.paymentTermsDays} jours`} />
            <InfoRow
              label="Taux heures sup"
              value={`${(client.overtimeRate ?? 0).toLocaleString('fr-FR')} ${country?.symbol ?? ''}/h`}
            />
            <InfoRow label="Fréquence facturation" value={BILLING_LABELS[client.billingFreq] ?? client.billingFreq} />
            <InfoRow label="Pays"                  value={client.country?.name} />
          </div>
        </div>
      )}

      {/* ── TAB: Missions ── */}
      {tab === 'missions' && (
        missions.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-sm">Aucune mission pour ce client</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['#', 'Employé', 'Service', 'Type', 'Début', 'Statut'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {missions.map((m: any, i: number) => {
                const st = MISSION_STATUS[m.status] ?? { label: m.status, color: '#94A3B8' }
                const ct = CONTRACT_TYPE_LABELS[m.contractType]
                return (
                  <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 text-[11px] text-slate-400">{i + 1}</td>
                    <td className="px-3 py-2.5 text-[12px] font-medium text-slate-700">
                      {m.candidate?.firstName} {m.candidate?.lastName}
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{m.service?.name ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {ct
                        ? <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold" style={{ background: ct.bg, color: ct.color }}>{ct.label}</span>
                        : <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-500">{m.contractType}</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDate(m.startDate)}</td>
                    <td className="px-3 py-2.5">
                      <span className="text-[11px] font-semibold" style={{ color: st.color }}>{st.label}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )
      )}

      {/* ── TAB: Factures ── */}
      {tab === 'invoices' && (
        invoices.length === 0 ? (
          <div className="py-14 text-center text-slate-400 text-sm">Aucune facture pour ce client</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Référence', 'Date', 'Total', 'Statut'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => {
                const st = INVOICE_STATUS[inv.status] ?? { label: inv.status, bg: '#F1F5F9', color: '#64748B' }
                return (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">{inv.reference}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDate(inv.date)}</td>
                    <td className="px-3 py-2.5 text-[12px] font-semibold text-slate-700">
                      {(inv.total ?? 0).toLocaleString('fr-FR')} {inv.country?.symbol ?? ''}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )
      )}

      {/* ── TAB: Plaintes ── */}
      {tab === 'complaints' && (
        complaints.length === 0 ? (
          <div className="py-14 flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle size={22} className="text-emerald-500" />
            </div>
            <p className="text-slate-400 text-sm">Aucune plainte enregistrée</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Date', 'Type', 'Gravité', 'Statut'].map(h => (
                  <th key={h} className="text-left px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {complaints.map((c: any) => {
                const sev = COMPLAINT_SEVERITY[c.severity] ?? { label: c.severity, bg: '#F1F5F9', color: '#64748B' }
                const st  = COMPLAINT_STATUS[c.status]    ?? { label: c.status,   bg: '#F1F5F9', color: '#64748B' }
                return (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="px-3 py-2.5 text-[12px] text-slate-500">{fmtDate(c.date)}</td>
                    <td className="px-3 py-2.5 text-[12px] text-slate-600">
                      {COMPLAINT_TYPE_LABELS[c.type] ?? c.type}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ background: sev.bg, color: sev.color }}>
                        {sev.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold"
                        style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )
      )}
    </Modal>
  )
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function ClientForm({ client, countries, onClose, onSaved }: {
  client?: any; countries: any[]; onClose: () => void; onSaved: () => void
}) {
  const { showToast } = useAppStore()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const [saving, setSaving] = useState(false)

  const [f, setF] = useState({
    type:             client?.type             ?? 'individual',
    countryId:        client?.countryId        ? String(client.countryId) : '',
    officeId:         client?.officeId         ? String(client.officeId)  : '',
    name:             client?.name             ?? '',
    companyName:      client?.companyName      ?? '',
    contactPerson:    client?.contactPerson    ?? '',
    phone:            client?.phone            ?? '',
    email:            client?.email            ?? '',
    address:          client?.address          ?? '',
    nif:              client?.nif              ?? '',
    stat:             client?.stat             ?? '',
    commissionRate:   client?.commissionRate   ?? 12,
    paymentTermsDays: client?.paymentTermsDays ?? 5,
    overtimeRate:     client?.overtimeRate     ?? 5000,
    billingFreq:      client?.billingFreq      ?? 'monthly',
    notes:            client?.notes            ?? '',
  })
  const u = (k: string) => (v: any) => setF(p => ({ ...p, [k]: v }))

  const offices = useMemo(() => {
    if (!f.countryId) return []
    const c = countries.find(c => String(c.id) === f.countryId)
    return c?.offices ?? []
  }, [f.countryId, countries])

  const save = async () => {
    if (!f.name)      { showToast('Nom requis', 'error'); return }
    if (!f.phone)     { showToast('Téléphone requis', 'error'); return }
    if (!f.countryId) { showToast('Pays requis', 'error'); return }
    setSaving(true)
    try {
      const url    = client ? `${B}/api/clients/${client.id}` : `${B}/api/clients`
      const method = client ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...f,
          countryId:        Number(f.countryId),
          officeId:         f.officeId ? Number(f.officeId) : null,
          commissionRate:   Number(f.commissionRate),
          paymentTermsDays: Number(f.paymentTermsDays),
          overtimeRate:     Number(f.overtimeRate),
        }),
      })
      if (res.ok) { onSaved() }
      else { const b = await res.json().catch(() => ({})); showToast(b?.error ?? 'Erreur', 'error') }
    } catch { showToast('Erreur réseau', 'error') }
    finally { setSaving(false) }
  }

  const isNew = !client

  return (
    <Modal title={isNew ? 'Nouveau client' : 'Modifier client'} onClose={onClose} size="lg">
      <div className="space-y-3">
        {/* Type | Pays */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Type" value={f.type} onChange={u('type')} options={TYPE_OPTS} />
          <Field
            label="Pays" value={f.countryId}
            onChange={v => setF(p => ({ ...p, countryId: v, officeId: '' }))}
            options={[{ value: '', label: 'Sélectionner...' }, ...countries.map(c => ({ value: String(c.id), label: c.name }))]}
          />
        </div>

        {f.type === 'individual' ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom *" value={f.name} onChange={u('name')} placeholder="Nom du client" />
              <Field label="Téléphone *" value={f.phone} onChange={u('phone')} placeholder="+261 34 000 000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" value={f.email} onChange={u('email')} type="email" placeholder="email@exemple.com" />
              <Field
                label="Bureau" value={f.officeId} onChange={u('officeId')}
                options={[{ value: '', label: offices.length ? 'Sélectionner...' : '— aucun bureau —' }, ...offices.map((o: any) => ({ value: String(o.id), label: o.name }))]}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nom *" value={f.name} onChange={u('name')} placeholder="Nom ou enseigne" />
              <Field label="Raison sociale" value={f.companyName} onChange={u('companyName')} placeholder="Nom juridique complet" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Personne de contact" value={f.contactPerson} onChange={u('contactPerson')} placeholder="Nom du contact" />
              <Field label="Téléphone *" value={f.phone} onChange={u('phone')} placeholder="+261 20 000 000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" value={f.email} onChange={u('email')} type="email" placeholder="contact@entreprise.com" />
              <Field label="NIF" value={f.nif} onChange={u('nif')} placeholder="NIF-2024-XXXXXXX" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="STAT/RCCM" value={f.stat} onChange={u('stat')} placeholder="STAT ou RCCM" />
              <Field
                label="Bureau" value={f.officeId} onChange={u('officeId')}
                options={[{ value: '', label: offices.length ? 'Sélectionner...' : '— aucun bureau —' }, ...offices.map((o: any) => ({ value: String(o.id), label: o.name }))]}
              />
            </div>
          </>
        )}

        <Field label="Adresse" value={f.address} onChange={u('address')} textarea />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Commission (%)" type="number" value={f.commissionRate} onChange={u('commissionRate')} suffix="%" />
          <Field label="Délai de paiement (jours)" type="number" value={f.paymentTermsDays} onChange={u('paymentTermsDays')} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Taux horaire heures sup" type="number" value={f.overtimeRate} onChange={u('overtimeRate')}
            hint="Tarif horaire facturé au client pour les heures sup"
          />
          <Field label="Fréquence facturation" value={f.billingFreq} onChange={u('billingFreq')} options={BILLING_FREQ} />
        </div>

        <Field label="Notes" value={f.notes} onChange={u('notes')} textarea />

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Btn variant="secondary" onClick={onClose}>Annuler</Btn>
          <Btn onClick={save} disabled={saving}>
            {saving ? 'Enregistrement...' : isNew ? 'Créer le client' : 'Modifier le client'}
          </Btn>
        </div>
      </div>
    </Modal>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ClientsPage() {
  const { showToast, showConfirm, adminCountryFilter } = useAppStore()
  const { data: session, status: sessionStatus } = useSession()
  const qc = useQueryClient()
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const countryQ = adminCountryFilter !== 'all' ? '?countryId=' + adminCountryFilter : ''
  const role = (session?.user?.role ?? 'operator') as string
  const canEdit = sessionStatus === 'authenticated' && role !== 'operator'

  const [search, setSearch]     = useState('')
  const [typeF, setTypeF]       = useState('all')
  const [creating, setCreating] = useState(false)
  const [viewing, setViewing]   = useState<any>(null)
  const [editing, setEditing]   = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['clients', adminCountryFilter],
    queryFn: () => fetch(`${B}/api/clients${countryQ}`).then(r => r.json()),
  })
  const { data: countriesData } = useQuery({
    queryKey: ['countries-list'],
    queryFn: () => fetch(`${B}/api/countries`).then(r => r.json()),
  })
  const countries: any[] = countriesData?.data ?? []

  const all: any[] = data?.data ?? []
  const clients = all.filter(c =>
    (typeF === 'all' || c.type === typeF) &&
    (!search || `${c.name} ${c.companyName ?? ''} ${c.phone}`.toLowerCase().includes(search.toLowerCase()))
  )

  const refresh = () => qc.refetchQueries({ queryKey: ['clients'] })

  const handleDelete = (c: any) => {
    showConfirm({
      title: `Supprimer ${c.name} ?`,
      message: 'Cette action est irréversible.',
      danger: true,
      onConfirm: async () => {
        const res = await fetch(`${B}/api/clients/${c.id}`, { method: 'DELETE' })
        if (res.ok) { refresh(); showToast('Client supprimé') }
        else showToast('Erreur lors de la suppression', 'error')
      },
    })
  }

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} client(s)`}
        actions={
          <div className="flex items-center gap-2">
            <SearchBox value={search} onChange={setSearch} placeholder="Nom..." />
            {canEdit && (
              <Btn icon={<Plus size={14} />} onClick={() => setCreating(true)}>
                Nouveau client
              </Btn>
            )}
          </div>
        }
      />

      <div>
        <FilterSelect value={typeF} onChange={setTypeF} options={[
          { value: 'all',        label: 'Tous types'  },
          { value: 'individual', label: 'Particulier' },
          { value: 'company',    label: 'Entreprise'  },
        ]} />
      </div>

      <Card noPad>
        {isLoading ? (
          <div className="py-12 text-center text-slate-400 text-sm">Chargement...</div>
        ) : clients.length === 0 ? (
          <div className="py-16 text-center">
            <User size={32} className="mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 text-sm">Aucun client trouvé</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                {['Nom', 'Type', 'Téléphone', 'Pays', 'Missions', 'Facturation', 'Commission', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clients.map((c: any) => (
                <tr key={c.id} onClick={() => setViewing(c)}
                  className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group cursor-pointer">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 text-[13px]">{c.name}</div>
                    {c.companyName && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{c.companyName}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><TypeBadge type={c.type} /></td>
                  <td className="px-4 py-3 font-mono text-[12px] text-slate-600">{c.phone}</td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">{c.country?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    <MissionsBadge count={c._count?.missions ?? 0} />
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">
                    {c.billingFreq === 'bimonthly' ? 'Quinzaine' : 'Mensuelle'}
                  </td>
                  <td className="px-4 py-3 text-[12px] text-slate-600">{c.commissionRate}%</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="flex items-center gap-1 text-[12px] text-slate-300 group-hover:text-teal-500 transition-colors">
                        <ArrowRight size={12} />
                      </span>
                      {canEdit && (
                        <button onClick={e => { e.stopPropagation(); handleDelete(c) }}
                          className="p-1 rounded hover:bg-red-50 hover:text-red-400 text-slate-200 transition-colors opacity-0 group-hover:opacity-100">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {creating && (
        <ClientForm countries={countries} onClose={() => setCreating(false)}
          onSaved={async () => { await refresh(); showToast('Client créé'); setCreating(false) }} />
      )}
      {editing && (
        <ClientForm client={editing} countries={countries} onClose={() => setEditing(null)}
          onSaved={async () => { await refresh(); showToast('Client modifié'); setEditing(null) }} />
      )}
      {viewing && (
        <ClientDetailModal
          client={viewing}
          countries={countries}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null) }}
        />
      )}
    </div>
  )
}
