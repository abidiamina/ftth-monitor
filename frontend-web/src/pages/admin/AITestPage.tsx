import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { api } from '@/services/authApi'

type SentimentResult = {
  sentiment: string
  score: number
  ia_used?: boolean
}

type PredictionResult = {
  zone: string
  probability: number
  riskLevel: string
  recommendation: string
}

type MessageResult = {
  message: string
  ia_used?: boolean
}

type TestResults = {
  sentiment: SentimentResult | null
  prediction: PredictionResult[] | null
  message: MessageResult | null
}

const panelClassName = 'rounded-3xl border border-slate-200 bg-white p-6 shadow-sm'

export default function AITestPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResults>({
    sentiment: null,
    prediction: null,
    message: null,
  })
  const [testText, setTestText] = useState('La panne est inadmissible!')
  const [selectedRole, setSelectedRole] = useState('TECHNICIEN')

  const testSentiment = async () => {
    setLoading(true)
    try {
      const response = await api.post<SentimentResult>('/ai/test-sentiment', { text: testText })
      setResults((prev) => ({ ...prev, sentiment: response.data }))
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du test de sentiment')
    } finally {
      setLoading(false)
    }
  }

  const testPrediction = async () => {
    setLoading(true)
    try {
      const response = await api.get<PredictionResult[]>('/ai/predictions')
      setResults((prev) => ({ ...prev, prediction: response.data }))
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du test de prediction')
    } finally {
      setLoading(false)
    }
  }

  const testMessage = async () => {
    setLoading(true)
    try {
      const response = await api.get<MessageResult>(`/ai/message?role=${selectedRole}`)
      setResults((prev) => ({ ...prev, message: response.data }))
    } catch (error) {
      console.error('Erreur:', error)
      alert('Erreur lors du test de message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='min-h-screen bg-slate-100 px-6 py-10'>
      <div className='mx-auto flex max-w-5xl flex-col gap-6'>
        <header className='rounded-[2rem] bg-slate-950 px-8 py-10 text-white shadow-xl'>
          <p className='text-xs font-black uppercase tracking-[0.25em] text-sky-300'>AI Test Lab</p>
          <h1 className='mt-4 text-4xl font-black tracking-tight'>Verification des modeles IA</h1>
          <p className='mt-3 max-w-2xl text-sm text-white/70'>
            Cette page permet de tester le sentiment, la prediction Random Forest et les messages
            generes par le microservice.
          </p>
        </header>

        <section className={panelClassName}>
          <h2 className='text-xl font-black text-slate-950'>1. CamemBERT - Analyse de sentiment</h2>
          <div className='mt-4 flex flex-col gap-4'>
            <textarea
              value={testText}
              onChange={(event) => setTestText(event.target.value)}
              className='min-h-28 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400'
              placeholder='Entrez un texte a analyser...'
            />
            <Button onClick={testSentiment} disabled={loading} className='w-full'>
              {loading ? 'Analyse en cours...' : 'Analyser le sentiment'}
            </Button>
            {results.sentiment && (
              <div className='rounded-2xl bg-sky-50 p-4 text-sm text-slate-700'>
                <p>
                  <strong>Sentiment:</strong> {results.sentiment.sentiment}
                </p>
                <p>
                  <strong>Score:</strong> {(results.sentiment.score * 100).toFixed(2)}%
                </p>
                <p>
                  <strong>IA utilisee:</strong>{' '}
                  {results.sentiment.ia_used ? 'Oui' : 'Non (fallback)'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className={panelClassName}>
          <h2 className='text-xl font-black text-slate-950'>2. Random Forest - Prediction des pannes</h2>
          <p className='mt-2 text-sm text-slate-500'>
            Analyse des zones a risque basee sur l&apos;historique des interventions.
          </p>
          <div className='mt-4 flex flex-col gap-4'>
            <Button onClick={testPrediction} disabled={loading} className='w-full'>
              {loading ? 'Prediction en cours...' : 'Predire les pannes'}
            </Button>
            {results.prediction && (
              <div className='space-y-3'>
                {results.prediction.slice(0, 5).map((prediction, index) => (
                  <div key={`${prediction.zone}-${index}`} className='rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm'>
                    <p>
                      <strong>Zone:</strong> {prediction.zone}
                    </p>
                    <p>
                      <strong>Probabilite:</strong> {prediction.probability}%
                    </p>
                    <p>
                      <strong>Risque:</strong> {prediction.riskLevel}
                    </p>
                    <p className='text-slate-500'>{prediction.recommendation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className={panelClassName}>
          <h2 className='text-xl font-black text-slate-950'>3. GPT-2 - Messages motivants</h2>
          <div className='mt-4 flex flex-col gap-4'>
            <select
              value={selectedRole}
              onChange={(event) => setSelectedRole(event.target.value)}
              className='w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-sky-400'
            >
              <option value='ADMIN'>ADMIN</option>
              <option value='TECHNICIEN'>TECHNICIEN</option>
              <option value='RESPONSABLE'>RESPONSABLE</option>
              <option value='CLIENT'>CLIENT</option>
            </select>
            <Button onClick={testMessage} disabled={loading} className='w-full'>
              {loading ? 'Generation en cours...' : 'Generer un message'}
            </Button>
            {results.message && (
              <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700'>
                <p className='text-base italic'>&quot;{results.message.message}&quot;</p>
                <p className='mt-2'>
                  <strong>IA utilisee:</strong> {results.message.ia_used ? 'Oui' : 'Non (fallback)'}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className='rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-slate-700 shadow-sm'>
          <h2 className='font-black text-slate-950'>Statut du microservice</h2>
          <p className='mt-3'>
            URL: <code>http://localhost:8000</code>
          </p>
          <p className='mt-1'>
            Swagger UI:{' '}
            <a
              href='http://localhost:8000/docs'
              target='_blank'
              rel='noreferrer'
              className='font-semibold text-sky-700 underline'
            >
              http://localhost:8000/docs
            </a>
          </p>
          <p className='mt-3'>
            Lancez le microservice avec <code>python main.py</code> depuis{' '}
            <code>microservice-ia</code>.
          </p>
        </section>
      </div>
    </main>
  )
}
