import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, UserPlus, Users } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { BackToLoginButton } from '@/components/auth/BackToLoginButton'
import { Button } from '@/components/ui/button'
import { createEmployee, listUsers, resetEmployeePassword, updateUserStatus } from '@/services/authApi'
import type { CreateEmployeeRequest, User, UserRole } from '@/types/auth.types'

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

const emptyEmployee: CreateEmployeeRequest = {
  nom: '',
  prenom: '',
  email: '',
  telephone: '',
  role: 'TECHNICIEN',
}

export const AdminDashboardPage = () => {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL')
  const [employeeForm, setEmployeeForm] = useState<CreateEmployeeRequest>(emptyEmployee)

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

    return { total, actifs, employes, mustChange }
  }, [users])

  const handleCreateEmployee = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(167,139,250,0.14),transparent_18%),radial-gradient(circle_at_88%_14%,rgba(255,187,120,0.10),transparent_18%),linear-gradient(135deg,#09060f_0%,#110b1c_42%,#1b1230_100%)] px-4 py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <header className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between'>
            <div className='max-w-3xl'>
              <div className='inline-flex items-center gap-2 rounded-full border border-violet-300/15 bg-violet-300/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-violet-200'>
                <ShieldCheck className='h-4 w-4' />
                Dashboard admin connecte au backend auth
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Gestion des utilisateurs et des comptes employes
              </h1>
              <p className='mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base'>
                Cette vue s aligne sur les routes backend disponibles: liste des utilisateurs,
                creation des employes, activation, desactivation et reset de mot de passe.
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <BackToLoginButton />
              <article className='rounded-[1.4rem] border border-white/10 bg-black/15 p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Utilisateurs</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.total}</p>
              </article>
              <article className='rounded-[1.4rem] border border-white/10 bg-black/15 p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Actifs</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.actifs}</p>
              </article>
              <article className='rounded-[1.4rem] border border-white/10 bg-black/15 p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Employes</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.employes}</p>
              </article>
              <article className='rounded-[1.4rem] border border-white/10 bg-black/15 p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Reset requis</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.mustChange}</p>
              </article>
            </div>
          </div>
        </header>

        <section className='mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]'>
          <article className='rounded-[2rem] border border-violet-300/15 bg-[linear-gradient(135deg,rgba(167,139,250,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-violet-200'>
              <UserPlus className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>POST /users/employees</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Creer un compte employe
            </h2>

            <form className='mt-6 grid gap-4' onSubmit={handleCreateEmployee}>
              <input value={employeeForm.prenom} onChange={(event) => setEmployeeForm((current) => ({ ...current, prenom: event.target.value }))} placeholder='Prenom' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />
              <input value={employeeForm.nom} onChange={(event) => setEmployeeForm((current) => ({ ...current, nom: event.target.value }))} placeholder='Nom' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />
              <input type='email' value={employeeForm.email} onChange={(event) => setEmployeeForm((current) => ({ ...current, email: event.target.value }))} placeholder='email@ftth.com' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />
              <input value={employeeForm.telephone} onChange={(event) => setEmployeeForm((current) => ({ ...current, telephone: event.target.value }))} placeholder='Telephone' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />
              <select value={employeeForm.role} onChange={(event) => setEmployeeForm((current) => ({ ...current, role: event.target.value as CreateEmployeeRequest['role'] }))} className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none'>
                <option value='TECHNICIEN'>Technicien</option>
                <option value='RESPONSABLE'>Responsable</option>
              </select>

              <Button type='submit' size='lg' disabled={submitting} className='h-12 rounded-[1.2rem] border-0 bg-[linear-gradient(135deg,#d6ccff_0%,#a78bfa_56%,#f4be7e_100%)] text-slate-950 hover:brightness-105'>
                {submitting ? 'Creation...' : 'Creer le compte employe'}
              </Button>
            </form>
          </article>

          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
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
                <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5 text-sm text-slate-300'>Chargement des utilisateurs...</div>
              ) : users.length === 0 ? (
                <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5 text-sm text-slate-300'>Aucun utilisateur trouve pour ce filtre.</div>
              ) : (
                users.map((user) => (
                  <div key={user.id} className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
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
                        <Button variant='outline' className='border-white/10 bg-white/5 text-white hover:bg-white/10' onClick={() => handleToggleStatus(user)}>
                          {user.actif ? 'Desactiver' : 'Activer'}
                        </Button>
                        {user.role !== 'CLIENT' && user.role !== 'ADMIN' ? (
                          <Button variant='outline' className='border-white/10 bg-white/5 text-white hover:bg-white/10' onClick={() => handleResetPassword(user.id)}>
                            Reset mot de passe
                          </Button>
                        ) : null}
                      </div>
                    </div>

                    {user.mustChangePassword ? (
                      <div className='mt-4 rounded-[1.1rem] border border-amber-300/15 bg-amber-300/8 px-4 py-3 text-sm text-amber-100'>
                        Ce compte doit encore changer son mot de passe.
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
