'use client'
import { useSession } from 'next-auth/react'
import { useAppStore } from '@/store/app'
import { Menu, Bell, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Notification { id: string; title: string; page?: string; type: 'warning' | 'danger' | 'info' }

export function Topbar({ notifications = [], countries = [] }: {
  notifications?: Notification[]
  countries?: { id: number; name: string; code: string }[]
}) {
  const { data: session } = useSession()
  const { toggleSidebar, adminCountryFilter, setAdminCountryFilter, setPage } = useAppStore()
  const [notifOpen, setNotifOpen] = useState(false)
  const isAdmin = session?.user?.role === 'admin'
  const canSeeNotifs = session?.user?.role !== 'operator'
  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-5 py-3 flex items-center justify-between gap-4">
      {/* Left — hamburger + date */}
      <div className="flex items-center gap-3 min-w-0">
        <button onClick={toggleSidebar} className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <Menu size={18} className="text-slate-600" />
        </button>
        <div className="hidden sm:block min-w-0">
          <div className="text-[11px] text-slate-400 capitalize">{today}</div>
          <div className="text-sm font-semibold text-slate-800">
            {isAdmin
              ? adminCountryFilter === 'all'
                ? 'Vue globale — Tous les pays'
                : countries.find(c => String(c.id) === adminCountryFilter)?.name ?? ''
              : session?.user?.countryName ?? ''}
          </div>
        </div>
      </div>

      {/* Right — country filter + notifications */}
      <div className="flex items-center gap-2">
        {isAdmin && countries.length > 0 && (
          <select value={adminCountryFilter} onChange={e => setAdminCountryFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white text-slate-700 max-w-[130px] sm:max-w-none">
            <option value="all">Tous les pays</option>
            {countries.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
          </select>
        )}

        {/* Bell */}
        {canSeeNotifs && (<div className="relative">
          <button onClick={() => setNotifOpen(v => !v)}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <Bell size={18} className="text-slate-600" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center text-white" style={{ background: '#EF4444' }}>
                {notifications.length}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden slide-in">
              <div className="px-4 py-3 border-b border-slate-100">
                <span className="text-sm font-bold text-slate-800">{notifications.length} notification(s)</span>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-6 text-center text-slate-400 text-sm">Aucune notification</div>
                ) : notifications.map(n => (
                  <button key={n.id} onClick={() => { n.page && setPage(n.page as any); setNotifOpen(false) }}
                    className={cn('w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors',
                      n.type === 'danger' && 'border-l-2 border-l-red-400',
                      n.type === 'warning' && 'border-l-2 border-l-amber-400',
                      n.type === 'info' && 'border-l-2 border-l-blue-400')}>
                    <span className="text-xs text-slate-700 font-medium">{n.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>)}

        {/* Avatar */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: '#0D9488' }}>
          {session?.user?.avatar ?? session?.user?.firstName?.[0]}
        </div>
      </div>
    </header>
  )
}
