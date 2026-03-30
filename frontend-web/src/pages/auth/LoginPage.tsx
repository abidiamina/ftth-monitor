import { useEffect, useState, type FormEvent } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  UserCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthShell } from '@/components/auth/AuthShell'
import { env } from '@/config/env'
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

const metrics = [
  { value: 'Live', label: 'Reseau' },
  { value: 'Roles', label: 'Acces' },
  { value: '24/7', label: 'Operations' },
]

const quickNotes = [
  'Flux d authentification unifie',
  'Dashboards metier',
  'Pilotage terrain en temps reel',
]

type InputFieldProps = {
  label: string
  type: 'email' | 'password' | 'text'
  value: string
  placeholder: string
  autoComplete: string
  onChange: (value: string) => void
  leadingIcon: React.ReactNode
  trailing?: React.ReactNode
}

const InputField = ({
  label,
  type,
  value,
  placeholder,
  autoComplete,
  onChange,
  leadingIcon,
  trailing,
}: InputFieldProps) => (
  <label className='block'>
    <span className='mb-2 block text-[0.68rem] font-medium uppercase tracking-[0.28em] text-slate-500'>
      {label}
    </span>
    <div className='rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-[1px] transition focus-within:border-emerald-300/40 focus-within:shadow-[0_0_0_3px_rgba(120,240,195,0.08)]'>
      <div className='flex items-center gap-3 rounded-[1.45rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] px-4 py-4'>
        <span className='text-slate-500'>{leadingIcon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className='w-full border-0 bg-transparent text-sm text-white outline-none placeholder:text-slate-500'
        />
        {trailing}
      </div>
    </div>
  </label>
)

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
      const response = await loginUser({
        email: email.trim(),
        motDePasse,
      })

      dispatch(setCredentials(response))
      toast.success(`Bienvenue ${response.user.prenom} ${response.user.nom}`)
      navigate(roleRedirects[response.user.role], { replace: true })
    } catch (error: any) {
      const message =
        error?.response?.data?.message ?? 'Connexion impossible pour le moment.'
      toast.error(message)
      dispatch(setLoading(false))
    }
  }

  if (!isReady) {
    return (
      <main className='flex min-h-screen items-center justify-center px-6 text-sm text-slate-300'>
        Verification de la session...
      </main>
    )
  }

  return (
    <AuthShell
      eyebrow='Access Layer'
      title={
        <>
          Un cockpit plus net.
          <br />
          Une entree plus forte.
        </>
      }
      description='Le portail FTTH prend un ton plus premium: plus de contraste, plus de rythme, et une lecture plus sereine des actions critiques.'
      sideLabel='FTTH Monitor'
      sideTitle='Authentification orientee operations'
      sideDescription='Le design rapproche les ecrans publics du niveau visuel des dashboards metier, avec une ambiance plus editoriale et plus actuelle.'
      sideChips={quickNotes}
      metrics={metrics}
      headerSlot={
        <div className='flex items-center justify-between gap-4'>
          <div className='inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2'>
            <span className='flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300/12 text-emerald-200'>
              <ShieldCheck className='h-4 w-4' />
            </span>
            <span className='text-xs uppercase tracking-[0.24em] text-slate-300'>
              Secure Login
            </span>
          </div>

          <div className='rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300'>
            {env.appEnv}
          </div>
        </div>
      }
    >
      <div className='mt-12'>
        <p className='inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-2 text-[0.68rem] uppercase tracking-[0.28em] text-emerald-100/80'>
          <Sparkles className='h-3.5 w-3.5' />
          Session metier
        </p>
        <h2 className='mt-5 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl'>
          Connexion
        </h2>
        <p className='mt-4 text-sm leading-7 text-slate-400'>
          Entre tes identifiants pour retrouver ton poste, tes vues de pilotage et tes actions en attente.
        </p>
      </div>

      <form className='mt-10 space-y-5' onSubmit={handleSubmit}>
        <InputField
          label='Email'
          type='email'
          value={email}
          placeholder='nom@entreprise.com'
          autoComplete='email'
          onChange={setEmail}
          leadingIcon={<UserCircle2 className='h-5 w-5' />}
        />

        <InputField
          label='Mot de passe'
          type={showPassword ? 'text' : 'password'}
          value={motDePasse}
          placeholder='********'
          autoComplete='current-password'
          onChange={setMotDePasse}
          leadingIcon={<LockKeyhole className='h-5 w-5' />}
          trailing={
            <button
              type='button'
              onClick={() => setShowPassword((value) => !value)}
              className='rounded-full p-1 text-slate-400 transition hover:text-white'
              aria-label={
                showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'
              }
            >
              {showPassword ? (
                <EyeOff className='h-4 w-4' />
              ) : (
                <Eye className='h-4 w-4' />
              )}
            </button>
          }
        />

        <div className='flex items-center justify-between gap-3 text-sm text-slate-400'>
          <span>{env.appName}</span>
          <Link to='/register' className='text-emerald-200 transition hover:text-white'>
            Creer un compte
          </Link>
        </div>

        <Button
          type='submit'
          size='lg'
          className='h-14 w-full rounded-[1.5rem] border-0 bg-[linear-gradient(135deg,#b8ffe7_0%,#6ee7b7_52%,#ffbe78_100%)] text-slate-950 shadow-[0_20px_48px_rgba(103,232,178,0.2)] hover:brightness-105'
        >
          Se connecter
          <ArrowRight className='h-4 w-4' />
        </Button>
      </form>
    </AuthShell>
  )
}
