'use client'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/store/app'
import { PageHeader } from '@/components/ui'
import { fmt, pct } from '@/lib/utils'
import {
  Users, Briefcase, Receipt, CreditCard, TrendingUp, AlertTriangle,
  Clock, ClipboardList, Wallet, MessageSquareWarning, Globe,
  ArrowDown, ArrowUp, ChevronRight, CheckCircle2, XCircle, Coins,
} from 'lucide-react'

const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

// ─── Color maps ───────────────────────────────────────────────────────────────

const ALERT_COLOR: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icon: '#F59E0B' },
  danger:  { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: '#EF4444' },
  info:    { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8', icon: '#3B82F6' },
}

const INV_STATUS: Record<string, { label: string; color: string }> = {
  draft:          { label: 'Brouillon',   color: '#94A3B8' },
  sent:           { label: 'Émise',       color: '#3B82F6' },
  paid:           { label: 'Payée',       color: '#10B981' },
  partially_paid: { label: 'Part. payée', color: '#D97706' },
  overdue:        { label: 'En retard',   color: '#EF4444' },
  cancelled:      { label: 'Annulée',     color: '#64748B' },
}

const CONTRACT_TYPE: Record<string, { label: string; color: string }> = {
  placement:     { label: 'Placement',  color: '#0D9488' },
  mad:           { label: 'MAD',        color: '#7C3AED' },
  mise_a_disposition: { label: 'MAD',   color: '#7C3AED' },
  prestation:    { label: 'Prestation', color: '#3B82F6' },
}

const MISSION_STATUS: Record<string, { label: string; color: string }> = {
  active:    { label: 'Actif',    color: '#10B981' },
  pending:   { label: 'Attente',  color: '#F59E0B' },
  completed: { label: 'Terminé',  color: '#0D9488' },
  cancelled: { label: 'Annulé',   color: '#64748B' },
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DashboardPage() {
  const { data: session } = useSession()
  const { setPage } = useAppStore()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch(`${B}/api/dashboard`).then(r => r.json()),
    refetchInterval: 60_000,
  })

  const stats          = data?.data?.stats          ?? {}
  const counters       = data?.data?.counters        ?? {}
  const treasury       = data?.data?.treasury        ?? []
  const caByCountry    = data?.data?.caByCountry     ?? []
  const pipeline       = data?.data?.pipeline        ?? []
  const recentInvoices = data?.data?.recentInvoices  ?? []
  const recentMissions = data?.data?.recentMissions  ?? []
  const isAdmin        = session?.user?.role === 'admin'
  const isOperator     = session?.user?.role === 'operator'

  const alerts = [
    { count: counters.overtime           ?? 0, label: 'Heures sup à valider',    page: 'overtime',     color: 'warning', icon: Clock },
    { count: counters.advances           ?? 0, label: 'Avances à approuver',    page: 'advances',     color: 'warning', icon: Wallet },
    { count: counters.attendance         ?? 0, label: 'Présences à valider',   page: 'attendance',   color: 'warning', icon: ClipboardList },
    { count: counters.payrollsToValidate ?? 0, label: 'Bulletins à valider',    page: 'payrolls',     color: 'warning', icon: CheckCircle2 },
    { count: counters.payrollsToPay      ?? 0, label: 'Bulletins à payer',      page: 'payrolls',     color: 'warning', icon: CreditCard },
    { count: counters.invoices           ?? 0, label: 'Factures en retard',     page: 'invoices',     color: 'danger',  icon: Receipt },
    { count: counters.complaints         ?? 0, label: 'Plaintes ouvertes',      page: 'complaints',   color: 'danger',  icon: MessageSquareWarning },
    { count: counters.trialEnding        ?? 0, label: 'Fin essai proche',       page: 'missions',     color: 'info',    icon: AlertTriangle },
    { count: counters.evaluationsDue     ?? 0, label: 'Évaluations à planifier', page: 'evaluations',  color: 'info',    icon: ClipboardList },
  ]

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title={`Bonjour, ${session?.user?.firstName}`}
        subtitle={isAdmin ? 'Vue consolidée — Tous les pays' : (session?.user?.countryName ?? '')}
      />

      {/* ── Alertes ── */}
      {!isOperator && (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-3">
        {alerts.map((a, i) => {
          const active = a.count > 0
          const c = active ? ALERT_COLOR[a.color] : { bg: '#F8FAFC', border: '#E2E8F0', text: '#94A3B8', icon: '#CBD5E1' }
          const Icon = a.icon
          return (
            <div key={i} onClick={() => setPage(a.page as any)}
              className="rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border"
              style={{ background: c.bg, borderColor: c.border }}>
              <div className="flex items-center gap-1.5 mb-2">
                <Icon size={12} style={{ color: c.icon }} />
                <span className="text-[10px] font-bold uppercase tracking-wide leading-tight" style={{ color: c.text }}>{a.label}</span>
              </div>
              <div className={`text-3xl font-black ${active ? 'text-slate-900' : 'text-slate-300'}`}>{a.count}</div>
            </div>
          )
        })}
      </div>
      )}

      {/* ── KPIs (toujours en EUR — consolidé multi-pays) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Candidats"        icon={Users}      color="#0D9488"
          value={stats.candidates ?? 0}
          sub={`${stats.candidatesAvail ?? 0} disponible${(stats.candidatesAvail ?? 0) !== 1 ? 's' : ''}`}
          onClick={() => setPage('candidates')} />
        <KpiCard label="Missions actives"  icon={Briefcase}  color="#3B82F6"
          value={stats.missions ?? 0}
          sub={`${stats.allMissions ?? 0} au total`}
          onClick={() => setPage('missions')} />
        <KpiCard label="CA Facturé"        icon={Receipt}    color="#D4A437"
          value={fmt(stats.totalCA ?? 0, '€')}
          onClick={() => setPage('invoices')} />
        <KpiCard label="Encaissé"          icon={CreditCard} color="#10B981"
          value={fmt(stats.totalEncaisse ?? 0, '€')}
          sub={`${pct(stats.totalEncaisse ?? 0, stats.totalCA ?? 0)}% du CA`}
          onClick={() => setPage('payments')} />
        <KpiCard label="Marge active"      icon={TrendingUp} color="#7C3AED"
          value={fmt(stats.margin ?? 0, '€')}
          onClick={() => setPage('missions')} />
      </div>

      {/* ── Trésorerie (devise locale par pays) ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Coins size={15} className="text-amber-500" strokeWidth={2} />
            <span className="text-sm font-semibold text-slate-700">Trésorerie — Ce que nous avons en caisse</span>
          </div>
          <button onClick={() => setPage('cash')}
            className="flex items-center gap-1 text-[12px] text-slate-500 hover:text-teal-600 transition-colors font-medium">
            Voir détail <ChevronRight size={12} />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {treasury.map((c: any) => <TreasuryCard key={c.id} country={c} />)}
          {treasury.length === 0 && !isLoading && (
            <div className="col-span-3 py-10 text-center text-slate-300 text-sm">
              <Coins size={28} className="mx-auto mb-2 opacity-40" />Aucune donnée
            </div>
          )}
        </div>
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* CA par pays — 2/3 */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Chiffre d'affaires par pays (équivalent EUR)</p>
          <CaBarChart caByCountry={caByCountry} isLoading={isLoading} />
        </div>

        {/* Pipeline — 1/3 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <p className="text-sm font-semibold text-slate-700 mb-4">Pipeline de recrutement</p>
          <div className="space-y-3.5">
            {pipeline.map((p: any) => <PipelineRow key={p.key} item={p} />)}
            {pipeline.length === 0 && !isLoading && (
              <div className="text-center py-6 text-slate-300 text-sm">
                <Users size={24} className="mx-auto mb-2 opacity-40" />Aucun candidat
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Tables ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Dernières factures */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-700">Dernières factures</span>
            <button onClick={() => setPage('invoices')}
              className="text-[12px] text-slate-400 hover:text-teal-600 transition-colors font-medium">
              Tout voir
            </button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-2.5 text-left">Référence</th>
                <th className="px-5 py-2.5 text-left">Type</th>
                <th className="px-5 py-2.5 text-right">Total</th>
                <th className="px-5 py-2.5 text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentInvoices.map((inv: any) => {
                const st = INV_STATUS[inv.status]        ?? { label: inv.status,      color: '#94A3B8' }
                const ct = CONTRACT_TYPE[inv.invoiceType?.toLowerCase()] ?? { label: inv.invoiceType, color: '#64748B' }
                return (
                  <tr key={inv.id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-600">{inv.reference}</td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: ct.color + '18', color: ct.color }}>{ct.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right text-[12px] font-semibold text-slate-700">
                      {fmt(inv.total, inv.country?.symbol ?? '?')}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: st.color + '18', color: st.color }}>{st.label}</span>
                    </td>
                  </tr>
                )
              })}
              {recentInvoices.length === 0 && (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-300 text-xs">Aucune facture</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Missions récentes */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-50">
            <span className="text-sm font-semibold text-slate-700">Missions récentes</span>
            <button onClick={() => setPage('missions')}
              className="text-[12px] text-slate-400 hover:text-teal-600 transition-colors font-medium">
              Tout voir
            </button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-2.5 text-left">Employé</th>
                <th className="px-5 py-2.5 text-left">Type</th>
                <th className="px-5 py-2.5 text-right">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recentMissions.map((m: any) => {
                const st = MISSION_STATUS[m.status]           ?? { label: m.status,      color: '#94A3B8' }
                const ct = CONTRACT_TYPE[m.contractType?.toLowerCase()] ?? { label: m.contractType, color: '#64748B' }
                return (
                  <tr key={m.id} className="border-t border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-[12px] font-medium text-slate-700">
                        {m.candidate?.firstName} {m.candidate?.lastName}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: ct.color + '18', color: ct.color }}>{ct.label}</span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                        style={{ background: st.color + '18', color: st.color }}>
                        {m.status === 'active' ? <CheckCircle2 size={9} /> : <XCircle size={9} />}
                        {st.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {recentMissions.length === 0 && (
                <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-300 text-xs">Aucune mission</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({ label, icon: Icon, color, value, sub, onClick }: {
  label: string; icon: any; color: string; value: any; sub?: string; onClick?: () => void
}) {
  return (
    <div onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 p-4 shadow-sm ${onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-tight">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + '18' }}>
          <Icon size={15} style={{ color }} strokeWidth={2} />
        </div>
      </div>
      <div className="text-3xl font-black text-slate-900 leading-none">{value}</div>
      {sub && <div className="text-[11px] text-slate-400 mt-1.5">{sub}</div>}
    </div>
  )
}

function TreasuryCard({ country }: { country: any }) {
  const balance  = country.balance  ?? 0
  const totalIn  = country.totalIn  ?? 0
  const totalOut = country.totalOut ?? 0
  const positive = balance >= 0

  return (
    <div className="rounded-2xl border border-teal-100 p-4" style={{ background: '#F0FDF9' }}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
          <Globe size={12} className="text-teal-600" strokeWidth={2} />
        </div>
        <span className="text-sm font-semibold text-slate-700">{country.name}</span>
      </div>
      <div className={`text-2xl font-black mb-2 ${positive ? 'text-teal-700' : 'text-red-600'}`}>
        {balance.toLocaleString('fr-FR')} {country.symbol}
      </div>
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-0.5 text-[11px] text-teal-500 font-medium">
          <ArrowUp size={10} strokeWidth={2.5} />{totalIn.toLocaleString('fr-FR')} {country.symbol}
        </span>
        <span className="flex items-center gap-0.5 text-[11px] text-rose-400 font-medium">
          <ArrowDown size={10} strokeWidth={2.5} />{totalOut.toLocaleString('fr-FR')} {country.symbol}
        </span>
      </div>
    </div>
  )
}

function CaBarChart({ caByCountry, isLoading }: { caByCountry: any[]; isLoading: boolean }) {
  if (!caByCountry.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-slate-200">
        <TrendingUp size={32} className="mb-2" />
        <span className="text-xs">{isLoading ? 'Chargement…' : 'Aucune donnée'}</span>
      </div>
    )
  }

  const maxVal = Math.max(...caByCountry.map(d => Math.abs(d.totalEur)), 1)

  // EUR : valeur exacte
  const fmtEur = (v: number) => {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M €`
    return `${Math.round(v).toLocaleString('fr-FR')} €`
  }

  // Devise locale : condensée
  const fmtLocal = (v: number, symbol: string) => {
    const abs = Math.abs(v)
    if (abs >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M ${symbol}`
    if (abs >= 1_000)     return `${Math.round(v / 1000)}k ${symbol}`
    return `${v.toLocaleString('fr-FR')} ${symbol}`
  }

  return (
    <div className="flex flex-col" style={{ height: 230 }}>
      <div className="text-[10px] text-slate-300 mb-1 pl-1">{fmtEur(maxVal)}</div>
      <div className="flex items-end flex-1 border-b border-slate-100 gap-6 px-2">
        {caByCountry.map((d, i) => {
          const heightPct = maxVal > 0 ? Math.max(Math.round((Math.abs(d.totalEur) / maxVal) * 100), d.totalEur > 0 ? 4 : 0) : 0
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1">
              {/* Montant EUR exact */}
              <span className="text-[12px] font-bold text-slate-700 leading-tight">
                {fmtEur(d.totalEur)}
              </span>
              {/* Montant en devise locale */}
              <span className="text-[10px] text-slate-400 leading-tight">
                {fmtLocal(d.totalLocal, d.symbol)}
              </span>
              <div className="w-full max-w-[72px] rounded-t-lg transition-all duration-700 mt-1"
                style={{
                  height: `${heightPct}%`,
                  minHeight: d.totalEur > 0 ? 6 : 2,
                  background: d.totalEur >= 0 ? '#0D9488' : '#EF4444',
                  opacity: d.totalEur === 0 ? 0.3 : 1,
                }} />
            </div>
          )
        })}
      </div>
      <div className="flex px-2 pt-2">
        {caByCountry.map((d, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="text-[11px] font-semibold text-slate-500">{d.code}</div>
            <div className="text-[10px] text-slate-300">{d.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PipelineRow({ item }: { item: any }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-slate-500 shrink-0 truncate" style={{ width: 100 }}>{item.label}</span>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${item.pct || 0}%`, background: item.color }} />
      </div>
      <div className="flex items-center gap-1.5 shrink-0 justify-end" style={{ width: 48 }}>
        <span className="text-[11px] font-bold" style={{ color: item.pct > 0 ? item.color : '#CBD5E1' }}>{item.pct ?? 0}%</span>
        <span className="text-[11px] text-slate-400">{item.count ?? 0}</span>
      </div>
    </div>
  )
}
