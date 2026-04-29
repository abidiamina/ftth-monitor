import { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyRound, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'
      await axios.post(`${apiUrl}/auth/forgot-password`, { email })
      setSuccess(true)
      toast.success('Lien envoyé !')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la demande.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <div className='flex justify-center'>
          <div className='p-3 bg-slate-900 rounded-2xl shadow-xl'>
            <KeyRound className='h-8 w-8 text-white' />
          </div>
        </div>
        <h2 className='mt-6 text-center text-3xl font-black text-slate-950 tracking-tight'>
          Mot de passe oublié ?
        </h2>
        <p className='mt-2 text-center text-sm font-medium text-slate-500'>
          Pas de panique, nous allons vous envoyer un lien de récupération.
        </p>
      </div>

      <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md'>
        <div className='bg-white py-10 px-6 shadow-2xl shadow-slate-200/50 sm:rounded-[2.5rem] sm:px-12 border border-slate-100'>
          {!success ? (
            <form className='space-y-6' onSubmit={handleSubmit}>
              <div>
                <label htmlFor='email' className='block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1'>
                  Email du compte
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <Mail className='h-5 w-5 text-slate-400' />
                  </div>
                  <input
                    id='email'
                    name='email'
                    type='email'
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className='block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:ring-2 focus:ring-slate-950 focus:bg-white transition-all sm:text-sm'
                    placeholder='nom@exemple.com'
                  />
                </div>
              </div>

              <div>
                <button
                  type='submit'
                  disabled={loading}
                  className='w-full flex justify-center items-center py-4 px-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-950 disabled:opacity-50 transition-all shadow-xl shadow-slate-200'
                >
                  {loading ? <Loader2 className='h-5 w-5 animate-spin' /> : 'Envoyer le lien'}
                </button>
              </div>
            </form>
          ) : (
            <div className='text-center space-y-6'>
              <div className='flex justify-center'>
                <div className='p-4 bg-emerald-50 rounded-full'>
                  <CheckCircle2 className='h-12 w-12 text-emerald-500' />
                </div>
              </div>
              <p className='text-slate-600 font-medium leading-relaxed'>
                Si un compte existe pour <span className="font-bold text-slate-900">{email}</span>, vous recevrez un email sous peu.
              </p>
              <div className='pt-4'>
                 <p className='text-xs text-slate-400 italic mb-6'>
                  N'oubliez pas de vérifier vos courriers indésirables (Spam).
                </p>
              </div>
            </div>
          )}

          <div className='mt-8 pt-8 border-t border-slate-50'>
            <Link
              to='/login'
              className='flex items-center justify-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-950 transition-colors'
            >
              <ArrowLeft className='h-4 w-4' />
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
