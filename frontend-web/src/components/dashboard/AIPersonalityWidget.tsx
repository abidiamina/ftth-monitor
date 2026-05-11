import { useEffect, useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { getPersonalizedMessage } from '@/services/aiApi'

export const AIPersonalityWidget = () => {
  const [message, setMessage] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        const data = await getPersonalizedMessage()
        setMessage(data.message)
      } catch (error) {
        console.error('Failed to fetch AI message', error)
        setMessage("L'IA est en train de réfléchir à un message inspirant pour vous !")
      } finally {
        setLoading(false)
      }
    }
    fetchMessage()
  }, [])

  return (
    <div className="relative overflow-hidden p-6 rounded-[2.5rem] bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-xl shadow-sky-200 dark:shadow-none">
      <div className="absolute top-0 right-0 p-4 opacity-20">
        <Sparkles className="h-16 w-16" />
      </div>
      
      <div className="flex items-start gap-4">
        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
          <Sparkles className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70 mb-2">Message de l'IA</h4>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <p className="text-lg font-black leading-tight tracking-tight">
              "{message}"
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
