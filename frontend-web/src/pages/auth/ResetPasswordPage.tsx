import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { KeyRound, Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import axios from 'axios'

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      return toast.error('Les mots de passe ne correspondent pas.')
    }
    if (password.length < 6) {
      return toast.error('Le mot de passe doit faire au moins 6 caractères.')
    }

    setLoading(true)
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
      await axios.post(`${apiUrl}/auth/reset-password`, { 
        token, 
        nouveauMotDePasse: password 
      })
      setSuccess(true)
      toast.success('Mot de passe réinitialisé !')
      setTimeout(() => navigate('/login'), 3000)
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erreur lors de la réinitialisation.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className='min-h-screen bg-slate-50 flex items-center justify-center p-6'>
        <div className='bg-white p-10 rounded-[2.5rem] shadow-xl text-center max-w-md border border-slate-100'>
          <h2 className='text-2xl font-black text-slate-950 mb-4'>Lien invalide</h2>
          <p className='text-slate-500 font-medium mb-8'>Ce lien de récupération semble corrompu ou manquant.</p>
          <Link to='/forgot-password' title='Lien vers la page de récupération' className='text-sky-500 font-black uppercase tracking-widest text-xs'>Demander un nouveau lien</Link>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8'>
      <div className='sm:mx-auto sm:w-full sm:max-w-md'>
        <div className='flex justify-center'>
          <div className='p-3 bg-slate-900 rounded-2xl shadow-xl'>
            <Lock className='h-8 w-8 text-white' />
          </div>
        </div>
        <h2 className='mt-6 text-center text-3xl font-black text-slate-950 tracking-tight'>
          Nouveau mot de passe
        </h2>
        <p className='mt-2 text-center text-sm font-medium text-slate-500'>
          Choisissez un mot de passe sécurisé pour votre compte.
        </p>
      </div>

      <div className='mt-8 sm:mx-auto sm:w-full sm:max-w-md'>
        <div className='bg-white py-10 px-6 shadow-2xl shadow-slate-200/50 sm:rounded-[2.5rem] sm:px-12 border border-slate-100'>
          {!success ? (
            <form className='space-y-6' onSubmit={handleSubmit}>
              <div>
                <label className='block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1'>
                  Nouveau mot de passe
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <KeyRound className='h-5 w-5 text-slate-400' />
                  </div>
                  <input
                    type='password'
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className='block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:ring-2 focus:ring-slate-950 focus:bg-white transition-all sm:text-sm'
                    placeholder='••••••••'
                  />
                </div>
              </div>

              <div>
                <label className='block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1'>
                  Confirmer le mot de passe
                </label>
                <div className='relative'>
                  <div className='absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none'>
                    <KeyRound className='h-5 w-5 text-slate-400' />
                  </div>
                  <input
                    type='password'
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className='block w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:ring-2 focus:ring-slate-950 focus:bg-white transition-all sm:text-sm'
                    placeholder='••••••••'
                  />
                </div>
              </div>

              <div>
                <button
                  type='submit'
                  disabled={loading}
                  className='w-full flex justify-center items-center py-4 px-4 bg-slate-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-950 disabled:opacity-50 transition-all shadow-xl shadow-slate-200'
                >
                  {loading ? <Loader2 className='h-5 w-5 animate-spin' /> : 'Réinitialiser'}
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
                Votre mot de passe a été mis à jour. Redirection vers la page de connexion...
              </p>
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
