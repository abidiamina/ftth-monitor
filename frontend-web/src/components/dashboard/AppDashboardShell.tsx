import type { ReactNode } from 'react'
import {
  BarChart3,
  Bell,
  CircleHelp,
  LayoutDashboard,
  LogOut,
  MapPinned,
  Search,
  Settings,
  Shield,
  Ticket,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { logout } from '@/store/authSlice'
import type { RootState } from '@/store'
import type { UserRole } from '@/types/auth.types'
import type { DashboardTab } from '@/components/dashboard/DashboardTabs'

type AppDashboardShellProps = {
  role: UserRole
  workspaceLabel: string
  workspaceTitle: string
  sectionTabs?: DashboardTab[]
  sectionTab?: string
  onSectionTabChange?: (tabId: string) => void
  children: ReactNode
}

type NavItem = {
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const roleNav: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Utilisateurs', icon: Users },
    { label: 'Roles', icon: Shield, badge: '3' },
    { label: 'Statistiques', icon: BarChart3 },
    { label: 'Parametres', icon: Settings },
  ],
  RESPONSABLE: [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Interventions', icon: Ticket, badge: 'Live' },
    { label: 'Techniciens', icon: Wrench, badge: '15' },
    { label: 'Carte', icon: MapPinned },
    { label: 'Notifications', icon: Bell, badge: '5' },
  ],
  TECHNICIEN: [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Interventions', icon: Ticket, badge: 'Mes taches' },
    { label: 'Carte', icon: MapPinned },
    { label: 'Statut', icon: CircleHelp },
    { label: 'Notifications', icon: Bell, badge: '2' },
  ],
  CLIENT: [
    { label: 'Dashboard', icon: LayoutDashboard },
    { label: 'Demandes', icon: Ticket },
    { label: 'Suivi', icon: Bell, badge: 'Live' },
    { label: 'Profil', icon: UserCog },
    { label: 'Aide', icon: CircleHelp },
  ],
}

export const AppDashboardShell = ({
  role,
  workspaceLabel,
  workspaceTitle,
  sectionTabs,
  sectionTab,
  onSectionTabChange,
  children,
}: AppDashboardShellProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((state: RootState) => state.auth.user)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <main className='dashboard-shell min-h-screen px-4 py-6 sm:px-6 lg:px-8'>
      <div className='dashboard-frame relative mx-auto flex max-w-[1600px] gap-6 rounded-[2.2rem] p-3 sm:p-4'>
        <aside className='dashboard-sidebar hidden w-[276px] shrink-0 xl:flex xl:flex-col'>
          <div className='dashboard-brand rounded-[2rem] p-5'>
            <div className='flex items-center gap-4'>
              <div className='flex h-14 w-14 items-center justify-center rounded-[1.35rem] bg-[linear-gradient(135deg,#7edbff_0%,#4cbfff_45%,#72e7c7_100%)] shadow-[0_14px_32px_rgba(76,191,255,0.22)]'>
                <div className='flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-sky-500'>
                  <LayoutDashboard className='h-4 w-4' />
                </div>
              </div>
              <div>
                <p className='text-sm font-semibold tracking-[0.02em] text-slate-900'>{workspaceLabel}</p>
                <p className='text-sm text-slate-500'>{workspaceTitle}</p>
              </div>
            </div>
          </div>

          <nav className='dashboard-nav mt-4 flex-1 rounded-[2rem] p-4'>
            <div className='space-y-2'>
              {(sectionTabs?.length && sectionTab && onSectionTabChange
                ? sectionTabs.map((tab) => ({
                    id: tab.id,
                    label: tab.label,
                    icon: tab.icon ?? LayoutDashboard,
                    badge: tab.badge !== undefined ? String(tab.badge) : undefined,
                  }))
                : roleNav[role].map((item) => ({
                    id: item.label,
                    label: item.label,
                    icon: item.icon,
                    badge: item.badge,
                  }))
              ).map((item, index) => {
                const Icon = item.icon
                const active = sectionTabs?.length && sectionTab ? item.id === sectionTab : index === 0 || location.pathname.includes(item.label.toLowerCase())

                return (
                  <button
                    key={item.id}
                    type='button'
                    data-active={active}
                    onClick={() => {
                      if (sectionTabs?.length && onSectionTabChange) {
                        onSectionTabChange(item.id)
                      }
                    }}
                    className={`dashboard-nav-item flex w-full items-center gap-3 rounded-[1.15rem] px-4 py-3 text-left text-sm transition ${
                      active
                        ? 'bg-[linear-gradient(135deg,rgba(82,174,255,0.18),rgba(25,185,147,0.14))] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]'
                        : 'text-slate-600 hover:bg-white/60'
                    }`}
                  >
                    <Icon className='h-4 w-4' />
                    <span className='flex-1'>{item.label}</span>
                    {item.badge ? (
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
                          active
                            ? 'bg-white/70 text-sky-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {item.badge}
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>

            <div className='mt-6 rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_16px_36px_rgba(148,163,184,0.08)]'>
              <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>Session</p>
              <p className='mt-3 text-sm font-medium text-slate-900'>
                {user ? `${user.prenom} ${user.nom}` : 'Utilisateur FTTH'}
              </p>
              <p className='mt-1 text-sm text-slate-500'>{role}</p>
              <div className='mt-4 grid grid-cols-2 gap-2'>
                <div className='dashboard-card-soft rounded-[1rem] p-3'>
                  <p className='text-[10px] uppercase tracking-[0.18em] text-slate-500'>Mode</p>
                  <p className='mt-2 text-sm font-semibold text-slate-900'>Ops</p>
                </div>
                <div className='dashboard-card-soft rounded-[1rem] p-3'>
                  <p className='text-[10px] uppercase tracking-[0.18em] text-slate-500'>Etat</p>
                  <p className='mt-2 text-sm font-semibold text-emerald-600'>En ligne</p>
                </div>
              </div>
            </div>
          </nav>
        </aside>

        <section className='min-w-0 flex-1'>
          <header className='dashboard-topbar rounded-[2rem] px-5 py-4'>
            <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
              <div className='flex min-w-0 items-center gap-3'>
                <div className='dashboard-search flex min-w-0 flex-1 items-center gap-3 rounded-[1.2rem] px-4 py-3 lg:min-w-[360px]'>
                  <Search className='h-4 w-4 text-slate-500' />
                  <input
                    value=''
                    readOnly
                    placeholder='Rechercher une intervention...'
                    className='w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400'
                  />
                </div>
              </div>

              <div className='flex items-center gap-3 self-end lg:self-auto'>
                <button type='button' className='dashboard-icon-btn'>
                  <Bell className='h-4 w-4' />
                </button>
                <div className='dashboard-user-chip flex items-center gap-3 rounded-[1.2rem] px-3 py-2'>
                  <div className='flex h-10 w-10 items-center justify-center rounded-full bg-[linear-gradient(135deg,#8bcbff_0%,#79f0d4_100%)] text-sm font-semibold text-white shadow-[0_10px_20px_rgba(76,191,255,0.2)]'>
                    {user?.prenom?.[0] ?? 'U'}
                  </div>
                  <div className='hidden sm:block'>
                    <p className='text-xs text-slate-500'>Bonjour,</p>
                    <p className='text-sm font-semibold text-slate-900'>{user?.prenom ?? 'Equipe'}</p>
                  </div>
                </div>
                <Button
                  variant='outline'
                  className='h-11 rounded-[1.2rem] border-slate-200 bg-white px-4 text-slate-800 hover:bg-slate-50'
                  onClick={handleLogout}
                >
                  <LogOut className='h-4 w-4' />
                </Button>
              </div>
            </div>
          </header>

          <div className='mt-6 space-y-6'>{children}</div>
        </section>
      </div>
    </main>
  )
}
