import { AlertOctagon } from 'lucide-react'
import { useMemo } from 'react'
import type { InterventionRecord, TechnicianRecord } from '@/types/auth.types'

interface TechnicianAlertsWidgetProps {
  interventions: InterventionRecord[]
  technicians: TechnicianRecord[]
}

export const TechnicianAlertsWidget = ({ interventions, technicians }: TechnicianAlertsWidgetProps) => {
  const alerts = useMemo(() => {
    let delays = 0
    let overloads = 0
    const now = new Date().getTime()

    // Calcul des retards
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const startOfToday = today.getTime()

    interventions.forEach(i => {
      if (i.statut !== 'TERMINEE' && i.statut !== 'ANNULEE' && i.datePlanifiee) {
        const planTime = new Date(i.datePlanifiee).getTime()
        if (planTime < now) {
          delays++
        }
      }
    })

    // Calcul des surcharges
    const activePerTech: Record<number, number> = {}
    interventions.forEach(i => {
      if ((i.statut === 'EN_ATTENTE' || i.statut === 'EN_COURS') && i.technicienId) {
        activePerTech[i.technicienId] = (activePerTech[i.technicienId] || 0) + 1
      }
    })

    Object.values(activePerTech).forEach(count => {
      if (count >= 3) overloads++
    })

    return { delays, overloads, total: delays + overloads }
  }, [interventions, technicians])

  if (alerts.total === 0) {
    return (
      <div className='stat-pill bg-white/40 relative'>
        <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Ressources</p>
        <div className="flex items-center gap-2 mt-2">
          <p className='text-3xl font-black text-slate-950'>0 <span className="text-lg font-bold text-slate-400">alerte</span></p>
        </div>
      </div>
    )
  }

  return (
    <div className='stat-pill bg-rose-50 border border-rose-200/50 shadow-[0_0_20px_rgba(244,63,94,0.15)] group relative'>
      <div className="absolute top-0 right-0 w-2 h-full bg-rose-500 animate-pulse rounded-r-[2.5rem]" />
      <p className='text-[10px] font-black uppercase tracking-[0.2em] text-rose-600 flex items-center gap-1.5'>
        <AlertOctagon className='h-3.5 w-3.5' />
        Alertes Critiques
      </p>
      <div className="flex items-center gap-2 mt-2">
        <p className='text-3xl font-black text-rose-950'>{alerts.total} <span className="text-lg font-bold text-rose-400/80">critique(s)</span></p>
      </div>
      
      <div className="absolute top-full mt-2 left-0 w-64 bg-slate-900 rounded-2xl p-4 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none border border-slate-700">
        <p className="text-slate-300 text-[10px] font-black uppercase tracking-widest mb-3 border-b border-slate-700 pb-2">Détails des alertes</p>
        {alerts.delays > 0 && <p className="text-rose-400 text-xs font-bold mb-1">• {alerts.delays} mission(s) en retard</p>}
        {alerts.overloads > 0 && <p className="text-amber-400 text-xs font-bold">• {alerts.overloads} technicien(s) en surcharge (&ge; 3)</p>}
      </div>
    </div>
  )
}
