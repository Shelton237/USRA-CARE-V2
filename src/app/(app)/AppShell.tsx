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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <Sidebar counters={counters} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar notifications={dashData?.data?.notifications ?? []} countries={countries} />
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
