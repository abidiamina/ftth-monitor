import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  Pencil,
  Search,
  ShieldCheck,
  ShieldEllipsis,
  Settings,
  Trash2,
  UserPlus,
  Users,
  Activity,
  UserCog,
  BellRing,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AIPersonalityWidget } from '@/components/dashboard/AIPersonalityWidget'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { Button } from '@/components/ui/button'
import { validateEmployeeForm, validateUserUpdateForm } from '@/lib/validation'
import { useNavigate } from 'react-router-dom'
import {
  createEmployee,
  deleteUser,
  getUserById,
  listUsers,
  resetEmployeePassword,
  updateUser,
  updateUserStatus,
} from '@/services/authApi'
import { listNotifications, markNotificationAsRead } from '@/services/notificationApi'
import { listConfigs, updateConfig } from '@/services/configApi'
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel'
import type { ConfigurationRecord, CreateEmployeeRequest, CurrentUser, UpdateUserRequest, User, UserRole } from '@/types/auth.types'

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
  const navigate = useNavigate()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingUserId, setEditingUserId] = useState<User['id'] | null>(null)
  const [savingUser, setSavingUser] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL')
  const [userQuery, setUserQuery] = useState('')
  const [tab, setTab] = useState<'APERCU' | 'UTILISATEURS' | 'CREATION' | 'ROLES' | 'PARAMETRES' | 'AUDIT' | 'NOTIFICATIONS'>('APERCU')
  const [configs, setConfigs] = useState<ConfigurationRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [configSaving, setConfigSaving] = useState<Record<string, boolean>>({})
  const [employeeForm, setEmployeeForm] = useState<CreateEmployeeRequest>({
    nom: '', prenom: '', email: '', telephone: '', role: 'ADMIN'
  })
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    nom: '', prenom: '', email: '', telephone: '', role: 'CLIENT', adresse: ''
  })

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, configsData, notificationsData] = await Promise.all([
        listUsers(),
        listConfigs(),
        listNotifications(),
      ])
      setUsers(usersData)
      setConfigs(configsData)
      setNotifications(notificationsData)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de charger les données.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const stats = useMemo(() => {
    const total = users.length
    const actifs = users.filter(u => u.actif).length
    const inactifs = total - actifs
    const mustChange = users.filter(u => u.mustChangePassword).length
    const unread = notifications.filter(n => !n.lu).length
    return { total, actifs, inactifs, mustChange, unread }
  }, [users, notifications])

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
    { id: 'CREATION', label: 'Ajouter membre', icon: UserPlus },
    { id: 'ROLES', label: 'Privilèges', icon: ShieldEllipsis },
    { id: 'PARAMETRES', label: 'Système', icon: Settings },
    { id: 'AUDIT', label: 'Audit', icon: Activity },
    { id: 'NOTIFICATIONS', label: 'Inbox', icon: BellRing, badge: stats.unread || undefined },
    { id: 'PROFIL', label: 'Profil', icon: UserCog },
  ], [stats.unread])

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id)
      setNotifications(curr => curr.map(n => n.id === id ? { ...n, lu: true } : n))
    } catch (error) { toast.error('Erreur notification.') }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const response = await updateUserStatus(user.id, !user.actif)
      toast.success('Statut mis à jour.')
      setUsers(curr => curr.map(u => u.id === user.id ? response.data : u))
    } catch (error) { toast.error('Erreur de mise à jour.') }
  }

  const handleUpdateConfig = async (cle: string, valeur: string) => {
    setConfigSaving(c => ({ ...c, [cle]: true }))
    try {
      await updateConfig(cle, valeur)
      toast.success('Réglage enregistré.')
      setConfigs(curr => curr.map(c => c.cle === cle ? { ...c, valeur } : c))
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde.')
    } finally {
      setConfigSaving(c => ({ ...c, [cle]: false }))
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Supprimer ${user.prenom} ?`)) return
    try {
      await deleteUser(user.id)
      toast.success('Compte supprimé.')
      setUsers(curr => curr.filter(u => u.id !== user.id))
    } catch (error) { toast.error('Action impossible.') }
  }

  const handleEditStart = (user: User) => {
    setEditingUserId(user.id)
    setEditForm({
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      telephone: user.telephone || '',
      role: user.role,
      adresse: (user as any).client?.adresse || ''
    })
  }

  const handleUpdateUser = async () => {
    if (!editingUserId) return

    const validationError = validateUserUpdateForm(editForm)
    if (validationError) {
      toast.error(validationError)
      return
    }

    setSavingUser(true)
    try {
      const response = await updateUser(editingUserId, editForm)
      toast.success('Compte mis à jour.')
      setUsers(curr => curr.map(u => u.id === editingUserId ? response.data : u))
      setEditingUserId(null)
    } catch (error) {
      toast.error(getErrorMessage(error, 'Échec de la mise à jour.'))
    } finally {
      setSavingUser(false)
    }
  }

  const renderUserCard = (user: User) => {
    const isEditing = editingUserId === user.id

    if (isEditing) {
      return (
        <div key={user.id} className='dashboard-card border-violet-200 bg-violet-50/30 animate-in fade-in zoom-in-95 duration-200'>
          <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end'>
            <div className='space-y-1'>
               <p className='text-[10px] font-black uppercase tracking-widest text-violet-600 ml-1'>Identité</p>
               <div className='flex gap-2'>
                 <input 
                   placeholder="Prénom"
                   className='w-full bg-white border border-violet-100 rounded-xl px-4 py-2.5 text-sm font-bold placeholder:font-medium'
                   value={editForm.prenom}
                   onChange={e => setEditForm(c => ({...c, prenom: e.target.value}))}
                 />
                 <input 
                   placeholder="Nom"
                   className='w-full bg-white border border-violet-100 rounded-xl px-4 py-2.5 text-sm font-bold placeholder:font-medium'
                   value={editForm.nom}
                   onChange={e => setEditForm(c => ({...c, nom: e.target.value}))}
                 />
               </div>
            </div>
            <div className='space-y-1'>
               <p className='text-[10px] font-black uppercase tracking-widest text-violet-600 ml-1'>Email</p>
               <input 
                 type="email"
                 className='w-full bg-white border border-violet-100 rounded-xl px-4 py-2.5 text-sm font-bold'
                 value={editForm.email}
                 onChange={e => setEditForm(c => ({...c, email: e.target.value}))}
               />
            </div>
            <div className='space-y-1'>
               <p className='text-[10px] font-black uppercase tracking-widest text-violet-600 ml-1'>Téléphone</p>
               <input 
                 type="tel"
                 placeholder="+216..."
                 className='w-full bg-white border border-violet-100 rounded-xl px-4 py-2.5 text-sm font-bold'
                 value={editForm.telephone}
                 onChange={e => setEditForm(c => ({...c, telephone: e.target.value}))}
               />
            </div>
            <div className='space-y-1'>
               <p className='text-[10px] font-black uppercase tracking-widest text-violet-600 ml-1'>Rôle</p>
               <select 
                 className='w-full bg-white border border-violet-100 rounded-xl px-4 py-2.5 text-sm font-bold'
                 value={editForm.role}
                 onChange={e => setEditForm(c => ({...c, role: e.target.value as any}))}
               >
                 <option value="ADMIN">Administrateur</option>
                 <option value="RESPONSABLE">Responsable</option>
                 <option value="TECHNICIEN">Technicien</option>
                 <option value="CLIENT">Client</option>
               </select>
            </div>
            {editForm.role === 'CLIENT' && (
              <div className='lg:col-span-5 space-y-1 mt-2'>
                <p className='text-[10px] font-black uppercase tracking-widest text-violet-600 ml-1'>Adresse Installation</p>
                <input 
                  placeholder="Adresse complète"
                  className='w-full bg-white border border-violet-100 rounded-xl px-4 py-2.5 text-sm font-bold'
                  value={editForm.adresse}
                  onChange={e => setEditForm(c => ({...c, adresse: e.target.value}))}
                />
              </div>
            )}
            <div className='flex items-center gap-2'>
               <button 
                 disabled={savingUser}
                 onClick={handleUpdateUser}
                 className='flex-1 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-violet-700 transition-colors disabled:opacity-50'
               >
                 {savingUser ? '...' : 'Sauver'}
               </button>
               <button 
                 onClick={() => setEditingUserId(null)}
                 className='px-4 py-2.5 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors'
               >
                 X
               </button>
            </div>
          </div>
        </div>
      )
    }

    return (
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
             <button onClick={() => handleEditStart(user)} className='p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition-colors'>
               <Pencil className='h-4 w-4 text-slate-600' />
             </button>
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
    );
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const response = await createEmployee(employeeForm)
      toast.success(response.message || 'Compte staff créé avec succès !')
      setUsers(curr => [response.data, ...curr])
      setEmployeeForm({ nom: '', prenom: '', email: '', telephone: '', role: 'ADMIN' })
      setTab('UTILISATEURS')
    } catch (error) {
      toast.error(getErrorMessage(error, 'Échec de la création du compte.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppDashboardShell
      role='ADMIN'
      workspaceLabel='Admin Portal'
      workspaceTitle='Security & Identity'
      sectionTabs={tabs}
      sectionTab={tab}
      onSectionTabChange={(v) => {
        if (v === 'PROFIL') return navigate('/profile')
        if (v === 'AUDIT') return navigate('/admin/audit')
        setTab(v as any)
      }}
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

          <div className='flex flex-col gap-4 justify-center'>
            <AIPersonalityWidget />
            <div className='grid gap-4 sm:grid-cols-2 content-center'>
              <article 
                onClick={() => { setTab('UTILISATEURS'); setRoleFilter('ALL'); }}
                className='dashboard-kpi rounded-[2.5rem] p-8 bg-white/40 border-white shadow-sm flex flex-col justify-between h-40 group hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer'
              >
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Total Comptes</p>
                <p className='text-4xl font-black text-slate-950 group-hover:text-violet-600 transition-colors'>{stats.total}</p>
              </article>
              <article 
                onClick={() => setTab('CREATION')}
                className='dashboard-kpi rounded-[2.5rem] p-8 bg-violet-600 border-violet-500 shadow-xl flex flex-col justify-between h-40 cursor-pointer hover:bg-violet-700 transition-all hover:-translate-y-1 group'
              >
                <div className='flex items-center justify-between'>
                  <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/50'>Action</p>
                  <UserPlus className='h-5 w-5 text-white/30 group-hover:rotate-12 transition-transform' />
                </div>
                <p className='text-xl font-black text-white leading-tight'>Ajouter<br />un Membre</p>
              </article>
              <article 
                onClick={() => setTab('PARAMETRES')}
                className='dashboard-kpi rounded-[2.5rem] p-8 bg-slate-950 border-slate-900 shadow-xl flex flex-col justify-between h-40 group hover:-translate-y-1 transition-transform cursor-pointer'
              >
                <p className='text-xl font-bold text-white leading-tight'>Système &<br />Paramètres</p>
              </article>
              <article 
                onClick={() => navigate('/admin/audit')}
                className='dashboard-kpi rounded-[2.5rem] p-8 bg-emerald-600 border-emerald-500 shadow-xl flex flex-col justify-between h-40 group hover:-translate-y-1 transition-transform cursor-pointer'
              >
                <Activity className='h-8 w-8 text-white opacity-20 group-hover:opacity-40 transition-opacity' />
                <p className='text-xl font-bold text-white leading-tight'>Audit &<br />Traçabilité</p>
              </article>
              <article 
                onClick={() => { setTab('UTILISATEURS'); setRoleFilter('ALL'); }}
                className='dashboard-kpi rounded-[2.5rem] p-8 bg-white/40 border-white shadow-sm flex flex-col justify-between h-40 cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all group'
              >
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Inactifs</p>
                <p className='text-5xl font-black text-rose-500 group-hover:scale-110 transition-transform origin-left'>{stats.inactifs}</p>
              </article>
            </div>
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
                <h2 className='text-2xl font-black text-slate-950 tracking-tight'>Gestion des Comptes</h2>
                <div className='flex items-center gap-2 bg-white/50 p-1.5 rounded-2xl border border-white'>
                   <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)} className='bg-transparent border-none text-[10px] font-black uppercase tracking-widest text-slate-500 py-1'>
                      <option value='ALL'>Tous les Rôles</option>
                      <option value='ADMIN'>Administrateur</option>
                      <option value='RESPONSABLE'>Responsable</option>
                      <option value='TECHNICIEN'>Technicien</option>
                      <option value='CLIENT'>Client</option>
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
                 <h2 className='text-4xl font-black text-slate-950 mb-4'>Gestion Staff.</h2>
                 <p className='text-slate-500 font-medium mb-10'>Créez un profil pour un membre de l'équipe et envoyez ses accès automatiquement par email.</p>
                 <form className='space-y-4' onSubmit={handleCreateEmployee}>
                    <div className='grid grid-cols-2 gap-4'>
                       <input placeholder="Prénom" className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={employeeForm.prenom} onChange={e => setEmployeeForm(c => ({...c, prenom: e.target.value}))} />
                       <input placeholder="Nom" className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={employeeForm.nom} onChange={e => setEmployeeForm(c => ({...c, nom: e.target.value}))} />
                    </div>
                    <input type="email" placeholder="Email Corporate" className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={employeeForm.email} onChange={e => setEmployeeForm(c => ({...c, email: e.target.value}))} />
                    <input type="tel" placeholder="Téléphone" className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={employeeForm.telephone} onChange={e => setEmployeeForm(c => ({...c, telephone: e.target.value}))} />
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
        ) : tab === 'PARAMETRES' ? (
          <div className='max-w-3xl mx-auto'>
            <div className='dashboard-card p-10'>
              <div className='flex items-center gap-4 mb-10'>
                <div className='h-12 w-12 rounded-2xl bg-slate-900 flex items-center justify-center'>
                   <Settings className='h-6 w-6 text-white' />
                </div>
                <div>
                   <h2 className='text-3xl font-black text-slate-950 tracking-tight'>Paramètres Système</h2>
                   <p className='text-slate-500 font-medium text-sm'>Adaptez les fonctionnalités de la plateforme en temps réel.</p>
                </div>
              </div>

              <div className='space-y-8'>
                {configs.map((config) => {
                  const isBoolean = config.valeur === 'true' || config.valeur === 'false'
                  const isSaving = configSaving[config.cle]

                  return (
                    <div key={config.id} className='flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-6 rounded-3xl border border-slate-100 bg-slate-50/50 group hover:bg-white transition-all'>
                      <div className='flex-1'>
                        <h3 className='text-base font-extrabold text-slate-950 mb-1'>{config.libelle}</h3>
                        <p className='text-xs font-medium text-slate-500 leading-relaxed'>{config.description}</p>
                      </div>

                      <div className='flex items-center gap-3'>
                        {isBoolean ? (
                          <button
                            onClick={() => handleUpdateConfig(config.cle, config.valeur === 'true' ? 'false' : 'true')}
                            disabled={isSaving}
                            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${config.valeur === 'true' ? 'bg-emerald-500' : 'bg-slate-300'}`}
                          >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${config.valeur === 'true' ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        ) : (
                          <div className='flex items-center gap-2'>
                            <input
                              type={config.cle === 'MAX_PHOTOS' ? 'number' : 'text'}
                              defaultValue={config.valeur}
                              onBlur={(e) => {
                                if (e.target.value !== config.valeur) {
                                  handleUpdateConfig(config.cle, e.target.value)
                                }
                              }}
                              className='bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-bold w-32 focus:ring-2 focus:ring-violet-500 outline-none transition-all'
                            />
                          </div>
                        )}
                        {isSaving && <div className='h-4 w-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin' />}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : tab === 'NOTIFICATIONS' ? (
          <NotificationsPanel notifications={notifications} loading={loading} onMarkAsRead={handleMarkAsRead} />
        ) : (
          <div className='grid grid-cols-1 gap-8'>
             <div className='dashboard-card h-64 flex flex-col items-center justify-center text-center'>
                <div className='h-20 w-20 rounded-full bg-violet-100 flex items-center justify-center mb-6'>
                   <Users className='h-10 w-10 text-violet-600 animate-float' />
                </div>
                <h3 className='text-xl font-black text-slate-950'>Total Utilisateurs</h3>
                <p className='text-5xl font-black text-slate-950 mt-2'>{stats.total}</p>
             </div>
          </div>
        )}
      </div>
    </AppDashboardShell>
  )
}
