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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthShell } from '@/components/auth/AuthShell'
import { env } from '@/config/env'
import { validateRegisterForm } from '@/lib/validation'
import { registerClient } from '@/services/authApi'
import { setCredentials, setLoading } from '@/store/authSlice'

const quickNotes = ['Les comptes technicien, responsable et admin sont crees par l administration.']

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'response' in error &&
    typeof (error as { response?: unknown }).response === 'object' &&
    (error as { response?: { data?: { message?: string } } }).response?.data?.message
  ) {
    return (error as { response?: { data?: { message?: string } } }).response!.data!.message!
  }

  return fallback
}

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
    <div className='rounded-[1.5rem] border border-slate-200 bg-white p-[1px] transition focus-within:border-emerald-300/60 focus-within:shadow-[0_0_0_3px_rgba(120,240,195,0.1)]'>
      <div className='flex items-center gap-3 rounded-[1.45rem] bg-[linear-gradient(180deg,#ffffff,#f8fbfc)] px-4 py-4'>
        <span className='text-slate-500'>{leadingIcon}</span>
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className='w-full border-0 bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400'
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

    const validationError = validateRegisterForm(form)

    if (validationError) {
      toast.error(validationError)
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
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Creation du compte impossible pour le moment.'))
      dispatch(setLoading(false))
    }
  }

  return (
    <AuthShell
      layout='single'
      eyebrow=''
      title={<span className='block max-w-xl'>{env.appName}</span>}
      sideLabel='FTTH'
      sideTitle=''
      sideChips={quickNotes}
    >
      <div className='mt-12'>
        <h2 className='mt-5 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl'>
          Creer un compte
        </h2>
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
              className='rounded-full p-1 text-slate-500 transition hover:text-slate-900'
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? <EyeOff className='h-4 w-4' /> : <Eye className='h-4 w-4' />}
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

        <div className='flex items-center justify-between gap-3 text-sm text-slate-700'>
          <span className='text-slate-800'>Deja un compte ?</span>
          <Link to='/login' className='text-emerald-700 transition hover:text-emerald-800'>
            Se connecter
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
