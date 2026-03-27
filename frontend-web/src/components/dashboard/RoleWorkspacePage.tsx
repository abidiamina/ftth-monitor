import type { ComponentType } from 'react'
import { ArrowRight, LogOut } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { logout } from '@/store/authSlice'
import type { RootState } from '@/store'

type Accent = {
  tint: string
  soft: string
  panel: string
  text: string
}

type Highlight = {
  label: string
  value: string
  change?: string
}

type Action = {
  label: string
  hint: string
}

type Feature = {
  title: string
  description: string
}

type TimelineItem = {
  step: string
  detail: string
}

type QueueItem = {
  title: string
  meta: string
  status: string
}

type ActivityItem = {
  time: string
  title: string
  detail: string
}

type FocusItem = {
  label: string
  value: string
}

type RoleWorkspacePageProps = {
  badge: string
  title: string
  description: string
  accent: Accent
  heroIcon: ComponentType<{ className?: string }>
  highlights: Highlight[]
  actions: Action[]
  features: Feature[]
  timeline: TimelineItem[]
  queueTitle: string
  queue: QueueItem[]
  activityTitle: string
  activity: ActivityItem[]
  focusTitle: string
  focus: FocusItem[]
}

export const RoleWorkspacePage = ({
  badge,
  title,
  description,
  accent,
  heroIcon: HeroIcon,
  highlights,
  actions,
  features,
  timeline,
  queueTitle,
  queue,
  activityTitle,
  activity,
  focusTitle,
  focus,
}: RoleWorkspacePageProps) => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((state: RootState) => state.auth.user)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(116,255,219,0.14),transparent_18%),radial-gradient(circle_at_88%_14%,rgba(255,187,120,0.12),transparent_18%),linear-gradient(135deg,#04110f_0%,#081917_42%,#0d2320_100%)] px-4 py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <header className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between'>
            <div className='max-w-3xl'>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.24em] ${accent.soft} ${accent.text}`}
              >
                <HeroIcon className='h-4 w-4' />
                {badge}
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                {title}
              </h1>
              <p className='mt-4 text-sm leading-7 text-slate-300 sm:text-base'>{description}</p>
            </div>

            <div className='flex flex-wrap items-center gap-3'>
              <div className='rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300'>
                {user ? `${user.prenom} ${user.nom}` : 'Utilisateur FTTH'}
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

        <section className='mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
          <article className={`rounded-[2rem] border p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8 ${accent.panel}`}>
            <div className='flex items-center gap-3 text-white'>
              <HeroIcon className={`h-5 w-5 ${accent.text}`} />
              <p className='text-xs uppercase tracking-[0.24em] text-slate-300'>
                Vue d ensemble
              </p>
            </div>

            <div className='mt-6 grid gap-4 sm:grid-cols-3'>
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>
                    {item.label}
                  </p>
                  <p className='mt-3 text-2xl font-semibold text-white'>{item.value}</p>
                  {item.change ? (
                    <p className={`mt-2 text-xs uppercase tracking-[0.18em] ${accent.text}`}>
                      {item.change}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>

            <div className='mt-6 rounded-[1.5rem] border border-dashed border-white/10 bg-black/10 p-5 text-sm leading-7 text-slate-300'>
              Cette page remplace le placeholder temporaire. Elle peut maintenant recevoir les
              vraies donnees API sans changer sa structure generale.
            </div>
          </article>

          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>Actions clefs</p>

            <div className='mt-6 space-y-4'>
              {actions.map((action) => (
                <div
                  key={action.label}
                  className='flex items-start justify-between gap-4 rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <div>
                    <p className='text-sm font-medium text-white'>{action.label}</p>
                    <p className='mt-2 text-sm leading-7 text-slate-300'>{action.hint}</p>
                  </div>
                  <ArrowRight className='mt-1 h-4 w-4 text-slate-500' />
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className='mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]'>
          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>
              Modules visibles
            </p>

            <div className='mt-6 grid gap-4'>
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <p className='text-sm font-medium text-white'>{feature.title}</p>
                  <p className='mt-2 text-sm leading-7 text-slate-300'>
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </article>

          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>
              Parcours recommande
            </p>

            <div className='mt-6 space-y-4'>
              {timeline.map((item) => (
                <div
                  key={item.step}
                  className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <p className='text-sm font-medium text-white'>{item.step}</p>
                  <p className='mt-2 text-sm leading-7 text-slate-300'>{item.detail}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className='mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>{queueTitle}</p>

            <div className='mt-6 space-y-4'>
              {queue.map((item) => (
                <div
                  key={item.title}
                  className='flex flex-col gap-3 rounded-[1.4rem] border border-white/10 bg-black/15 p-5 sm:flex-row sm:items-center sm:justify-between'
                >
                  <div>
                    <p className='text-sm font-medium text-white'>{item.title}</p>
                    <p className='mt-2 text-sm leading-7 text-slate-300'>{item.meta}</p>
                  </div>
                  <span
                    className={`rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] ${accent.soft} ${accent.text}`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </article>

          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>{focusTitle}</p>

            <div className='mt-6 grid gap-4 sm:grid-cols-2'>
              {focus.map((item) => (
                <div
                  key={item.label}
                  className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
                >
                  <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>
                    {item.label}
                  </p>
                  <p className='mt-3 text-lg font-semibold text-white'>{item.value}</p>
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className='mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
          <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>{activityTitle}</p>

          <div className='mt-6 grid gap-4 lg:grid-cols-3'>
            {activity.map((item) => (
              <div
                key={`${item.time}-${item.title}`}
                className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'
              >
                <p className={`text-xs uppercase tracking-[0.2em] ${accent.text}`}>{item.time}</p>
                <p className='mt-3 text-sm font-medium text-white'>{item.title}</p>
                <p className='mt-2 text-sm leading-7 text-slate-300'>{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className='mt-6 rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
          <div className='flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between'>
            <div>
              <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>
                Etape suivante
              </p>
              <p className='mt-3 max-w-2xl text-sm leading-7 text-slate-300'>
                La partie interface est maintenant presente. La prochaine etape logique est de
                connecter chaque bloc aux donnees backend et de remplacer les valeurs statiques.
              </p>
            </div>
            <Link
              to='/login'
              className='inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10'
            >
              Retour connexion
              <ArrowRight className='h-4 w-4' />
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
