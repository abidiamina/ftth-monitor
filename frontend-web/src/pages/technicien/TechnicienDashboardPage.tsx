import { useEffect, useMemo, useState } from 'react'
import {
  BellRing,
  CheckCheck,
  ClipboardCheck,
  KeyRound,
  MapPinned,
  RadioTower,
  ScanSearch,
  Wrench,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel'
import { TechnicianSprint3Panel } from '@/components/sprint3/TechnicianSprint3Panel'
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
  EN_ATTENTE: 'border-amber-200 bg-amber-50 text-amber-700',
  EN_COURS: 'border-sky-200 bg-sky-50 text-sky-700',
  TERMINEE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  ANNULEE: 'border-rose-200 bg-rose-50 text-rose-700',
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
  const [tab, setTab] = useState<'APERCU' | 'TERRAIN' | 'NOTIFICATIONS' | 'PROFIL' | 'SECURITE'>('APERCU')
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

  const tabs = useMemo(
    () => [
      { id: 'APERCU', label: 'Apercu', icon: RadioTower },
      { id: 'TERRAIN', label: 'Terrain', icon: ScanSearch },
      { id: 'NOTIFICATIONS', label: 'Notifications', icon: BellRing, badge: missionDeck.unread || undefined },
      { id: 'PROFIL', label: 'Profil', icon: MapPinned },
      { id: 'SECURITE', label: 'Securite', icon: KeyRound },
    ],
    [missionDeck.unread]
  )

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
    <article key={intervention.id} className='rounded-[1.6rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(148,163,184,0.12)]'>
      <div className='flex flex-wrap items-center gap-3'>
        <p className='text-sm font-semibold text-slate-950'>{intervention.titre}</p>
        <span className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${statusBadgeClasses[intervention.statut]}`}>{statusLabels[intervention.statut]}</span>
      </div>
      {intervention.description ? (
        <p className='mt-3 text-sm leading-7 text-slate-800'>{intervention.description}</p>
      ) : null}
      <div className='mt-4 grid gap-2 text-sm text-slate-800'>
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
      sectionTabs={tabs}
      sectionTab={tab}
      onSectionTabChange={(value) => setTab(value as typeof tab)}
    >
        <header className='dashboard-hero rounded-[2.4rem] p-6 sm:p-8'>
          <div className='grid gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
            <div>
              <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-700'>
                <RadioTower className='h-4 w-4' />
                Technicien
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl'>
                Tableau de bord
              </h1>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <article className='dashboard-stat dashboard-stat--cyan rounded-[1.8rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>A confirmer</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{missionDeck.pending.length}</p>
              </article>
              <article className='dashboard-stat dashboard-stat--mint rounded-[1.8rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Actives</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{missionDeck.active.length}</p>
              </article>
              <article className='dashboard-stat dashboard-stat--violet rounded-[1.8rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Terminees</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{missionDeck.completed.length}</p>
              </article>
              <article className='dashboard-stat dashboard-stat--blue rounded-[1.8rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Alertes</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{missionDeck.unread}</p>
              </article>
            </div>
          </div>
        </header>

        <section className='mt-6 space-y-6'>
          <div className='xl:hidden'>
            <DashboardTabs value={tab} onChange={(value) => setTab(value as typeof tab)} tabs={tabs} />
          </div>

          {tab === 'APERCU' ? (
            <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
              <div className='flex items-center gap-3 text-emerald-700'>
                <ClipboardCheck className='h-5 w-5' />
                <p className='text-xs uppercase tracking-[0.24em]'>Missions</p>
              </div>

              {loading ? (
                <div className='dashboard-card mt-6 rounded-[1.5rem] p-6 text-sm text-slate-800'>
                  Chargement...
                </div>
              ) : (
                <div className='mt-6 grid gap-5 xl:grid-cols-3'>
                  <section className='rounded-[1.7rem] border border-amber-100 bg-[linear-gradient(180deg,#fffaf0_0%,#fff6e1_100%)] p-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <h2 className='text-sm font-semibold text-slate-950'>A confirmer</h2>
                      <ScanSearch className='h-5 w-5 text-amber-600' />
                    </div>
                    <div className='mt-4 space-y-4'>
                      {missionDeck.pending.length === 0 ? (
                        <div className='rounded-[1.3rem] border border-amber-200 bg-white/80 p-4 text-sm text-slate-900'>
                          Aucune mission.
                        </div>
                      ) : (
                        missionDeck.pending.map((intervention) =>
                          renderCard(
                            intervention,
                            <>
                              <button type='button' disabled={actionId === intervention.id} onClick={() => handleAccept(intervention)} className='rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60'>
                                Accepter
                              </button>
                              <button type='button' disabled={actionId === intervention.id} onClick={() => handleRefuse(intervention)} className='rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 transition hover:bg-rose-100 disabled:opacity-60'>
                                Refuser
                              </button>
                            </>
                          )
                        )
                      )}
                    </div>
                  </section>

                  <section className='rounded-[1.7rem] border border-sky-100 bg-[linear-gradient(180deg,#f4fbff_0%,#ebf7ff_100%)] p-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <h2 className='text-sm font-semibold text-slate-950'>En cours</h2>
                      <Wrench className='h-5 w-5 text-sky-600' />
                    </div>
                    <div className='mt-4 space-y-4'>
                      {missionDeck.active.length === 0 ? (
                        <div className='rounded-[1.3rem] border border-sky-200 bg-white/80 p-4 text-sm text-slate-900'>
                          Aucune mission.
                        </div>
                      ) : (
                        missionDeck.active.map((intervention) =>
                          renderCard(
                            intervention,
                            <button type='button' disabled={actionId === intervention.id} onClick={() => handleComplete(intervention)} className='rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800 transition hover:bg-sky-100 disabled:opacity-60'>
                              Terminer
                            </button>
                          )
                        )
                      )}
                    </div>
                  </section>

                  <section className='rounded-[1.7rem] border border-emerald-100 bg-[linear-gradient(180deg,#f3fffb_0%,#eafcf5_100%)] p-4'>
                    <div className='flex items-center justify-between gap-3'>
                      <h2 className='text-sm font-semibold text-slate-950'>Terminees</h2>
                      <CheckCheck className='h-5 w-5 text-emerald-600' />
                    </div>
                    <div className='mt-4 space-y-4'>
                      {missionDeck.completed.length === 0 ? (
                        <div className='rounded-[1.3rem] border border-emerald-200 bg-white/80 p-4 text-sm text-slate-900'>
                          Aucun historique.
                        </div>
                      ) : (
                        missionDeck.completed.map((intervention) =>
                          renderCard(
                            intervention,
                            <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800'>
                              <CheckCheck className='h-4 w-4' />
                              Rapport pret
                            </div>
                          )
                        )
                      )}
                    </div>
                  </section>
                </div>
              )}
            </article>
          ) : null}

          {tab === 'TERRAIN' ? (
            <TechnicianSprint3Panel interventions={interventions} onRefresh={loadDashboard} />
          ) : null}

          {tab === 'PROFIL' ? (
            <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
              <div className='flex items-center gap-3 text-emerald-700'>
                <MapPinned className='h-5 w-5' />
                <p className='text-xs uppercase tracking-[0.24em]'>Profil</p>
              </div>

              {loading ? (
                <div className='dashboard-card mt-6 rounded-[1.5rem] p-5 text-sm text-slate-800'>
                  Chargement...
                </div>
              ) : user ? (
                <div className='mt-6 grid gap-4 sm:grid-cols-2'>
                  <div className='dashboard-card rounded-[1.5rem] p-5'>
                    <p className='text-xs uppercase tracking-[0.22em] text-slate-700'>Nom</p>
                    <p className='mt-3 text-lg font-semibold text-slate-950'>{user.prenom} {user.nom}</p>
                  </div>
                  <div className='dashboard-card rounded-[1.5rem] p-5'>
                    <p className='text-xs uppercase tracking-[0.22em] text-slate-700'>Email</p>
                    <p className='mt-3 text-lg font-semibold text-slate-950'>{user.email}</p>
                  </div>
                  <div className='dashboard-card rounded-[1.5rem] p-5'>
                    <p className='text-xs uppercase tracking-[0.22em] text-slate-700'>Telephone</p>
                    <p className='mt-3 text-lg font-semibold text-slate-950'>{user.telephone || 'Non renseigne'}</p>
                  </div>
                  <div className='dashboard-card rounded-[1.5rem] p-5'>
                    <p className='text-xs uppercase tracking-[0.22em] text-slate-700'>Compte</p>
                    <p className='mt-3 text-lg font-semibold text-slate-950'>{user.actif ? 'Actif' : 'Inactif'}</p>
                  </div>
                </div>
              ) : null}

              {user?.mustChangePassword ? (
                <div className='mt-6 rounded-[1.4rem] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800'>
                  Changement de mot de passe requis.
                </div>
              ) : null}
            </article>
          ) : null}

          {tab === 'SECURITE' ? (
            <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
              <div className='flex items-center gap-3 text-emerald-700'>
                <KeyRound className='h-5 w-5' />
                <p className='text-xs uppercase tracking-[0.24em]'>Mot de passe</p>
              </div>

              <form className='mt-6 grid gap-4 sm:max-w-xl' onSubmit={handlePasswordChange}>
                <input type='password' value={motDePasseActuel} onChange={(event) => setMotDePasseActuel(event.target.value)} placeholder='Mot de passe actuel' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />
                <input type='password' value={nouveauMotDePasse} onChange={(event) => setNouveauMotDePasse(event.target.value)} placeholder='Nouveau mot de passe' className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm' />

                <button type='submit' className='rounded-[1.2rem] border-0 bg-[linear-gradient(135deg,#a3ffe0_0%,#68e6b1_56%,#f4be7e_100%)] px-4 py-3 text-sm font-medium text-slate-950 transition hover:brightness-105'>
                  Mettre a jour
                </button>
              </form>
            </article>
          ) : null}

          {tab === 'NOTIFICATIONS' ? (
            <NotificationsPanel
              notifications={notifications}
              loading={loading}
              accentClassName='bg-emerald-100 text-emerald-800'
              onMarkAsRead={handleMarkNotificationAsRead}
            />
          ) : null}
        </section>
    </AppDashboardShell>
  )
}
