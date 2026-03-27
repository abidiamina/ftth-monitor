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
  UserCircle2,
  Wifi,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  { value: '24/7', label: 'Monitoring' },
  { value: 'Live', label: 'Interventions' },
  { value: 'Role', label: 'Access' },
]

const quickNotes = [
  'Suivi reseau',
  'Pilotage terrain',
  'Connexion securisee',
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
    <span className='mb-2 block text-xs font-medium uppercase tracking-[0.24em] text-slate-500'>
      {label}
    </span>
    <div className='rounded-[1.35rem] border border-white/10 bg-white/[0.03] p-[1px] transition focus-within:border-emerald-300/40'>
      <div className='flex items-center gap-3 rounded-[1.3rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] px-4 py-4'>
        <span className='text-slate-500'>{leadingIcon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
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

    if (!email.trim() || !motDePasse.trim()) {
      toast.error('Renseigne ton email et ton mot de passe.')
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
      <main className='flex min-h-screen items-center justify-center bg-[#071412] px-6 text-sm text-slate-300'>
        Verification de la session...
      </main>
    )
  }

  return (
    <main className='relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(116,255,219,0.14),transparent_20%),radial-gradient(circle_at_88%_14%,rgba(255,187,120,0.12),transparent_18%),linear-gradient(135deg,#04110f_0%,#081917_42%,#0d2320_100%)] px-4 py-6 sm:px-6 lg:px-8'>
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.1]' />
        <div className='absolute -left-24 top-20 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl' />
        <div className='absolute bottom-0 right-0 h-96 w-96 rounded-full bg-orange-200/10 blur-3xl' />
      </div>

      <div className='relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-stretch gap-6 xl:grid-cols-[1.05fr_0.95fr]'>
        <section className='relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-8 xl:p-10'>
          <div className='absolute right-10 top-10 h-40 w-40 rounded-full border border-white/10' />
          <div className='absolute bottom-12 left-10 h-56 w-56 rounded-full border border-emerald-200/10' />
          <div className='absolute right-16 top-28 h-px w-48 bg-gradient-to-r from-white/0 via-emerald-200/50 to-white/0' />
          <div className='absolute bottom-20 right-24 h-32 w-px bg-gradient-to-b from-white/0 via-white/20 to-white/0' />

          <div className='relative flex h-full flex-col justify-between'>
            <div>
              <div className='inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2 backdrop-blur'>
                <span className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300/12 text-emerald-200'>
                  <Wifi className='h-4 w-4' />
                </span>
                <div>
                  <p className='text-[0.68rem] uppercase tracking-[0.28em] text-emerald-200/72'>
                    FTTH Monitor
                  </p>
                  <p className='text-sm text-slate-300'>Network Operations</p>
                </div>
              </div>

              <div className='mt-14 max-w-2xl'>
                <p className='text-sm uppercase tracking-[0.28em] text-slate-500'>
                  Professional Access
                </p>
                <h1 className='mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl xl:text-[4.6rem]'>
                  Une interface claire.
                  <br />
                  Une entree serieuse.
                </h1>
                <p className='mt-6 max-w-xl text-base leading-8 text-slate-300'>
                  Espace de connexion FTTH pense pour un usage metier, propre,
                  lisible et direct.
                </p>
              </div>

              <div className='mt-10 flex flex-wrap gap-3'>
                {quickNotes.map((item) => (
                  <span
                    key={item}
                    className='rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-300'
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className='mt-10 grid gap-4 sm:grid-cols-3'>
              {metrics.map(({ value, label }) => (
                <article
                  key={label}
                  className='rounded-[1.6rem] border border-white/10 bg-black/20 p-5'
                >
                  <p className='text-[0.68rem] uppercase tracking-[0.22em] text-slate-500'>
                    {label}
                  </p>
                  <p className='mt-4 text-3xl font-semibold tracking-tight text-white'>
                    {value}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className='relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#071412]/90 p-6 shadow-[0_28px_110px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8 xl:p-10'>
          <div className='absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/55 to-transparent' />
          <div className='absolute right-8 top-8 h-24 w-24 rounded-full bg-emerald-300/8 blur-2xl' />

          <div className='relative mx-auto flex h-full max-w-md flex-col justify-center'>
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
                {import.meta.env.VITE_APP_ENV ?? 'development'}
              </div>
            </div>

            <div className='mt-12'>
              <h2 className='text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Connexion
              </h2>
              <p className='mt-4 text-sm leading-7 text-slate-400'>
                Entre tes identifiants pour acceder a ton espace.
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
                placeholder='••••••••'
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
                <span>{import.meta.env.VITE_APP_NAME ?? 'FTTH Dashboard'}</span>
                <Link to='/register' className='text-emerald-200 transition hover:text-white'>
                  Creer un compte
                </Link>
              </div>

              <Button
                type='submit'
                size='lg'
                className='h-14 w-full rounded-[1.35rem] border-0 bg-[linear-gradient(135deg,#a3ffe0_0%,#68e6b1_56%,#f4be7e_100%)] text-slate-950 shadow-[0_16px_44px_rgba(103,232,178,0.22)] hover:brightness-105'
              >
                Se connecter
                <ArrowRight className='h-4 w-4' />
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
