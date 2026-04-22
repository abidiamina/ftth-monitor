import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'
import type { InterventionRecord } from '@/types/auth.types'
import { CheckCircle2, Clock, Star, TrendingUp } from 'lucide-react'

type DashboardMetricsProps = {
  interventions: InterventionRecord[]
}

const COLORS = {
  EN_ATTENTE: '#f59e0b', // Amber 500
  EN_COURS: '#0ea5e9',   // Sky 500
  TERMINEE: '#10b981',   // Emerald 500
  ANNULEE: '#ef4444'     // Red 500
}

export function DashboardMetrics({ interventions }: DashboardMetricsProps) {
  // --- 1. Statistics Calculations ---
  const stats = useMemo(() => {
    const total = interventions.length
    const completed = interventions.filter(i => i.statut === 'TERMINEE').length
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0
    
    const ratings = interventions
      .filter(i => i.clientFeedbackRating !== null)
      .map(i => i.clientFeedbackRating!)
    const avgRating = ratings.length > 0 
      ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
      : '0.0'

    const urgentPending = interventions.filter(i => i.priorite === 'URGENTE' && i.statut !== 'TERMINEE').length

    return { total, completed, successRate, avgRating, urgentPending }
  }, [interventions])

  // --- 2. Chart Data: Status Distribution ---
  const statusData = useMemo(() => {
    const counts = interventions.reduce((acc, i) => {
      acc[i.statut] = (acc[i.statut] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(counts).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
      key: name
    }))
  }, [interventions])

  // --- 3. Chart Data: Daily Activity (Last 7 Days) ---
  const dailyData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().split('T')[0]
    })

    const dayCounts = interventions.reduce((acc, i) => {
      const day = i.dateCreation.split('T')[0]
      acc[day] = (acc[day] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return last7Days.map(day => ({
      date: new Date(day).toLocaleDateString('fr-FR', { weekday: 'short' }),
      missions: dayCounts[day] || 0
    }))
  }, [interventions])

  return (
    <div className='space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000'>
      {/* KPI Cards Row */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
        <div className='stat-pill border-slate-100 bg-white/50 backdrop-blur-sm'>
          <div className='flex items-center justify-between mb-4'>
             <p className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400'>Total Missions</p>
             <TrendingUp className='h-4 w-4 text-slate-300' />
          </div>
          <p className='text-3xl font-black text-slate-900'>{stats.total}</p>
        </div>

        <div className='stat-pill border-emerald-100 bg-emerald-50/20 backdrop-blur-sm'>
          <div className='flex items-center justify-between mb-4'>
             <p className='text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600'>Taux Réussite</p>
             <CheckCircle2 className='h-4 w-4 text-emerald-500/30' />
          </div>
          <p className='text-3xl font-black text-slate-900'>{stats.successRate}%</p>
        </div>

        <div className='stat-pill border-amber-100 bg-amber-50/20 backdrop-blur-sm'>
          <div className='flex items-center justify-between mb-4'>
             <p className='text-[10px] font-black uppercase tracking-[0.2em] text-amber-600'>Satisfaction</p>
             <Star className='h-4 w-4 text-amber-500/30' />
          </div>
          <div className='flex items-baseline gap-1'>
            <p className='text-3xl font-black text-slate-900'>{stats.avgRating}</p>
            <span className='text-sm font-bold text-amber-600/50'>/ 5</span>
          </div>
        </div>

        <div className='stat-pill border-rose-100 bg-rose-50/20 backdrop-blur-sm shadow-rose-100/20'>
          <div className='flex items-center justify-between mb-4'>
             <p className='text-[10px] font-black uppercase tracking-[0.2em] text-rose-600'>Urgences</p>
             <Clock className='h-4 w-4 text-rose-500/30' />
          </div>
          <p className={`text-3xl font-black ${stats.urgentPending > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {stats.urgentPending}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
        {/* Activity Chart */}
        <div className='dashboard-card'>
          <div className='flex items-center justify-between mb-8'>
            <h3 className='text-lg font-black text-slate-900'>Activité 7 Jours</h3>
            <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Missions par jour</p>
          </div>
          <div className='h-[300px] w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray='3 3' vertical={false} stroke='#f1f5f9' />
                <XAxis 
                  dataKey='date' 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Bar 
                  dataKey='missions' 
                  fill='#0f172a' 
                  radius={[6, 6, 0, 0]} 
                  barSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution */}
        <div className='dashboard-card'>
          <div className='flex items-center justify-between mb-8'>
            <h3 className='text-lg font-black text-slate-900'>État du Flux</h3>
            <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>Répartition statut</p>
          </div>
          <div className='h-[300px] w-full'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={statusData}
                  cx='50%'
                  cy='50%'
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey='value'
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.key} fill={COLORS[entry.key as keyof typeof COLORS] || '#000'} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
                />
                <Legend 
                  verticalAlign='bottom' 
                  height={36} 
                  iconType='circle'
                  formatter={(value) => <span className='text-[10px] font-black uppercase tracking-wider text-slate-500 ml-2'>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
