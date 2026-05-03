import { useEffect, useState } from 'react'
import { getTechnicianPerformance } from '@/services/statsApi'
import type { TechnicianPerformance } from '@/services/statsApi'
import { Award, TrendingDown, TrendingUp, Minus } from 'lucide-react'

export function TechnicianPerformanceRanking() {
  const [data, setData] = useState<TechnicianPerformance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTechnicianPerformance().then(res => {
      setData(res)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="animate-pulse h-40 bg-slate-50 rounded-3xl" />

  return (
    <div className='dashboard-card'>
      <div className='flex items-center justify-between mb-8'>
        <div>
          <h3 className='text-lg font-black text-slate-900'>Performance Qualité</h3>
          <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Classement par sentiment client</p>
        </div>
        <Award className='h-6 w-6 text-amber-400' />
      </div>

      <div className='space-y-6'>
        {data.map((tech, index) => (
          <div key={tech.id} className='group'>
            <div className='flex items-center justify-between mb-2'>
              <div className='flex items-center gap-3'>
                <span className='flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white'>
                  {index + 1}
                </span>
                <p className='text-sm font-black text-slate-700 group-hover:text-sky-600 transition-colors'>
                  {tech.nom}
                </p>
              </div>
              <div className='flex items-center gap-2'>
                 <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg ${
                   tech.satisfactionRate >= 80 ? 'bg-emerald-50 text-emerald-600' :
                   tech.satisfactionRate >= 50 ? 'bg-amber-50 text-amber-600' :
                   'bg-rose-50 text-rose-600'
                 }`}>
                   {tech.satisfactionRate >= 80 ? <TrendingUp className="h-3 w-3" /> : 
                    tech.satisfactionRate >= 50 ? <Minus className="h-3 w-3" /> : 
                    <TrendingDown className="h-3 w-3" />}
                   {tech.satisfactionRate}% Satisfaction
                 </span>
              </div>
            </div>

            {/* Barre de progression segmentée (Sentiment) */}
            <div className='h-2 w-full bg-slate-100 rounded-full overflow-hidden flex'>
              <div 
                className='h-full bg-emerald-500 transition-all duration-1000' 
                style={{ width: `${(tech.sentiments.POSITIVE / tech.totalTerminees) * 100}%` }} 
              />
              <div 
                className='h-full bg-slate-300 transition-all duration-1000' 
                style={{ width: `${(tech.sentiments.NEUTRAL / tech.totalTerminees) * 100}%` }} 
              />
              <div 
                className='h-full bg-rose-500 transition-all duration-1000' 
                style={{ width: `${(tech.sentiments.NEGATIVE / tech.totalTerminees) * 100}%` }} 
              />
            </div>
            
            <div className='flex justify-between mt-2'>
               <p className='text-[9px] font-bold text-slate-400'>{tech.totalTerminees} missions terminées</p>
               <div className='flex gap-3'>
                  <span className='text-[9px] font-black text-emerald-600'>{tech.sentiments.POSITIVE} 🙂</span>
                  <span className='text-[9px] font-black text-slate-400'>{tech.sentiments.NEUTRAL} 😐</span>
                  <span className='text-[9px] font-black text-rose-600'>{tech.sentiments.NEGATIVE} ☹️</span>
               </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
