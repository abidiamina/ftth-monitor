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
  Navigation,
  Clock,
  CheckCircle2,
  MapPin,
  QrCode,
  Camera,
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import { AIPersonalityWidget } from '@/components/dashboard/AIPersonalityWidget'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { DashboardTabs } from '@/components/dashboard/DashboardTabs'
import { NotificationsPanel } from '@/components/dashboard/NotificationsPanel'
import { TechnicianSprint3Panel } from '@/components/sprint3/TechnicianSprint3Panel'
import { validatePasswordChangeForm } from '@/lib/validation'
import { changeCurrentPassword, getCurrentUser, updateTechnicianLocation } from '@/services/authApi'
import { listInterventions, updateIntervention } from '@/services/interventionApi'
import { listNotifications, markNotificationAsRead } from '@/services/notificationApi'
import { getSocket } from '@/services/socketService'
import type {
  CurrentUser,
  InterventionRecord,
  InterventionStatus,
  NotificationRecord,
} from '@/types/auth.types'

const statusLabels: Record<InterventionStatus, string> = {
  EN_ATTENTE: 'À confirmer',
  EN_COURS: 'En cours',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
}

const formatDate = (value?: string | null) => {
  if (!value) return 'En attente'
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
    } catch (error) {
      toast.error('Impossible de charger votre tableau de bord.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { 
    loadDashboard() 
    
    const socket = getSocket()
    socket.on('intervention_updated', () => {
      loadDashboard()
    })

    return () => {
      socket.off('intervention_updated')
    }
  }, [])

  const missionDeck = useMemo(() => ({
    pending: interventions.filter(i => i.statut === 'EN_ATTENTE'),
    active: interventions.filter(i => i.statut === 'EN_COURS'),
    completed: interventions.filter(i => i.statut === 'TERMINEE'),
    unread: notifications.filter(n => !n.lu).length,
  }), [interventions, notifications])

  const tabs = useMemo(() => [
    { id: 'APERCU', label: 'Dashboard', icon: RadioTower },
    { id: 'TERRAIN', label: 'Exécution', icon: ScanSearch },
    { id: 'NOTIFICATIONS', label: 'Inbox', icon: BellRing, badge: missionDeck.unread || undefined },
    { id: 'PROFIL', label: 'Identité', icon: MapPinned },
    { id: 'SECURITE', label: 'Accès', icon: KeyRound },
  ], [missionDeck.unread])

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsRead(id)
      setNotifications(curr => curr.map(n => n.id === id ? { ...n, lu: true } : n))
    } catch (error) { toast.error('Erreur notification.') }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changeCurrentPassword({ motDePasseActuel, nouveauMotDePasse })
      setMotDePasseActuel(''); setNouveauMotDePasse('')
      toast.success('Mot de passe mis à jour.')
    } catch (error) { toast.error('Échec du changement.') }
  }

  const handleStatusUpdate = async (id: number, statut: InterventionStatus) => {
    setActionId(id)
    try {
      const response = await updateIntervention(id, { statut })
      toast.success(`Statut mis à jour: ${statusLabels[statut]}`)
      setInterventions(curr => curr.map(i => i.id === id ? response.data : i))
    } catch (error) { toast.error('Action impossible.') }
    finally { setActionId(null) }
  }

  const handleReject = async (id: number) => {
    setActionId(id)
    try {
      const response = await updateIntervention(id, { statut: 'EN_ATTENTE', technicienId: null })
      toast.success('Intervention refusée et remise en attente.')
      // Since it's no longer assigned to this technician, we remove it from their view
      setInterventions(curr => curr.filter(i => i.id !== id))
    } catch (error) { toast.error('Action impossible.') }
    finally { setActionId(null) }
  }

  const [updatingLocation, setUpdatingLocation] = useState(false)
  const handleUpdateLocation = () => {
    if (!navigator.geolocation) {
      toast.error("La géolocalisation n'est pas supportée par votre navigateur.")
      return
    }

    setUpdatingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await updateTechnicianLocation(position.coords.latitude, position.coords.longitude)
          toast.success('Position GPS mise à jour avec succès.')
        } catch (error) {
          toast.error('Erreur lors de la mise à jour de la position.')
        } finally {
          setUpdatingLocation(false)
        }
      },
      (error) => {
        setUpdatingLocation(false)
        toast.error('Impossible de récupérer votre position.')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const renderInterventionCard = (i: InterventionRecord, actions: React.ReactNode) => (
    <div key={i.id} className='dashboard-card group animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden'>
      <div className='flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between'>
        <div className='flex-1 min-w-0'>
           <div className='flex items-center gap-3 mb-4'>
              <div className='p-3 bg-slate-50 rounded-2xl border border-slate-100/50'>
                 <Navigation className='h-5 w-5 text-sky-500' />
              </div>
              <div className='min-w-0'>
                 <h4 className='text-lg font-black text-slate-950 truncate tracking-tight'>{i.titre}</h4>
                 <p className='text-[10px] font-black uppercase tracking-widest text-slate-400'>ID: #{i.id}</p>
              </div>
           </div>

           <div className='grid gap-6 sm:grid-cols-2'>
              <div className='flex items-center gap-4'>
                 <div className='p-2.5 bg-sky-50 rounded-xl text-sky-600'>
                    <Navigation className='h-4 w-4' />
                 </div>
                 <div className='min-w-0'>
                    <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5'>Lieu</p>
                    <p className='text-sm font-bold text-slate-900 truncate'>{i.adresse}</p>
                 </div>
              </div>
              <div className='flex items-center gap-4'>
                 <div className='p-2.5 bg-emerald-50 rounded-xl text-emerald-600'>
                    <Clock className='h-4 w-4' />
                 </div>
                 <div className='min-w-0'>
                    <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5'>Date prévue</p>
                    <p className='text-sm font-bold text-slate-900 truncate'>{formatDate(i.datePlanifiee)}</p>
                 </div>
              </div>
           </div>
           
           <div className='mt-6 pt-6 border-t border-slate-100/50'>
              <div className='bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-100/50'>
                 <p className='text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3'>Validation Technique</p>
                 <div className='grid grid-cols-3 gap-2'>
                    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${i.gpsConfirmedAt ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-100 text-slate-300'}`}>
                       {i.gpsConfirmedAt ? <CheckCircle2 className='h-4 w-4 mb-1' /> : <MapPin className='h-4 w-4 mb-1 opacity-50' />}
                       <span className='text-[8px] font-bold uppercase'>GPS</span>
                    </div>
                    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${i.qrVerifiedAt ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-100 text-slate-300'}`}>
                       {i.qrVerifiedAt ? <CheckCircle2 className='h-4 w-4 mb-1' /> : <QrCode className='h-4 w-4 mb-1 opacity-50' />}
                       <span className='text-[8px] font-bold uppercase'>QR Code</span>
                    </div>
                    <div className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${i.evidences && i.evidences.length > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-white dark:bg-slate-800 border-slate-100 text-slate-300'}`}>
                       {i.evidences && i.evidences.length > 0 ? <CheckCircle2 className='h-4 w-4 mb-1' /> : <Camera className='h-4 w-4 mb-1 opacity-50' />}
                       <span className='text-[8px] font-bold uppercase'>Photo</span>
                    </div>
                 </div>
              </div>
           </div>

           {i.description && (
             <p className='mt-6 text-sm font-medium text-slate-500 leading-relaxed italic'>"{i.description}"</p>
           )}
        </div>

        <div className='flex flex-wrap gap-2 lg:flex-col lg:min-w-[160px]'>
           {actions}
        </div>
      </div>
    </div>
  )

  return (
    <AppDashboardShell
      role='TECHNICIEN'
      workspaceLabel='Staff Mobile'
      workspaceTitle='Technicien Dashboard'
      sectionTabs={tabs}
      sectionTab={tab}
      onSectionTabChange={(v) => setTab(v as any)}
    >
      <header className='hero-gradient p-8 mb-10'>
        <div className='grid gap-10 xl:grid-cols-[1.2fr_0.8fr]'>
          <div className='flex flex-col justify-center'>
            <div className='inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-sky-700'>
              <RadioTower className='h-4 w-4' />
              Opérations Terrain
            </div>
            <h1 className='mt-8 text-5xl font-black tracking-tight text-slate-950 sm:text-7xl leading-[1.05]'>
              Bonjour, <span className="text-sky-500 italic">{user?.prenom}.</span>
            </h1>
            <p className="mt-6 text-slate-500 font-medium max-w-lg leading-relaxed text-lg">
              Prêt pour vos missions du jour ? Gérez vos interventions avec efficacité.
            </p>

            <div className='mt-10 grid gap-4 sm:grid-cols-2'>
              <div className='stat-pill border-emerald-100 bg-emerald-50/50'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600'>À confirmer</p>
                <p className='mt-2 text-3xl font-black text-slate-950'>{missionDeck.pending.length}</p>
              </div>
              <div className='stat-pill border-sky-100 bg-sky-50/50'>
                <p className='text-[10px] font-black uppercase tracking-[0.2em] text-sky-600'>En cours</p>
                <p className='mt-2 text-3xl font-black text-slate-950'>{missionDeck.active.length}</p>
              </div>
            </div>

            {/* GPS Location Button */}
            <div className='mt-6'>
              <button
                onClick={handleUpdateLocation}
                disabled={updatingLocation}
                className='inline-flex items-center gap-3 rounded-full border border-emerald-200 bg-emerald-50 px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed'
              >
                <MapPinned className={`h-4 w-4 ${updatingLocation ? 'animate-pulse' : ''}`} />
                {updatingLocation ? 'Localisation en cours...' : 'Mettre à jour ma position GPS'}
              </button>
            </div>
          </div>

          <div className='flex flex-col gap-4 justify-center'>
             <AIPersonalityWidget />
             <div className='grid gap-4 sm:grid-cols-2'>
                <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-white/40 border-white shadow-sm flex flex-col justify-between h-40'>
                   <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Total Missions</p>
                   <p className='text-5xl font-black text-slate-950'>{interventions.length}</p>
                </article>
                <article className='dashboard-kpi rounded-[2.5rem] p-8 bg-slate-950 border-slate-900 shadow-xl flex flex-col justify-between h-40'>
                   <p className='text-[10px] font-black uppercase tracking-[0.2em] text-white/40'>Messages</p>
                   <p className='text-5xl font-black text-white'>{missionDeck.unread}</p>
                </article>
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
           <div className='space-y-12'>
              <section className='space-y-6'>
                 <h3 className='text-2xl font-black text-slate-950 flex items-center gap-3'>
                    <ScanSearch className='h-6 w-6 text-sky-500' />
                    Missions Prioritaires
                 </h3>
                 <div className='grid gap-6'>
                    {missionDeck.pending.length > 0 ? (
                      missionDeck.pending.map(i => renderInterventionCard(i, (
                        <>
                           <button 
                             onClick={() => handleStatusUpdate(i.id, 'EN_COURS')} 
                             disabled={actionId === i.id}
                             className='flex-1 py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50'
                           >
                             {actionId === i.id ? 'Traitement...' : 'Accepter Mission'}
                           </button>
                           <button 
                             onClick={() => handleReject(i.id)} 
                             disabled={actionId === i.id}
                             className='flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-all disabled:opacity-50'
                           >
                             Refuser
                           </button>
                        </>
                      )))
                    ) : (
                      <div className='dashboard-card text-center py-10 text-slate-400 font-medium'>Aucune mission en attente.</div>
                    )}
                 </div>
              </section>

              <section className='space-y-6'>
                 <h3 className='text-2xl font-black text-slate-950 flex items-center gap-3'>
                    <Wrench className='h-6 w-6 text-emerald-500' />
                    Missions Actives
                 </h3>
                 <div className='grid gap-6'>
                    {missionDeck.active.length > 0 ? (
                      missionDeck.active.map(i => renderInterventionCard(i, (
                        <div className='flex gap-2 w-full'>
                           <button 
                             onClick={() => handleStatusUpdate(i.id, 'TERMINEE')} 
                             disabled={actionId === i.id}
                             className='flex-[2] py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-colors disabled:opacity-50'
                           >
                             {actionId === i.id ? '...' : 'Terminer le job'}
                           </button>
                           <button 
                             onClick={() => handleReject(i.id)} 
                             disabled={actionId === i.id}
                             className='flex-1 py-4 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-rose-100 hover:bg-rose-100 transition-colors disabled:opacity-50'
                           >
                              Refuser
                           </button>
                        </div>
                      )))
                    ) : (
                      <div className='dashboard-card text-center py-10 text-slate-400 font-medium'>Aucun job en cours.</div>
                    )}
                 </div>
              </section>
           </div>
        ) : tab === 'TERRAIN' ? (
           <TechnicianSprint3Panel interventions={interventions} onRefresh={loadDashboard} />
        ) : tab === 'PROFIL' ? (
           <div className='max-w-2xl mx-auto'>
              <div className='dashboard-card p-10'>
                 <h3 className='text-3xl font-black text-slate-950 mb-8'>Identité Tech</h3>
                 <div className='space-y-6'>
                    <div className='flex items-center gap-6 p-6 bg-slate-50 rounded-[2rem]'>
                       <div className='h-20 w-20 rounded-full bg-sky-500 flex items-center justify-center text-white text-3xl font-black'>{user?.prenom?.[0] ?? '?'}</div>
                       <div>
                          <p className='text-sm font-black text-slate-400 uppercase tracking-widest'>Technicien Certifié</p>
                          <h4 className='text-2xl font-black text-slate-950'>{user?.prenom} {user?.nom}</h4>
                       </div>
                    </div>
                    <div className='grid gap-4 sm:grid-cols-2'>
                       <div className='p-5 rounded-2xl border border-slate-100 bg-white'>
                          <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Email</p>
                          <p className='text-sm font-bold mt-1'>{user?.email}</p>
                       </div>
                       <div className='p-5 rounded-2xl border border-slate-100 bg-white'>
                          <p className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>Contact</p>
                          <p className='text-sm font-bold mt-1'>{user?.telephone || 'Non renseigné'}</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        ) : tab === 'SECURITE' ? (
           <div className='max-w-xl mx-auto'>
              <div className='dashboard-card p-10'>
                 <h3 className='text-3xl font-black text-slate-950 mb-8'>Accès & Sécurité</h3>
                 <form className='space-y-4' onSubmit={handlePasswordChange}>
                    <input type="password" placeholder="Mot de passe actuel" className='w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold' value={motDePasseActuel} onChange={e => setMotDePasseActuel(e.target.value)} />
                    <input type="password" placeholder="Nouveau mot de passe" className='w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-sm font-bold' value={nouveauMotDePasse} onChange={e => setNouveauMotDePasse(e.target.value)} />
                    <button type="submit" className='btn-premium w-full py-5 text-xs font-black uppercase tracking-widest mt-4'>Valider les accès</button>
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
