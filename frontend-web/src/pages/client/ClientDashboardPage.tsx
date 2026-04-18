import { useCallback, useEffect, useMemo, useState } from 'react'
import { BellRing, CheckCircle2, ClipboardList, KeyRound, MapPin, ShieldCheck, Star, TicketPlus, UserRound } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { toast } from 'react-hot-toast'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel'
import { ClientSprint3Panel } from '@/components/sprint3/ClientSprint3Panel'
import {
  validateInterventionForm,
  validatePasswordChangeForm,
  validateUserUpdateForm,
} from '@/lib/validation'
import { listNotifications, markNotificationAsRead } from '@/services/notificationApi'
import { changeCurrentPassword, getCurrentUser, updateCurrentUser } from '@/services/authApi'
import { createIntervention, listInterventions } from '@/services/interventionApi'
import { normalizePhotoData, parseSignatureToPath } from '@/lib/interventionUtils'
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
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

const priorityLabels: Record<InterventionPriority, string> = {
  BASSE: 'Basse',
  NORMALE: 'Normale',
  HAUTE: 'Haute',
  URGENTE: 'Urgente',
}

const formatDate = (value?: string | null) => {
  if (!value) return 'En attente'
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

export const ClientDashboardPage = () => {
  const dispatch = useDispatch()
  const [user, setLocalUser] = useState<CurrentUser | null>(null)
  const [interventions, setInterventions] = useState<InterventionRecord[]>([])
  const [notifications, setNotifications] = useState<NotificationRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [tab, setTab] = useState<'APERCU' | 'DEMANDE' | 'SUIVI' | 'VALIDATION' | 'COMPTE' | 'NOTIFICATIONS'>('APERCU')
  const [profileForm, setProfileForm] = useState({ nom: '', prenom: '', telephone: '', adresse: '' })
  const [passwordForm, setPasswordForm] = useState({ motDePasseActuel: '', nouveauMotDePasse: '' })
  const [requestForm, setRequestForm] = useState<CreateInterventionRequest>({ titre: '', description: '', adresse: '', priorite: 'NORMALE' })

  const loadDashboard = useCallback(async () => {
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
      setRequestForm(prev => ({ ...prev, adresse: userData.client?.adresse ?? '' }))
      dispatch(setUser(userData))
    } catch (error) {
      toast.error(getErrorMessage(error, 'Impossible de charger votre espace.'))
    } finally {
      setLoading(false)
    }
  }, [dispatch])

  useEffect(() => { loadDashboard() }, [loadDashboard])

  const stats = useMemo(() => {
    const total = interventions.length
    const ouvertes = interventions.filter(i => i.statut !== 'TERMINEE').length
    const enCours = interventions.filter(i => i.statut === 'EN_COURS').length
    const aValider = interventions.filter(i => i.statut === 'TERMINEE' && !i.clientSignatureAt).length
    const unread = notifications.filter(n => !n.lu).length
    return { total, ouvertes, enCours, aValider, unread }
  }, [interventions, notifications])

  const tabs = useMemo(() => [
    { id: 'APERCU', label: 'Espace Client', icon: ShieldCheck },
    { id: 'DEMANDE', label: 'Nouveau Ticket', icon: TicketPlus },
    { id: 'SUIVI', label: 'Activités', icon: BellRing },
    { id: 'VALIDATION', label: 'Validation', icon: CheckCircle2, badge: stats.aValider || undefined },
    { id: 'COMPTE', label: 'Profil', icon: UserRound },
    { id: 'NOTIFICATIONS', label: 'Inbox', icon: BellRing, badge: stats.unread || undefined },
  ], [stats.unread, stats.aValider])

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id)
      setNotifications(curr => curr.map(n => n.id === id ? { ...n, lu: true } : n))
    } catch (error) { toast.error('Erreur notification.') }
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await updateCurrentUser(profileForm)
      toast.success('Profil mis à jour !')
      dispatch(setUser(response.user))
    } catch (error) { toast.error('Échec de la mise à jour.') }
  }

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingRequest(true)
    try {
      await createIntervention(requestForm)
      toast.success('Votre demande a été transmise avec succès.')
      loadDashboard()
      setTab('SUIVI')
    } catch (error) { toast.error('Erreur lors de la demande.') }
    finally { setSubmittingRequest(false) }
  }

  const renderInterventionCard = (i: InterventionRecord) => (
    <div key={i.id} className='dashboard-card group animate-in fade-in slide-in-from-bottom-4 duration-500'>
      <details className='w-full'>
        <summary className='list-none cursor-pointer'>
          <div className='flex flex-col gap-5 md:flex-row md:items-center md:justify-between'>
            <div className='flex-1 min-w-0'>
               <div className='flex items-center gap-3 mb-3'>
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                    i.statut === 'EN_COURS' ? 'bg-sky-500 text-white' :
                    i.statut === 'TERMINEE' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <ClipboardList className='h-5 w-5' />
                  </div>
                  <div className='min-w-0'>
                    <h4 className='font-bold text-slate-900 truncate'>{i.titre}</h4>
                    <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Ticket #{i.id}</p>
                  </div>
               </div>

               <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='flex items-center gap-2 text-slate-600'>
                     <MapPin className='h-3.5 w-3.5 text-slate-400' />
                     <span className='text-xs font-medium truncate'>{i.adresse}</span>
                  </div>
                  <div className='flex items-center gap-2'>
                     <span className={`badge-status ${
                       i.statut === 'EN_ATTENTE' ? 'badge-pending' : 
                       i.statut === 'EN_COURS' ? 'badge-working' : 'badge-done'
                     }`}>
                       {statusLabels[i.statut]}
                     </span>
                     <span className='px-2 py-0.5 rounded-full bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-400 uppercase'>
                       {priorityLabels[i.priorite]}
                     </span>
                  </div>
               </div>
            </div>

            <div className='flex flex-col items-end gap-1'>
                <p className='text-xs font-bold text-slate-900'>{formatDate(i.datePlanifiee)}</p>
                <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Date prévue</p>
            </div>
          </div>
        </summary>

        <div className='mt-6 pt-6 border-t border-slate-100 space-y-6'>
          {i.evidences.length > 0 && (
            <div>
              <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3'>Photos terrain</p>
              <div className='flex flex-wrap gap-2'>
                {i.evidences.map((ev) => (
                  <img 
                    key={ev.id} 
                    src={normalizePhotoData(ev.photoData)} 
                    className='h-14 w-14 rounded-xl object-cover border border-white shadow-sm' 
                    alt="Evidence" 
                  />
                ))}
              </div>
            </div>
          )}

          {i.clientSignature && (
            <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
              <div className='space-y-3'>
                <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Votre Signature</p>
                <div className='bg-white rounded-2xl border border-slate-100 p-2 w-fit shadow-sm'>
                  <svg width="120" height="60" viewBox="0 0 160 80" className="opacity-80">
                    <path 
                      d={parseSignatureToPath(i.clientSignature)} 
                      fill="none" 
                      stroke="#0f172a" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                    />
                  </svg>
                </div>
              </div>
              {i.clientFeedbackRating !== null && (
                <div className='flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100'>
                  {[...Array(5)].map((_, idx) => (
                    <Star 
                      key={idx} 
                      className={`h-3 w-3 ${idx < (i.clientFeedbackRating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`} 
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </details>
    </div>
  )

  return (
    <AppDashboardShell
      role='CLIENT'
      workspaceLabel='FTTH Connect'
      workspaceTitle='Mon Espace Fibre'
      sectionTabs={tabs}
      sectionTab={tab}
      onSectionTabChange={(v) => setTab(v as any)}
    >
      <header className='hero-gradient p-8 mb-10'>
        <div className='flex flex-col gap-10 xl:flex-row xl:items-center xl:justify-between'>
          <div className='max-w-xl'>
            <div className='inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700'>
              <ShieldCheck className='h-4 w-4' />
              Portail Sécurisé
            </div>
            <h1 className='mt-8 text-5xl font-black tracking-tight text-slate-950 sm:text-7xl leading-[1.05]'>
              Bonjour, <span className="text-emerald-500">{user?.prenom ?? 'Client'}.</span>
            </h1>
            <p className="mt-6 text-slate-500 font-medium leading-relaxed text-lg">
              Suivez vos raccordements et gérez vos demandes techniques en toute simplicité.
            </p>
          </div>

          <div className='grid gap-4 sm:grid-cols-2'>
            <div className='stat-pill border-emerald-100 bg-emerald-50/50 min-w-[200px]'>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600'>Tickets Ouverts</p>
              <p className='mt-2 text-3xl font-black text-slate-950'>{stats.ouvertes}</p>
            </div>
            <div className='stat-pill border-sky-100 bg-sky-50/50 min-w-[200px]'>
              <p className='text-[10px] font-black uppercase tracking-[0.2em] text-sky-600'>En cours</p>
              <p className='mt-2 text-3xl font-black text-slate-950'>{stats.enCours}</p>
            </div>
          </div>
        </div>
      </header>

      <div className='mt-6 xl:hidden'>
        <DashboardTabs value={tab} onChange={(v) => setTab(v as any)} tabs={tabs} />
      </div>

      <div className='mt-10'>
        {loading ? (
          <div className="text-center py-20 animate-pulse font-black uppercase tracking-widest text-slate-400">Initialisation...</div>
        ) : tab === 'APERCU' ? (
           <div className='grid gap-8 lg:grid-cols-[1.2fr_0.8fr]'>
              <div className='space-y-6'>
                 <h2 className='text-2xl font-black text-slate-950 tracking-tight'>Dernières Activités</h2>
                 {interventions.length > 0 ? (
                    interventions.slice(0, 3).map(i => renderInterventionCard(i))
                 ) : (
                    <div className='dashboard-card text-center py-10 text-slate-400 font-medium'>Aucun ticket récent.</div>
                 )}
              </div>
              <div className='space-y-6'>
                 <div className='dashboard-card bg-slate-950 !text-white !border-none shadow-2xl shadow-emerald-100 overflow-hidden relative'>
                    <div className='absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 blur-[50px] rounded-full' />
                    <h3 className='text-xl font-black mb-2'>Qualité Réseau</h3>
                    <p className='text-emerald-400 text-sm font-bold'>Excellent (99.9% Up)</p>
                    <p className='mt-4 text-white/50 text-xs leading-relaxed'>Votre connexion est surveillée 24/7 par nos centres de supervision FTTH.</p>
                 </div>
                 <div className='dashboard-card'>
                    <h3 className='text-lg font-black mb-4'>Besoin d'aide ?</h3>
                    <div className='space-y-3'>
                       <button onClick={() => setTab('DEMANDE')} className='w-full py-3 bg-slate-50 text-slate-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-colors'>Créer un ticket</button>
                    </div>
                 </div>
              </div>
           </div>
        ) : tab === 'DEMANDE' ? (
           <div className='max-w-2xl mx-auto'>
              <div className='dashboard-card p-10'>
                 <h3 className='text-3xl font-black text-slate-950 mb-8'>Nouvelle Demande</h3>
                 <form className='space-y-5' onSubmit={handleRequestSubmit}>
                    <div className='space-y-2'>
                       <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4'>Sujet</label>
                       <input className='w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold' placeholder="Problème de connexion, Installation..." value={requestForm.titre} onChange={e => setRequestForm(c => ({...c, titre: e.target.value}))} />
                    </div>
                    <div className='space-y-2'>
                       <label className='text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4'>Description détaillée</label>
                       <textarea rows={4} className='w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold' placeholder="Détaillez votre besoin technique..." value={requestForm.description} onChange={e => setRequestForm(c => ({...c, description: e.target.value}))} />
                    </div>
                    <button type="submit" disabled={submittingRequest} className='btn-premium w-full py-5 text-lg uppercase tracking-[.2em] mt-6'>Transmettre ma demande</button>
                 </form>
              </div>
           </div>
        ) : tab === 'SUIVI' ? (
           <div className='grid gap-4'>
              <h2 className='text-2xl font-black text-slate-950 tracking-tight mb-4'>Historique des tickets</h2>
              {interventions.map(i => renderInterventionCard(i))}
           </div>
        ) : tab === 'VALIDATION' ? (
           <ClientSprint3Panel interventions={interventions} signerName={user ? `${user.prenom} ${user.nom}` : 'Client'} onRefresh={loadDashboard} />
        ) : tab === 'COMPTE' ? (
           <div className='grid gap-8 lg:grid-cols-2'>
              <div className='dashboard-card'>
                 <h3 className='text-xl font-black mb-6'>Identité</h3>
                 <form className='space-y-4' onSubmit={handleProfileSubmit}>
                    <div className='grid grid-cols-2 gap-4'>
                       <input className='w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold' value={profileForm.prenom} onChange={e => setProfileForm(c => ({...c, prenom: e.target.value}))} />
                       <input className='w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold' value={profileForm.nom} onChange={e => setProfileForm(c => ({...c, nom: e.target.value}))} />
                    </div>
                    <input className='w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold' value={profileForm.telephone} onChange={e => setProfileForm(c => ({...c, telephone: e.target.value}))} />
                    <textarea rows={3} className='w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold' value={profileForm.adresse} onChange={e => setProfileForm(c => ({...c, adresse: e.target.value}))} />
                    <button type="submit" className='btn-premium w-full py-4 text-xs font-black uppercase tracking-widest'>Mettre à jour</button>
                 </form>
              </div>
              <div className='dashboard-card'>
                 <h3 className='text-xl font-black mb-6'>Sécurité</h3>
                 <form className='space-y-4' onSubmit={handlePasswordSubmit}>
                    <input type="password" placeholder="Mot de passe actuel" className='w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold' value={passwordForm.motDePasseActuel} onChange={e => setPasswordForm(c => ({...c, motDePasseActuel: e.target.value}))} />
                    <input type="password" placeholder="Nouveau mot de passe" className='w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold' value={passwordForm.nouveauMotDePasse} onChange={e => setPasswordForm(c => ({...c, nouveauMotDePasse: e.target.value}))} />
                    <button type="submit" className='w-full py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest'>Changer le mot de passe</button>
                 </form>
              </div>
           </div>
        ) : (
           <NotificationsPanel notifications={notifications} loading={loading} onMarkAsRead={handleMarkAsRead} />
        )}
      </div>
    </AppDashboardShell>
  )
}
