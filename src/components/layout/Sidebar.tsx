'use client'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app'
import { useSession, signOut } from 'next-auth/react'
import {
  LayoutDashboard, UserSearch, Building2, Briefcase, Layers,
  ClipboardCheck, Clock4, HandCoins, FileSpreadsheet,
  ScrollText, Banknote, Landmark, Star, ShieldAlert,
  HardHat, Target, BarChart2, UsersRound, Globe2, SlidersHorizontal, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────
type NavItem = {
  id: string
  label: string
  icon: React.ElementType
  badge?: string
  roles?: string[]
}
type NavGroup = { group: string; items: NavItem[] }

// ─── Navigation ───────────────────────────────────────────────────────
const NAV: NavGroup[] = [
  { group: 'Tableau de bord', items: [
    { id: 'dashboard',   label: 'Tableau de bord',      icon: LayoutDashboard },
  ]},
  { group: 'Opérations', items: [
    { id: 'candidates',  label: 'Candidats / Employés', icon: UserSearch       },
    { id: 'clients',     label: 'Clients',              icon: Building2        },
    { id: 'missions',    label: 'Missions',             icon: Briefcase        },
    { id: 'services',    label: 'Services / Métiers',   icon: Layers           },
  ]},
  { group: 'Gestion paie', items: [
    { id: 'attendance',  label: 'Fiches de présence',   icon: ClipboardCheck,   badge: 'attendance' },
    { id: 'overtime',    label: 'Heures sup.',          icon: Clock4,           badge: 'overtime'   },
    { id: 'advances',    label: 'Avances',              icon: HandCoins,        badge: 'advances'   },
    { id: 'payrolls',    label: 'Bulletins de paie',    icon: FileSpreadsheet,  badge: 'payrolls'   },
  ]},
  { group: 'Facturation', items: [
    { id: 'invoices',    label: 'Factures',             icon: ScrollText,       badge: 'invoices'   },
    { id: 'payments',    label: 'Paiements',            icon: Banknote          },
    { id: 'cash',        label: 'Caisse',               icon: Landmark          },
  ]},
  { group: 'Suivi qualité', items: [
    { id: 'evaluations', label: 'Évaluations',          icon: Star,             badge: 'evaluations' },
    { id: 'complaints',  label: 'Plaintes clients',     icon: ShieldAlert,      badge: 'complaints'  },
    { id: 'equipment',   label: 'Matériels',            icon: HardHat           },
  ]},
  { group: 'Pilotage', items: [
    { id: 'targets',     label: 'Objectifs',            icon: Target            },
    { id: 'reporting',   label: 'Reporting',            icon: BarChart2         },
  ]},
  { group: 'Administration', items: [
    { id: 'users',       label: 'Utilisateurs',         icon: UsersRound,       roles: ['admin','dg'] },
    { id: 'countries',   label: 'Pays / Entités',       icon: Globe2,           roles: ['admin']      },
    { id: 'settings',    label: 'Paramètres',           icon: SlidersHorizontal },
  ]},
]

// ─── Composant principal ──────────────────────────────────────────────
export function Sidebar({ counters = {} }: { counters?: Record<string, number> }) {
  const { page, setPage, sidebarOpen, setSidebarOpen } = useAppStore()
  const { data: session } = useSession()
  const router = useRouter()
  const role = session?.user?.role ?? 'operator'

  const navigate = (id: string) => {
    setPage(id as any)
    router.push('/dashboard')
    setSidebarOpen(false)
  }

  const filteredNav = NAV.map(g => ({
    ...g,
    items: g.items.filter(i => !i.roles || i.roles.includes(role)),
  })).filter(g => g.items.length > 0)

  const roleLabel = role === 'admin' ? 'Super Admin' : role === 'dg' ? 'Directeur Général' : 'Opérateur'
  const userName = `${session?.user?.firstName ?? ''} ${session?.user?.lastName ?? ''}`.trim()

  return (
    <>
      {/* ── Desktop ───────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col flex-shrink-0 h-screen sticky top-0 overflow-hidden"
        style={{ width: 235, background: '#0F172A' }}>
        <SidebarInner
          filteredNav={filteredNav} page={page} counters={counters}
          navigate={navigate} role={role} roleLabel={roleLabel} userName={userName}
          session={session} showClose={false} onClose={() => {}}
        />
      </aside>

      {/* ── Mobile overlay ────────────────────────────────── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 flex flex-col slide-in overflow-hidden"
            style={{ width: 235, background: '#0F172A' }}>
            <SidebarInner
              filteredNav={filteredNav} page={page} counters={counters}
              navigate={navigate} role={role} roleLabel={roleLabel} userName={userName}
              session={session} showClose onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  )
}

// ─── Contenu interne ──────────────────────────────────────────────────
function SidebarInner({ filteredNav, page, counters, navigate, role, roleLabel, userName, session, showClose, onClose }: {
  filteredNav: NavGroup[]
  page: string
  counters: Record<string, number>
  navigate: (id: string) => void
  role: string
  roleLabel: string
  userName: string
  session: any
  showClose: boolean
  onClose: () => void
}) {
  return (
    <div className="flex flex-col h-full select-none">

      {/* ── Header logo ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-[14px]"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex-shrink-0 w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center"
          style={{ background: '#0D9488' }}>
          <Image src="/v2/logo.png" alt="USRA-CARE" width={36} height={36}
            className="object-contain w-full h-full" unoptimized />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-extrabold text-sm tracking-wide leading-none">USRA-CARE</p>
          <p className="text-white/40 text-[10px] mt-[3px]">v2.0</p>
        </div>
        {showClose && (
          <button onClick={onClose}
            className="p-1 rounded-md transition-colors text-white/40 hover:text-white hover:bg-white/10">
            <X size={16} />
          </button>
        )}
      </div>

      {/* ── Navigation ──────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
        {filteredNav.map((g, gi) => (
          <div key={g.group} className={gi === 0 ? 'mb-1' : 'mb-1 mt-1'}>

            {/* Group label */}
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: 'rgba(255,255,255,0.35)' }}>
              {g.group}
            </p>

            {/* Items */}
            {g.items.map(item => {
              const Icon = item.icon
              const isActive = page === item.id
              const badge = item.badge ? (counters[item.badge] ?? 0) : 0

              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className="w-full flex items-center gap-[10px] text-left transition-all duration-150"
                  style={{
                    padding: '9px 16px',
                    marginBottom: 1,
                    borderLeft: isActive ? '3px solid #D4A437' : '3px solid transparent',
                    background: isActive ? '#0D9488' : 'transparent',
                    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.65)',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'
                      ;(e.currentTarget as HTMLElement).style.color = '#fff'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      (e.currentTarget as HTMLElement).style.background = 'transparent'
                      ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)'
                    }
                  }}
                >
                  <Icon size={15} className="flex-shrink-0" />
                  <span className="flex-1 text-[12.5px] font-medium leading-none">{item.label}</span>
                  {badge > 0 && (
                    <span
                      className="flex-shrink-0 text-[10px] font-black leading-none rounded-full text-center"
                      style={{
                        background: '#D4A437',
                        color: '#0F172A',
                        minWidth: 18,
                        padding: '2px 5px',
                      }}>
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* ── Footer utilisateur ──────────────────────────── */}
      <div className="px-4 py-4 flex-shrink-0"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <p className="text-white text-[13px] font-semibold leading-tight">{userName || 'Utilisateur'}</p>
        <p className="mt-[3px] text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>{roleLabel}</p>
        <button
          onClick={() => signOut({ redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login` })}
          className="mt-3 w-full text-center text-[12px] py-2 rounded-lg transition-colors"
          style={{
            background: 'rgba(255,255,255,0.07)',
            color: 'rgba(255,255,255,0.70)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.13)'
            ;(e.currentTarget as HTMLElement).style.color = '#fff'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'
            ;(e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.70)'
          }}
        >
          Déconnexion
        </button>
      </div>

    </div>
  )
}
