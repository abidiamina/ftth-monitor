import { useEffect, useMemo, useState } from 'react'
import { BellRing, ClipboardList, Search, ShieldCheck, UsersRound, Wrench } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel'
import { validateInterventionForm } from '@/lib/validation'
import { listTechnicians } from '@/services/authApi'
import {
  createIntervention,
  listClients,
  listInterventions,
  updateIntervention,
} from '@/services/interventionApi'
import { listNotifications, markNotificationAsRead } from '@/services/notificationApi'
import type {
  ClientRecord,
  CreateInterventionRequest,
  InterventionPriority,
  InterventionRecord,
  InterventionStatus,
  NotificationRecord,
  TechnicianRecord,
} from '@/types/auth.types'

const priorityLabels: Record<InterventionPriority, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
}

const statusLabels: Record<InterventionStatus, string> = {
  EN_ATTENTE: 'En attente',
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

const priorityBadgeClasses: Record<InterventionPriority, string> = {
  BASSE: 'border-slate-200 bg-slate-100 text-slate-700',
  NORMALE: 'border-blue-200 bg-blue-50 text-blue-700',
  HAUTE: 'border-orange-200 bg-orange-50 text-orange-700',
  URGENTE: 'border-rose-200 bg-rose-50 text-rose-700',
}

const emptyForm: CreateInterventionRequest = {
  titre: '',
  description: '',
  adresse: '',
  priorite: 'NORMALE',
  datePlanifiee: '',
  clientId: '',
  technicienId: '',
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Non planifiee'
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const formatValidationDate = (value?: string | null) => {
  if (!value) return 'En attente de validation'
  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
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

export const ResponsableDashboardPage = () => {
  const [technicians, setTechnicians] = useState<TechnicianRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [interventions, setInterventions] = useState<InterventionRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'APERCU' | 'CREATION' | 'INTERVENTIONS' | 'NOTIFICATIONS'>('APERCU')
  const [statusFilter, setStatusFilter] = useState<'ALL' | InterventionStatus>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | InterventionPriority>('ALL')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<CreateInterventionRequest>(emptyForm)
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<number, string>>({})
  const [priorityDrafts, setPriorityDrafts] = useState<Record<number, InterventionPriority>>({})

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [techniciansData, clientsData, interventionsData, notificationsData] = await Promise.all([
        listTechnicians(),
        listClients(),
        listInterventions(),
        listNotifications(),
      ])

      setTechnicians(techniciansData)
      setClients(clientsData)
      setInterventions(interventionsData)
      setNotifications(notificationsData)
      setAssignmentDrafts(
        Object.fromEntries(
          interventionsData.map((item) => [item.id, item.technicienId ? String(item.technicienId) : ''])
        )
      )
      setPriorityDrafts(
        Object.fromEntries(interventionsData.map((item) => [item.id, item.priorite]))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Impossible de charger le pilotage des interventions.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  const stats = useMemo(() => {
    const total = interventions.length
    const enCours = interventions.filter((item) => item.statut === 'EN_COURS').length
    const urgentes = interventions.filter((item) => item.priorite === 'URGENTE').length
    const sansTechnicien = interventions.filter((item) => !item.technicienId).length
    const unread = notifications.filter((item) => !item.lu).length

    return { total, enCours, urgentes, sansTechnicien, unread }
  }, [interventions, notifications])

  const tabs = useMemo(
    () => [
      { id: 'APERCU', label: 'Apercu', icon: ShieldCheck },
      { id: 'CREATION', label: 'Nouvelle', icon: ClipboardList },
      { id: 'INTERVENTIONS', label: 'Interventions', icon: UsersRound },
      { id: 'NOTIFICATIONS', label: 'Notifications', icon: BellRing, badge: stats.unread || undefined },
    ],
    [stats.unread]
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

  const filteredInterventions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return interventions.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.statut === statusFilter
      const matchesPriority = priorityFilter === 'ALL' || item.priorite === priorityFilter
      const matchesQuery =
        !normalizedQuery ||
        `${item.titre} ${item.description ?? ''} ${item.adresse} ${item.client?.prenom ?? ''} ${item.client?.nom ?? ''} ${item.technicien?.utilisateur?.prenom ?? ''} ${item.technicien?.utilisateur?.nom ?? ''}`
          .toLowerCase()
          .includes(normalizedQuery)

      return matchesStatus && matchesPriority && matchesQuery
    })
  }, [interventions, priorityFilter, query, statusFilter])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateInterventionForm(form, { requireClient: true })

    if (validationError) {
      toast.error(validationError)
      return
    }

    setSubmitting(true)

    try {
      const payload: CreateInterventionRequest = {
        ...form,
        clientId: form.clientId || undefined,
        technicienId: form.technicienId || undefined,
        datePlanifiee: form.datePlanifiee || undefined,
      }

      const response = await createIntervention(payload)
      toast.success(response.message)
      setInterventions((current) => [response.data, ...current])
      setAssignmentDrafts((current) => ({
        ...current,
        [response.data.id]: response.data.technicienId ? String(response.data.technicienId) : '',
      }))
      setPriorityDrafts((current) => ({
        ...current,
        [response.data.id]: response.data.priorite,
      }))
      setForm(emptyForm)
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Creation de l intervention impossible.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssign = async (intervention: InterventionRecord) => {
    try {
      const response = await updateIntervention(intervention.id, {
        technicienId: assignmentDrafts[intervention.id] || null,
      })
      toast.success('Affectation mise a jour.')
      setInterventions((current) =>
        current.map((item) => (item.id === intervention.id ? response.data : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Affectation impossible.'))
    }
  }

  const handlePriority = async (intervention: InterventionRecord) => {
    try {
      const response = await updateIntervention(intervention.id, {
        priorite: priorityDrafts[intervention.id],
      })
      toast.success('Priorite mise a jour.')
      setInterventions((current) =>
        current.map((item) => (item.id === intervention.id ? response.data : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise a jour de priorite impossible.'))
    }
  }

  const handleStatus = async (
    intervention: InterventionRecord,
    statut: InterventionStatus
  ) => {
    try {
      const response = await updateIntervention(intervention.id, { statut })
      toast.success(`Intervention ${statusLabels[statut].toLowerCase()}.`)
      setInterventions((current) =>
        current.map((item) => (item.id === intervention.id ? response.data : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise a jour du statut impossible.'))
    }
  }

  const handleValidate = async (intervention: InterventionRecord) => {
    try {
      const response = await updateIntervention(intervention.id, { validee: true })
      toast.success('Intervention validee.')
      setInterventions((current) =>
        current.map((item) => (item.id === intervention.id ? response.data : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Validation impossible.'))
    }
  }

  const renderInterventionCard = (intervention: InterventionRecord) => {
    const assignmentInitial = intervention.technicienId ? String(intervention.technicienId) : ''
    const assignmentValue = assignmentDrafts[intervention.id] ?? ''
    const assignmentChanged = assignmentValue !== assignmentInitial

    const priorityValue = priorityDrafts[intervention.id] ?? intervention.priorite
    const priorityChanged = priorityValue !== intervention.priorite

    const validationLabel =
      intervention.statut === 'TERMINEE'
        ? intervention.validee
          ? 'Validee'
          : 'A valider'
        : null

    const validationBadgeClass =
      intervention.statut === 'TERMINEE' && !intervention.validee
        ? 'border-blue-200 bg-blue-50 text-blue-700'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'

    return (
      <div key={intervention.id} className='dashboard-card rounded-[1.6rem] p-5 sm:p-6'>
        <div className='grid gap-5 lg:grid-cols-[1fr_320px]'>
          <div className='min-w-0'>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='truncate text-base font-semibold text-slate-950'>{intervention.titre}</p>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${statusBadgeClasses[intervention.statut]}`}
              >
                {statusLabels[intervention.statut]}
              </span>
              <span
                className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${priorityBadgeClasses[intervention.priorite]}`}
              >
                {priorityLabels[intervention.priorite]}
              </span>
              {validationLabel ? (
                <span
                  className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${validationBadgeClass}`}
                >
                  {validationLabel}
                </span>
              ) : null}
            </div>

            <div className='mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2'>
              <div className='min-w-0'>
                <p className='truncate text-slate-800'>
                  {intervention.client.prenom} {intervention.client.nom}
                </p>
                <p className='mt-1 truncate text-slate-600'>{intervention.adresse}</p>
              </div>
              <div className='space-y-1 text-slate-600'>
                <p className='truncate'>Planifiee: {formatDate(intervention.datePlanifiee)}</p>
                <p className='truncate'>
                  Technicien:{' '}
                  {intervention.technicien
                    ? `${intervention.technicien.utilisateur.prenom} ${intervention.technicien.utilisateur.nom}`
                    : 'Non affecte'}
                </p>
              </div>
            </div>

            {intervention.description ? (
              <details className='mt-4 rounded-[1.2rem] border border-slate-200 bg-white/60 px-4 py-3'>
                <summary className='cursor-pointer text-sm font-medium text-slate-800'>
                  Details
                </summary>
                <div className='mt-3 space-y-2 text-sm text-slate-700'>
                  <p className='leading-6'>{intervention.description}</p>
                  <p className='text-slate-600'>
                    Validation: {formatValidationDate(intervention.dateValidation)}
                  </p>
                </div>
              </details>
            ) : null}
          </div>

          <div className='flex flex-col gap-3'>
            <div className='rounded-[1.3rem] border border-slate-200 bg-white/70 p-4'>
              <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Affectation</p>
              <div className='mt-3 grid gap-2'>
                <select
                  value={assignmentValue}
                  onChange={(event) =>
                    setAssignmentDrafts((current) => ({
                      ...current,
                      [intervention.id]: event.target.value,
                    }))
                  }
                  className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
                >
                  <option value=''>Sans technicien</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.utilisateur.prenom} {technician.utilisateur.nom}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  disabled={!assignmentChanged}
                  onClick={() => handleAssign(intervention)}
                  className='rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className='rounded-[1.3rem] border border-slate-200 bg-white/70 p-4'>
              <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Priorite</p>
              <div className='mt-3 grid gap-2'>
                <select
                  value={priorityValue}
                  onChange={(event) =>
                    setPriorityDrafts((current) => ({
                      ...current,
                      [intervention.id]: event.target.value as InterventionPriority,
                    }))
                  }
                  className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
                >
                  {(['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'] as InterventionPriority[]).map((priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabels[priority]}
                    </option>
                  ))}
                </select>
                <button
                  type='button'
                  disabled={!priorityChanged}
                  onClick={() => handlePriority(intervention)}
                  className='rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <div className='grid gap-2 sm:grid-cols-2'>
              <button
                type='button'
                disabled={intervention.statut !== 'EN_ATTENTE'}
                onClick={() => handleStatus(intervention, 'EN_COURS')}
                className='rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60'
              >
                Demarrer
              </button>
              <button
                type='button'
                disabled={intervention.statut !== 'EN_COURS'}
                onClick={() => handleStatus(intervention, 'TERMINEE')}
                className='rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60'
              >
                Terminer
              </button>
            </div>

            {intervention.statut === 'TERMINEE' && !intervention.validee ? (
              <button
                type='button'
                onClick={() => handleValidate(intervention)}
                className='rounded-[1rem] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 transition hover:bg-blue-100'
              >
                Valider
              </button>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppDashboardShell
      role='RESPONSABLE'
      workspaceLabel='Suivi des interventions'
      workspaceTitle='Pilotage responsable'
      sectionTabs={tabs}
      sectionTab={tab}
      onSectionTabChange={(value) => setTab(value as typeof tab)}
    >
      <header className='dashboard-hero rounded-[2.4rem] p-6 sm:p-8'>
        <div className='grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
          <div className='max-w-3xl'>
            <div className='inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs uppercase tracking-[0.24em] text-blue-700'>
              <ShieldCheck className='h-4 w-4' />
              Responsable
            </div>
            <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl'>
              Tableau de bord
            </h1>

            <div className='mt-6 grid gap-4 md:grid-cols-2'>
              <div className='dashboard-card-soft rounded-[1.5rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Rythme du jour</p>
                <p className='mt-3 text-2xl font-semibold text-slate-950'>
                  {stats.enCours} mission(s) actives
                </p>
              </div>
              <div className='dashboard-card-soft rounded-[1.5rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Point de tension</p>
                <p className='mt-3 text-2xl font-semibold text-slate-950'>
                  {stats.urgentes} ticket(s) urgents
                </p>
              </div>
            </div>
          </div>

          <div className='grid gap-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <article className='dashboard-kpi rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Interventions</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.total}</p>
              </article>
              <article className='dashboard-kpi rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>En cours</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.enCours}</p>
              </article>
              <article className='dashboard-kpi rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Urgentes</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.urgentes}</p>
              </article>
              <article className='dashboard-kpi rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Sans tech</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.sansTechnicien}</p>
              </article>
              <article className='dashboard-kpi rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Alertes</p>
                <p className='mt-3 text-3xl font-semibold text-slate-950'>{stats.unread}</p>
              </article>
            </div>

            <article className='dashboard-graph rounded-[1.8rem] p-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>
                    Signal operationnel
                  </p>
                  <p className='mt-2 text-lg font-semibold text-slate-950'>Flux d interventions</p>
                </div>
                <div className='dashboard-avatar-stack'>
                  <span className='bg-sky-500'>JD</span>
                  <span className='bg-emerald-500'>SA</span>
                  <span className='bg-fuchsia-500'>MA</span>
                </div>
              </div>
              <div className='relative mt-6 h-40 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(236,254,255,0.6))]'>
                <span className='dashboard-orbit left-[-3rem] top-[-2rem] h-32 w-32' />
                <span className='dashboard-orbit right-[-2rem] top-8 h-24 w-24' />
                <div className='dashboard-graph-line' />
              </div>
            </article>
          </div>
        </div>
      </header>

      <div className='mt-6 xl:hidden'>
        <DashboardTabs value={tab} onChange={(value) => setTab(value as typeof tab)} tabs={tabs} />
      </div>

      <section hidden={tab !== 'CREATION'} className='mt-6'>
        <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
          <div className='flex items-center gap-3 text-blue-700'>
            <ClipboardList className='h-5 w-5' />
            <p className='text-xs uppercase tracking-[0.24em]'>Creation</p>
          </div>

          <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-slate-950'>
            Nouvelle intervention
          </h2>

          <form className='mt-6 grid gap-4' onSubmit={handleCreate}>
            <input
              value={form.titre}
              onChange={(event) =>
                setForm((current) => ({ ...current, titre: event.target.value }))
              }
              placeholder='Titre de l intervention'
              className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm'
            />
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              placeholder='Description de la demande, contexte technique, acces...'
              rows={4}
              className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm'
            />
            <textarea
              value={form.adresse}
              onChange={(event) =>
                setForm((current) => ({ ...current, adresse: event.target.value }))
              }
              placeholder='Adresse de l intervention'
              rows={3}
              className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm'
            />
            <div className='grid gap-4 sm:grid-cols-2'>
              <select
                value={String(form.clientId ?? '')}
                onChange={(event) =>
                  setForm((current) => ({ ...current, clientId: event.target.value }))
                }
                className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm'
              >
                <option value=''>Choisir un client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.prenom} {client.nom}
                  </option>
                ))}
              </select>
              <select
                value={String(form.technicienId ?? '')}
                onChange={(event) =>
                  setForm((current) => ({ ...current, technicienId: event.target.value }))
                }
                className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm'
              >
                <option value=''>Affecter plus tard</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.utilisateur.prenom} {technician.utilisateur.nom}
                  </option>
                ))}
              </select>
            </div>
            <div className='grid gap-4 sm:grid-cols-2'>
              <select
                value={form.priorite ?? 'NORMALE'}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priorite: event.target.value as InterventionPriority,
                  }))
                }
                className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm'
              >
                {(['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'] as InterventionPriority[]).map(
                  (priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabels[priority]}
                    </option>
                  )
                )}
              </select>
              <input
                type='datetime-local'
                value={form.datePlanifiee ?? ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, datePlanifiee: event.target.value }))
                }
                className='dashboard-input rounded-[1.3rem] px-4 py-3 text-sm'
              />
            </div>

            <button
              type='submit'
              disabled={submitting}
              className='rounded-[1.2rem] border-0 bg-[linear-gradient(135deg,#cce0ff_0%,#60a5fa_56%,#f4be7e_100%)] px-4 py-3 text-sm font-medium text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60'
            >
              {submitting ? 'Creation...' : 'Creer l intervention'}
            </button>
          </form>
        </article>
      </section>

      <section hidden={tab !== 'INTERVENTIONS'} className='mt-6'>
        <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex items-center gap-3 text-blue-700'>
              <UsersRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Interventions</p>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <div className='flex items-center gap-2 rounded-[1.1rem] border border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-700'>
                <Search className='h-4 w-4 text-slate-500' />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder='Rechercher...'
                  className='w-56 bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400'
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className='dashboard-input h-11 rounded-[1.1rem] px-4 text-sm'
              >
                <option value='ALL'>Tous statuts</option>
                {(['EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE'] as InterventionStatus[]).map(
                  (status) => (
                    <option key={status} value={status}>
                      {statusLabels[status]}
                    </option>
                  )
                )}
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)}
                className='dashboard-input h-11 rounded-[1.1rem] px-4 text-sm'
              >
                <option value='ALL'>Toutes priorites</option>
                {(['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'] as InterventionPriority[]).map(
                  (priority) => (
                    <option key={priority} value={priority}>
                      {priorityLabels[priority]}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className='mt-6 grid gap-4'>
            {loading ? (
              <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-700'>
                Chargement...
              </div>
            ) : filteredInterventions.length === 0 ? (
              <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-700'>
                Aucune intervention.
              </div>
            ) : statusFilter === 'ALL' ? (
              (['EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE'] as InterventionStatus[]).map((status) => {
                const items = filteredInterventions.filter((item) => item.statut === status)
                if (items.length === 0) return null

                return (
                  <section key={status} className='space-y-3'>
                    <div className='flex items-center justify-between'>
                      <p className='text-sm font-semibold text-slate-900'>{statusLabels[status]}</p>
                      <span className='rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-600'>
                        {items.length}
                      </span>
                    </div>
                    <div className='grid gap-4'>
                      {items.map((intervention) => renderInterventionCard(intervention))}
                    </div>
                  </section>
                )
              })
            ) : (
              <div className='grid gap-4'>
                {filteredInterventions.map((intervention) => renderInterventionCard(intervention))}
              </div>
            )}
          </div>
        </article>
      </section>

      <section hidden={tab !== 'APERCU'} className='mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr]'>
        <article className='dashboard-panel rounded-[1.8rem] p-6'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <p className='text-xs uppercase tracking-[0.24em] text-blue-700'>Carte des zones</p>
              <p className='mt-2 text-2xl font-semibold text-slate-950'>Vision terrain</p>
            </div>
            <div className='dashboard-avatar-stack'>
              <span className='bg-sky-500'>N1</span>
              <span className='bg-emerald-500'>N2</span>
              <span className='bg-orange-500'>N3</span>
            </div>
          </div>
          <div className='relative mt-6 h-64 overflow-hidden rounded-[1.7rem] border border-white/8 bg-[radial-gradient(circle_at_50%_50%,rgba(28,72,95,0.45),rgba(6,11,17,0.95))]'>
            <span className='dashboard-orbit left-[8%] top-[12%] h-20 w-20' />
            <span className='dashboard-orbit left-[40%] top-[30%] h-36 w-36' />
            <span className='dashboard-orbit right-[10%] bottom-[8%] h-24 w-24' />
            <div className='absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,rgba(90,177,255,0.08)_45%,transparent_80%)]' />
            <div className='absolute left-[14%] top-[55%] h-4 w-4 rounded-full bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.85)]' />
            <div className='absolute left-[42%] top-[38%] h-4 w-4 rounded-full bg-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.85)]' />
            <div className='absolute right-[18%] top-[24%] h-4 w-4 rounded-full bg-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.85)]' />
            <div className='absolute bottom-[22%] right-[26%] h-4 w-4 rounded-full bg-amber-300 shadow-[0_0_20px_rgba(252,211,77,0.85)]' />
            <div className='absolute left-[15%] top-[57%] h-px w-[30%] rotate-[18deg] bg-[linear-gradient(90deg,rgba(52,211,153,0.9),rgba(59,130,246,0.1))]' />
            <div className='absolute left-[42%] top-[40%] h-px w-[24%] rotate-[-22deg] bg-[linear-gradient(90deg,rgba(56,189,248,0.9),rgba(251,113,133,0.18))]' />
            <div className='absolute right-[18%] top-[25%] h-px w-[14%] rotate-[58deg] bg-[linear-gradient(90deg,rgba(251,113,133,0.9),rgba(253,224,71,0.14))]' />
          </div>
        </article>

        <article className='dashboard-panel rounded-[1.8rem] p-6'>
          <div className='flex items-center gap-3 text-blue-700'>
            <Wrench className='h-5 w-5' />
            <p className='text-xs uppercase tracking-[0.24em]'>Equipe terrain</p>
          </div>
          <p className='mt-5 text-sm leading-6 text-slate-600'>
            {technicians.length} technicien(s) disponibles.
          </p>
        </article>

        <article className='dashboard-panel rounded-[1.8rem] p-6'>
          <div className='flex items-center gap-3 text-blue-700'>
            <BellRing className='h-5 w-5' />
            <p className='text-xs uppercase tracking-[0.24em]'>Alertes</p>
          </div>
          <div className='mt-5 space-y-3'>
            <div className='dashboard-card-soft rounded-[1.2rem] p-4 text-sm text-slate-600'>
              {stats.unread} notification(s) en attente de lecture
            </div>
            <div className='dashboard-card-soft rounded-[1.2rem] p-4 text-sm text-slate-600'>
              {stats.enCours} intervention(s) actives a suivre
            </div>
          </div>
        </article>
      </section>

      <section hidden={tab !== 'NOTIFICATIONS'} className='mt-6'>
        <NotificationsPanel
          notifications={notifications}
          loading={loading}
          accentClassName='bg-blue-100 text-blue-800'
          onMarkAsRead={handleMarkNotificationAsRead}
        />
      </section>
    </AppDashboardShell>
  )
}
