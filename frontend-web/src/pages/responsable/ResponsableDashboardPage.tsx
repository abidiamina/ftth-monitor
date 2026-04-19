import { useEffect, useMemo, useState } from 'react'
import { Bell, BellRing, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, LogOut, MapPin, MapPinned, Menu, QrCode, Search, ShieldCheck, Star, User, UsersRound, Wrench, X } from 'lucide-react'
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
import { normalizePhotoData, parseSignatureToPath } from '@/lib/interventionUtils'
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
  const [form, setForm] = useState<CreateInterventionRequest>({
    titre: '',
    description: '',
    adresse: '',
    priorite: 'NORMALE',
    datePlanifiee: '',
    clientId: '',
    technicienId: '',
  })
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
      toast.error(getErrorMessage(error, 'Impossible de charger le pilotage.'))
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
      { id: 'APERCU', label: 'Aperçu', icon: ShieldCheck },
      { id: 'CREATION', label: 'Nouvelle', icon: ClipboardList },
      { id: 'INTERVENTIONS', label: 'Missions', icon: UsersRound },
      { id: 'NOTIFICATIONS', label: 'Inbox', icon: BellRing, badge: stats.unread || undefined },
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
      toast.error(getErrorMessage(error, 'Notification impossible à marquer comme lue.'))
    }
  }

  const filteredInterventions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    
    // Poids des priorités pour le tri
    const priorityWeight: Record<InterventionPriority, number> = {
      URGENTE: 4,
      HAUTE: 3,
      NORMALE: 2,
      BASSE: 1,
    }

    return interventions
      .filter((item) => {
        const matchesStatus = statusFilter === 'ALL' || item.statut === statusFilter
        const matchesPriority = priorityFilter === 'ALL' || item.priorite === priorityFilter
        const matchesQuery =
          !normalizedQuery ||
          `${item.titre} ${item.description ?? ''} ${item.adresse} ${item.client?.prenom ?? ''} ${item.client?.nom ?? ''}`
            .toLowerCase()
            .includes(normalizedQuery)

        return matchesStatus && matchesPriority && matchesQuery
      })
      .sort((a, b) => {
        // 1. Trier par poids de priorité (descendant)
        const weightA = priorityWeight[a.priorite] || 0
        const weightB = priorityWeight[b.priorite] || 0
        
        if (weightA !== weightB) {
          return weightB - weightA
        }
        
        // 2. Si même priorité, trier par date de création (décroissant)
        return new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime()
      })
  }, [interventions, priorityFilter, query, statusFilter])

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    try {
      const response = await createIntervention(form)
      toast.success('Intervention créée !')
      setInterventions((current) => [response.data, ...current])
      setForm({
        titre: '',
        description: '',
        adresse: '',
        priorite: 'NORMALE',
        datePlanifiee: '',
        clientId: '',
        technicienId: '',
      })
      setTab('INTERVENTIONS')
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Échec de la création.'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleAssign = async (intervention: InterventionRecord) => {
    try {
      const response = await updateIntervention(intervention.id, {
        technicienId: assignmentDrafts[intervention.id] || null,
      })
      toast.success('Affectation enregistrée.')
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
      toast.success('Priorité mise à jour.')
      setInterventions((current) =>
        current.map((item) => (item.id === intervention.id ? response.data : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise à jour impossible.'))
    }
  }

  const handleUpdateStatus = async (intervention: InterventionRecord, statut: InterventionStatus) => {
    try {
      const response = await updateIntervention(intervention.id, { statut })
      toast.success(`Statut mis à jour : ${statusLabels[statut]}`)
      setInterventions((current) =>
        current.map((item) => (item.id === intervention.id ? response.data : item))
      )
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Mise à jour impossible.'))
    }
  }

  const renderInterventionCard = (intervention: InterventionRecord) => {
    const assignmentInitial = intervention.technicienId ? String(intervention.technicienId) : ''
    const assignmentValue = assignmentDrafts[intervention.id] ?? ''
    const assignmentChanged = assignmentValue !== assignmentInitial
    const priorityValue = priorityDrafts[intervention.id] ?? intervention.priorite
    const priorityChanged = priorityValue !== intervention.priorite

    return (
      <div key={intervention.id} className='dashboard-card group animate-in fade-in slide-in-from-bottom-4 duration-500'>
        <div className='flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between'>
          <div className='flex-1 min-w-0'>
            <div className='flex flex-wrap items-center gap-2 mb-4'>
              <h3 className='text-xl font-extrabold text-slate-950 truncate tracking-tight'>{intervention.titre}</h3>
              <span className={`badge-status ${
                intervention.statut === 'EN_ATTENTE' ? 'badge-pending' : 
                intervention.statut === 'EN_COURS' ? 'badge-working' : 
                'badge-done'
              }`}>
                {statusLabels[intervention.statut]}
              </span>
              <span className='px-3 py-1 rounded-full bg-slate-100/50 border border-slate-200/50 text-[10px] font-black text-slate-500 uppercase tracking-widest'>
                {priorityLabels[intervention.priorite]}
              </span>
              {intervention.statut === 'TERMINEE' && (
                 <span className={`badge-status ${intervention.validee ? 'badge-done' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  {intervention.validee ? 'Validée' : 'À valider'}
                </span>
              )}
            </div>

            <div className='grid gap-6 sm:grid-cols-2'>
              <div className='flex items-center gap-4'>
                <div className='p-3 bg-slate-50 rounded-2xl border border-slate-100/50 text-emerald-500'>
                  <MapPin className='h-4.5 w-4.5' />
                </div>
                <div className='min-w-0'>
                  <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5'>Localisation</p>
                  <p className='text-sm font-bold text-slate-900 truncate'>{intervention.adresse}</p>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <div className='p-3 bg-slate-50 rounded-2xl border border-slate-100/50 text-sky-500'>
                  <UsersRound className='h-4.5 w-4.5' />
                </div>
                <div className='min-w-0'>
                  <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5'>Client</p>
                  <p className='text-sm font-bold text-slate-900 truncate'>{intervention.client.prenom} {intervention.client.nom}</p>
                </div>
              </div>
            </div>

            <details className='mt-6 rounded-3xl border border-slate-200/50 bg-slate-50/30 p-5 group/details'>
              <summary className='cursor-pointer text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-colors'>
                Rapport Terrain détaillé
              </summary>
              <div className='mt-5 space-y-6'>
                {intervention.description && (
                  <div className="bg-white p-4 rounded-2xl border border-slate-100">
                    <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2'>Description</p>
                    <p className='text-slate-700 text-sm leading-relaxed'>{intervention.description}</p>
                  </div>
                )}
                <div className='grid gap-3 sm:grid-cols-2'>
                  {intervention.gpsConfirmedAt && (
                    <div className='flex items-center gap-3 p-3 rounded-2xl bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-100'>
                      <CheckCircle2 className='h-4 w-4' />
                      Position GPS validée
                    </div>
                  )}
                  {intervention.qrVerifiedAt && (
                    <div className='flex items-center gap-3 p-3 rounded-2xl bg-sky-50 text-sky-700 font-bold text-xs border border-sky-100'>
                      <QrCode className='h-4 w-4' />
                      Équipement vérifié
                    </div>
                  )}
                </div>
                {intervention.evidences.length > 0 && (
                  <div>
                    <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3'>Preuves Photos</p>
                    <div className='flex flex-wrap gap-2'>
                      {intervention.evidences.map((ev) => (
                        <img 
                          key={ev.id} 
                          src={normalizePhotoData(ev.photoData)} 
                          className='h-16 w-16 rounded-xl object-cover border border-white shadow-sm hover:scale-110 transition-transform cursor-pointer' 
                          alt="Evidence" 
                          onClick={() => window.open(normalizePhotoData(ev.photoData), '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {intervention.statut === 'TERMINEE' && (
                  <div className='grid gap-6 pt-6 border-t border-slate-100'>
                    {intervention.clientSignature && (
                      <div className='space-y-3'>
                        <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Signature Client</p>
                        <div className='bg-white rounded-2xl border border-slate-100 p-2 w-fit group-hover:border-sky-100 transition-colors shadow-sm'>
                          <svg width="160" height="80" viewBox="0 0 160 80" className="opacity-80">
                            <path 
                              d={parseSignatureToPath(intervention.clientSignature)} 
                              fill="none" 
                              stroke="#0f172a" 
                              strokeWidth="3" 
                              strokeLinecap="round" 
                              strokeLinejoin="round" 
                            />
                          </svg>
                          <div className='mt-2 pt-2 border-t border-slate-50 text-center'>
                             <p className='text-[9px] font-bold text-slate-400 italic'>Signé par: {intervention.clientSignatureBy || 'Client'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {(intervention.clientFeedbackRating !== null || intervention.clientFeedbackComment) && (
                      <div className='space-y-3'>
                        <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Évaluation & Note</p>
                        <div className='bg-white rounded-2xl border border-slate-100 p-5 shadow-sm'>
                          {intervention.clientFeedbackRating !== null && (
                            <div className='flex items-center gap-1 mb-3'>
                              {[...Array(5)].map((_, i) => (
                                <Star 
                                  key={i} 
                                  className={`h-4 w-4 ${i < (intervention.clientFeedbackRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                                />
                              ))}
                            </div>
                          )}
                          {intervention.clientFeedbackComment && (
                            <p className='text-sm font-medium text-slate-700 leading-relaxed italic border-l-2 border-slate-100 pl-4'>
                              "{intervention.clientFeedbackComment}"
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </details>
          </div>

          <div className='flex flex-col gap-3 min-w-[240px]'>
            <div className='p-4 rounded-2xl bg-white border border-slate-100/50 shadow-sm'>
              <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3'>Assignation Technicien</p>
              <div className='flex flex-col gap-2'>
                <select
                  value={assignmentValue}
                  onChange={(e) => setAssignmentDrafts(c => ({...c, [intervention.id]: e.target.value}))}
                  className='w-full bg-slate-50 rounded-xl px-3 py-2 text-xs font-bold border-none'
                >
                  <option value=''>Non assigné</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.utilisateur.prenom}</option>)}
                </select>
                <button
                  onClick={() => handleAssign(intervention)}
                  disabled={!assignmentChanged}
                  className='w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30'
                >
                  Save
                </button>
              </div>
            </div>
            
            <div className='grid grid-cols-2 gap-2'>
              <button
                disabled={intervention.statut !== 'EN_ATTENTE'}
                onClick={() => handleUpdateStatus(intervention, 'EN_COURS')}
                className='py-2.5 bg-sky-50 text-sky-600 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-sky-100'
              >
                Start
              </button>
              <button
                disabled={intervention.statut !== 'EN_COURS'}
                onClick={() => handleUpdateStatus(intervention, 'TERMINEE')}
                className='py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 border border-emerald-100'
              >
                Finish
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <AppDashboardShell
      role='RESPONSABLE'
      workspaceLabel='FTTH Global'
      workspaceTitle='Network Operation Center'
      sectionTabs={tabs}
      sectionTab={tab}
      onSectionTabChange={(v) => setTab(v as any)}
    >
      <header className='hero-gradient p-8 mb-10'>
        <div className='grid gap-10 xl:grid-cols-[1.2fr_0.8fr]'>
          <div className='flex flex-col justify-center'>
            <div className='inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-sky-700'>
              <ShieldCheck className='h-4 w-4' />
              Pilotage Responsable
            </div>
            <h1 className='mt-8 text-5xl font-black tracking-tight text-slate-950 sm:text-7xl leading-[1.05]'>
              Opérations <span className="text-sky-500 italic">Live.</span>
            </h1>
            <p className="mt-6 text-slate-500 font-medium max-w-lg leading-relaxed text-lg">
              Surveillance proactive du réseau et gestion agile des interventions terrain.
            </p>

            <div className='mt-10 grid gap-4 sm:grid-cols-2'>
              <div className='stat-pill'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-sky-600'>Activité</p>
                <p className='mt-2 text-3xl font-black text-slate-950'>{stats.enCours} <span className="text-lg font-bold text-slate-400">en cours</span></p>
              </div>
              <div className='stat-pill'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-rose-500'>Alerte</p>
                <p className='mt-2 text-3xl font-black text-slate-950'>{stats.urgentes} <span className="text-lg font-bold text-slate-400">urgents</span></p>
              </div>
            </div>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-white/40 border-white shadow-sm flex flex-col justify-between h-40'>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Total Missions</p>
              <p className='text-5xl font-black text-slate-950'>{stats.total}</p>
            </article>
            <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-white/40 border-white shadow-sm flex flex-col justify-between h-40'>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Sans Technicien</p>
              <p className='text-5xl font-black text-amber-500'>{stats.sansTechnicien}</p>
            </article>
            <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-white/40 border-white shadow-sm flex flex-col justify-between h-40'>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Statut Réseau</p>
              <p className='text-3xl font-black text-emerald-500 uppercase tracking-tighter'>Optimal</p>
            </article>
            <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-slate-950 border-slate-900 shadow-xl flex flex-col justify-between h-40'>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/40'>Inbox</p>
              <p className='text-5xl font-black text-white'>{stats.unread}</p>
            </article>
          </div>
        </div>
      </header>

      <div className='mt-6 xl:hidden'>
        <DashboardTabs value={tab} onChange={(v) => setTab(v as any)} tabs={tabs} />
      </div>

      <div className="mt-10">
        {loading ? (
          <div className="text-center py-20 animate-pulse text-slate-400 font-black uppercase tracking-widest text-sm">Synchronisation...</div>
        ) : tab === 'INTERVENTIONS' ? (
          <div className='grid gap-6'>
            <div className='flex flex-wrap items-center justify-between gap-4 mb-4'>
               <h2 className='text-2xl font-black text-slate-950 tracking-tight'>Flux de travail</h2>
               <div className='flex items-center gap-3 bg-white/50 p-2 rounded-2xl border border-white'>
                 <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className='bg-transparent border-none text-xs font-black uppercase tracking-widest text-slate-500'>
                   <option value='ALL'>Tous Statuts</option>
                   <option value='EN_ATTENTE'>En attente</option>
                   <option value='EN_COURS'>En cours</option>
                   <option value='TERMINEE'>Terminée</option>
                 </select>
               </div>
            </div>
            {filteredInterventions.map(i => renderInterventionCard(i))}
          </div>
        ) : tab === 'CREATION' ? (
          <div className='max-w-2xl mx-auto'>
            <div className='dashboard-card p-10'>
              <h2 className='text-3xl font-black text-slate-950 mb-8'>Nouvelle Mission</h2>
              <form className='space-y-4' onSubmit={handleCreate}>
                <input placeholder="Titre" className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={form.titre} onChange={e => setForm(c => ({...c, titre: e.target.value}))} />
                <textarea placeholder="Description" rows={3} className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={form.description} onChange={e => setForm(c => ({...c, description: e.target.value}))} />
                <textarea placeholder="Adresse" rows={2} className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" value={form.adresse} onChange={e => setForm(c => ({...c, adresse: e.target.value}))} />
                <div className='grid grid-cols-2 gap-4'>
                  <select value={form.clientId} onChange={e => setForm(c => ({...c, clientId: e.target.value}))} className='bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold'>
                    <option value="">Client</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.prenom} {c.nom}</option>)}
                  </select>
                  <select value={form.priorite} onChange={e => setForm(c => ({...c, priorite: e.target.value as any}))} className='bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold'>
                    <option value="BASSE">Basse</option>
                    <option value="NORMALE">Normale</option>
                    <option value="HAUTE">Haute</option>
                    <option value="URGENTE">Urgente</option>
                  </select>
                </div>
                <button type='submit' className='btn-premium w-full mt-6 py-5 text-lg uppercase tracking-[.3em]'>Lancer la mission</button>
              </form>
            </div>
          </div>
        ) : tab === 'NOTIFICATIONS' ? (
           <NotificationsPanel notifications={notifications} loading={loading} onMarkAsRead={handleMarkNotificationAsRead} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="dashboard-card overflow-hidden !p-0">
               <div className="bg-slate-950 p-6 text-white">
                  <h3 className="text-xl font-black">Performance Réseau</h3>
               </div>
               <div className="p-8 h-80 flex items-center justify-center bg-slate-50">
                  <MapPinned className="h-20 w-20 text-slate-200 animate-float" />
               </div>
            </div>
            <div className="space-y-6">
              <div className="dashboard-card">
                 <h3 className="text-lg font-black mb-4">Techniciens Actifs</h3>
                 <div className="flex -space-x-3">
                    {technicians.slice(0, 5).map((t, idx) => (
                       <div key={idx} className="h-12 w-12 rounded-full border-4 border-white bg-slate-950 flex items-center justify-center text-white text-xs font-black">
                          {t.utilisateur?.prenom?.[0] ?? '?'}
                       </div>
                    ))}
                    <div className="h-12 w-12 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-black">
                       +{technicians.length - 5}
                    </div>
                 </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppDashboardShell>
  )
}
