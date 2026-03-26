import {
  Bell,
  KeyRound,
  LogOut,
  MessageSquareMore,
  PenSquare,
  ShieldCheck,
  Siren,
  Star,
  UserRound,
  Wrench,
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { logout } from '@/store/authSlice'
import type { RootState } from '@/store'

const serviceRequestFields = [
  { label: 'Type', value: 'Panne reseau / Installation' },
  { label: 'Adresse', value: 'Rue, zone, point d acces' },
  { label: 'Details', value: 'Description courte du besoin client' },
]

const notifications = [
  {
    title: 'Intervention confirmee',
    detail: 'Le client recoit une alerte des qu un rendez-vous est valide.',
  },
  {
    title: 'Technicien en route',
    detail: 'Notification temps reel reliee au suivi d intervention.',
  },
  {
    title: 'Cloture & compte rendu',
    detail: 'Retour automatique quand la visite est terminee.',
  },
]

const sprintCards = [
  {
    icon: Wrench,
    sprint: 'Sprint 2',
    title: 'Demande d intervention',
    story: 'US-19',
    description: 'Formulaire client pour soumettre une demande de service technique.',
  },
  {
    icon: PenSquare,
    sprint: 'Sprint 3',
    title: 'Signature numerique',
    story: 'US-20',
    description: 'Validation electronique a la fin de l intervention.',
  },
  {
    icon: Star,
    sprint: 'Sprint 3',
    title: 'Feedback & notation',
    story: 'US-21',
    description: 'Evaluation de la qualite du service recu par le client.',
  },
]

const transversalFeatures = [
  {
    icon: Bell,
    title: 'Notifications en temps reel',
    story: 'US-07',
  },
  {
    icon: UserRound,
    title: 'Modification du profil',
    story: 'US-05',
  },
  {
    icon: KeyRound,
    title: 'Reinitialisation du mot de passe',
    story: 'US-06',
  },
]

export const ClientDashboardPage = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(116,255,219,0.12),transparent_18%),radial-gradient(circle_at_88%_14%,rgba(255,187,120,0.10),transparent_18%),linear-gradient(135deg,#04110f_0%,#081917_42%,#0d2320_100%)] px-4 py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <header className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between'>
            <div>
              <div className='inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-emerald-200'>
                <ShieldCheck className='h-4 w-4' />
                Portail Client FTTH
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Essai de dashboard client
              </h1>
              <p className='mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base'>
                Cette maquette rassemble les briques fonctionnelles prevues pour le client
                selon les sprints: demande d intervention, signature, feedback,
                notifications, profil et mot de passe.
              </p>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <div className='rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300'>
                {user ? `${user.prenom} ${user.nom}` : 'Client Demo'}
              </div>
              <Button
                variant='outline'
                className='h-11 rounded-full border-white/10 bg-white/5 px-5 text-white hover:bg-white/10'
                onClick={handleLogout}
              >
                <LogOut className='h-4 w-4' />
                Deconnexion
              </Button>
            </div>
          </div>
        </header>

        <section className='mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]'>
          <article className='rounded-[2rem] border border-emerald-300/15 bg-[linear-gradient(135deg,rgba(158,255,223,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <Wrench className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>US-19 - Demande d intervention</p>
            </div>

            <h2 className='mt-5 text-3xl font-semibold tracking-[-0.04em] text-white'>
              Formulaire de demande client
            </h2>

            <div className='mt-6 grid gap-4 sm:grid-cols-3'>
              {serviceRequestFields.map((field) => (
                <div
                  key={field.label}
                  className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>
                    {field.label}
                  </p>
                  <p className='mt-3 text-sm leading-7 text-white'>{field.value}</p>
                </div>
              ))}
            </div>

            <div className='mt-6 rounded-[1.5rem] border border-dashed border-emerald-300/25 bg-black/10 p-5 text-sm leading-7 text-slate-300'>
              Zone prevue pour un vrai formulaire: type de demande, description du probleme,
              adresse, priorite et piece jointe si necessaire.
            </div>
          </article>

          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <Bell className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>US-07 - Notifications</p>
            </div>

            <div className='mt-6 space-y-4'>
              {notifications.map((item) => (
                <div
                  key={item.title}
                  className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <p className='text-sm font-medium text-white'>{item.title}</p>
                  <p className='mt-2 text-sm leading-7 text-slate-300'>{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className='mt-6 grid gap-6 xl:grid-cols-3'>
          {sprintCards.map(({ icon: Icon, sprint, title, story, description }) => (
            <article
              key={story}
              className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'
            >
              <div className='flex items-center justify-between gap-4'>
                <div className='flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200'>
                  <Icon className='h-5 w-5' />
                </div>
                <span className='rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.18em] text-slate-300'>
                  {sprint}
                </span>
              </div>

              <p className='mt-6 text-xs uppercase tracking-[0.22em] text-slate-500'>{story}</p>
              <h3 className='mt-3 text-2xl font-semibold tracking-[-0.03em] text-white'>
                {title}
              </h3>
              <p className='mt-4 text-sm leading-7 text-slate-300'>{description}</p>
            </article>
          ))}
        </section>

        <section className='mt-6 grid gap-6 xl:grid-cols-[0.9fr_1.1fr]'>
          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-emerald-200'>
              <UserRound className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>US-05 & US-06</p>
            </div>

            <div className='mt-6 space-y-4'>
              {transversalFeatures.map(({ icon: Icon, title, story }) => (
                <div
                  key={story}
                  className='flex items-center gap-4 rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <div className='flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200'>
                    <Icon className='h-4 w-4' />
                  </div>
                  <div>
                    <p className='text-sm font-medium text-white'>{title}</p>
                    <p className='mt-1 text-xs uppercase tracking-[0.18em] text-slate-500'>
                      {story}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className='rounded-[2rem] border border-orange-200/10 bg-[linear-gradient(135deg,rgba(255,184,107,0.08),rgba(255,255,255,0.03))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-orange-100'>
              <Siren className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Parcours client cible</p>
            </div>

            <div className='mt-6 space-y-4'>
              <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                <p className='text-sm font-medium text-white'>1. Demande de service</p>
                <p className='mt-2 text-sm leading-7 text-slate-300'>
                  Le client soumet une demande d intervention depuis son tableau de bord.
                </p>
              </div>
              <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                <p className='text-sm font-medium text-white'>2. Suivi & notifications</p>
                <p className='mt-2 text-sm leading-7 text-slate-300'>
                  Il recoit les alertes importantes jusqu a la cloture de l intervention.
                </p>
              </div>
              <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                <p className='text-sm font-medium text-white'>3. Signature & evaluation</p>
                <p className='mt-2 text-sm leading-7 text-slate-300'>
                  A la fin, il signe numeriquement puis note la qualite du service.
                </p>
              </div>
            </div>

            <div className='mt-6 rounded-[1.5rem] border border-dashed border-orange-200/25 bg-black/10 p-5 text-sm leading-7 text-slate-300'>
              Cette page est un essai de structure metier. L etape suivante serait de brancher
              chaque bloc aux vraies APIs du sprint.
            </div>
          </article>
        </section>

        <section className='mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
          <div className='flex items-center gap-3 text-emerald-200'>
            <MessageSquareMore className='h-5 w-5' />
            <p className='text-xs uppercase tracking-[0.24em]'>Lecture produit</p>
          </div>

          <div className='mt-5 grid gap-4 lg:grid-cols-3'>
            <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5 text-sm leading-7 text-slate-300'>
              Le client voit clairement ce qu il peut faire maintenant.
            </div>
            <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5 text-sm leading-7 text-slate-300'>
              Chaque bloc correspond a une user story du backlog.
            </div>
            <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5 text-sm leading-7 text-slate-300'>
              La page reste evolutive: elle peut devenir dynamique sans changer sa structure.
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
