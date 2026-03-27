import { useEffect, useState } from 'react'
import { KeyRound, MapPinned, Wrench } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { BackToLoginButton } from '@/components/auth/BackToLoginButton'
import { changeCurrentPassword, getCurrentUser } from '@/services/authApi'
import type { CurrentUser } from '@/types/auth.types'

export const TechnicienDashboardPage = () => {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [motDePasseActuel, setMotDePasseActuel] = useState('')
  const [nouveauMotDePasse, setNouveauMotDePasse] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getCurrentUser()
        setUser(data)
      } catch (error: any) {
        toast.error(error?.response?.data?.message ?? 'Impossible de charger le profil.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const response = await changeCurrentPassword({ motDePasseActuel, nouveauMotDePasse })
      setUser((current) => (current ? { ...current, ...response.user } : current))
      setMotDePasseActuel('')
      setNouveauMotDePasse('')
      toast.success(response.message)
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Mise a jour du mot de passe impossible.')
    }
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_18%),radial-gradient(circle_at_88%_14%,rgba(255,187,120,0.10),transparent_18%),linear-gradient(135deg,#04110f_0%,#081917_42%,#0d2320_100%)] px-4 py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <header className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8'>
          <div className='flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between'>
            <div>
              <div className='inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-200'>
                <Wrench className='h-4 w-4' />
                Dashboard technicien appuye sur GET /auth/me
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Espace technicien
              </h1>
              <p className='mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base'>
                Cette page lit ton profil reel et gere deja le cas important du
                `mustChangePassword` expose par le backend auth.
              </p>
            </div>
            <BackToLoginButton />
          </div>
        </header>

        <section className='mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]'>
          <article className='rounded-[2rem] border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <MapPinned className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Profil terrain</p>
            </div>

            {loading ? (
              <div className='mt-6 rounded-[1.4rem] border border-white/10 bg-black/15 p-5 text-sm text-slate-300'>Chargement du profil...</div>
            ) : user ? (
              <div className='mt-6 grid gap-4 sm:grid-cols-2'>
                <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                  <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Nom complet</p>
                  <p className='mt-3 text-lg font-semibold text-white'>{user.prenom} {user.nom}</p>
                </div>
                <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                  <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Email</p>
                  <p className='mt-3 text-lg font-semibold text-white'>{user.email}</p>
                </div>
                <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                  <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Telephone</p>
                  <p className='mt-3 text-lg font-semibold text-white'>{user.telephone || 'Non renseigne'}</p>
                </div>
                <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                  <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Statut</p>
                  <p className='mt-3 text-lg font-semibold text-white'>{user.actif ? 'Compte actif' : 'Compte inactif'}</p>
                </div>
              </div>
            ) : null}

            {user?.mustChangePassword ? (
              <div className='mt-6 rounded-[1.4rem] border border-amber-300/15 bg-amber-300/8 p-5 text-sm leading-7 text-amber-100'>
                Le backend indique que ce compte doit changer son mot de passe avant usage normal.
              </div>
            ) : null}
          </article>

          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <KeyRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>PATCH /auth/change-password</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Changer le mot de passe
            </h2>

            <form className='mt-6 grid gap-4' onSubmit={handlePasswordChange}>
              <input type='password' value={motDePasseActuel} onChange={(event) => setMotDePasseActuel(event.target.value)} placeholder='Mot de passe actuel' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />
              <input type='password' value={nouveauMotDePasse} onChange={(event) => setNouveauMotDePasse(event.target.value)} placeholder='Nouveau mot de passe' className='rounded-[1.2rem] border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500' />

              <button type='submit' className='rounded-[1.2rem] border-0 bg-[linear-gradient(135deg,#a3ffe0_0%,#68e6b1_56%,#f4be7e_100%)] px-4 py-3 text-sm font-medium text-slate-950 transition hover:brightness-105'>
                Mettre a jour le mot de passe
              </button>
            </form>
          </article>
        </section>
      </div>
    </main>
  )
}
