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
import { validateRegisterForm } from '@/lib/validation'
import { registerClient } from '@/services/authApi'
import { setCredentials, setLoading } from '@/store/authSlice'

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
      toast.success(`Bienvenue parmi nous, ${response.user.prenom}`)
      navigate('/client/dashboard', { replace: true })
    } catch (error: unknown) {
      toast.error('Échec de la création du compte. Veuillez vérifier vos informations.')
      dispatch(setLoading(false))
    }
  }

  return (
    <AuthShell
      layout='single'
      sideLabel="INSCRIPTION CLIENT"
    >
      <div className='mt-8 pb-10'>
        <div className="mb-10">
            <h2 className="text-3xl font-black text-slate-950 tracking-tight">Créer un compte</h2>
            <p className="text-slate-500 font-medium mt-2">Rejoignez la plateforme FTTH Monitor.</p>
        </div>

        <form className='space-y-6' onSubmit={handleSubmit}>
          <div className='grid gap-6 sm:grid-cols-2'>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Prénom</label>
              <div className="relative group">
                <UserCircle2 className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  placeholder="Sami" 
                  className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  value={form.prenom}
                  onChange={e => setForm(c => ({...c, prenom: e.target.value}))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Nom</label>
              <div className="relative group">
                <UserCircle2 className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input 
                  placeholder="Ben Sassi" 
                  className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  value={form.nom}
                  onChange={e => setForm(c => ({...c, nom: e.target.value}))}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Email</label>
            <div className="relative group">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type="email" 
                placeholder="nom@gmail.com" 
                className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={form.email}
                onChange={e => setForm(c => ({...c, email: e.target.value}))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Téléphone</label>
            <div className="relative group">
              <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                placeholder="+216 12 345 678" 
                className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={form.telephone}
                onChange={e => setForm(c => ({...c, telephone: e.target.value}))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Adresse d'installation</label>
            <div className="relative group">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                placeholder="40 Rue Ali Belhouane, Jendouba" 
                className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-6 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={form.adresse}
                onChange={e => setForm(c => ({...c, adresse: e.target.value}))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Mot de Passe</label>
            <div className="relative group">
              <LockKeyhole className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="********" 
                className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-14 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={form.motDePasse}
                onChange={e => setForm(c => ({...c, motDePasse: e.target.value}))}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400">
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Confirmer le Mot de Passe</label>
            <div className="relative group">
              <ShieldCheck className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
              <input 
                type={showPassword ? 'text' : 'password'} 
                placeholder="********" 
                className="w-full bg-slate-50 border-none rounded-[1.8rem] pl-14 pr-14 py-4 text-sm font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                value={form.confirmation}
                onChange={e => setForm(c => ({...c, confirmation: e.target.value}))}
              />
            </div>
          </div>

          <div className='flex items-center justify-between text-sm py-2 px-2'>
            <span className='text-slate-500 font-medium'>Déjà client ?</span>
            <Link to='/login' className='text-xs font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 transition-colors'>
              Se connecter
            </Link>
          </div>

          <button
            type='submit'
            className='btn-premium w-full py-5 flex items-center justify-center gap-3 text-lg'
          >
            Créer mon compte
            <ArrowRight className='h-5 w-5' />
          </button>
        </form>
      </div>
    </AuthShell>
  )
}
