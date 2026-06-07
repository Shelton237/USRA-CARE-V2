'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '@/store/app'
import { PageHeader, StatCard, Card, Table, Badge, BarChart } from '@/components/ui'
import { fmt, fmtDate, currentPeriod, periodLabel } from '@/lib/utils'
import { TrendingUp, Banknote, Users, AlertTriangle } from 'lucide-react'

// ─── Main page ───────────────────────────────────────────────────────────────
export function ReportingPage() {
  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const { adminCountryFilter } = useAppStore()
  const [period, setPeriod] = useState(currentPeriod())
  const countryQ = adminCountryFilter !== 'all' ? '&countryId=' + adminCountryFilter : ''

  const { data, isLoading } = useQuery({
    queryKey: ['reporting', period, adminCountryFilter],
    queryFn: () => fetch(`${B}/api/reporting?period=${period}${countryQ}`).then(r => r.json()),
  })

  const d = data?.data
  const revenueByCountry: any[] = d?.revenueByCountry ?? []
  const totalRevenueEur  = d?.totalRevenueEur  ?? 0
  const totalPaymentsEur = d?.totalPaymentsEur ?? 0
  const totalPayrollEur  = d?.totalPayrollEur  ?? 0
  const overdueInvoices: any[] = d?.overdueInvoices ?? []
  const activity = d?.activityStats ?? {}

  const fmtEur = (v: number) => `${new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(v)} €`

  // Bar chart data
  const chartData = revenueByCountry
    .filter(c => c.totalEur > 0)
    .map(c => ({ label: c.name, value: Math.round(c.totalEur) }))

  return (
    <div className="fade-in space-y-4">
      <PageHeader
        title="Reporting"
        subtitle="Vue consolidée des opérations"
        actions={
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white text-slate-700"
          />
        }
      />

      {/* ── KPI StatCards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="CA mensuel"
          value={isLoading ? '—' : fmtEur(totalRevenueEur)}
          color="#0D9488"
          icon={<TrendingUp size={18} />}
        />
        <StatCard
          label="Encaissements"
          value={isLoading ? '—' : fmtEur(totalPaymentsEur)}
          color="#10B981"
          icon={<Banknote size={18} />}
        />
        <StatCard
          label="Masse salariale"
          value={isLoading ? '—' : fmtEur(totalPayrollEur)}
          color="#7C3AED"
          icon={<Users size={18} />}
        />
        <StatCard
          label="Factures impayées"
          value={isLoading ? '—' : overdueInvoices.length}
          sub={overdueInvoices.length > 0 ? `${fmtEur(overdueInvoices.reduce((s: number, i: any) => s + i.total * 0.0002, 0))} env.` : undefined}
          color="#EF4444"
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {/* ── Graphique CA + Répartition activité ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title={`Chiffre d'affaires par pays — ${periodLabel(period)}`} className="lg:col-span-2">
          {isLoading ? (
            <div className="h-36 flex items-center justify-center text-slate-400 text-sm">Chargement...</div>
          ) : chartData.length === 0 ? (
            <div className="h-36 flex items-center justify-center text-slate-400 text-sm">Aucune donnée pour cette période</div>
          ) : (
            <BarChart data={chartData} height={160} color="#0D9488" />
          )}
        </Card>

        <Card title="Répartition activité">
          <div className="flex flex-col gap-2">
            {[
              { label: 'Candidats inscrits',  value: activity.totalCandidates ?? 0,  color: '#0D9488' },
              { label: 'Candidats placés',     value: activity.placedCandidates ?? 0, color: '#10B981' },
              { label: 'Clients actifs',       value: activity.activeClients ?? 0,    color: '#7C3AED' },
              { label: 'Missions actives',     value: activity.activeMissions ?? 0,   color: '#D4A437' },
              { label: 'Plaintes ouvertes',    value: activity.openComplaints ?? 0,   color: '#F59E0B' },
            ].map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#F8FAFC' }}>
                <span className="text-xs text-slate-500">{s.label}</span>
                <Badge color={s.color} solid>{isLoading ? '…' : s.value}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Tableau détail par pays ── */}
      <Card title="Détail par pays">
        {isLoading ? (
          <div className="text-center py-8 text-slate-400 text-sm">Chargement...</div>
        ) : (
          <Table
            columns={[
              { key: 'name',  label: 'Pays' },
              { key: 'count', label: 'Factures', align: 'right' },
              { key: 'local', label: 'CA local', align: 'right',
                render: (r: any) => fmt(r.total, r.symbol) },
              { key: 'eur', label: 'CA en EUR', align: 'right',
                render: (r: any) => fmtEur(r.totalEur) },
              { key: 'pct', label: '%', align: 'right',
                render: (r: any) => totalRevenueEur > 0
                  ? `${Math.round((r.totalEur / totalRevenueEur) * 100)} %`
                  : '0 %' },
            ]}
            data={revenueByCountry}
            empty="Aucune donnée"
          />
        )}
      </Card>

      {/* ── Factures en retard (conditionnel) ── */}
      {overdueInvoices.length > 0 && (
        <Card title={`⚠ ${overdueInvoices.length} facture(s) en retard`}>
          <Table
            columns={[
              { key: 'reference', label: 'Référence',
                render: (r: any) => <span className="font-mono font-bold text-xs">{r.reference}</span> },
              { key: 'client',    label: 'Client',
                render: (r: any) => r.clientName },
              { key: 'due',       label: 'Échéance',
                render: (r: any) => fmtDate(r.dueDate) },
              { key: 'amount',    label: 'Montant', align: 'right',
                render: (r: any) => fmt(r.total, r.symbol) },
              { key: 'delay',     label: 'Retard', align: 'right',
                render: (r: any) => {
                  const days = Math.floor((Date.now() - new Date(r.dueDate).getTime()) / 86400000)
                  return (
                    <Badge color={days >= 30 ? '#EF4444' : '#F59E0B'} solid={days >= 30}>
                      {days}j
                    </Badge>
                  )
                }},
            ]}
            data={overdueInvoices}
            empty=""
          />
        </Card>
      )}
    </div>
  )
}
