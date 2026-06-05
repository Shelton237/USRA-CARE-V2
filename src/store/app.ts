import { create } from 'zustand'

type Page =
  | 'dashboard' | 'candidates' | 'clients' | 'missions' | 'services'
  | 'attendance' | 'overtime' | 'advances' | 'payrolls'
  | 'invoices' | 'payments' | 'cash'
  | 'evaluations' | 'complaints' | 'equipment'
  | 'targets' | 'reporting'
  | 'users' | 'countries' | 'settings'

interface Toast { message: string; type: 'success' | 'error' | 'warning' }
interface Confirm { title: string; message: string; onConfirm: () => void; danger?: boolean }

interface AppState {
  page: Page
  sidebarOpen: boolean
  adminCountryFilter: string
  toast: Toast | null
  confirm: Confirm | null

  setPage: (p: Page) => void
  toggleSidebar: () => void
  setSidebarOpen: (v: boolean) => void
  setAdminCountryFilter: (v: string) => void
  showToast: (message: string, type?: Toast['type']) => void
  showConfirm: (c: Confirm) => void
  clearConfirm: () => void
}

export const useAppStore = create<AppState>((set) => ({
  page: 'dashboard',
  sidebarOpen: false,
  adminCountryFilter: 'all',
  toast: null,
  confirm: null,

  setPage: (page) => set({ page, sidebarOpen: false }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setAdminCountryFilter: (adminCountryFilter) => set({ adminCountryFilter }),
  showToast: (message, type = 'success') => {
    set({ toast: { message, type } })
    setTimeout(() => set({ toast: null }), 3000)
  },
  showConfirm: (confirm) => set({ confirm }),
  clearConfirm: () => set({ confirm: null }),
}))
