import { useState, type FormEvent } from 'react'
import { useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserCircle2,
  UserPlus,
  Wifi,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { registerClient } from '@/services/authApi'
import { setCredentials, setLoading } from '@/store/authSlice'

type InputFieldProps = {
  label: string
  type?: 'email' | 'password' | 'text'
  value: string
  placeholder: string
  autoComplete?: string
  onChange: (value: string) => void
  leadingIcon: React.ReactNode
  trailing?: React.ReactNode
}

const InputField = ({
  label,
  type = 'text',
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

export const RegisterPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [form, setForm] = useState({
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    adresse: '',
    motDePasse: '',
    confirmation: '',
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (
      !form.nom.trim() ||
      !form.prenom.trim() ||
      !form.email.trim() ||
      !form.telephone.trim() ||
      !form.adresse.trim() ||
      !form.motDePasse.trim()
    ) {
      toast.error('Tous les champs sont obligatoires.')
      return
    }

    if (form.motDePasse.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caracteres.')
      return
    }

    if (form.motDePasse !== form.confirmation) {
      toast.error('La confirmation du mot de passe ne correspond pas.')
      return
    }

    dispatch(setLoading(true))

    try {
      const response = await registerClient({
        nom: form.nom.trim(),
        prenom: form.prenom.trim(),
        email: form.email.trim(),
        telephone: form.telephone.trim(),
        adresse: form.adresse.trim(),
        motDePasse: form.motDePasse,
      })

      dispatch(setCredentials(response))
      toast.success(`Compte cree. Bienvenue ${response.user.prenom} ${response.user.nom}`)
      navigate('/client/dashboard', { replace: true })
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Inscription impossible pour le moment.')
      dispatch(setLoading(false))
    }
  }

  return (
    <main className='relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(116,255,219,0.14),transparent_20%),radial-gradient(circle_at_88%_14%,rgba(255,187,120,0.12),transparent_18%),linear-gradient(135deg,#04110f_0%,#081917_42%,#0d2320_100%)] px-4 py-6 sm:px-6 lg:px-8'>
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.1]' />
        <div className='absolute -left-24 top-20 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl' />
        <div className='absolute bottom-0 right-0 h-96 w-96 rounded-full bg-orange-200/10 blur-3xl' />
      </div>

      <div className='relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl items-stretch gap-6 xl:grid-cols-[1.05fr_0.95fr]'>
        <section className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-8 xl:p-10'>
          <div className='inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2'>
            <span className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300/12 text-emerald-200'>
              <Wifi className='h-4 w-4' />
            </span>
            <div>
              <p className='text-[0.68rem] uppercase tracking-[0.28em] text-emerald-200/72'>
                FTTH Monitor
              </p>
              <p className='text-sm text-slate-300'>Inscription client</p>
            </div>
          </div>

          <div className='mt-14 max-w-2xl'>
            <p className='text-sm uppercase tracking-[0.28em] text-slate-500'>
              Public Access
            </p>
            <h1 className='mt-5 text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-white sm:text-6xl xl:text-[4.4rem]'>
              Cree ton acces.
              <br />
              Entre directement.
            </h1>
            <p className='mt-6 max-w-xl text-base leading-8 text-slate-300'>
              Le formulaire est maintenant branche au backend auth pour l inscription client.
            </p>
          </div>

          <div className='mt-10 grid gap-4 sm:grid-cols-3'>
            {[
              { value: 'Client', label: 'Role cree' },
              { value: 'JWT', label: 'Session' },
              { value: 'Live', label: 'Backend' },
            ].map(({ value, label }) => (
              <article
                key={label}
                className='rounded-[1.6rem] border border-white/10 bg-black/20 p-5'
              >
                <p className='text-[0.68rem] uppercase tracking-[0.22em] text-slate-500'>
                  {label}
                </p>
                <p className='mt-4 text-3xl font-semibold tracking-tight text-white'>{value}</p>
              </article>
            ))}
          </div>
        </section>

        <section className='relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#071412]/90 p-6 shadow-[0_28px_110px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-8 xl:p-10'>
          <div className='absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/55 to-transparent' />
          <div className='absolute right-8 top-8 h-24 w-24 rounded-full bg-emerald-300/8 blur-2xl' />

          <div className='relative mx-auto flex h-full max-w-md flex-col justify-center'>
            <div className='flex items-center justify-between gap-4'>
              <div className='inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-2'>
                <span className='flex h-8 w-8 items-center justify-center rounded-full bg-emerald-300/12 text-emerald-200'>
                  <UserPlus className='h-4 w-4' />
                </span>
                <span className='text-xs uppercase tracking-[0.24em] text-slate-300'>
                  Create Account
                </span>
              </div>

              <div className='rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] uppercase tracking-[0.22em] text-slate-300'>
                Client
              </div>
            </div>

            <div className='mt-12'>
              <h2 className='text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Inscription
              </h2>
              <p className='mt-4 text-sm leading-7 text-slate-400'>
                Cree ton compte client pour acceder a ton espace FTTH.
              </p>
            </div>

            <form className='mt-10 space-y-5' onSubmit={handleSubmit}>
              <div className='grid gap-5 sm:grid-cols-2'>
                <InputField
                  label='Prenom'
                  value={form.prenom}
                  placeholder='Sami'
                  autoComplete='given-name'
                  onChange={(value) => setForm((current) => ({ ...current, prenom: value }))}
                  leadingIcon={<UserCircle2 className='h-5 w-5' />}
                />
                <InputField
                  label='Nom'
                  value={form.nom}
                  placeholder='Ben Sassi'
                  autoComplete='family-name'
                  onChange={(value) => setForm((current) => ({ ...current, nom: value }))}
                  leadingIcon={<UserCircle2 className='h-5 w-5' />}
                />
              </div>

              <InputField
                label='Email'
                type='email'
                value={form.email}
                placeholder='nom@gmail.com'
                autoComplete='email'
                onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                leadingIcon={<Mail className='h-5 w-5' />}
              />

              <InputField
                label='Telephone'
                value={form.telephone}
                placeholder='+21612345678'
                autoComplete='tel'
                onChange={(value) => setForm((current) => ({ ...current, telephone: value }))}
                leadingIcon={<Phone className='h-5 w-5' />}
              />

              <InputField
                label='Adresse'
                value={form.adresse}
                placeholder='40 ali belhouane jendouba'
                autoComplete='street-address'
                onChange={(value) => setForm((current) => ({ ...current, adresse: value }))}
                leadingIcon={<MapPin className='h-5 w-5' />}
              />

              <InputField
                label='Mot de passe'
                type={showPassword ? 'text' : 'password'}
                value={form.motDePasse}
                placeholder='********'
                autoComplete='new-password'
                onChange={(value) => setForm((current) => ({ ...current, motDePasse: value }))}
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

              <InputField
                label='Confirmer le mot de passe'
                type={showPassword ? 'text' : 'password'}
                value={form.confirmation}
                placeholder='********'
                autoComplete='new-password'
                onChange={(value) => setForm((current) => ({ ...current, confirmation: value }))}
                leadingIcon={<ShieldCheck className='h-5 w-5' />}
              />

              <div className='flex items-center justify-between gap-3 text-sm text-slate-400'>
                <span>Inscription client publique</span>
                <Link to='/login' className='text-emerald-200 transition hover:text-white'>
                  Deja un compte ?
                </Link>
              </div>

              <Button
                type='submit'
                size='lg'
                className='h-14 w-full rounded-[1.35rem] border-0 bg-[linear-gradient(135deg,#a3ffe0_0%,#68e6b1_56%,#f4be7e_100%)] text-slate-950 shadow-[0_16px_44px_rgba(103,232,178,0.22)] hover:brightness-105'
              >
                Creer mon compte
                <ArrowRight className='h-4 w-4' />
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}
