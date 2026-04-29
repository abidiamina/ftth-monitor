import type { ReactNode } from 'react'
import { Search, Bell, LogOut, LayoutDashboard, Ticket, Wrench, MapPinned, UserCog, CircleHelp, Settings, Shield, BarChart3, Users, Menu, X, Activity } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { logout } from '@/store/authSlice'
import { listConfigs } from '@/services/configApi'
import { useEffect, useState } from 'react'
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
  path?: string
}

const roleNav: Record<UserRole, NavItem[]> = {
  ADMIN: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Utilisateurs', icon: Users, path: '/admin/dashboard' },
    { label: 'Roles', icon: Shield, path: '/admin/dashboard' },
    { label: 'Statistiques', icon: BarChart3, path: '/admin/dashboard' },
    { label: 'Parametres', icon: Settings, path: '/admin/dashboard' },
    { label: 'Audit', icon: Activity, path: '/admin/audit' },
    { label: 'Mon Profil', icon: UserCog, path: '/profile' },
  ],
  RESPONSABLE: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/responsable' },
    { label: 'Interventions', icon: Ticket, badge: 'Live', path: '/responsable' },
    { label: 'Techniciens', icon: Wrench, badge: '15', path: '/responsable' },
    { label: 'Carte', icon: MapPinned, path: '/responsable' },
    { label: 'Notifications', icon: Bell, badge: '5', path: '/responsable' },
    { label: 'Mon Profil', icon: UserCog, path: '/profile' },
  ],
  TECHNICIEN: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/technicien' },
    { label: 'Interventions', icon: Ticket, badge: 'Mes taches', path: '/technicien' },
    { label: 'Carte', icon: MapPinned, path: '/technicien' },
    { label: 'Statut', icon: CircleHelp, path: '/technicien' },
    { label: 'Notifications', icon: Bell, badge: '2', path: '/technicien' },
    { label: 'Mon Profil', icon: UserCog, path: '/profile' },
  ],
  CLIENT: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/client' },
    { label: 'Demandes', icon: Ticket, path: '/client' },
    { label: 'Suivi', icon: Bell, badge: 'Live', path: '/client' },
    { label: 'Profil', icon: UserCog, path: '/profile' },
    { label: 'Aide', icon: CircleHelp, path: '/client' },
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
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useSelector((state: RootState) => state.auth)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [appName, setAppName] = useState(workspaceLabel)

  useEffect(() => {
    listConfigs().then(configs => {
      if (Array.isArray(configs)) {
        const name = configs.find(c => c.cle === 'APP_NAME')?.valeur
        if (name) setAppName(name)
      }
    }).catch(() => {})
  }, [workspaceLabel])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  const navItems = sectionTabs?.length && sectionTab && onSectionTabChange
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
        path: item.path,
      }))

  return (
    <div className='dashboard-shell min-h-screen relative overflow-hidden'>
      {/* Mesh Gradient Decorations */}
      <div className='absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-sky-200/20 rounded-full blur-[120px] pointer-events-none' />
      <div className='absolute top-[20%] -right-[10%] w-[50%] h-[50%] bg-emerald-100/20 rounded-full blur-[140px] pointer-events-none' />
      <div className='absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] bg-amber-100/10 rounded-full blur-[100px] pointer-events-none' />

      <div className='dashboard-frame relative z-10 mx-auto max-w-[1600px] flex overflow-hidden lg:h-[calc(100vh-2rem)] min-h-[500px] shadow-2xl'>
        {/* Sidebar Overlay for Mobile */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm xl:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`
          fixed inset-y-0 left-0 z-50 w-72 transform border-r border-white/40 bg-white/60 p-6 backdrop-blur-3xl transition-transform duration-500 ease-in-out xl:relative xl:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          <div className='flex flex-col h-full'>
            <div className='mb-10 flex items-center gap-4 px-2'>
              <div className='flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 shadow-xl shadow-slate-200'>
                <Shield className='h-6 w-6 text-white' />
              </div>
              <div className='min-w-0'>
                <h2 className='text-lg font-bold truncate tracking-tight text-slate-950'>{appName}</h2>
                <p className='text-[10px] uppercase tracking-widest font-bold text-slate-400'>{workspaceTitle}</p>
              </div>
            </div>

            <nav className='flex-1 space-y-1.5 overflow-y-auto no-scrollbar'>
              {navItems.map((item, index) => {
                const Icon = item.icon
                const active = sectionTabs?.length && sectionTab ? item.id === sectionTab : index === 0 || location.pathname.includes(item.label.toLowerCase())

                return (
                  <button
                    key={item.id}
                    type='button'
                    onClick={() => {
                      if (sectionTabs?.length && onSectionTabChange) {
                        onSectionTabChange(item.id)
                      } else if (item.path) {
                        navigate(item.path)
                      }
                      setIsMobileMenuOpen(false)
                    }}
                    className={`nav-item w-full ${active ? 'nav-item-active' : 'nav-item-inactive'}`}
                  >
                    <Icon className={`h-4.5 w-4.5 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span className='flex-1 font-semibold'>{item.label}</span>
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Profile Summary Card */}
            <div className='mt-6 p-5 rounded-3xl bg-slate-50/50 border border-white relative overflow-hidden group hover:bg-white transition-all duration-300'>
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:rotate-12 transition-transform">
                <LayoutDashboard className="h-12 w-12" />
              </div>
              <p className='text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2'>Session Active</p>
              <p className='text-sm font-bold text-slate-900 truncate'>{user ? `${user.prenom} ${user.nom}` : 'Equipe FTTH'}</p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{role}</span>
                </div>
                <button 
                  onClick={() => navigate('/profile')}
                  className="p-3 rounded-2xl bg-white border border-slate-200 text-slate-400 hover:text-slate-950 hover:border-slate-950 hover:shadow-lg transition-all"
                  title="Modifier mon profil"
                >
                  <UserCog className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className='flex-1 flex flex-col min-w-0 h-full overflow-hidden'>
          {/* Top Header */}
          <header className='h-20 flex items-center justify-between px-8 bg-white/30 border-b border-white/40 backdrop-blur-md sticky top-0 z-40'>
            <div className='flex items-center gap-4 flex-1'>
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="xl:hidden p-2 rounded-xl bg-white border border-slate-200"
              >
                <Menu className="h-5 w-5" />
              </button>
              
              <div className='hidden md:flex items-center gap-3 bg-white/70 border border-white rounded-2xl px-4 py-2.5 w-full max-w-md focus-within:shadow-lg focus-within:shadow-slate-100 transition-all'>
                <Search className='h-4 w-4 text-slate-400' />
                <input placeholder='Rechercher un dossier...' className='bg-transparent border-none focus:ring-0 text-sm w-full outline-none' />
              </div>
            </div>

            <div className='flex items-center gap-4'>
              <button 
                onClick={() => onSectionTabChange?.('NOTIFICATIONS')}
                className='relative p-2.5 rounded-2xl bg-white border border-white shadow-sm hover:scale-105 active:scale-95 transition-all'
              >
                <Bell className='h-4.5 w-4.5 text-slate-600' />
                {sectionTabs?.find(t => t.id === 'NOTIFICATIONS')?.badge && (
                  <span className='absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white' />
                )}
              </button>

              <div className='h-10 w-[1px] bg-slate-200 mx-1 hidden sm:block' />

              <div className='flex items-center gap-3 bg-white/80 border border-white rounded-2xl p-1.5 pr-4 shadow-sm hover:shadow-md transition-all'>
                <div className='flex h-8 w-8 items-center justify-center rounded-xl bg-slate-950 text-xs font-bold text-white uppercase'>
                  {user?.prenom?.[0] ?? 'U'}
                </div>
                <div className='hidden lg:block min-w-0'>
                  <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1'>{role}</p>
                  <p className='text-sm font-bold text-slate-900 truncate'>{user?.prenom ?? 'Admin'}</p>
                </div>
              </div>

              <button 
                onClick={handleLogout}
                className='p-2.5 rounded-2xl bg-white border border-rose-100 shadow-sm text-rose-500 hover:bg-rose-50 hover:scale-105 active:scale-95 transition-all'
                title="Déconnexion"
              >
                <LogOut className='h-4.5 w-4.5' />
              </button>
            </div>
          </header>

          {/* Page Body */}
          <div className='flex-1 overflow-y-auto p-8 no-scrollbar scroll-smooth'>
            <div className="max-w-6xl mx-auto space-y-8 pb-10">
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
