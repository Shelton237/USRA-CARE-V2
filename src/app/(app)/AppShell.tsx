'use client'
import { Sidebar } from '@/components/layout/Sidebar'
import { Topbar } from '@/components/layout/Topbar'
import { Toast, ConfirmDialog } from '@/components/ui'
import { useAppStore } from '@/store/app'
import { useQuery } from '@tanstack/react-query'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { toast, confirm, clearConfirm } = useAppStore()

  const B = process.env.NEXT_PUBLIC_APP_URL ?? ''

  const { data: dashData } = useQuery({
    queryKey: ['dashboard-counters'],
    queryFn: () => fetch(`${B}/api/dashboard`).then(r => r.json()),
    refetchInterval: 60_000,
  })

  const { data: countriesData } = useQuery({
    queryKey: ['countries-list'],
    queryFn: () => fetch(`${B}/api/countries`).then(r => r.json()),
  })

  const counters = dashData?.data?.counters ?? {}
  const countries = countriesData?.data ?? []

  const notifications = [
    counters.overtime > 0 && { id: 'ot', title: `${counters.overtime} heure(s) sup. à valider`, page: 'overtime', type: 'warning' as const },
    counters.advances > 0 && { id: 'adv', title: `${counters.advances} avance(s) à approuver`, page: 'advances', type: 'warning' as const },
    counters.attendance > 0 && { id: 'att', title: `${counters.attendance} fiche(s) de présence à valider`, page: 'attendance', type: 'warning' as const },
    counters.payrollsToValidate > 0 && { id: 'pv', title: `${counters.payrollsToValidate} bulletin(s) à valider`, page: 'payrolls', type: 'warning' as const },
    counters.payrollsToPay > 0 && { id: 'pp', title: `${counters.payrollsToPay} bulletin(s) à payer`, page: 'payrolls', type: 'warning' as const },
    counters.complaints > 0 && { id: 'cpl', title: `${counters.complaints} plainte(s) en cours`, page: 'complaints', type: 'danger' as const },
    counters.invoices > 0 && { id: 'inv', title: `${counters.invoices} facture(s) en retard`, page: 'invoices', type: 'danger' as const },
    counters.trialEnding > 0 && { id: 'tr', title: `${counters.trialEnding} fin(s) d'essai proche(s)`, page: 'missions', type: 'info' as const },
    counters.evaluationsDue > 0 && { id: 'ev', title: `${counters.evaluationsDue} évaluation(s) à planifier`, page: 'evaluations', type: 'info' as const },
  ].filter(Boolean) as { id: string; title: string; page?: string; type: 'warning' | 'danger' | 'info' }[]

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar counters={counters} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar notifications={notifications} countries={countries} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>

      {toast && <Toast message={toast.message} type={toast.type} />}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          danger={confirm.danger}
          onConfirm={() => { confirm.onConfirm(); clearConfirm() }}
          onCancel={clearConfirm}
        />
      )}
    </div>
  )
}
