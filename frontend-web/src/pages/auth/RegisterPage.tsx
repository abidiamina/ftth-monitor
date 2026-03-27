import { ArrowRight, ShieldCheck, UserPlus, Wifi } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const accountTypes = [
  {
    role: 'Client',
    description: 'Suivre ses demandes, recevoir les notifications et consulter son historique.',
  },
  {
    role: 'Technicien',
    description: 'Voir les interventions attribuees, gerer les comptes rendus et signatures.',
  },
  {
    role: 'Responsable',
    description: 'Piloter les tickets, coordonner les equipes et suivre les SLA.',
  },
]

export const RegisterPage = () => {
  return (
    <main className='relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(116,255,219,0.14),transparent_20%),radial-gradient(circle_at_88%_14%,rgba(255,187,120,0.12),transparent_18%),linear-gradient(135deg,#04110f_0%,#081917_42%,#0d2320_100%)] px-4 py-6 sm:px-6 lg:px-8'>
      <div className='pointer-events-none absolute inset-0'>
        <div className='absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-[0.1]' />
        <div className='absolute -left-24 top-20 h-80 w-80 rounded-full bg-emerald-300/10 blur-3xl' />
        <div className='absolute bottom-0 right-0 h-96 w-96 rounded-full bg-orange-200/10 blur-3xl' />
      </div>

      <div className='relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 xl:grid-cols-[1.05fr_0.95fr]'>
        <section className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_32px_120px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-8 xl:p-10'>
          <div className='inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2'>
            <span className='flex h-10 w-10 items-center justify-center rounded-full bg-emerald-300/12 text-emerald-200'>
              <Wifi className='h-4 w-4' />
            </span>
            <div>
              <p className='text-[0.68rem] uppercase tracking-[0.28em] text-emerald-200/72'>
                FTTH Monitor
              </p>
              <p className='text-sm text-slate-300'>Creation de compte</p>
            </div>
          </div>

          <h1 className='mt-8 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
            Page d inscription prete a etre branchee
          </h1>
          <p className='mt-5 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base'>
            Cette page remplace le placeholder temporaire. La structure est en place pour
            accueillir ensuite le vrai formulaire d inscription, la validation et l appel API.
          </p>

          <div className='mt-8 grid gap-4 sm:grid-cols-3'>
            {accountTypes.map((type) => (
              <article
                key={type.role}
                className='rounded-[1.5rem] border border-white/10 bg-black/15 p-5'
              >
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>{type.role}</p>
                <p className='mt-3 text-sm leading-7 text-slate-300'>{type.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className='rounded-[2rem] border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(158,255,223,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8 xl:p-10'>
          <div className='flex h-14 w-14 items-center justify-center rounded-3xl bg-emerald-300/10 text-emerald-200'>
            <UserPlus className='h-6 w-6' />
          </div>

          <h2 className='mt-6 text-3xl font-semibold tracking-[-0.04em] text-white'>
            Ce que tu pourras brancher ensuite
          </h2>

          <div className='mt-6 space-y-4'>
            <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
              <p className='text-sm font-medium text-white'>Informations utilisateur</p>
              <p className='mt-2 text-sm leading-7 text-slate-300'>
                Nom, prenom, email, mot de passe et role cible selon le parcours choisi.
              </p>
            </div>
            <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
              <p className='text-sm font-medium text-white'>Validation et erreurs</p>
              <p className='mt-2 text-sm leading-7 text-slate-300'>
                Messages clairs pour doublons email, mot de passe faible ou champs manquants.
              </p>
            </div>
            <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
              <p className='text-sm font-medium text-white'>Creation backend</p>
              <p className='mt-2 text-sm leading-7 text-slate-300'>
                Appel API vers Prisma ou ton endpoint d inscription puis redirection vers login.
              </p>
            </div>
          </div>

          <div className='mt-8 rounded-[1.5rem] border border-dashed border-emerald-300/25 bg-black/10 p-5 text-sm leading-7 text-slate-300'>
            L interface est deja credible pour les tests visuels. Il reste a brancher la vraie
            logique d inscription quand tu seras pret.
          </div>

          <div className='mt-8 flex flex-wrap gap-3'>
            <Button asChild className='h-11 rounded-full px-5'>
              <Link to='/login'>
                <ShieldCheck className='h-4 w-4' />
                Aller a la connexion
              </Link>
            </Button>
            <Link
              to='/login'
              className='inline-flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 text-sm text-white transition hover:bg-white/10'
            >
              Retour
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
