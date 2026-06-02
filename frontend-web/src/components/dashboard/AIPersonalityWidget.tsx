import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import { getPersonalizedMessage } from '@/services/aiApi'

const REFRESH_INTERVAL_MS = 60_000

export const AIPersonalityWidget = () => {
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [visible, setVisible] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchMessage = useCallback(async () => {
    setVisible(false)
    setLoading(true)
    try {
      const data = await getPersonalizedMessage()
      setTimeout(() => {
        setMessage(data.message)
        setLoading(false)
        setVisible(true)
      }, 300)
    } catch (error) {
      console.error('Failed to fetch AI message', error)
      setTimeout(() => {
        setMessage("L'IA est en train de réfléchir à un message inspirant pour vous !")
        setLoading(false)
        setVisible(true)
      }, 300)
    }
  }, [])

  useEffect(() => {
    fetchMessage()
    intervalRef.current = setInterval(fetchMessage, REFRESH_INTERVAL_MS)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchMessage])

  return (
    <div className="relative overflow-hidden p-6 rounded-[2.5rem] bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-200 dark:shadow-none">
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <Sparkles className="h-16 w-16" />
      </div>

      <button
        onClick={fetchMessage}
        disabled={loading}
        className="absolute top-4 right-4 p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
        title="Nouveau message"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      </button>

      <div className="flex items-start gap-4">
        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-2">Message de l'IA</h4>
          <p
            className="text-lg font-black leading-tight tracking-tight transition-opacity duration-300"
            style={{ opacity: visible && !loading ? 1 : 0 }}
          >
            "{message}"
          </p>
        </div>
      </div>
    </div>
  )
}
