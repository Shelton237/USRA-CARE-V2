'use client'
import { useAppStore } from '@/store/app'
import { DashboardPage }   from '@/components/pages/DashboardPage'
import { CandidatesPage }  from '@/components/pages/CandidatesPage'
import { MissionsPage }    from '@/components/pages/MissionsPage'
import { InvoicesPage }    from '@/components/pages/InvoicesPage'
import { UsersPage }       from '@/components/pages/UsersPage'
import { CountriesPage }   from '@/components/pages/CountriesPage'
import { SettingsPage }    from '@/components/pages/SettingsPage'
import { ReportingPage }   from '@/components/pages/ReportingPage'
import { TargetsPage }     from '@/components/pages/TargetsPage'
import { ClientsPage }     from '@/components/pages/ClientsPage'
import { ServicesPage }    from '@/components/pages/ServicesPage'
import { AttendancePage }  from '@/components/pages/AttendancePage'
import { OvertimePage }    from '@/components/pages/OvertimePage'
import { AdvancesPage }    from '@/components/pages/AdvancesPage'
import { PayrollsPage }    from '@/components/pages/PayrollsPage'
import { PaymentsPage }    from '@/components/pages/PaymentsPage'
import { CashPage }        from '@/components/pages/CashPage'
import { EvaluationsPage } from '@/components/pages/EvaluationsPage'
import { ComplaintsPage }  from '@/components/pages/ComplaintsPage'
import { EquipmentPage }   from '@/components/pages/EquipmentPage'

const GenericPage = ({ title }: { title: string }) => (
  <div className="fade-in flex items-center justify-center h-64">
    <div className="text-center text-slate-400">
      <div className="text-4xl mb-3">🚧</div>
      <div className="text-lg font-semibold text-slate-700">{title}</div>
      <div className="text-sm mt-1">Module en cours de développement</div>
    </div>
  </div>
)

const PAGE_MAP: Record<string, React.ComponentType> = {
  dashboard:   DashboardPage,
  candidates:  CandidatesPage,
  missions:    MissionsPage,
  invoices:    InvoicesPage,
  clients:     ClientsPage,
  services:    ServicesPage,
  attendance:  AttendancePage,
  overtime:    OvertimePage,
  advances:    AdvancesPage,
  payrolls:    PayrollsPage,
  payments:    PaymentsPage,
  cash:        CashPage,
  evaluations: EvaluationsPage,
  complaints:  ComplaintsPage,
  equipment:   EquipmentPage,
  targets:     TargetsPage,
  reporting:   ReportingPage,
  users:       UsersPage,
  countries:   CountriesPage,
  settings:    SettingsPage,
}

export default function DashboardRoute() {
  const { page } = useAppStore()
  const Page = PAGE_MAP[page] ?? DashboardPage
  return <Page />
}
