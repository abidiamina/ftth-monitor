import { useEffect, useMemo, useState } from 'react'
import {
  CheckCheck,
  ClipboardCheck,
  KeyRound,
  MapPinned,
  RadioTower,
  ScanSearch,
  Wrench,
  XCircle,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel'
import { validatePasswordChangeForm } from '@/lib/validation'
import { changeCurrentPassword, getCurrentUser } from '@/services/authApi'
import { listInterventions, updateIntervention } from '@/services/interventionApi'
import { listNotifications, markNotificationAsRead } from '@/services/notificationApi'
import type {
  CurrentUser,
  InterventionRecord,
  InterventionStatus,
  NotificationRecord,
} from '@/types/auth.types'

const statusLabels: Record<InterventionStatus, string> = {
  EN_ATTENTE: 'A confirmer',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminee',
  ANNULEE: 'Annulee',
}

const statusBadgeClasses: Record<InterventionStatus, string> = {
  EN_ATTENTE: 'border-amber-300/15 bg-amber-300/8 text-amber-100',
  EN_COURS: 'border-sky-300/15 bg-sky-300/8 text-sky-100',
  TERMINEE: 'border-emerald-300/15 bg-emerald-300/8 text-emerald-100',
  ANNULEE: 'border-rose-300/15 bg-rose-300/8 text-rose-100',
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

export const TechnicienDashboardPage = () => {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [interventions, setInterventions] = useState<InterventionRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<number | null>(null)
  const [motDePasseActuel, setMotDePasseActuel] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [userData, interventionsData, notificationsData] = await Promise.all([
        getCurrentUser(),
        listInterventions(),
        listNotifications(),
      ])
      setUser(userData)
      setInterventions(interventionsData)
      setNotifications(notificationsData)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Impossible de charger l espace technicien.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const missionDeck = useMemo(() => {
    return {
      pending: interventions.filter((item) => item.statut === 'EN_ATTENTE'),
      active: interventions.filter((item) => item.statut === 'EN_COURS'),
      completed: interventions.filter((item) => item.statut === 'TERMINEE'),
      unread: notifications.filter((item) => !item.lu).length,
    }
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

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validatePasswordChangeForm({
      motDePasseActuel,
      nouveauMotDePasse,
    })

    if (validationError) {
      toast.error(validationError)
      return
    }

    try {
      const response = await changeCurrentPassword({ motDePasseActuel, nouveauMotDePasse })
      setUser((current) => (current ? { ...current, ...response.user } : current))
      setMotDePasseActuel('')
      setNouveauMotDePasse('')
      toast.success(response.message)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise a jour du mot de passe impossible.'))
    }
  }

  const handleAccept = async (intervention: InterventionRecord) => {
    setActionId(intervention.id)
    try {
      const response = await updateIntervention(intervention.id, { statut: 'EN_COURS' })
      toast.success('Intervention acceptee et demarree.')
      setInterventions((current) =>
        current.map((item) => (item.id === intervention.id ? response.data : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Acceptation impossible.'))
    } finally {
      setActionId(null)
    }
  }

  const handleRefuse = async (intervention: InterventionRecord) => {
    setActionId(intervention.id)
    try {
      await updateIntervention(intervention.id, {
        technicienId: null,
        statut: 'EN_ATTENTE',
      })
      toast.success('Intervention refusee et renvoyee pour reaffectation.')
      setInterventions((current) => current.filter((item) => item.id !== intervention.id))
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Refus impossible.'))
    } finally {
      setActionId(null)
    }
  }

  const handleComplete = async (intervention: InterventionRecord) => {
    setActionId(intervention.id)
    try {
      const response = await updateIntervention(intervention.id, { statut: 'TERMINEE' })
      toast.success('Intervention marquee comme terminee.')
      setInterventions((current) =>
        current.map((item) => (item.id === intervention.id ? response.data : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Cloture impossible.'))
    } finally {
      setActionId(null)
    }
  }

  const renderCard = (
    intervention: InterventionRecord,
    actions: React.ReactNode
  ) => (
    <article key={intervention.id} className='rounded-[1.6rem] border border-white/10 bg-[#081412]/85 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]'>
      <div className='flex flex-wrap items-center gap-3'>
        <p className='text-sm font-semibold text-white'>{intervention.titre}</p>
        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${statusBadgeClasses[intervention.statut]}`}>{statusLabels[intervention.statut]}</span>
      </div>
      <p className='mt-3 text-sm leading-7 text-slate-300'>{intervention.description}</p>
      <div className='mt-4 grid gap-2 text-sm text-slate-400'>
        <p>Client: {intervention.client.prenom} {intervention.client.nom}</p>
        <p>Adresse: {intervention.adresse}</p>
        <p>Planifiee: {formatDate(intervention.datePlanifiee)}</p>
      </div>
      <div className='mt-5 flex flex-wrap gap-3'>
        {actions}
      </div>
    </article>
  )

  return (
    <AppDashboardShell
      role='TECHNICIEN'
      workspaceLabel='Suivi des interventions'
      workspaceTitle='Deck technicien'
    >
        <header className='dashboard-hero rounded-[2.4rem] p-6 sm:p-8'>
          <div className='grid gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
            <div>
              <div className='inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-100'>
                <RadioTower className='h-4 w-4' />
                Sprint 2 us-20 us-21 us-22
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Mission deck technicien
              </h1>
              <p className='mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base'>
                Un tableau de bord concu pour trier rapidement les taches affectees, accepter ou
                refuser une mission, puis pousser son avancement en temps reel.
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>A confirmer</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{missionDeck.pending.length}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Actives</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{missionDeck.active.length}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Terminees</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{missionDeck.completed.length}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Technicien</p>
                <p className='mt-3 text-base font-semibold text-white'>{user ? `${user.prenom} ${user.nom}` : 'Chargement...'}</p>
              </article>
              <article className='dashboard-stat rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Alertes</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{missionDeck.unread}</p>
              </article>
            </div>
          </div>
        </header>

        <section className='mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
          <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <ClipboardCheck className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Couloir des interventions</p>
            </div>

            {loading ? (
              <div className='dashboard-card mt-6 rounded-[1.5rem] p-6 text-sm text-slate-300'>
                Chargement des missions terrain...
              </div>
            ) : (
              <div className='mt-6 grid gap-5 xl:grid-cols-3'>
                <section className='rounded-[1.7rem] border border-amber-300/15 bg-amber-300/[0.05] p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-xs uppercase tracking-[0.22em] text-amber-200'>US-20 / US-21</p>
                      <h2 className='mt-2 text-xl font-semibold text-white'>A confirmer</h2>
                    </div>
                    <ScanSearch className='h-5 w-5 text-amber-200' />
                  </div>
                  <div className='mt-4 space-y-4'>
                    {missionDeck.pending.length === 0 ? (
                      <div className='rounded-[1.3rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300'>
                        Aucune mission en attente de confirmation.
                      </div>
                    ) : (
                      missionDeck.pending.map((intervention) =>
                        renderCard(
                          intervention,
                          <>
                            <button type='button' disabled={actionId === intervention.id} onClick={() => handleAccept(intervention)} className='rounded-[1rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100 transition hover:bg-emerald-300/15 disabled:opacity-60'>
                              Accepter
                            </button>
                            <button type='button' disabled={actionId === intervention.id} onClick={() => handleRefuse(intervention)} className='rounded-[1rem] border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100 transition hover:bg-rose-300/15 disabled:opacity-60'>
                              Refuser
                            </button>
                          </>
                        )
                      )
                    )}
                  </div>
                </section>

                <section className='rounded-[1.7rem] border border-sky-300/15 bg-sky-300/[0.05] p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-xs uppercase tracking-[0.22em] text-sky-200'>US-22</p>
                      <h2 className='mt-2 text-xl font-semibold text-white'>En cours</h2>
                    </div>
                    <Wrench className='h-5 w-5 text-sky-200' />
                  </div>
                  <div className='mt-4 space-y-4'>
                    {missionDeck.active.length === 0 ? (
                      <div className='rounded-[1.3rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300'>
                        Aucune intervention active pour le moment.
                      </div>
                    ) : (
                      missionDeck.active.map((intervention) =>
                        renderCard(
                          intervention,
                          <button type='button' disabled={actionId === intervention.id} onClick={() => handleComplete(intervention)} className='rounded-[1rem] border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-100 transition hover:bg-sky-300/15 disabled:opacity-60'>
                            Marquer terminee
                          </button>
                        )
                      )
                    )}
                  </div>
                </section>

                <section className='rounded-[1.7rem] border border-emerald-300/15 bg-emerald-300/[0.05] p-4'>
                  <div className='flex items-center justify-between gap-3'>
                    <div>
                      <p className='text-xs uppercase tracking-[0.22em] text-emerald-200'>Archive</p>
                      <h2 className='mt-2 text-xl font-semibold text-white'>Terminees</h2>
                    </div>
                    <CheckCheck className='h-5 w-5 text-emerald-200' />
                  </div>
                  <div className='mt-4 space-y-4'>
                    {missionDeck.completed.length === 0 ? (
                      <div className='rounded-[1.3rem] border border-white/10 bg-black/15 p-4 text-sm text-slate-300'>
                        Rien de cloture pour l instant.
                      </div>
                    ) : (
                      missionDeck.completed.map((intervention) =>
                        renderCard(
                          intervention,
                          <div className='inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100'>
                            <CheckCheck className='h-4 w-4' />
                            Rapport de mission pret
                          </div>
                        )
                      )
                    )}
                  </div>
                </section>
              </div>
            )}
          </article>

          <div className='grid gap-6'>
            <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
              <div className='flex items-center gap-3 text-emerald-200'>
                <MapPinned className='h-5 w-5' />
                <p className='text-xs uppercase tracking-[0.24em]'>Lecture de profil</p>
              </div>

              {loading ? (
                <div className='dashboard-card mt-6 rounded-[1.5rem] p-5 text-sm text-slate-300'>
                  Chargement du profil...
                </div>
              ) : user ? (
                <div className='mt-6 grid gap-4 sm:grid-cols-2'>
                    <div className='dashboard-card rounded-[1.5rem] p-5'>
                    <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Nom complet</p>
                    <p className='mt-3 text-lg font-semibold text-white'>{user.prenom} {user.nom}</p>
                  </div>
                    <div className='dashboard-card rounded-[1.5rem] p-5'>
                    <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Email</p>
                    <p className='mt-3 text-lg font-semibold text-white'>{user.email}</p>
                  </div>
                    <div className='dashboard-card rounded-[1.5rem] p-5'>
                    <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Telephone</p>
                    <p className='mt-3 text-lg font-semibold text-white'>{user.telephone || 'Non renseigne'}</p>
                  </div>
                    <div className='dashboard-card rounded-[1.5rem] p-5'>
                    <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Compte</p>
                    <p className='mt-3 text-lg font-semibold text-white'>{user.actif ? 'Actif' : 'Inactif'}</p>
                  </div>
                </div>
              ) : null}

              {user?.mustChangePassword ? (
                <div className='mt-6 rounded-[1.4rem] border border-amber-300/15 bg-amber-300/8 p-5 text-sm leading-7 text-amber-100'>
                  Le backend impose encore un changement de mot de passe avant utilisation normale.
                </div>
              ) : null}
            </article>

            <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
              <div className='flex items-center gap-3 text-emerald-200'>
                <KeyRound className='h-5 w-5' />
                <p className='text-xs uppercase tracking-[0.24em]'>Securite de session</p>
              </div>

              <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
                Changer le mot de passe
              </h2>

              <form className='mt-6 grid gap-4' onSubmit={handlePasswordChange}>
                <input type='password' value={motDePasseActuel} onChange={(event) => setMotDePasseActuel(event.target.value)} placeholder='Mot de passe actuel' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
                <input type='password' value={nouveauMotDePasse} onChange={(event) => setNouveauMotDePasse(event.target.value)} placeholder='Nouveau mot de passe' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />

                <button type='submit' className='rounded-[1.2rem] border-0 bg-[linear-gradient(135deg,#a3ffe0_0%,#68e6b1_56%,#f4be7e_100%)] px-4 py-3 text-sm font-medium text-slate-950 transition hover:brightness-105'>
                  Mettre a jour
                </button>
              </form>
            </article>

            <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
              <div className='flex items-center gap-3 text-emerald-200'>
                <XCircle className='h-5 w-5' />
                <p className='text-xs uppercase tracking-[0.24em]'>Regle metier retenue</p>
              </div>
              <p className='mt-5 text-sm leading-7 text-slate-300'>
                Dans cette version, <strong>Accepter</strong> fait passer la mission en cours,
                tandis que <strong>Refuser</strong> la renvoie au responsable pour reaffectation.
              </p>
            </article>
          </div>
        </section>

        <section className='mt-6'>
          <NotificationsPanel
            description='Affectations, changements de priorite et mises a jour de statut du sprint 2 remontent ici en temps reel applicatif.'
            notifications={notifications}
            loading={loading}
            accentClassName='bg-emerald-300/10 text-emerald-100'
            onMarkAsRead={handleMarkNotificationAsRead}
          />
        </section>
    </AppDashboardShell>
  )
}
