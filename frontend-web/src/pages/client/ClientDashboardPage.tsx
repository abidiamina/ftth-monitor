import { useEffect, useState } from 'react'
import { KeyRound, ShieldCheck, UserRound } from 'lucide-react'
import { useDispatch } from 'react-redux'
import { toast } from 'react-hot-toast'
import { BackToLoginButton } from '@/components/auth/BackToLoginButton'
import { changeCurrentPassword, getCurrentUser, updateCurrentUser } from '@/services/authApi'
import { setUser } from '@/store/authSlice'
import type { CurrentUser } from '@/types/auth.types'

export const ClientDashboardPage = () => {
  const dispatch = useDispatch()
  const [user, setLocalUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileForm, setProfileForm] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    adresse: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    motDePasseActuel: '',
    nouveauMotDePasse: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCurrentUser()
        setLocalUser(data)
        setProfileForm({
          nom: data.nom,
          prenom: data.prenom,
          telephone: data.telephone ?? '',
          adresse: data.client?.adresse ?? '',
        })
        dispatch(setUser(data))
      } catch (error: any) {
        toast.error(error?.response?.data?.message ?? 'Impossible de charger le profil client.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [dispatch])

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const response = await updateCurrentUser(profileForm)
      setLocalUser((current) =>
        current
          ? {
              ...current,
              ...response.user,
              client: current.client
                ? {
                    ...current.client,
                    adresse: profileForm.adresse,
                    nom: profileForm.nom,
                    prenom: profileForm.prenom,
                    telephone: profileForm.telephone,
                  }
                : current.client,
            }
          : current
      )
      dispatch(setUser(response.user))
      toast.success(response.message)
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Mise a jour du profil impossible.')
    }
  }

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const response = await changeCurrentPassword(passwordForm)
      setLocalUser((current) => (current ? { ...current, ...response.user } : current))
      dispatch(setUser(response.user))
      setPasswordForm({ motDePasseActuel: '', nouveauMotDePasse: '' })
      toast.success(response.message)
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Changement de mot de passe impossible.')
    }
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(116,255,219,0.12),transparent_18%),radial-gradient(circle_at_88%_14%,rgba(255,187,120,0.10),transparent_18%),linear-gradient(135deg,#04110f_0%,#081917_42%,#0d2320_100%)] px-4 py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <header className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8'>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <div className='inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-200'>
                <ShieldCheck className='h-4 w-4' />
                Dashboard client branche sur auth/me
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Espace profil client
              </h1>
              <p className='mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base'>
                Le backend de ton binome fournit deja le profil courant, sa mise a jour et le
                changement de mot de passe. Cette page exploite directement ces routes.
              </p>
            </div>
            <BackToLoginButton />
          </div>
        </header>

        <section className='mt-6 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]'>
          <article className='rounded-[2rem] border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(158,255,223,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <UserRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>PATCH /auth/me</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Mettre a jour mes informations
            </h2>

            {loading ? (
              <div className='mt-6 rounded-[1.4rem] border border-white/10 bg-black/15 p-5 text-sm text-slate-300'>Chargement du profil...</div>
            ) : (
              <form className='mt-6 grid gap-4' onSubmit={handleProfileSubmit}>
                <input value={profileForm.prenom} onChange={(event) => setProfileForm((current) => ({ ...current, prenom: event.target.value }))} placeholder='Prenom' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />
                <input value={profileForm.nom} onChange={(event) => setProfileForm((current) => ({ ...current, nom: event.target.value }))} placeholder='Nom' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />
                <input value={profileForm.telephone} onChange={(event) => setProfileForm((current) => ({ ...current, telephone: event.target.value }))} placeholder='Telephone' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />
                <textarea value={profileForm.adresse} onChange={(event) => setProfileForm((current) => ({ ...current, adresse: event.target.value }))} placeholder='Adresse' rows={4} className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />

                <button type='submit' className='rounded-[1.2rem] border-0 bg-[linear-gradient(135deg,#a3ffe0_0%,#68e6b1_56%,#f4be7e_100%)] px-4 py-3 text-sm font-medium text-slate-950 transition hover:brightness-105'>
                  Enregistrer le profil
                </button>
              </form>
            )}
          </article>

          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <KeyRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>PATCH /auth/change-password</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Securite du compte
            </h2>

            <div className='mt-6 rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
              <p className='text-sm font-medium text-white'>Profil charge depuis l API</p>
              <p className='mt-2 text-sm leading-7 text-slate-300'>{user ? `${user.prenom} ${user.nom} - ${user.email}` : 'Aucune information disponible.'}</p>
              <p className='text-sm leading-7 text-slate-400'>{user?.client?.adresse || 'Adresse client non disponible.'}</p>
            </div>

            <form className='mt-6 grid gap-4' onSubmit={handlePasswordSubmit}>
              <input type='password' value={passwordForm.motDePasseActuel} onChange={(event) => setPasswordForm((current) => ({ ...current, motDePasseActuel: event.target.value }))} placeholder='Mot de passe actuel' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />
              <input type='password' value={passwordForm.nouveauMotDePasse} onChange={(event) => setPasswordForm((current) => ({ ...current, nouveauMotDePasse: event.target.value }))} placeholder='Nouveau mot de passe' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />

              <button type='submit' className='rounded-[1.2rem] border-0 bg-white/10 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/15'>
                Changer le mot de passe
              </button>
            </form>
          </article>
        </section>
      </div>
    </main>
  )
}
