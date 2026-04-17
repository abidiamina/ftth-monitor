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

const roleBadgeClass: Record<UserRole, string> = {
  ADMIN: 'border-violet-200 bg-violet-50 text-violet-700',
  RESPONSABLE: 'border-blue-200 bg-blue-50 text-blue-700',
  TECHNICIEN: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  CLIENT: 'border-amber-200 bg-amber-50 text-amber-700',
}

const roleCapabilities: Record<
  UserRole,
  {
    accent: string
    rights: string[]
  }
> = {
  ADMIN: {
    accent: 'text-violet-700',
    rights: ['Administrer les comptes', 'Activer et desactiver', 'Reset et suppression'],
  },
  RESPONSABLE: {
    accent: 'text-blue-700',
    rights: ['Creer intervention', 'Affecter technicien', 'Prioriser et valider'],
  },
  TECHNICIEN: {
    accent: 'text-emerald-700',
    rights: ['Consulter les missions', 'Accepter ou refuser', 'Mettre a jour le statut'],
  },
  CLIENT: {
    accent: 'text-amber-700',
    rights: ['Creer une demande', 'Suivre son ticket', 'Mettre a jour son profil'],
  },
}

const emptyEmployee: CreateEmployeeRequest = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  role: 'ADMIN',
}

const toUpdatePayload = (user: User): UpdateUserRequest => ({
  nom: user.nom,
  prenom: user.prenom,
  email: user.email,
  telephone: user.telephone ?? '',
  role: user.role,
  adresse: '',
})

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
  const [employeeForm, setEmployeeForm] = useState<CreateEmployeeRequest>(emptyEmployee)
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'CLIENT',
    adresse: '',
  })

  const loadUsers = async () => {
    setLoading(true)
    try {
      const data = await listUsers()
      setUsers(data)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Impossible de charger les utilisateurs.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const stats = useMemo(() => {
    const total = users.length
    const actifs = users.filter((user) => user.actif).length
    const employes = users.filter((user) => user.role !== 'CLIENT').length
    const mustChange = users.filter((user) => user.mustChangePassword).length
    const inactifs = total - actifs

    return { total, actifs, employes, mustChange, inactifs }
  }, [users])

  const roleSummary = useMemo(() => {
    return (['ADMIN', 'RESPONSABLE', 'TECHNICIEN', 'CLIENT'] as UserRole[]).map((role) => {
      const items = users.filter((user) => user.role === role)
      return {
        role,
        total: items.length,
        actifs: items.filter((user) => user.actif).length,
        mustChange: items.filter((user) => user.mustChangePassword).length,
      }
    })
  }, [users])

  const priorityQueue = useMemo(() => {
    return users
      .filter((user) => !user.actif || user.mustChangePassword)
      .sort((left, right) => Number(Boolean(right.mustChangePassword)) - Number(Boolean(left.mustChangePassword)))
      .slice(0, 6)
  }, [users])

  const visibleUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    return users.filter((user) => {
      const matchesRole = roleFilter === 'ALL' || user.role === roleFilter
      const matchesQuery =
        !q ||
        `${user.prenom} ${user.nom} ${user.email} ${user.telephone ?? ''}`
          .toLowerCase()
          .includes(q)
      return matchesRole && matchesQuery
    })
  }, [roleFilter, userQuery, users])

  const tabs = useMemo(
    () => [
      { id: 'APERCU', label: 'Apercu', icon: ShieldCheck, badge: priorityQueue.length || undefined },
      { id: 'UTILISATEURS', label: 'Utilisateurs', icon: Users },
      { id: 'CREATION', label: 'Nouveau compte', icon: UserPlus },
      { id: 'ROLES', label: 'Roles', icon: ShieldEllipsis },
    ],
    [priorityQueue.length]
  )

  const handleCreateEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateEmployeeForm(employeeForm)

    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmitting(true)

    try {
      const response = await createEmployee(employeeForm)
      toast.success(response.message)
      setEmployeeForm(emptyEmployee)
      await loadUsers()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Creation du compte employee impossible.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (user: User) => {
    try {
      const response = await updateUserStatus(user.id, !user.actif)
      toast.success(response.message)
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? response.data : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise a jour du statut impossible.'))
    }
  }

  const handleResetPassword = async (userId: User['id']) => {
    try {
      const response = await resetEmployeePassword(userId)
      toast.success(response.message)
      await loadUsers()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Reset mot de passe impossible.'))
    }
  }

  const handleStartEdit = async (user: User) => {
    try {
      const fullUser: CurrentUser = await getUserById(user.id)
      setEditingUserId(user.id)
      setEditForm({
        ...toUpdatePayload(user),
        role: fullUser.role,
        adresse: fullUser.client?.adresse ?? '',
      })
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Chargement du profil utilisateur impossible.'))
    }
  }

  const handleCancelEdit = () => {
    setEditingUserId(null)
    setEditForm({
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      role: 'CLIENT',
      adresse: '',
    })
  }

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>, userId: User['id']) => {
    event.preventDefault()
    const validationError = validateUserUpdateForm(editForm)

    if (validationError) {
      toast.error(validationError)
      return
    }

    setSavingUser(true)

    try {
      const response = await updateUser(userId, editForm)
      toast.success(response.message)
      setUsers((current) =>
        current.map((item) => (item.id === userId ? response.data : item))
      )
      handleCancelEdit()
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise a jour du compte impossible.'))
    } finally {
      setSavingUser(false)
    }
  }

  const handleDeleteUser = async (user: User) => {
    const confirmed = window.confirm(
      `Supprimer le compte de ${user.prenom} ${user.nom} ? Cette action est irreversible.`
    )

    if (!confirmed) return

    try {
      const response = await deleteUser(user.id)
      toast.success(response.message)
      setUsers((current) => current.filter((item) => item.id !== user.id))
      if (editingUserId === user.id) {
        handleCancelEdit()
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Suppression du compte impossible.'))
    }
  }

  const roleOrder: UserRole[] = ['ADMIN', 'RESPONSABLE', 'TECHNICIEN', 'CLIENT']

  const renderUserCard = (user: User) => (
    <div key={user.id} className='dashboard-card rounded-[1.6rem] p-5 sm:p-6'>
      <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
        <div className='min-w-0'>
          <div className='flex flex-wrap items-center gap-2'>
            <p className='truncate text-sm font-semibold text-slate-950'>
              {user.prenom} {user.nom}
            </p>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${roleBadgeClass[user.role]}`}
            >
              {roleLabels[user.role]}
            </span>
            <span
              className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                user.actif
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {user.actif ? 'Actif' : 'Inactif'}
            </span>
            {user.mustChangePassword ? (
              <span className='rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-700'>
                Reset requis
              </span>
            ) : null}
          </div>
          <p className='mt-2 truncate text-sm leading-6 text-slate-700'>{user.email}</p>
          {user.telephone ? (
            <p className='truncate text-sm leading-6 text-slate-600'>{user.telephone}</p>
          ) : null}
        </div>

        <div className='flex flex-wrap gap-3'>
          <Button
            variant='outline'
            className='border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            onClick={() => handleStartEdit(user)}
          >
            <Pencil className='mr-2 h-4 w-4' />
            Modifier
          </Button>
          <Button
            variant='outline'
            className='border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            onClick={() => handleToggleStatus(user)}
          >
            {user.actif ? 'Desactiver' : 'Activer'}
          </Button>
          {user.role !== 'CLIENT' ? (
            <Button
              variant='outline'
              className='border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              onClick={() => handleResetPassword(user.id)}
            >
              Reset
            </Button>
          ) : null}
          <Button
            variant='outline'
            className='border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
            onClick={() => handleDeleteUser(user)}
          >
            <Trash2 className='mr-2 h-4 w-4' />
            Supprimer
          </Button>
        </div>
      </div>

      {editingUserId === user.id ? (
        <form
          className='mt-4 grid gap-3 rounded-[1.2rem] border border-slate-200 bg-slate-50 p-4'
          onSubmit={(event) => handleUpdateUser(event, user.id)}
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            <input
              value={editForm.prenom}
              onChange={(event) => setEditForm((current) => ({ ...current, prenom: event.target.value }))}
              placeholder='Prenom'
              className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
            />
            <input
              value={editForm.nom}
              onChange={(event) => setEditForm((current) => ({ ...current, nom: event.target.value }))}
              placeholder='Nom'
              className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
            />
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <input
              type='email'
              value={editForm.email}
              onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
              placeholder='email@ftth.com'
              className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
            />
            <input
              value={editForm.telephone ?? ''}
              onChange={(event) => setEditForm((current) => ({ ...current, telephone: event.target.value }))}
              placeholder='Telephone'
              className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
            />
          </div>
          <div className='grid gap-3 sm:grid-cols-2'>
            <select
              value={editForm.role ?? user.role}
              onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value as UserRole }))}
              className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
            >
              <option value='ADMIN'>Administrateur</option>
              <option value='RESPONSABLE'>Responsable</option>
              <option value='TECHNICIEN'>Technicien</option>
              <option value='CLIENT'>Client</option>
            </select>
            {editForm.role === 'CLIENT' ? (
              <input
                value={editForm.adresse ?? ''}
                onChange={(event) => setEditForm((current) => ({ ...current, adresse: event.target.value }))}
                placeholder='Adresse client'
                className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
              />
            ) : (
              <div className='rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500'>
                Role interne.
              </div>
            )}
          </div>
          <div className='flex flex-wrap gap-3'>
            <Button
              type='submit'
              disabled={savingUser}
              className='border-0 bg-[linear-gradient(135deg,#d6ccff_0%,#a78bfa_56%,#f4be7e_100%)] text-slate-950 hover:brightness-105'
            >
              {savingUser ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button
              type='button'
              variant='outline'
              className='border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              onClick={handleCancelEdit}
            >
              Annuler
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  )

  return (
    <AppDashboardShell
      role='ADMIN'
      workspaceLabel='Suivi des interventions'
      workspaceTitle='Console administration'
      sectionTabs={tabs}
      sectionTab={tab}
      onSectionTabChange={(value) => setTab(value as typeof tab)}
    >
        <header className='dashboard-hero rounded-[2.4rem] p-6 sm:p-8'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between'>
            <div className='max-w-3xl'>
              <div className='inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs uppercase tracking-[0.24em] text-violet-700'>
                <ShieldCheck className='h-4 w-4' />
                Admin
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl'>
                Tableau de bord
              </h1>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-700'>Utilisateurs</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.total}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-700'>Actifs</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.actifs}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-700'>Employes</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.employes}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-700'>Reset requis</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.mustChange}</p>
              </article>
            </div>
          </div>
        </header>

        <div className='mt-6 xl:hidden'>
          <DashboardTabs value={tab} onChange={(value) => setTab(value as typeof tab)} tabs={tabs} />
        </div>

        <section hidden={tab !== 'APERCU'} className='mt-6'>
          <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-violet-700'>
              <KeyRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>A surveiller</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950'>
              Comptes prioritaires
            </h2>

            <div className='mt-6 grid gap-4 sm:grid-cols-3'>
              <article className='dashboard-stat rounded-[1.5rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Inactifs</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.inactifs}</p>
              </article>
              <article className='dashboard-stat rounded-[1.5rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Reset</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.mustChange}</p>
              </article>
              <article className='dashboard-stat rounded-[1.5rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Employes</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.employes}</p>
              </article>
            </div>

            <div className='mt-6 grid gap-4'>
              {priorityQueue.length === 0 ? (
                <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-700'>
                  Aucun compte critique.
                </div>
              ) : (
                priorityQueue.map((user) => (
                  <div key={user.id} className='dashboard-card rounded-[1.6rem] p-5 sm:p-6'>
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                      <div className='min-w-0'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <p className='truncate text-sm font-semibold text-slate-950'>
                            {user.prenom} {user.nom}
                          </p>
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${roleBadgeClass[user.role]}`}
                          >
                            {roleLabels[user.role]}
                          </span>
                          {!user.actif ? (
                            <span className='rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-rose-700'>
                              Inactif
                            </span>
                          ) : null}
                          {user.mustChangePassword ? (
                            <span className='rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-amber-700'>
                              Reset requis
                            </span>
                          ) : null}
                        </div>
                        <p className='mt-2 truncate text-sm text-slate-700'>{user.email}</p>
                      </div>

                      <div className='flex flex-wrap gap-3'>
                        <Button
                          variant='outline'
                          className='border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.actif ? 'Desactiver' : 'Activer'}
                        </Button>
                        {user.role !== 'CLIENT' ? (
                          <Button
                            variant='outline'
                            className='border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            onClick={() => handleResetPassword(user.id)}
                          >
                            Reset
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section hidden={tab !== 'CREATION'} className='mt-6'>
          <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-violet-700'>
              <UserPlus className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Creation</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950'>
              Creer un compte admin ou employe
            </h2>

            <form className='mt-6 grid gap-4' onSubmit={handleCreateEmployee}>
              <input value={employeeForm.prenom} onChange={(event) => setEmployeeForm((current) => ({ ...current, prenom: event.target.value }))} placeholder='Prenom' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
              <input value={employeeForm.nom} onChange={(event) => setEmployeeForm((current) => ({ ...current, nom: event.target.value }))} placeholder='Nom' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
              <input type='email' value={employeeForm.email} onChange={(event) => setEmployeeForm((current) => ({ ...current, email: event.target.value }))} placeholder='email@ftth.com' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
              <input value={employeeForm.telephone} onChange={(event) => setEmployeeForm((current) => ({ ...current, telephone: event.target.value }))} placeholder='Telephone' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
              <select value={employeeForm.role} onChange={(event) => setEmployeeForm((current) => ({ ...current, role: event.target.value as CreateEmployeeRequest['role'] }))} className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm'>
                <option value='ADMIN'>Administrateur</option>
                <option value='TECHNICIEN'>Technicien</option>
                <option value='RESPONSABLE'>Responsable</option>
              </select>

              <Button type='submit' size='lg' disabled={submitting} className='h-12 rounded-[1.2rem] border-0 bg-[linear-gradient(135deg,#d6ccff_0%,#a78bfa_56%,#f4be7e_100%)] text-slate-950 hover:brightness-105'>
                {submitting ? 'Creation...' : 'Creer le compte'}
              </Button>
            </form>
          </article>
        </section>

        <section hidden={tab !== 'UTILISATEURS'} className='mt-6'>
          <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-3 text-violet-700'>
                <Users className='h-5 w-5' />
                <p className='text-xs uppercase tracking-[0.24em]'>Utilisateurs</p>
              </div>

              <div className='flex flex-wrap items-center gap-3'>
                <div className='flex items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700'>
                  <Search className='h-4 w-4 text-slate-500' />
                  <input
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                    placeholder='Rechercher...'
                    className='w-56 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400'
                  />
                </div>

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as typeof roleFilter)}
                  className='dashboard-input h-11 rounded-[1.1rem] px-4 text-sm'
                >
                  <option value='ALL'>Tous roles</option>
                  <option value='ADMIN'>Administrateur</option>
                  <option value='RESPONSABLE'>Responsable</option>
                  <option value='TECHNICIEN'>Technicien</option>
                  <option value='CLIENT'>Client</option>
                </select>

                <span className='rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-600'>
                  {visibleUsers.length}
                </span>
              </div>
            </div>

            <div className='mt-6 grid gap-4'>
              {loading ? (
                <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-600'>Chargement...</div>
              ) : visibleUsers.length === 0 ? (
                <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-600'>
                  Aucun utilisateur.
                </div>
              ) : roleFilter === 'ALL' ? (
                roleOrder.map((role) => {
                  const items = visibleUsers.filter((user) => user.role === role)
                  if (items.length === 0) return null

                  return (
                    <section key={role} className='space-y-3'>
                      <div className='flex items-center justify-between'>
                        <p className='text-sm font-semibold text-slate-900'>{roleLabels[role]}</p>
                        <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.16em] ${roleBadgeClass[role]}`}>
                          {items.length}
                        </span>
                      </div>
                      <div className='grid gap-4'>
                        {items.map((user) => renderUserCard(user))}
                      </div>
                    </section>
                  )
                })
              ) : (
                <div className='grid gap-4'>
                  {visibleUsers.map((user) => renderUserCard(user))}
                </div>
              )}
            </div>
          </article>
        </section>

        <section hidden={tab !== 'ROLES'} className='mt-6'>
          <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-violet-700'>
              <ShieldEllipsis className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Roles et permissions</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950'>
              Matrice des acces effectifs
            </h2>

            <div className='mt-6 space-y-4'>
              {roleSummary.map((item) => (
                <div
                  key={item.role}
                  className='rounded-[1.4rem] border border-slate-200 bg-white p-5'
                >
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div>
                      <div className='flex flex-wrap items-center gap-3'>
                        <p className='text-sm font-medium text-slate-950'>{roleLabels[item.role]}</p>
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${roleBadgeClass[item.role]}`}
                        >
                          {item.total} compte(s)
                        </span>
                      </div>
                      <div className='mt-3 flex flex-wrap gap-2'>
                        {roleCapabilities[item.role].rights.map((right) => (
                          <span
                            key={right}
                            className='rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-600'
                          >
                            {right}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className='grid gap-3 sm:grid-cols-2'>
                      <div className='dashboard-card-soft rounded-[1rem] p-4'>
                        <p className='text-[10px] uppercase tracking-[0.18em] text-slate-500'>
                          Actifs
                        </p>
                        <p className={`mt-2 text-lg font-semibold ${roleCapabilities[item.role].accent}`}>
                          {item.actifs}
                        </p>
                      </div>
                      <div className='dashboard-card-soft rounded-[1rem] p-4'>
                        <p className='text-[10px] uppercase tracking-[0.18em] text-slate-500'>
                          Reset requis
                        </p>
                        <p className='mt-2 text-lg font-semibold text-amber-700'>
                          {item.mustChange}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

        </section>

    </AppDashboardShell>
  )
}
