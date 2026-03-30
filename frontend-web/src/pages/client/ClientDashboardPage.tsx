import { useEffect, useMemo, useState } from 'react'
import { BellRing, KeyRound, ShieldCheck, TicketPlus, UserRound } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { toast } from 'react-hot-toast'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel'
import {
  validateInterventionForm,
  validatePasswordChangeForm,
  validateUserUpdateForm,
} from '@/lib/validation'
import { listNotifications, markNotificationAsRead } from '@/services/notificationApi'
import { changeCurrentPassword, getCurrentUser, updateCurrentUser } from '@/services/authApi'
import { createIntervention, listInterventions } from '@/services/interventionApi'
import { setUser } from '@/store/authSlice'
import type {
  CreateInterventionRequest,
  CurrentUser,
  InterventionPriority,
  InterventionRecord,
  InterventionStatus,
  NotificationRecord,
} from '@/types/auth.types'

const statusLabels: Record<InterventionStatus, string> = {
  EN_ATTENTE: 'En attente',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminee',
  ANNULEE: 'Annulee',
}

const priorityLabels: Record<InterventionPriority, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
}

const statusBadgeClasses: Record<InterventionStatus, string> = {
  EN_ATTENTE: 'border-amber-300/15 bg-amber-300/8 text-amber-100',
  EN_COURS: 'border-sky-300/15 bg-sky-300/8 text-sky-100',
  TERMINEE: 'border-emerald-300/15 bg-emerald-300/8 text-emerald-100',
  ANNULEE: 'border-rose-300/15 bg-rose-300/8 text-rose-100',
}

const emptyRequest: CreateInterventionRequest = {
  titre: '',
  description: '',
  adresse: '',
  priorite: 'NORMALE',
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

const formatDate = (value?: string | null) => {
  if (!value) return 'Non planifiee'
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const ClientDashboardPage = () => {
  const dispatch = useDispatch()
  const [user, setLocalUser] = useState<CurrentUser | null>(null)
  const [interventions, setInterventions] = useState<InterventionRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [profileForm, setProfileForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    adresse: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    motDePasseActuel: '',
    nouveauMotDePasse: '',
  })
  const [requestForm, setRequestForm] = useState<CreateInterventionRequest>(emptyRequest)

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [userData, interventionsData, notificationsData] = await Promise.all([
        getCurrentUser(),
        listInterventions(),
        listNotifications(),
      ])

      setLocalUser(userData)
      setInterventions(interventionsData)
      setNotifications(notificationsData)
      setProfileForm({
        nom: userData.nom,
        prenom: userData.prenom,
        telephone: userData.telephone ?? '',
        adresse: userData.client?.adresse ?? '',
      })
      setRequestForm((current) => ({
        ...current,
        adresse: userData.client?.adresse ?? current.adresse,
      }))
      dispatch(setUser(userData))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Impossible de charger le profil client.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [dispatch])

  const stats = useMemo(() => {
    const total = interventions.length
    const ouvertes = interventions.filter((item) => item.statut !== 'TERMINEE').length
    const enCours = interventions.filter((item) => item.statut === 'EN_COURS').length
    const unread = notifications.filter((item) => !item.lu).length
    return { total, ouvertes, enCours, unread }
  }, [interventions, notifications])

  const handleMarkNotificationAsRead = async (notificationId: number) => {
    try {
      await markNotificationAsRead(notificationId)
      setNotifications((current) =>
        current.map((item) => (item.id === notificationId ? { ...item, lu: true } : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Notification impossible a marquer comme lue.'))
    }
  }

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateUserUpdateForm(profileForm)

    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      const response = await updateCurrentUser(profileForm)
      setLocalUser((current) =>
        current
          ? {
              ...current,
              ...response.user,
              client: current.client
                ? {
                    ...current.client,
                    adresse: profileForm.adresse,
                    nom: profileForm.nom,
                    prenom: profileForm.prenom,
                    telephone: profileForm.telephone,
                  }
                : current.client,
            }
          : current
      )
      dispatch(setUser(response.user))
      toast.success(response.message)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise a jour du profil impossible.'))
    }
  }

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validatePasswordChangeForm(passwordForm)

    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      const response = await changeCurrentPassword(passwordForm)
      setLocalUser((current) => (current ? { ...current, ...response.user } : current))
      dispatch(setUser(response.user))
      setPasswordForm({ motDePasseActuel: '', nouveauMotDePasse: '' })
      toast.success(response.message)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Changement de mot de passe impossible.'))
    }
  }

  const handleRequestSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateInterventionForm(requestForm)

    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmittingRequest(true)

    try {
      const response = await createIntervention(requestForm)
      toast.success('Demande enregistree et transmise au responsable.')
      setInterventions((current) => [response.data, ...current])
      setRequestForm({
        ...emptyRequest,
        adresse: profileForm.adresse,
      })
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Demande d intervention impossible.'))
    } finally {
      setSubmittingRequest(false)
    }
  }

  return (
    <AppDashboardShell
      role='CLIENT'
      workspaceLabel='Suivi des interventions'
      workspaceTitle='Portail client'
    >
        <header className='dashboard-hero rounded-[2.4rem] p-6 sm:p-8'>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <div className='inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-100'>
                <ShieldCheck className='h-4 w-4' />
                Customer space live
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Espace client interventions
              </h1>
              <p className='mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base'>
                Le client peut maintenant garder son profil a jour, envoyer une demande
                d intervention et suivre l avancement de ses tickets.
              </p>
            </div>
          </div>
        </header>

        <section className='mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]'>
          <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <TicketPlus className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>US-19 Demande intervention</p>
            </div>

            <div className='mt-6 grid gap-3 sm:grid-cols-3'>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Total</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.total}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Ouvertes</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.ouvertes}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>En cours</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.enCours}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Alertes</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.unread}</p>
              </article>
            </div>

            <h2 className='mt-6 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Declarer un besoin technique
            </h2>

            <form className='mt-6 grid gap-4' onSubmit={handleRequestSubmit}>
              <input value={requestForm.titre} onChange={(event) => setRequestForm((current) => ({ ...current, titre: event.target.value }))} placeholder='Exemple: Panne fibre au domicile' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
              <textarea value={requestForm.description} onChange={(event) => setRequestForm((current) => ({ ...current, description: event.target.value }))} placeholder='Decris le probleme, l impact et les disponibilites d acces...' rows={4} className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
              <textarea value={requestForm.adresse} onChange={(event) => setRequestForm((current) => ({ ...current, adresse: event.target.value }))} placeholder='Adresse de l intervention' rows={3} className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
              <select value={requestForm.priorite ?? 'NORMALE'} onChange={(event) => setRequestForm((current) => ({ ...current, priorite: event.target.value as InterventionPriority }))} className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm'>
                {(['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'] as InterventionPriority[]).map((priority) => (
                  <option key={priority} value={priority}>
                    {priorityLabels[priority]}
                  </option>
                ))}
              </select>

              <button type='submit' disabled={submittingRequest} className='rounded-[1.2rem] border-0 bg-[linear-gradient(135deg,#a3ffe0_0%,#68e6b1_56%,#f4be7e_100%)] px-4 py-3 text-sm font-medium text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60'>
                {submittingRequest ? 'Envoi...' : 'Envoyer ma demande'}
              </button>
            </form>
          </article>

          <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <BellRing className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>US-07 et consultation</p>
            </div>

            <div className='mt-6 space-y-4'>
              {loading ? (
                <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>Chargement de tes interventions...</div>
              ) : interventions.length === 0 ? (
                <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>Aucune intervention n a encore ete enregistree pour ce compte.</div>
              ) : (
                interventions.map((intervention) => (
                  <div key={intervention.id} className='dashboard-card rounded-[1.5rem] p-5'>
                    <div className='flex flex-wrap items-center gap-3'>
                      <p className='text-sm font-medium text-white'>{intervention.titre}</p>
                      <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${statusBadgeClasses[intervention.statut]}`}>{statusLabels[intervention.statut]}</span>
                    </div>
                    <p className='mt-3 text-sm leading-7 text-slate-300'>{intervention.description}</p>
                    <p className='mt-2 text-sm text-slate-400'>{intervention.adresse}</p>
                    <p className='text-sm text-slate-400'>Priorite: {priorityLabels[intervention.priorite]}</p>
                    <p className='text-sm text-slate-500'>Planifiee: {formatDate(intervention.datePlanifiee)}</p>
                    <p className='text-sm text-slate-500'>
                      Technicien: {intervention.technicien ? `${intervention.technicien.utilisateur.prenom} ${intervention.technicien.utilisateur.nom}` : 'En attente d affectation'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </article>
        </section>

        <section className='mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]'>
          <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <UserRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>PATCH /auth/me</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Mettre a jour mes informations
            </h2>

            {loading ? (
              <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>Chargement du profil...</div>
            ) : (
              <form className='mt-6 grid gap-4' onSubmit={handleProfileSubmit}>
                <input value={profileForm.prenom} onChange={(event) => setProfileForm((current) => ({ ...current, prenom: event.target.value }))} placeholder='Prenom' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
                <input value={profileForm.nom} onChange={(event) => setProfileForm((current) => ({ ...current, nom: event.target.value }))} placeholder='Nom' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
                <input value={profileForm.telephone} onChange={(event) => setProfileForm((current) => ({ ...current, telephone: event.target.value }))} placeholder='Telephone' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
                <textarea value={profileForm.adresse} onChange={(event) => setProfileForm((current) => ({ ...current, adresse: event.target.value }))} placeholder='Adresse' rows={4} className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />

                <button type='submit' className='rounded-[1.2rem] border-0 bg-[linear-gradient(135deg,#a3ffe0_0%,#68e6b1_56%,#f4be7e_100%)] px-4 py-3 text-sm font-medium text-slate-950 transition hover:brightness-105'>
                  Enregistrer le profil
                </button>
              </form>
            )}
          </article>

          <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <KeyRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>PATCH /auth/change-password</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Securite du compte
            </h2>

            <div className='dashboard-card mt-6 rounded-[1.5rem] p-5'>
              <p className='text-sm font-medium text-white'>Profil charge depuis l API</p>
              <p className='mt-2 text-sm leading-7 text-slate-300'>{user ? `${user.prenom} ${user.nom} - ${user.email}` : 'Aucune information disponible.'}</p>
              <p className='text-sm leading-7 text-slate-400'>{user?.client?.adresse || 'Adresse client non disponible.'}</p>
            </div>

            <form className='mt-6 grid gap-4' onSubmit={handlePasswordSubmit}>
              <input type='password' value={passwordForm.motDePasseActuel} onChange={(event) => setPasswordForm((current) => ({ ...current, motDePasseActuel: event.target.value }))} placeholder='Mot de passe actuel' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
              <input type='password' value={passwordForm.nouveauMotDePasse} onChange={(event) => setPasswordForm((current) => ({ ...current, nouveauMotDePasse: event.target.value }))} placeholder='Nouveau mot de passe' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />

              <button type='submit' className='rounded-[1.2rem] border-0 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15'>
                Changer le mot de passe
              </button>
            </form>
          </article>
        </section>

        <section className='mt-6'>
          <NotificationsPanel
            description='Les notifications backend du sprint 2 apparaissent ici pour suivre les nouvelles demandes, affectations et changements de statut.'
            notifications={notifications}
            loading={loading}
            accentClassName='bg-emerald-300/10 text-emerald-100'
            onMarkAsRead={handleMarkNotificationAsRead}
          />
        </section>
    </AppDashboardShell>
  )
}
