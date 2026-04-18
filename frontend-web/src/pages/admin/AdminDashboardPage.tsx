import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  Pencil,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { Button } from '@/components/ui/button'
import { validateEmployeeForm, validateUserUpdateForm } from '@/lib/validation'
import {
  createEmployee,
  deleteUser,
  getUserById,
  listUsers,
  resetEmployeePassword,
  updateUser,
  updateUserStatus,
} from '@/services/authApi'
import type { CreateEmployeeRequest, CurrentUser, UpdateUserRequest, User, UserRole } from '@/types/auth.types'

const roleLabels: Record<UserRole, string> = {
  ADMIN: 'Administrateur',
  RESPONSABLE: 'Responsable',
  TECHNICIEN: 'Technicien',
  CLIENT: 'Client',
}

const roleCapabilities: Record<UserRole, { accent: string; rights: string[] }> = {
  ADMIN: {
    accent: 'text-violet-700',
    rights: ['Administration Système', 'Gestion Comptes', 'Audit Sécurité'],
  },
  RESPONSABLE: {
    accent: 'text-sky-700',
    rights: ['Gestion Missions', 'Pilotage Flux', 'Reporting'],
  },
  TECHNICIEN: {
    accent: 'text-emerald-700',
    rights: ['Exécution Mobile', 'Validation Terrain', 'Preuves Photos'],
  },
  CLIENT: {
    accent: 'text-amber-700',
    rights: ['Suivi Personnel', 'Validation Signature', 'Feedback'],
  },
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
  ) {
    return (error as { response?: { data?: { message?: string } } }).response!.data!.message!
  }
  return fallback
}

export const AdminDashboardPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingUserId, setEditingUserId] = useState<User['id'] | null>(null)
  const [savingUser, setSavingUser] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL')
  const [userQuery, setUserQuery] = useState('')
  const [tab, setTab] = useState<'APERCU' | 'UTILISATEURS' | 'CREATION' | 'ROLES'>('APERCU')
  const [employeeForm, setEmployeeForm] = useState<CreateEmployeeRequest>({
    nom: '', prenom: '', email: '', telephone: '', role: 'ADMIN'
  })
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    nom: '', prenom: '', email: '', telephone: '', role: 'CLIENT', adresse: ''
  })

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await listUsers()
      setUsers(data)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de charger les utilisateurs.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const stats = useMemo(() => {
    const total = users.length
    const actifs = users.filter(u => u.actif).length
    const inactifs = total - actifs
    const mustChange = users.filter(u => u.mustChangePassword).length
    return { total, actifs, inactifs, mustChange }
  }, [users])

  const visibleUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    return users.filter(u => {
      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter
      const matchesQuery = !q || `${u.prenom} ${u.nom} ${u.email}`.toLowerCase().includes(q)
      return matchesRole && matchesQuery
    })
  }, [roleFilter, userQuery, users])

  const tabs = useMemo(() => [
    { id: 'APERCU', label: 'Overview', icon: ShieldCheck },
    { id: 'UTILISATEURS', label: 'Comptes', icon: Users },
    { id: 'CREATION', label: 'Invite', icon: UserPlus },
    { id: 'ROLES', label: 'Privilèges', icon: ShieldEllipsis },
  ], [])

  const handleToggleStatus = async (user: User) => {
    try {
      const response = await updateUserStatus(user.id, !user.actif)
      toast.success('Statut mis à jour.')
      setUsers(curr => curr.map(u => u.id === user.id ? response.data : u))
    } catch (error) { toast.error('Erreur de mise à jour.') }
  }

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Supprimer ${user.prenom} ?`)) return
    try {
      await deleteUser(user.id)
      toast.success('Compte supprimé.')
      setUsers(curr => curr.filter(u => u.id !== user.id))
    } catch (error) { toast.error('Action impossible.') }
  }

  const renderUserCard = (user: User) => (
    <div key={user.id} className='dashboard-card group animate-in fade-in slide-in-from-bottom-4 duration-500'>
      <div className='flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between'>
        <div className='flex items-center gap-4 min-w-0'>
          <div className={`h-12 w-12 rounded-2xl flex items-center justify-center font-black text-white ${
            user.role === 'ADMIN' ? 'bg-violet-600' :
            user.role === 'RESPONSABLE' ? 'bg-sky-600' :
            user.role === 'TECHNICIEN' ? 'bg-emerald-600' : 'bg-amber-500'
          }`}>
            {user.prenom?.[0] ?? 'U'}
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2 mb-1'>
               <p className='text-base font-bold text-slate-900 truncate'>{user.prenom} {user.nom}</p>
               <span className={`badge-status ${user.actif ? 'badge-done' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                 {user.actif ? 'Actif' : 'Bloqué'}
               </span>
            </div>
            <p className='text-xs font-medium text-slate-500 truncate'>{user.email}</p>
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-2'>
           <div className='px-3 py-1.5 rounded-xl border border-slate-100 bg-slate-50 text-[10px] font-black uppercase tracking-widest text-slate-500'>
             {roleLabels[user.role]}
           </div>
           <div className='flex items-center gap-1 ml-2'>
             <button onClick={() => handleToggleStatus(user)} className='p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors'>
               <KeyRound className='h-4 w-4 text-slate-600' />
             </button>
             <button onClick={() => handleDeleteUser(user)} className='p-2.5 rounded-xl bg-white border border-rose-100 hover:bg-rose-50 transition-colors'>
               <Trash2 className='h-4 w-4 text-rose-500' />
             </button>
           </div>
        </div>
      </div>
    </div>
  )

  return (
    <AppDashboardShell
      role='ADMIN'
      workspaceLabel='Admin Portal'
      workspaceTitle='Security & Identity'
      sectionTabs={tabs}
      sectionTab={tab}
      onSectionTabChange={(v) => setTab(v as any)}
    >
      <header className='hero-gradient p-8 mb-10'>
        <div className='grid gap-10 xl:grid-cols-[1.2fr_0.8fr]'>
          <div className='flex flex-col justify-center'>
            <div className='inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-violet-700'>
              <ShieldCheck className='h-4 w-4' />
              Intelligence Admin
            </div>
            <h1 className='mt-8 text-5xl font-black tracking-tight text-slate-950 sm:text-7xl leading-[1.05]'>
              Contrôle <span className="text-violet-600 italic">Global.</span>
            </h1>
            <p className="mt-6 text-slate-500 font-medium max-w-lg leading-relaxed text-lg text-pretty">
              Gestion centralisée des identités et des privilèges d'accès à la plateforme.
            </p>

            <div className='mt-10 grid gap-4 sm:grid-cols-2'>
              <div className='stat-pill border-violet-100 bg-violet-50/50'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-violet-600'>Comptes</p>
                <p className='mt-2 text-3xl font-black text-slate-950'>{stats.total} <span className="text-lg font-bold text-slate-400 font-sans tracking-normal">Inscrits</span></p>
              </div>
              <div className='stat-pill border-emerald-100 bg-emerald-50/50'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600'>Sessions</p>
                <p className='mt-2 text-3xl font-black text-slate-950'>{stats.actifs} <span className="text-lg font-bold text-slate-400 font-sans tracking-normal">Actives</span></p>
              </div>
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2 content-center'>
            <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-white/40 border-white shadow-sm flex flex-col justify-between h-40'>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Sécurité Brut</p>
              <p className='text-4xl font-black text-slate-950'>99<span className='text-violet-500'>%</span></p>
            </article>
            <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-white/40 border-white shadow-sm flex flex-col justify-between h-40'>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Inactifs</p>
              <p className='text-5xl font-black text-rose-500'>{stats.inactifs}</p>
            </article>
            <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-slate-950 border-slate-900 shadow-xl flex flex-col justify-between h-40 group hover:-translate-y-1 transition-transform'>
               <KeyRound className='h-8 w-8 text-violet-400 opacity-20 group-hover:opacity-40 transition-opacity' />
               <p className='text-xl font-bold text-white'>Audit<br />Système</p>
            </article>
            <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-violet-600 border-violet-500 shadow-xl flex flex-col justify-between h-40 cursor-pointer hover:bg-violet-700 transition-colors'>
               <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/50'>Reset</p>
               <p className='text-5xl font-black text-white'>{stats.mustChange}</p>
            </article>
          </div>
        </div>
      </header>

      <div className='mt-6 xl:hidden'>
        <DashboardTabs value={tab} onChange={(v) => setTab(v as any)} tabs={tabs} />
      </div>

      <div className='mt-10'>
        {loading ? (
          <div className="text-center py-20 animate-pulse text-slate-300 font-black uppercase tracking-[.4em]">Initialisation...</div>
        ) : tab === 'UTILISATEURS' ? (
          <div className='grid gap-8'>
             <div className='flex flex-wrap items-center justify-between gap-4'>
                <h2 className='text-2xl font-black text-slate-950 tracking-tight'>Directoire Comptes</h2>
                <div className='flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-white'>
                   <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className='bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-500 py-1'>
                      <option value='ALL'>Tous les Roles</option>
                      <option value='ADMIN'>Admins</option>
                      <option value='RESPONSABLE'>Managers</option>
                      <option value='TECHNICIEN'>Staff</option>
                      <option value='CLIENT'>Clients</option>
                   </select>
                </div>
             </div>
             <div className='grid gap-4'>
                {visibleUsers.map(u => renderUserCard(u))}
             </div>
          </div>
        ) : tab === 'CREATION' ? (
           <div className='max-w-xl mx-auto'>
              <div className='dashboard-card p-12'>
                 <h2 className='text-4xl font-black text-slate-950 mb-4'>Invite Staff.</h2>
                 <p className='text-slate-500 font-medium mb-10'>Préparez les accès pour un nouvel équipier.</p>
                 <form className='space-y-4' onSubmit={handleCreateEmployee}>
                    <div className='grid grid-cols-2 gap-4'>
                       <input placeholder="Prénom" className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={employeeForm.prenom} onChange={e => setEmployeeForm(c => ({...c, prenom: e.target.value}))} />
                       <input placeholder="Nom" className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={employeeForm.nom} onChange={e => setEmployeeForm(c => ({...c, nom: e.target.value}))} />
                    </div>
                    <input type="email" placeholder="Email Corporate" className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={employeeForm.email} onChange={e => setEmployeeForm(c => ({...c, email: e.target.value}))} />
                    <select value={employeeForm.role} onChange={e => setEmployeeForm(c => ({...c, role: e.target.value as any}))} className='w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold'>
                      <option value='ADMIN'>Administrateur</option>
                      <option value='RESPONSABLE'>Responsable Ops</option>
                      <option value='TECHNICIEN'>Technicien Terrain</option>
                    </select>
                    <button type="submit" disabled={submitting} className='btn-premium w-full mt-8 py-5 text-lg uppercase tracking-[.3em]'>Générer Accès</button>
                 </form>
              </div>
           </div>
        ) : tab === 'ROLES' ? (
          <div className='grid gap-6 md:grid-cols-2'>
             {Object.entries(roleCapabilities).map(([key, cap]) => (
                <div key={key} className='dashboard-card h-full flex flex-col justify-between'>
                   <div>
                      <div className='flex items-center justify-between mb-8'>
                         <h3 className='text-2xl font-black text-slate-950'>{roleLabels[key as UserRole]}</h3>
                         <div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black ${cap.accent.replace('text-', 'bg-').replace('700', '100')} ${cap.accent}`}>
                            {key?.[0] ?? '?'}
                         </div>
                      </div>
                      <div className='space-y-3'>
                         {cap.rights.map(r => (
                            <div key={r} className='flex items-center gap-3 text-slate-500 font-medium'>
                               <div className='w-1.5 h-1.5 rounded-full bg-slate-300' />
                               {r}
                            </div>
                         ))}
                      </div>
                   </div>
                   <div className="mt-8 pt-6 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total actifs</span>
                      <span className="text-xl font-black text-slate-950">{users.filter(u => u.role === key).length}</span>
                   </div>
                </div>
             ))}
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 gap-8'>
             <div className='dashboard-card h-64 flex flex-col items-center justify-center text-center'>
                <div className='h-20 w-20 rounded-full bg-violet-100 flex items-center justify-center mb-6'>
                   <Users className='h-10 w-10 text-violet-600 animate-float' />
                </div>
                <h3 className='text-xl font-black text-slate-950'>Total Utilisateurs</h3>
                <p className='text-5xl font-black text-slate-950 mt-2'>{stats.total}</p>
             </div>
             <div className='dashboard-card h-64 bg-slate-950 !text-white !border-none flex flex-col items-center justify-center text-center relative overflow-hidden'>
                <div className='absolute top-0 right-0 w-32 h-32 bg-violet-500/20 blur-[60px] rounded-full' />
                <h3 className='text-xl font-black'>Système Intact</h3>
                <p className='text-sm font-medium text-white/60 mt-2 max-w-[200px]'>Toutes les couches de sécurité sont opérationnelles.</p>
                <button className='mt-8 px-6 py-2 bg-white text-slate-950 rounded-xl font-black text-xs uppercase'>Scan Complet</button>
             </div>
          </div>
        )}
      </div>
    </AppDashboardShell>
  )
}
