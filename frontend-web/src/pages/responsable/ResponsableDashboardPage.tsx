import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, BellRing, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, LayoutDashboard, LogOut, MapPin, Menu, QrCode, Search, ShieldCheck, Star, User, UsersRound, Wrench, X, UserCog } from 'lucide-react'
import { toast } from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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
import { MapInterventionsView } from '@/components/dashboard/MapInterventionsView'
import { DashboardMetrics } from '@/components/dashboard/DashboardMetrics'
import { WeatherWidget } from '@/components/dashboard/WeatherWidget'
import { TechnicianAlertsWidget } from '@/components/dashboard/TechnicianAlertsWidget'
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

const isInterventionDelayed = (intervention: InterventionRecord) => {
  if (intervention.statut === 'TERMINEE' || intervention.statut === 'ANNULEE' || !intervention.datePlanifiee) {
    return false
  }
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const planDate = new Date(intervention.datePlanifiee)
  planDate.setHours(0, 0, 0, 0)
  return planDate.getTime() < today.getTime()
}

export const ResponsableDashboardPage = () => {
  const navigate = useNavigate()
  const [technicians, setTechnicians] = useState<TechnicianRecord[]>([])
  const [clients, setClients] = useState<ClientRecord[]>([])
  const [interventions, setInterventions] = useState<InterventionRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tab, setTab] = useState<'APERCU' | 'CREATION' | 'INTERVENTIONS' | 'NOTIFICATIONS' | 'MAP' | 'SUPERVISION' | 'RAPPORTS'>('APERCU')
  const [statusFilter, setStatusFilter] = useState<'ALL' | InterventionStatus>('ALL')
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | InterventionPriority>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'URGENTES' | 'RETARD' | 'RECENTES'>('ALL')
  const [selectedReportDate, setSelectedReportDate] = useState<string>(new Date().toISOString().split('T')[0])
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
      { id: 'SUPERVISION', label: 'Supervision', icon: LayoutDashboard },
      { id: 'RAPPORTS', label: 'Rapports', icon: ClipboardList },
      { id: 'NOTIFICATIONS', label: 'Inbox', icon: BellRing, badge: stats.unread || undefined },
      { id: 'MAP', label: 'Cartographie', icon: MapPin },
      { id: 'PROFIL', label: 'Profil', icon: UserCog },
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
        // Critère 1 : Retard
        const isDelayedA = isInterventionDelayed(a) ? 1 : 0
        const isDelayedB = isInterventionDelayed(b) ? 1 : 0
        if (isDelayedA !== isDelayedB) return isDelayedB - isDelayedA

        // Critère 2 : Urgence
        const isUrgentA = a.priorite === 'URGENTE' && a.statut !== 'TERMINEE' ? 1 : 0
        const isUrgentB = b.priorite === 'URGENTE' && b.statut !== 'TERMINEE' ? 1 : 0
        if (isUrgentA !== isUrgentB) return isUrgentB - isUrgentA

        // Critère 3 : Date de création (décroissant)
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
        latitude: '',
        longitude: '',
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

  const generatePDFReport = () => {
    try {
      const doc = new jsPDF()
      
      const targetDateObj = new Date(selectedReportDate)
      const targetDateStr = targetDateObj.toLocaleDateString('fr-FR')

      // Données du jour sélectionné
      const interventionsDuJour = interventions.filter(i => 
        new Date(i.dateCreation).toLocaleDateString('fr-FR') === targetDateStr ||
        (i.dateFin && new Date(i.dateFin).toLocaleDateString('fr-FR') === targetDateStr)
      )

      const totalJour = interventionsDuJour.length
      const clotureesJour = interventionsDuJour.filter(i => i.statut === 'TERMINEE').length
      const enCoursJour = interventionsDuJour.filter(i => i.statut === 'EN_COURS').length
      const attenteJour = interventionsDuJour.filter(i => i.statut === 'EN_ATTENTE').length
      const urgentesJour = interventionsDuJour.filter(i => i.priorite === 'URGENTE').length
      
      const tauxResolution = totalJour > 0 ? Math.round((clotureesJour / totalJour) * 100) : 0

      // En-tête Principal
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42) // slate-950
      doc.text('FTTH Monitor NOC', 14, 22)
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(14, 165, 233) // sky-500
      doc.text('RAPPORT OPÉRATIONNEL JOURNALIER', 14, 30)
      
      doc.setFontSize(10)
      doc.setTextColor(100, 116, 139) // slate-500
      doc.text(`Édité le : ${new Date().toLocaleString('fr-FR')}`, 14, 36)
      
      // Ligne de séparation
      doc.setDrawColor(226, 232, 240) // slate-200
      doc.setLineWidth(0.5)
      doc.line(14, 42, 196, 42)

      // Section 1: Synthèse Globale
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('1. Synthèse Globale des Activités', 14, 52)
      
      doc.setFontSize(11)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(71, 85, 105) // slate-600
      
      // Colonne 1
      doc.text(`Total interventions : ${totalJour}`, 20, 62)
      doc.text(`Taux de résolution : ${tauxResolution}%`, 20, 69)
      doc.text(`Urgences signalées : ${urgentesJour}`, 20, 76)
      
      // Colonne 2
      doc.text(`Missions clôturées : ${clotureesJour}`, 110, 62)
      doc.text(`Missions en cours : ${enCoursJour}`, 110, 69)
      doc.text(`Missions en attente : ${attenteJour}`, 110, 76)

      // Section 2: Détail des Interventions
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(15, 23, 42)
      doc.text('2. Détail des Interventions du Jour', 14, 92)

      // Préparation des données pour le tableau
      const tableData = interventionsDuJour.map(i => {
        const technicienName = i.technicien?.utilisateur?.prenom ? `${i.technicien.utilisateur.prenom} ${i.technicien.utilisateur.nom}` : 'Non assigné'
        return [
          i.id.toString(),
          i.titre,
          `${i.client?.prenom || ''} ${i.client?.nom || ''}`,
          i.adresse,
          technicienName,
          statusLabels[i.statut] || i.statut,
          priorityLabels[i.priorite] || i.priorite
        ]
      })

      autoTable(doc, {
        startY: 98,
        head: [['ID', 'Mission', 'Client', 'Localisation', 'Technicien', 'Statut', 'Priorité']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [15, 23, 42], // slate-950
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252] // slate-50
        },
        styles: { 
          fontSize: 8,
          cellPadding: 4
        },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 40 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 25 },
          5: { cellWidth: 20 },
          6: { cellWidth: 20 }
        }
      })

      // Footer
      const pageCount = doc.internal.getNumberOfPages()
      for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(148, 163, 184)
        doc.text(`FTTH Monitor - Document généré automatiquement - Page ${i} sur ${pageCount}`, 14, 285)
      }

      doc.save(`Rapport_FTTH_${selectedReportDate}.pdf`)
      toast.success('Rapport détaillé généré avec succès !')
    } catch (error) {
      console.error('PDF Generation Error:', error)
      toast.error('Erreur lors de la génération du rapport PDF.')
    }
  }

  const renderInterventionCard = (intervention: InterventionRecord) => {
    const assignmentInitial = intervention.technicienId ? String(intervention.technicienId) : ''
    const assignmentValue = assignmentDrafts[intervention.id] ?? ''
    const assignmentChanged = assignmentValue !== assignmentInitial
    const priorityValue = priorityDrafts[intervention.id] ?? intervention.priorite
    const priorityChanged = priorityValue !== intervention.priorite

    const isUrgent = intervention.priorite === 'URGENTE'
    const isDelayed = isInterventionDelayed(intervention)

    return (
      <div key={intervention.id} className={`dashboard-card group animate-in fade-in slide-in-from-bottom-4 duration-500 ${isUrgent ? '!border-2 !border-rose-500 !bg-rose-50 shadow-[0_0_15px_rgba(244,63,94,0.3)] relative overflow-hidden' : ''}`}>
        {isUrgent && (
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500 animate-pulse" />
        )}
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
              {isDelayed && (
                <span className='px-3 py-1 rounded-full bg-rose-100/80 border border-rose-200/50 text-[10px] font-black text-rose-600 uppercase tracking-widest shadow-sm animate-pulse flex items-center gap-1'>
                  En Retard
                </span>
              )}
              {intervention.statut === 'TERMINEE' && (
                 <span className={`badge-status ${intervention.validee ? 'badge-done' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                  {intervention.validee ? 'Validée' : 'À valider'}
                </span>
              )}
              <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
                {intervention.datePlanifiee && (
                  <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-sm ${isDelayed ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-white/50 border-slate-100 text-slate-500'}`}>
                    Prévue le : {formatDate(intervention.datePlanifiee)}
                  </span>
                )}
                <span className='text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/50 px-3 py-1 rounded-full border border-slate-100 shadow-sm'>
                  Ajoutée le : {formatDate(intervention.dateCreation)}
                </span>
              </div>
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
                          {intervention.clientSignature.startsWith('DRAWN_SIGNATURE:') ? (
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
                          ) : (
                            <img src={intervention.clientSignature} alt="Signature" className="max-w-[160px] max-h-[80px] h-auto object-contain opacity-80" />
                          )}
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

            <div className='p-4 rounded-2xl bg-white border border-slate-100/50 shadow-sm'>
              <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3'>Priorité</p>
              <div className='flex flex-col gap-2'>
                <select
                  value={priorityValue}
                  onChange={(e) => setPriorityDrafts(c => ({...c, [intervention.id]: e.target.value as InterventionPriority}))}
                  className='w-full bg-slate-50 rounded-xl px-3 py-2 text-xs font-bold border-none'
                >
                  <option value='BASSE'>Basse</option>
                  <option value='NORMALE'>Normale</option>
                  <option value='HAUTE'>Haute</option>
                  <option value='URGENTE'>Urgente</option>
                </select>
                <button
                  onClick={() => handlePriority(intervention)}
                  disabled={!priorityChanged}
                  className='w-full py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30'
                >
                  Update
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
      onSectionTabChange={(v) => {
        if (v === 'PROFIL') return navigate('/profile')
        setTab(v as any)
      }}
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

            <div className='mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
              <div className='stat-pill bg-white/40'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-sky-600'>Activité</p>
                <p className='mt-2 text-3xl font-black text-slate-950'>{stats.enCours} <span className="text-lg font-bold text-slate-400">en cours</span></p>
              </div>
              <div className='stat-pill bg-white/40'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-rose-500'>Alerte</p>
                <p className='mt-2 text-3xl font-black text-slate-950'>{stats.urgentes} <span className="text-lg font-bold text-slate-400">urgents</span></p>
              </div>
              <TechnicianAlertsWidget interventions={interventions} technicians={technicians} />
              <WeatherWidget />
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
            {(() => {
              const urgentes = filteredInterventions.filter(i => i.priorite === 'URGENTE' && i.statut !== 'TERMINEE')
              
              const enRetard = filteredInterventions.filter(i => isInterventionDelayed(i) && i.priorite !== 'URGENTE')
              
              const autres = filteredInterventions.filter(i => !isInterventionDelayed(i) && i.priorite !== 'URGENTE')

              return (
                <>
                  <div className='flex flex-col gap-4 mb-2'>
                    <div className='flex flex-wrap items-center justify-between gap-4'>
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

                    <div className='flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide'>
                      <button 
                        onClick={() => setCategoryFilter('ALL')}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${categoryFilter === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-100'}`}
                      >
                        Tout voir
                      </button>
                      <button 
                        onClick={() => setCategoryFilter('URGENTES')}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${categoryFilter === 'URGENTES' ? 'bg-rose-600 text-white shadow-md' : 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100'}`}
                      >
                        🚨 Urgences ({urgentes.length})
                      </button>
                      <button 
                        onClick={() => setCategoryFilter('RETARD')}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${categoryFilter === 'RETARD' ? 'bg-amber-500 text-white shadow-md' : 'bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100'}`}
                      >
                        ⚠️ En Retard ({enRetard.length})
                      </button>
                      <button 
                        onClick={() => setCategoryFilter('RECENTES')}
                        className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-all ${categoryFilter === 'RECENTES' ? 'bg-sky-600 text-white shadow-md' : 'bg-sky-50 text-sky-600 hover:bg-sky-100 border border-sky-100'}`}
                      >
                        📅 Récentes ({autres.length})
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {(categoryFilter === 'ALL' || categoryFilter === 'URGENTES') && urgentes.length > 0 && (
                      <div className="space-y-4">
                        {categoryFilter === 'ALL' && <h3 className="text-sm font-black uppercase tracking-widest text-rose-600 flex items-center gap-2 border-b border-rose-100 pb-2">🚨 Urgences à traiter ({urgentes.length})</h3>}
                        {urgentes.map(i => renderInterventionCard(i))}
                      </div>
                    )}
                    
                    {(categoryFilter === 'ALL' || categoryFilter === 'RETARD') && enRetard.length > 0 && (
                      <div className="space-y-4">
                        {categoryFilter === 'ALL' && <h3 className="text-sm font-black uppercase tracking-widest text-amber-600 flex items-center gap-2 border-b border-amber-100 pb-2">⚠️ Missions en retard ({enRetard.length})</h3>}
                        {enRetard.map(i => renderInterventionCard(i))}
                      </div>
                    )}

                    {(categoryFilter === 'ALL' || categoryFilter === 'RECENTES') && autres.length > 0 && (
                      <div className="space-y-4">
                        {categoryFilter === 'ALL' && <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-2">📅 Récemment ajoutées ({autres.length})</h3>}
                        {autres.map(i => renderInterventionCard(i))}
                      </div>
                    )}
                    
                    {filteredInterventions.length === 0 && (
                      <div className="text-center py-10 text-slate-400 font-bold">Aucune intervention trouvée.</div>
                    )}
                  </div>
                </>
              )
            })()}
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
                <div className='grid grid-cols-2 gap-4'>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="Latitude (ex: 36.80)" 
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" 
                    value={form.latitude} 
                    onChange={e => setForm(c => ({...c, latitude: e.target.value}))} 
                  />
                  <input 
                    type="number" 
                    step="any"
                    placeholder="Longitude (ex: 10.18)" 
                    className="w-full bg-slate-50 rounded-2xl px-5 py-4 border-none text-sm font-bold" 
                    value={form.longitude} 
                    onChange={e => setForm(c => ({...c, longitude: e.target.value}))} 
                  />
                </div>
                <button type='submit' className='btn-premium w-full mt-6 py-5 text-lg uppercase tracking-[.3em]'>Lancer la mission</button>
              </form>
            </div>
          </div>
        ) : tab === 'NOTIFICATIONS' ? (
           <NotificationsPanel notifications={notifications} loading={loading} onMarkAsRead={handleMarkNotificationAsRead} />
        ) : tab === 'SUPERVISION' ? (
           <div className='max-w-7xl mx-auto'>
              <div className='flex items-center justify-between mb-10'>
                 <div>
                    <h2 className='text-4xl font-black text-slate-950 tracking-tight'>Pilotage <span className="text-sky-600 italic">Opérationnel.</span></h2>
                    <p className='text-slate-500 font-medium mt-1'>Analyse en temps réel de la performance de vos missions.</p>
                 </div>
              </div>
              <DashboardMetrics interventions={interventions} />
           </div>
        ) : tab === 'RAPPORTS' ? (
          <div className='max-w-2xl mx-auto py-10'>
            <div className='dashboard-card p-10 text-center border-2 border-dashed border-slate-200 bg-slate-50/30'>
              <div className='h-24 w-24 bg-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm border border-slate-100 text-slate-400'>
                <ClipboardList className='h-12 w-12' />
              </div>
              <h2 className='text-3xl font-black text-slate-950 mb-4'>Génération de Rapports</h2>
              <p className='text-slate-500 font-medium mb-10'>Exportez les données d'interventions au format PDF pour vos archives et analyses mensuelles.</p>
              
              <div className='space-y-4'>
                <div className='flex flex-col items-center gap-2 mb-6'>
                  <label className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Sélectionner la date du rapport</label>
                  <input 
                    type='date' 
                    value={selectedReportDate}
                    onChange={(e) => setSelectedReportDate(e.target.value)}
                    className='bg-white border border-slate-200 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-900 transition-all outline-none'
                  />
                </div>

                <button 
                  onClick={generatePDFReport}
                  className='w-full py-5 bg-slate-900 text-white rounded-[1.8rem] text-sm font-black uppercase tracking-widest shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all flex items-center justify-center gap-3'
                >
                  <ClipboardList className='h-5 w-5' />
                  Générer le Rapport
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className='max-w-7xl mx-auto'>
             <div className='flex items-center justify-between mb-10'>
                <div>
                   <h2 className='text-4xl font-black text-slate-950 tracking-tight'>Vue <span className="text-emerald-600 italic">D'ensemble.</span></h2>
                   <p className='text-slate-500 font-medium mt-1'>Résumé de l'activité NOC en temps réel.</p>
                </div>
             </div>
             <DashboardMetrics interventions={interventions} />
          </div>
        )}
        {tab === 'MAP' && (
          <div className='max-w-7xl mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-700'>
             <div className='flex items-center justify-between mb-8'>
                <div>
                   <h2 className='text-3xl font-black text-slate-900 tracking-tight'>Cartographie live</h2>
                   <p className='text-slate-500 mt-1'>Visualisez vos interventions et vos techniciens sur le terrain.</p>
                </div>
             </div>
             <MapInterventionsView interventions={filteredInterventions} />
          </div>
        )}
      </div>
    </AppDashboardShell>
  )
}
