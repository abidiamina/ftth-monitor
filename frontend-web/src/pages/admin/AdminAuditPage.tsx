import { useEffect, useState } from 'react'
import { Shield, Search, Filter, Calendar, User, Activity, ArrowLeft, RefreshCw, Eye, ShieldCheck, Users, UserPlus, ShieldEllipsis, Settings, BellRing, UserCog } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'
import { AppDashboardShell } from '@/components/dashboard/AppDashboardShell'
import { useNavigate } from 'react-router-dom'

interface AuditLog {
  id: number
  action: string
  entite: string
  entiteId: number | null
  details: string | null
  userId: number
  userEmail: string
  userRole: string
  ip: string | null
  createdAt: string
}

export const AdminAuditPage = () => {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [entiteFilter, setEntiteFilter] = useState('ALL')
  const navigate = useNavigate()

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
      const token = localStorage.getItem('ftth_token')
      const response = await axios.get(`${apiUrl}/audit`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLogs(response.data.data)
    } catch (error: any) {
      toast.error('Erreur lors du chargement des logs.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [])

  const filteredLogs = logs.filter(log => {
    const matchesQuery = !query || 
      log.userEmail.toLowerCase().includes(query.toLowerCase()) ||
      log.action.toLowerCase().includes(query.toLowerCase()) ||
      (log.details && log.details.toLowerCase().includes(query.toLowerCase()))
    
    const matchesEntite = entiteFilter === 'ALL' || log.entite === entiteFilter

    return matchesQuery && matchesEntite
  })

  return (
    <AppDashboardShell 
      role='ADMIN'
      workspaceLabel='Système'
      workspaceTitle='Audit Trail'
      sectionTabs={[
        { id: 'APERCU', label: 'Overview', icon: ShieldCheck },
        { id: 'UTILISATEURS', label: 'Annuaire', icon: Users },
        { id: 'CREATION', label: 'Ajouter membre', icon: UserPlus },
        { id: 'ROLES', label: 'Privilèges', icon: ShieldEllipsis },
        { id: 'PARAMETRES', label: 'Système', icon: Settings },
        { id: 'AUDIT', label: 'Audit', icon: Activity },
        { id: 'NOTIFICATIONS', label: 'Inbox', icon: BellRing },
        { id: 'PROFIL', label: 'Profil', icon: UserCog },
      ]}
      sectionTab='AUDIT'
      onSectionTabChange={(v) => {
        if (v === 'PROFIL') return navigate('/profile')
        if (v === 'AUDIT') return // already here
        navigate('/admin/dashboard') // For other tabs, go back to main dashboard
      }}
    >
      <div className='max-w-7xl mx-auto py-8 px-4'>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10'>
          <div>
            <button 
              onClick={() => navigate('/admin/dashboard')}
              className='flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-950 transition-colors mb-4'
            >
              <ArrowLeft className='h-4 w-4' />
              Dashboard
            </button>
            <h2 className='text-4xl font-black text-slate-950 tracking-tight flex items-center gap-4'>
              Traçabilité Système
              <span className='px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest border border-emerald-100'>Actif</span>
            </h2>
            <p className='text-slate-500 font-medium mt-2'>Historique complet des actions critiques réalisées sur la plateforme.</p>
          </div>

          <button 
            onClick={fetchLogs}
            disabled={loading}
            className='p-4 bg-white rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all shadow-sm'
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Filters */}
        <div className='dashboard-card p-6 mb-8 flex flex-wrap items-center gap-6'>
          <div className='flex-1 min-w-[300px] relative group'>
            <Search className='absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-950 transition-colors' />
            <input 
              type='text' 
              placeholder='Rechercher par email, action ou détails...'
              value={query}
              onChange={e => setQuery(e.target.value)}
              className='w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:ring-2 focus:ring-slate-950 transition-all'
            />
          </div>
          
          <div className='flex items-center gap-3'>
            <Filter className='h-5 w-5 text-slate-400' />
            <select 
              value={entiteFilter}
              onChange={e => setEntiteFilter(e.target.value)}
              className='bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-600 outline-none focus:ring-2 focus:ring-slate-950/10'
            >
              <option value='ALL'>Toutes Entités</option>
              <option value='UTILISATEUR'>Utilisateurs</option>
              <option value='INTERVENTION'>Interventions</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className='dashboard-card overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='w-full text-left'>
              <thead>
                <tr className='bg-slate-50/50 border-b border-slate-100'>
                  <th className='px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400'>Horodatage</th>
                  <th className='px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400'>Utilisateur</th>
                  <th className='px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400'>Action</th>
                  <th className='px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400'>Détails</th>
                  <th className='px-6 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400'>IP</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-slate-50'>
                {loading ? (
                  <tr>
                    <td colSpan={5} className='px-6 py-20 text-center animate-pulse text-slate-400 font-black uppercase tracking-widest text-xs'>Chargement de l'historique...</td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className='px-6 py-20 text-center text-slate-400 font-bold'>Aucun log trouvé.</td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className='hover:bg-slate-50/50 transition-colors group'>
                      <td className='px-6 py-5'>
                        <div className='flex items-center gap-3'>
                          <Calendar className='h-4 w-4 text-slate-300' />
                          <span className='text-xs font-bold text-slate-600'>{new Date(log.createdAt).toLocaleString('fr-FR')}</span>
                        </div>
                      </td>
                      <td className='px-6 py-5'>
                        <div className='flex items-center gap-3'>
                          <div className='h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400'>
                            <User className='h-4 w-4' />
                          </div>
                          <div>
                            <p className='text-xs font-black text-slate-900'>{log.userEmail}</p>
                            <p className='text-[9px] font-black text-slate-400 uppercase tracking-widest'>{log.userRole}</p>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-5'>
                        <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          log.action.includes('CREATE') ? 'bg-emerald-50 text-emerald-600' :
                          log.action.includes('UPDATE') ? 'bg-sky-50 text-sky-600' :
                          log.action.includes('DELETE') ? 'bg-rose-50 text-rose-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className='px-6 py-5'>
                         <div className='flex items-center gap-3'>
                            <Activity className='h-4 w-4 text-slate-300' />
                            <p className='text-xs font-medium text-slate-600 max-w-xs truncate' title={log.details || ''}>{log.details}</p>
                         </div>
                      </td>
                      <td className='px-6 py-5'>
                        <span className='text-[10px] font-mono font-bold text-slate-400'>{log.ip || '---'}</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppDashboardShell>
  )
}
