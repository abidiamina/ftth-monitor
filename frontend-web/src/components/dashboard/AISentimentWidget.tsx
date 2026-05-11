import { useEffect, useState } from 'react'
import { MessageSquare, Smile, Meh, Frown } from 'lucide-react'
import { getSentimentStats } from '@/services/aiApi'

interface SentimentStat {
  clientFeedbackSentiment: string
  _count: { id: number }
}

export const AISentimentWidget = () => {
  const [stats, setStats] = useState<SentimentStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getSentimentStats()
        setStats(data)
      } catch (error) {
        console.error('Failed to fetch sentiment stats', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const getCount = (sentiment: string) => {
    return stats.find(s => s.clientFeedbackSentiment === sentiment)?._count.id || 0
  }

  const total = stats.reduce((acc, curr) => acc + curr._count.id, 0)
  const positivePerc = total > 0 ? Math.round((getCount('POSITIVE') / total) * 100) : 0

  if (loading) return null

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl text-emerald-500">
          <MessageSquare className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">Analyse de Satisfaction (IA)</h3>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Sentiment global des clients</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="flex flex-col items-center gap-1">
            <Smile className="h-6 w-6 text-emerald-500" />
            <span className="text-xl font-black text-slate-900 dark:text-white">{getCount('POSITIVE')}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Positifs</span>
          </div>
        </div>
        <div className="text-center">
          <div className="flex flex-col items-center gap-1">
            <Meh className="h-6 w-6 text-slate-400" />
            <span className="text-xl font-black text-slate-900 dark:text-white">{getCount('NEUTRAL')}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Neutres</span>
          </div>
        </div>
        <div className="text-center">
          <div className="flex flex-col items-center gap-1">
            <Frown className="h-6 w-6 text-rose-500" />
            <span className="text-xl font-black text-slate-900 dark:text-white">{getCount('NEGATIVE')}</span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Négatifs</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Indice de satisfaction</span>
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">{positivePerc}%</span>
        </div>
        <div className="w-full h-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${positivePerc}%` }}></div>
        </div>
      </div>
    </div>
  )
}
