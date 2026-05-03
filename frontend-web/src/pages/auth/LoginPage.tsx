import { useEffect, useState, type FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthShell } from '@/components/auth/AuthShell'
import { validateLoginForm } from '@/lib/validation'
import { loginUser } from '@/services/authApi'
import { setCredentials, setLoading } from '@/store/authSlice'
import type { RootState } from '@/store'
import type { UserRole } from '@/types/auth.types'

const roleRedirects: Record<UserRole, string> = {
  ADMIN: '/admin/dashboard',
  RESPONSABLE: '/responsable/dashboard',
  TECHNICIEN: '/technicien/dashboard',
  CLIENT: '/client/dashboard',
}

export const LoginPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, isAuthenticated, isReady } = useSelector((state: RootState) => state.auth)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')

  useEffect(() => {
    if (!isReady || !isAuthenticated || !user) return
    navigate(roleRedirects[user.role], { replace: true })
  }, [isAuthenticated, isReady, navigate, user])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validateLoginForm({ email, motDePasse })
    if (validationError) {
      toast.error(validationError)
      return
    }

    dispatch(setLoading(true))
    try {
      const response = await loginUser({ email: email.trim(), motDePasse })
      dispatch(setCredentials(response))
      toast.success(`Heureux de vous revoir, ${response.user.prenom}`)
      navigate(roleRedirects[response.user.role], { replace: true })
    } catch (error: unknown) {
      toast.error('Identifiants incorrects ou problème technique.')
      dispatch(setLoading(false))
    }
  }

  if (!isReady) return null

 
  return (
    <AuthShell 
      layout='single' 
      sideLabel="FTTH MONITOR PRO"
    >
      <div className='mt-10'>
        <div className="mb-8">
            <h2 className="text-3xl font-black text-slate-950 tracking-tight">Connexion</h2>
            <p className="text-slate-500 font-medium mt-2">Accédez à votre espace sécurisé.</p>
        </div>

        <form className='space-y-6' onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Email Professionnel</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="email" 
                placeholder="nom@entreprise.com" 
                className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-6 py-5 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Clé d'accès</label>
            <div className="relative group">
              <LockKeyhole className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="********" 
                className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-14 py-5 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={motDePasse}
                onChange={e => setMotDePasse(e.target.value)}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className='flex items-center justify-between px-2'>
            <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-slate-200 text-emerald-500 focus:ring-emerald-500/20 h-4 w-4" />
                <span className="text-xs font-bold text-slate-500">Rester connecté</span>
            </label>
            <Link to='/register' className='text-xs font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors'>
              Nouveau Client ?
            </Link>
          </div>

          <div className='flex justify-center'>
            <Link to='/forgot-password' title='Mot de passe oublié' className='text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-colors'>
              Mot de passe oublié ?
            </Link>
          </div>

          <button
            type='submit'
            className='btn-premium w-full py-5 flex items-center justify-center gap-3 text-lg'
          >
            S'identifier
            <ArrowRight className='h-5 w-5' />
          </button>
        </form>

        <p className="mt-10 text-center text-xs font-medium text-slate-400">
            En vous connectant, vous acceptez nos <span className="text-slate-600 underline">Conditions d'Utilisation</span>.
        </p>
      </div>
    </AuthShell>
  )
}

