import { useEffect, useState } from 'react'
import { CloudRain, Wind, Sun, Cloud, AlertTriangle, Loader2 } from 'lucide-react'

type WeatherData = {
  current: {
    temperature_2m: number
    wind_speed_10m: number
    weather_code: number
  }
  daily: {
    precipitation_probability_max: number[]
  }
}

export function WeatherWidget() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Tunis coordinates as default based on placeholders in the app
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=36.8065&longitude=10.1815&current=temperature_2m,wind_speed_10m,weather_code&daily=precipitation_probability_max&timezone=auto'
        )
        const json = await res.json()
        setData(json)
      } catch (error) {
        console.error('Failed to fetch weather', error)
      } finally {
        setLoading(false)
      }
    }
    fetchWeather()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6 bg-slate-900/5 rounded-3xl animate-pulse">
        <Loader2 className="h-6 w-6 text-slate-400 animate-spin" />
      </div>
    )
  }

  if (!data) return null

  const temp = data.current.temperature_2m
  const wind = data.current.wind_speed_10m
  const rainProb = data.daily.precipitation_probability_max[0] || 0
  const code = data.current.weather_code

  // Determine risk level for FTTH operations
  const hasWindRisk = wind > 50 // km/h
  const hasRainRisk = rainProb > 60 // %
  const hasRisk = hasWindRisk || hasRainRisk

  return (
    <div className={`p-6 rounded-[2.5rem] shadow-sm flex flex-col justify-between border ${hasRisk ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${hasRisk ? 'text-rose-500' : 'text-slate-400'}`}>
            Météo & Risques
          </p>
          <div className="flex items-center gap-2 mt-1">
             <span className="text-3xl font-black text-slate-900">{temp}°C</span>
             {code <= 3 ? <Sun className="h-6 w-6 text-amber-500" /> : <Cloud className="h-6 w-6 text-slate-400" />}
          </div>
        </div>
        {hasRisk && (
          <div className="p-2 bg-rose-100 rounded-full text-rose-600 animate-bounce">
            <AlertTriangle className="h-5 w-5" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-2">
        <div className="flex items-center gap-2">
          <Wind className={`h-4 w-4 ${hasWindRisk ? 'text-rose-500' : 'text-sky-500'}`} />
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Vent</p>
            <p className={`text-sm font-black ${hasWindRisk ? 'text-rose-600' : 'text-slate-900'}`}>{wind} km/h</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CloudRain className={`h-4 w-4 ${hasRainRisk ? 'text-rose-500' : 'text-emerald-500'}`} />
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Pluie (Max)</p>
            <p className={`text-sm font-black ${hasRainRisk ? 'text-rose-600' : 'text-slate-900'}`}>{rainProb}%</p>
          </div>
        </div>
      </div>
    </div>
  )
}
