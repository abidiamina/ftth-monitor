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
  Sparkles,
  UserCircle2,
  UserPlus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthShell } from '@/components/auth/AuthShell'
import { registerClient } from '@/services/authApi'
import { setCredentials, setLoading } from '@/store/authSlice'

const metrics = [
  { value: 'Client', label: 'Role' },
  { value: 'JWT', label: 'Session' },
  { value: 'Ready', label: 'Activation' },
]

const quickNotes = [
  'Inscription branchee au backend',
  'Profil client cree en direct',
  'Entree immediate dans l espace perso',
]

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
    <AuthShell
      eyebrow='Public Entry'
      title={
        <>
          Un onboarding plus fluide.
          <br />
          Une premiere impression plus nette.
        </>
      }
      description='Le parcours d inscription devient plus editorial et plus haut de gamme, sans perdre la simplicite necessaire a un formulaire public.'
      sideLabel='FTTH Access'
      sideTitle='Creation de compte sans friction'
      sideDescription='Le theme mise sur des volumes plus doux, une lumiere plus chaude et un formulaire qui ressemble a une vraie interface produit, pas a un simple CRUD.'
      sideChips={quickNotes}
      metrics={metrics}
      headerSlot={
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
      }
    >
      <div className='mt-12'>
        <p className='inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-3 py-2 text-[0.68rem] uppercase tracking-[0.28em] text-emerald-100/80'>
          <Sparkles className='h-3.5 w-3.5' />
          Inscription publique
        </p>
        <h2 className='mt-5 text-4xl font-semibold tracking-[-0.06em] text-white sm:text-5xl'>
          Inscription
        </h2>
        <p className='mt-4 text-sm leading-7 text-slate-400'>
          Cree ton acces client pour suivre tes demandes, recevoir les interventions et garder ton profil a jour.
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
          className='h-14 w-full rounded-[1.5rem] border-0 bg-[linear-gradient(135deg,#b8ffe7_0%,#6ee7b7_52%,#ffbe78_100%)] text-slate-950 shadow-[0_20px_48px_rgba(103,232,178,0.2)] hover:brightness-105'
        >
          Creer mon compte
          <ArrowRight className='h-4 w-4' />
        </Button>
      </form>
    </AuthShell>
  )
}
