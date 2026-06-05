'use client'
import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/store/app'
import { StatCard, Card, PageHeader, BarChart, Badge } from '@/components/ui'
import { fmt, fmtDate, pct } from '@/lib/utils'
import { Users, Briefcase, Receipt, CreditCard, TrendingUp, AlertTriangle, Clock, FileText, ClipboardList, Wallet, Star, MessageSquareWarning } from 'lucide-react'

export function DashboardPage() {
  const { data: session } = useSession()
  const { setPage, adminCountryFilter } = useAppStore()

  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data } = useQuery({
    queryKey: ['dashboard', adminCountryFilter],
    queryFn: () => fetch(`${B}/api/dashboard`).then(r => r.json()),
    refetchInterval: 60_000,
  })

  const stats = data?.data?.stats ?? {}
  const counters = data?.data?.counters ?? {}
  const countries = data?.data?.countries ?? []
  const currency = session?.user?.countrySymbol ?? '€'

  const alerts = [
    { count: counters.overtime, label: 'Heures sup à valider', page: 'overtime', color: 'warning', icon: Clock },
    { count: counters.advances, label: 'Avances à approuver', page: 'advances', color: 'warning', icon: Wallet },
    { count: counters.attendance, label: 'Présences à valider', page: 'attendance', color: 'warning', icon: ClipboardList },
    { count: counters.payrolls, label: 'Bulletins à valider', page: 'payrolls', color: 'warning', icon: FileText },
    { count: counters.invoices, label: 'Factures en retard', page: 'invoices', color: 'danger', icon: Receipt },
    { count: counters.complaints, label: 'Plaintes ouvertes', page: 'complaints', color: 'danger', icon: MessageSquareWarning },
  ].filter(a => a.count > 0)

  const colorMap: any = {
    warning: { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309', icon: '#F59E0B' },
    danger:  { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C', icon: '#EF4444' },
  }

  return (
    <div className="fade-in space-y-5">
      <PageHeader
        title={`Bonjour, ${session?.user?.firstName} 👋`}
        subtitle={session?.user?.role === 'admin' ? 'Vue consolidée — Tous les pays' : session?.user?.countryName ?? ''}
      />

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {alerts.map((a, i) => {
            const c = colorMap[a.color]
            const Icon = a.icon
            return (
              <div key={i} onClick={() => setPage(a.page as any)}
                className="rounded-xl p-3 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 border"
                style={{ background: c.bg, borderColor: c.border }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon size={14} style={{ color: c.icon }} />
                  <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: c.text }}>{a.label}</span>
                </div>
                <div className="text-2xl font-black text-slate-900">{a.count}</div>
              </div>
            )
          })}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Candidats" value={stats.candidates ?? 0} icon={<Users size={16}/>} onClick={() => setPage('candidates')} />
        <StatCard label="Missions actives" value={stats.missions ?? 0} color="#3B82F6" icon={<Briefcase size={16} />} onClick={() => setPage('missions')} />
        <StatCard label="CA Facturé" value={fmt(stats.totalCA ?? 0, currency)} color="#D4A437" icon={<Receipt size={16}/>} onClick={() => setPage('invoices')} />
        <StatCard label="Encaissé" value={fmt(stats.totalEncaisse ?? 0, currency)} sub={`${pct(stats.totalEncaisse ?? 0, stats.totalCA ?? 0)}% du CA`} color="#10B981" icon={<CreditCard size={16}/>} onClick={() => setPage('payments')} />
        <StatCard label="Taux placement" value={`${pct(stats.missions ?? 0, stats.candidates ?? 0)}%`} color="#7C3AED" icon={<TrendingUp size={16}/>} />
      </div>

      {/* Graphique CA par pays */}
      {session?.user?.role === 'admin' && countries.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="CA par pays (EUR)" className="lg:col-span-2">
            <BarChart data={countries.map((c: any) => ({ label: c.code, value: 0 }))} color="#0D9488" />
          </Card>
          <Card title="Activité globale">
            <div className="space-y-2">
              {countries.filter((c: any) => c.active).map((c: any) => (
                <div key={c.id} className="flex justify-between items-center py-2 border-b border-slate-50">
                  <span className="text-sm text-slate-600">{c.name}</span>
                  <Badge color="#0D9488">{c.code}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
