import { useEffect, useMemo, useState } from 'react'
import {
  KeyRound,
  Pencil,
  Settings2,
  ShieldCheck,
  ShieldEllipsis,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
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
  ADMIN: 'border-violet-300/15 bg-violet-300/8 text-violet-200',
  RESPONSABLE: 'border-blue-300/15 bg-blue-300/8 text-blue-200',
  TECHNICIEN: 'border-emerald-300/15 bg-emerald-300/8 text-emerald-200',
  CLIENT: 'border-amber-300/15 bg-amber-300/8 text-amber-200',
}

const roleCapabilities: Record<
  UserRole,
  {
    accent: string
    rights: string[]
  }
> = {
  ADMIN: {
    accent: 'text-violet-200',
    rights: ['Gerer les comptes', 'Activer et desactiver', 'Reset et suppression'],
  },
  RESPONSABLE: {
    accent: 'text-blue-200',
    rights: ['Creer intervention', 'Affecter technicien', 'Prioriser et valider'],
  },
  TECHNICIEN: {
    accent: 'text-emerald-200',
    rights: ['Consulter les missions', 'Accepter ou refuser', 'Mettre a jour le statut'],
  },
  CLIENT: {
    accent: 'text-amber-200',
    rights: ['Creer une demande', 'Suivre son ticket', 'Mettre a jour son profil'],
  },
}

const systemPolicies = [
  {
    title: 'Controle des acces',
    detail: 'Les routes backend restreignent les endpoints sensibles au role ADMIN.',
  },
  {
    title: 'Protection du compte admin',
    detail: 'Un administrateur ne peut ni se desactiver ni se supprimer lui-meme.',
  },
  {
    title: 'Rotation de mot de passe',
    detail: 'Les comptes employes peuvent etre recrees avec mot de passe temporaire et changement requis.',
  },
]

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

export const AdminDashboardPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [editingUserId, setEditingUserId] = useState<User['id'] | null>(null)
  const [savingUser, setSavingUser] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL')
  const [employeeForm, setEmployeeForm] = useState<CreateEmployeeRequest>(emptyEmployee)
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    role: 'CLIENT',
    adresse: '',
  })

  const loadUsers = async (role?: UserRole) => {
    setLoading(true)
    try {
      const data = await listUsers(role ? { role } : undefined)
      setUsers(data)
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Impossible de charger les utilisateurs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUsers(roleFilter === 'ALL' ? undefined : roleFilter)
  }, [roleFilter])

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
      await loadUsers(roleFilter === 'ALL' ? undefined : roleFilter)
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Creation du compte employee impossible.')
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
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Mise a jour du statut impossible.')
    }
  }

  const handleResetPassword = async (userId: User['id']) => {
    try {
      const response = await resetEmployeePassword(userId)
      toast.success(response.message)
      await loadUsers(roleFilter === 'ALL' ? undefined : roleFilter)
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Reset mot de passe impossible.')
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
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Chargement du profil utilisateur impossible.')
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
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Mise a jour du compte impossible.')
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
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Suppression du compte impossible.')
    }
  }

  return (
    <AppDashboardShell
      role='ADMIN'
      workspaceLabel='Suivi des interventions'
      workspaceTitle='Console administration'
    >
        <header className='dashboard-hero rounded-[2.4rem] p-6 sm:p-8'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between'>
            <div className='max-w-3xl'>
              <div className='inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-300/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-violet-100'>
                <ShieldCheck className='h-4 w-4' />
                Control room administration
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Pilotage des utilisateurs et des comptes employes
              </h1>
              <p className='mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base'>
                Cette vue s aligne sur les routes backend disponibles: liste des utilisateurs,
                creation des comptes admin, responsable et technicien, activation,
                desactivation et reset de mot de passe.
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Utilisateurs</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.total}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Actifs</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.actifs}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Employes</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.employes}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Reset requis</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.mustChange}</p>
              </article>
            </div>
          </div>
        </header>

        <section className='mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]'>
          <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-violet-200'>
              <UserPlus className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>POST /users/employees</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
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

          <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center justify-between gap-4'>
              <div className='flex items-center gap-3 text-violet-200'>
                <Users className='h-5 w-5' />
                <p className='text-xs uppercase tracking-[0.24em]'>GET /users</p>
              </div>

              <div className='flex flex-wrap gap-2'>
                {(['ALL', 'ADMIN', 'RESPONSABLE', 'TECHNICIEN', 'CLIENT'] as const).map((role) => (
                  <button key={role} type='button' onClick={() => setRoleFilter(role)} className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] transition ${roleFilter === role ? 'border-violet-300/30 bg-violet-300/12 text-violet-200' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'}`}>
                    {role === 'ALL' ? 'Tous' : role}
                  </button>
                ))}
              </div>
            </div>

            <div className='mt-6 space-y-4'>
              {loading ? (
                <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>Chargement des utilisateurs...</div>
              ) : users.length === 0 ? (
                <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>Aucun utilisateur trouve pour ce filtre.</div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className='dashboard-card rounded-[1.5rem] p-5'>
                    <div className='flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between'>
                      <div>
                        <div className='flex flex-wrap items-center gap-3'>
                          <p className='text-sm font-medium text-white'>{user.prenom} {user.nom}</p>
                          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${roleBadgeClass[user.role]}`}>{roleLabels[user.role]}</span>
                          <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${user.actif ? 'border-emerald-300/15 bg-emerald-300/8 text-emerald-200' : 'border-rose-300/15 bg-rose-300/8 text-rose-200'}`}>{user.actif ? 'Actif' : 'Inactif'}</span>
                        </div>
                        <p className='mt-2 text-sm leading-7 text-slate-300'>{user.email}</p>
                        <p className='text-sm leading-7 text-slate-400'>{user.telephone || 'Telephone non renseigne'}</p>
                      </div>

                      <div className='flex flex-wrap gap-3'>
                        <Button variant='outline' className='border-white/10 bg-white/5 text-white hover:bg-white/10' onClick={() => handleStartEdit(user)}>
                          <Pencil className='mr-2 h-4 w-4' />
                          Modifier
                        </Button>
                        <Button variant='outline' className='border-white/10 bg-white/5 text-white hover:bg-white/10' onClick={() => handleToggleStatus(user)}>
                          {user.actif ? 'Desactiver' : 'Activer'}
                        </Button>
                        {user.role !== 'CLIENT' ? (
                          <Button variant='outline' className='border-white/10 bg-white/5 text-white hover:bg-white/10' onClick={() => handleResetPassword(user.id)}>
                            Reset mot de passe
                          </Button>
                        ) : null}
                        <Button variant='outline' className='border-rose-400/20 bg-rose-400/10 text-rose-100 hover:bg-rose-400/20' onClick={() => handleDeleteUser(user)}>
                          <Trash2 className='mr-2 h-4 w-4' />
                          Supprimer
                        </Button>
                      </div>
                    </div>

                    {user.mustChangePassword ? (
                      <div className='mt-4 rounded-[1.1rem] border border-amber-300/15 bg-amber-300/8 px-4 py-3 text-sm text-amber-100'>
                        Ce compte doit encore changer son mot de passe.
                      </div>
                    ) : null}

                    {editingUserId === user.id ? (
                      <form className='mt-4 grid gap-3 rounded-[1.2rem] border border-white/10 bg-white/5 p-4' onSubmit={(event) => handleUpdateUser(event, user.id)}>
                        <div className='grid gap-3 sm:grid-cols-2'>
                          <input value={editForm.prenom} onChange={(event) => setEditForm((current) => ({ ...current, prenom: event.target.value }))} placeholder='Prenom' className='dashboard-input rounded-[1rem] px-4 py-3 text-sm' />
                          <input value={editForm.nom} onChange={(event) => setEditForm((current) => ({ ...current, nom: event.target.value }))} placeholder='Nom' className='dashboard-input rounded-[1rem] px-4 py-3 text-sm' />
                        </div>
                        <div className='grid gap-3 sm:grid-cols-2'>
                          <input type='email' value={editForm.email} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} placeholder='email@ftth.com' className='dashboard-input rounded-[1rem] px-4 py-3 text-sm' />
                          <input value={editForm.telephone ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, telephone: event.target.value }))} placeholder='Telephone' className='dashboard-input rounded-[1rem] px-4 py-3 text-sm' />
                        </div>
                        <div className='grid gap-3 sm:grid-cols-2'>
                          <select value={editForm.role ?? user.role} onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value as UserRole }))} className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'>
                            <option value='ADMIN'>Administrateur</option>
                            <option value='RESPONSABLE'>Responsable</option>
                            <option value='TECHNICIEN'>Technicien</option>
                            <option value='CLIENT'>Client</option>
                          </select>
                          {editForm.role === 'CLIENT' ? (
                            <input value={editForm.adresse ?? ''} onChange={(event) => setEditForm((current) => ({ ...current, adresse: event.target.value }))} placeholder='Adresse client' className='dashboard-input rounded-[1rem] px-4 py-3 text-sm' />
                          ) : (
                            <div className='rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-400'>
                              Changement de role interne disponible ici.
                            </div>
                          )}
                        </div>
                        <div className='flex flex-wrap gap-3'>
                          <Button type='submit' disabled={savingUser} className='border-0 bg-[linear-gradient(135deg,#d6ccff_0%,#a78bfa_56%,#f4be7e_100%)] text-slate-950 hover:brightness-105'>
                            {savingUser ? 'Enregistrement...' : 'Enregistrer'}
                          </Button>
                          <Button type='button' variant='outline' className='border-white/10 bg-white/5 text-white hover:bg-white/10' onClick={handleCancelEdit}>
                            Annuler
                          </Button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className='mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
          <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-violet-200'>
              <ShieldEllipsis className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Roles et permissions</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Matrice des acces effectifs
            </h2>

            <div className='mt-6 space-y-4'>
              {roleSummary.map((item) => (
                <div
                  key={item.role}
                  className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <div className='flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
                    <div>
                      <div className='flex flex-wrap items-center gap-3'>
                        <p className='text-sm font-medium text-white'>{roleLabels[item.role]}</p>
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
                            className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-slate-300'
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
                        <p className='mt-2 text-lg font-semibold text-amber-200'>
                          {item.mustChange}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-violet-200'>
              <KeyRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>File prioritaire</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Comptes a traiter rapidement
            </h2>

            <div className='mt-6 grid gap-4 sm:grid-cols-3'>
              <article className='dashboard-stat rounded-[1.5rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Inactifs</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.inactifs}</p>
              </article>
              <article className='dashboard-stat rounded-[1.5rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Reset</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.mustChange}</p>
              </article>
              <article className='dashboard-stat rounded-[1.5rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Employes</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.employes}</p>
              </article>
            </div>

            <div className='mt-6 space-y-4'>
              {priorityQueue.length === 0 ? (
                <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>
                  Aucun compte critique pour le moment.
                </div>
              ) : (
                priorityQueue.map((user) => (
                  <div key={user.id} className='dashboard-card rounded-[1.5rem] p-5'>
                    <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
                      <div>
                        <div className='flex flex-wrap items-center gap-3'>
                          <p className='text-sm font-medium text-white'>
                            {user.prenom} {user.nom}
                          </p>
                          <span
                            className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${roleBadgeClass[user.role]}`}
                          >
                            {roleLabels[user.role]}
                          </span>
                        </div>
                        <p className='mt-2 text-sm leading-7 text-slate-300'>{user.email}</p>
                        <p className='text-sm text-slate-400'>
                          {!user.actif
                            ? 'Compte desactive: reactivation a considerer.'
                            : 'Mot de passe temporaire encore actif.'}
                        </p>
                      </div>

                      <div className='flex flex-wrap gap-3'>
                        <Button
                          variant='outline'
                          className='border-white/10 bg-white/5 text-white hover:bg-white/10'
                          onClick={() => handleToggleStatus(user)}
                        >
                          {user.actif ? 'Desactiver' : 'Activer'}
                        </Button>
                        {user.role !== 'CLIENT' ? (
                          <Button
                            variant='outline'
                            className='border-white/10 bg-white/5 text-white hover:bg-white/10'
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

        <section className='mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]'>
          <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-violet-200'>
              <Settings2 className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Parametrage systeme</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Garde-fous actifs
            </h2>

            <div className='mt-6 space-y-4'>
              {systemPolicies.map((policy) => (
                <div
                  key={policy.title}
                  className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <p className='text-sm font-medium text-white'>{policy.title}</p>
                  <p className='mt-2 text-sm leading-7 text-slate-300'>{policy.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-violet-200'>
              <ShieldCheck className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Vue Sprint 2</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Lecture admin complete
            </h2>

            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              <div className='dashboard-card-soft rounded-[1.4rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>
                  Couverture roles
                </p>
                <p className='mt-3 text-lg font-semibold text-white'>
                  {roleSummary.filter((item) => item.total > 0).length}/4 roles actifs
                </p>
              </div>
              <div className='dashboard-card-soft rounded-[1.4rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>
                  Hygiene comptes
                </p>
                <p className='mt-3 text-lg font-semibold text-white'>
                  {stats.mustChange === 0 && stats.inactifs === 0 ? 'Stable' : 'A surveiller'}
                </p>
              </div>
            </div>

            <div className='mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm leading-7 text-slate-300'>
              L experience admin Sprint 2 combine maintenant creation, edition, activation,
              reinitialisation, suppression controlee, lecture des permissions effectives et
              priorisation des comptes a risque depuis un seul ecran.
            </div>
          </article>
        </section>
    </AppDashboardShell>
  )
}
