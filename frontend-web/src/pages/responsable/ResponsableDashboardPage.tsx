import { useEffect, useMemo, useState } from 'react'
import { BellRing, ClipboardList, ShieldCheck, UsersRound, Wrench } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { listTechnicians } from '@/services/authApi'
import {
  createIntervention,
  listClients,
  listInterventions,
  updateIntervention,
} from '@/services/interventionApi'
import type {
  ClientRecord,
  CreateInterventionRequest,
  InterventionPriority,
  InterventionRecord,
  InterventionStatus,
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
  EN_ATTENTE: 'border-amber-300/15 bg-amber-300/8 text-amber-100',
  EN_COURS: 'border-sky-300/15 bg-sky-300/8 text-sky-100',
  TERMINEE: 'border-emerald-300/15 bg-emerald-300/8 text-emerald-100',
  ANNULEE: 'border-rose-300/15 bg-rose-300/8 text-rose-100',
}

const priorityBadgeClasses: Record<InterventionPriority, string> = {
  BASSE: 'border-slate-300/15 bg-slate-300/8 text-slate-100',
  NORMALE: 'border-blue-300/15 bg-blue-300/8 text-blue-100',
  HAUTE: 'border-orange-300/15 bg-orange-300/8 text-orange-100',
  URGENTE: 'border-rose-300/15 bg-rose-300/8 text-rose-100',
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
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | InterventionStatus>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | InterventionPriority>('ALL')
  const [form, setForm] = useState<CreateInterventionRequest>(emptyForm)
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<number, string>>({})
  const [priorityDrafts, setPriorityDrafts] = useState<Record<number, InterventionPriority>>({})

  const loadDashboard = async () => {
    setLoading(true)
    try {
      const [techniciansData, clientsData, interventionsData] = await Promise.all([
        listTechnicians(),
        listClients(),
        listInterventions(),
      ])

      setTechnicians(techniciansData)
      setClients(clientsData)
      setInterventions(interventionsData)
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

    return { total, enCours, urgentes, sansTechnicien }
  }, [interventions])

  const filteredInterventions = useMemo(() => {
    return interventions.filter((item) => {
      const matchesStatus = statusFilter === 'ALL' || item.statut === statusFilter
      const matchesPriority = priorityFilter === 'ALL' || item.priorite === priorityFilter
      return matchesStatus && matchesPriority
    })
  }, [interventions, priorityFilter, statusFilter])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
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

  return (
    <AppDashboardShell
      role='RESPONSABLE'
      workspaceLabel='Suivi des interventions'
      workspaceTitle='Pilotage responsable'
    >
      <header className='dashboard-hero rounded-[2.4rem] p-6 sm:p-8'>
        <div className='grid gap-6 xl:grid-cols-[1.2fr_0.8fr]'>
          <div className='max-w-3xl'>
            <div className='inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-300/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-blue-100'>
              <ShieldCheck className='h-4 w-4' />
              Operations board responsable
            </div>
            <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
              Pilotage des interventions terrain
            </h1>
            <p className='mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base'>
              Cette vue couvre la creation d intervention, l affectation technicien, la
              priorisation, la consultation et la validation depuis un seul cockpit responsable.
            </p>

            <div className='mt-6 grid gap-4 md:grid-cols-2'>
              <div className='dashboard-card-soft rounded-[1.5rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Rythme du jour</p>
                <p className='mt-3 text-2xl font-semibold text-white'>
                  {stats.enCours} mission(s) actives
                </p>
                <p className='mt-2 text-sm text-slate-400'>
                  Vue rapide sur le volume en cours pour piloter la charge terrain.
                </p>
              </div>
              <div className='dashboard-card-soft rounded-[1.5rem] p-5'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Point de tension</p>
                <p className='mt-3 text-2xl font-semibold text-white'>
                  {stats.urgentes} ticket(s) urgents
                </p>
                <p className='mt-2 text-sm text-slate-400'>
                  Les tickets non affectes restent visibles pour une reaction immediate.
                </p>
              </div>
            </div>
          </div>

          <div className='grid gap-4'>
            <div className='grid gap-3 sm:grid-cols-2'>
              <article className='dashboard-kpi rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Interventions</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.total}</p>
              </article>
              <article className='dashboard-kpi rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>En cours</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.enCours}</p>
              </article>
              <article className='dashboard-kpi rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Urgentes</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.urgentes}</p>
              </article>
              <article className='dashboard-kpi rounded-[1.6rem] p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Sans tech</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.sansTechnicien}</p>
              </article>
            </div>

            <article className='dashboard-graph rounded-[1.8rem] p-5'>
              <div className='flex items-start justify-between gap-4'>
                <div>
                  <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>
                    Signal operationnel
                  </p>
                  <p className='mt-2 text-lg font-semibold text-white'>Flux d interventions</p>
                </div>
                <div className='dashboard-avatar-stack'>
                  <span className='bg-sky-500'>JD</span>
                  <span className='bg-emerald-500'>SA</span>
                  <span className='bg-fuchsia-500'>MA</span>
                </div>
              </div>
              <div className='relative mt-6 h-40 overflow-hidden rounded-[1.5rem] border border-white/6 bg-[rgba(7,14,20,0.5)]'>
                <span className='dashboard-orbit left-[-3rem] top-[-2rem] h-32 w-32' />
                <span className='dashboard-orbit right-[-2rem] top-8 h-24 w-24' />
                <div className='dashboard-graph-line' />
              </div>
            </article>
          </div>
        </div>
      </header>

      <section className='mt-6 grid gap-6 xl:grid-cols-[0.82fr_1.18fr]'>
        <article className='dashboard-panel dashboard-panel-accent rounded-[2rem] p-6 sm:p-8'>
          <div className='flex items-center gap-3 text-blue-200'>
            <ClipboardList className='h-5 w-5' />
            <p className='text-xs uppercase tracking-[0.24em]'>US-14 Creer une intervention</p>
          </div>

          <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
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

        <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
          <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
            <div className='flex items-center gap-3 text-blue-200'>
              <UsersRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>US-15 16 17 18 Pilotage live</p>
            </div>

            <div className='flex flex-wrap gap-2'>
              {(['ALL', 'EN_ATTENTE', 'EN_COURS', 'TERMINEE', 'ANNULEE'] as const).map(
                (status) => (
                  <button
                    key={status}
                    type='button'
                    onClick={() => setStatusFilter(status)}
                    className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] transition ${
                      statusFilter === status
                        ? 'border-blue-300/30 bg-blue-300/12 text-blue-200'
                        : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    {status === 'ALL' ? 'Tous statuts' : statusLabels[status]}
                  </button>
                )
              )}
              {(['ALL', 'NORMALE', 'HAUTE', 'URGENTE'] as const).map((priority) => (
                <button
                  key={priority}
                  type='button'
                  onClick={() => setPriorityFilter(priority)}
                  className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] transition ${
                    priorityFilter === priority
                      ? 'border-orange-300/30 bg-orange-300/12 text-orange-200'
                      : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {priority === 'ALL' ? 'Toutes priorites' : priorityLabels[priority]}
                </button>
              ))}
            </div>
          </div>

          <div className='mt-6 space-y-4'>
            {loading ? (
              <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>
                Chargement des interventions...
              </div>
            ) : filteredInterventions.length === 0 ? (
              <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>
                Aucune intervention ne correspond a ces filtres.
              </div>
            ) : (
              filteredInterventions.map((intervention) => (
                <div key={intervention.id} className='dashboard-card rounded-[1.5rem] p-5'>
                  <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
                    <div className='max-w-3xl'>
                      <div className='flex flex-wrap items-center gap-3'>
                        <p className='text-base font-semibold text-white'>{intervention.titre}</p>
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
                      </div>
                      <p className='mt-3 text-sm leading-7 text-slate-300'>
                        {intervention.description}
                      </p>
                      <p className='mt-2 text-sm text-slate-400'>{intervention.adresse}</p>
                      <p className='mt-2 text-sm text-slate-400'>
                        Client: {intervention.client.prenom} {intervention.client.nom}
                      </p>
                      <p className='text-sm text-slate-400'>
                        Technicien:{' '}
                        {intervention.technicien
                          ? `${intervention.technicien.utilisateur.prenom} ${intervention.technicien.utilisateur.nom}`
                          : 'Non affecte'}
                      </p>
                      <p className='text-sm text-slate-500'>
                        Planifiee: {formatDate(intervention.datePlanifiee)}
                      </p>
                    </div>

                    <div className='flex w-full max-w-sm flex-col gap-3'>
                      <select
                        value={assignmentDrafts[intervention.id] ?? ''}
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
                        onClick={() => handleAssign(intervention)}
                        className='rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10'
                      >
                        Affecter
                      </button>

                      <select
                        value={priorityDrafts[intervention.id] ?? intervention.priorite}
                        onChange={(event) =>
                          setPriorityDrafts((current) => ({
                            ...current,
                            [intervention.id]: event.target.value as InterventionPriority,
                          }))
                        }
                        className='dashboard-input rounded-[1rem] px-4 py-3 text-sm'
                      >
                        {(['BASSE', 'NORMALE', 'HAUTE', 'URGENTE'] as InterventionPriority[]).map(
                          (priority) => (
                            <option key={priority} value={priority}>
                              {priorityLabels[priority]}
                            </option>
                          )
                        )}
                      </select>
                      <button
                        type='button'
                        onClick={() => handlePriority(intervention)}
                        className='rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10'
                      >
                        Prioriser
                      </button>

                      <div className='grid gap-2 sm:grid-cols-2'>
                        <button
                          type='button'
                          onClick={() => handleStatus(intervention, 'EN_COURS')}
                          className='rounded-[1rem] border border-sky-300/20 bg-sky-300/10 px-4 py-3 text-sm text-sky-100 transition hover:bg-sky-300/15'
                        >
                          Demarrer
                        </button>
                        <button
                          type='button'
                          onClick={() => handleStatus(intervention, 'TERMINEE')}
                          className='rounded-[1rem] border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm text-emerald-100 transition hover:bg-emerald-300/15'
                        >
                          Valider
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </section>

      <section className='mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr_0.8fr]'>
        <article className='dashboard-panel rounded-[1.8rem] p-6'>
          <div className='flex items-center justify-between gap-4'>
            <div>
              <p className='text-xs uppercase tracking-[0.24em] text-blue-200'>Carte des zones</p>
              <p className='mt-2 text-2xl font-semibold text-white'>Vision terrain sprint 2</p>
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
          <div className='flex items-center gap-3 text-blue-200'>
            <Wrench className='h-5 w-5' />
            <p className='text-xs uppercase tracking-[0.24em]'>Equipe terrain</p>
          </div>
          <p className='mt-5 text-sm leading-7 text-slate-300'>
            {technicians.length} technicien(s) disponibles pour les affectations depuis le sprint 2.
          </p>
        </article>

        <article className='dashboard-panel rounded-[1.8rem] p-6'>
          <div className='flex items-center gap-3 text-blue-200'>
            <BellRing className='h-5 w-5' />
            <p className='text-xs uppercase tracking-[0.24em]'>Notifications</p>
          </div>
          <p className='mt-5 text-sm leading-7 text-slate-300'>
            Les notifications backend existent deja. Cette zone reste dans l esprit sprint 2 pour
            rendre visibles les alertes metier et les points d attention terrain.
          </p>
          <div className='mt-5 space-y-3'>
            <div className='dashboard-card-soft rounded-[1.2rem] p-4 text-sm text-slate-300'>
              Nouvelle intervention creee
            </div>
            <div className='dashboard-card-soft rounded-[1.2rem] p-4 text-sm text-slate-300'>
              Affectation technicien mise a jour
            </div>
          </div>
        </article>
      </section>
    </AppDashboardShell>
  )
}
