'use client'
import { useAppStore } from '@/store/app'
import { DashboardPage }  from '@/components/pages/DashboardPage'
import { CandidatesPage } from '@/components/pages/CandidatesPage'
import { MissionsPage }   from '@/components/pages/MissionsPage'
import { InvoicesPage }   from '@/components/pages/InvoicesPage'
import { UsersPage }      from '@/components/pages/UsersPage'

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
  clients:     () => <GenericPage title="Clients" />,
  services:    () => <GenericPage title="Services / Métiers" />,
  attendance:  () => <GenericPage title="Fiches de présence" />,
  overtime:    () => <GenericPage title="Heures supplémentaires" />,
  advances:    () => <GenericPage title="Avances sur salaire" />,
  payrolls:    () => <GenericPage title="Bulletins de paie" />,
  payments:    () => <GenericPage title="Paiements" />,
  cash:        () => <GenericPage title="Caisse" />,
  evaluations: () => <GenericPage title="Évaluations" />,
  complaints:  () => <GenericPage title="Plaintes clients" />,
  equipment:   () => <GenericPage title="Matériels remis" />,
  targets:     () => <GenericPage title="Objectifs" />,
  reporting:   () => <GenericPage title="Reporting" />,
  users:       UsersPage,
  countries:   () => <GenericPage title="Pays / Entités" />,
  settings:    () => <GenericPage title="Paramètres" />,
}

export default function DashboardRoute() {
  const { page } = useAppStore()
  const Page = PAGE_MAP[page] ?? DashboardPage
  return <Page />
}
