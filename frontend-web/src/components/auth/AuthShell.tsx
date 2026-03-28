import type { ReactNode } from 'react'

type AuthShellProps = {
  eyebrow: string
  title: ReactNode
  description: string
  sideLabel: string
  sideTitle: string
  sideDescription: string
  sideChips: string[]
  metrics: Array<{ value: string; label: string }>
  headerSlot?: ReactNode
  children: ReactNode
}

export const AuthShell = ({
  eyebrow,
  title,
  description,
  sideLabel,
  sideTitle,
  sideDescription,
  sideChips,
  metrics,
  headerSlot,
  children,
}: AuthShellProps) => (
  <main className='relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8'>
    <div className='pointer-events-none absolute inset-0'>
      <div className='absolute -left-20 top-12 h-72 w-72 rounded-full bg-emerald-300/12 blur-3xl' />
      <div className='absolute right-0 top-24 h-80 w-80 rounded-full bg-orange-200/10 blur-3xl' />
      <div className='absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-300/8 blur-3xl' />
      <div className='absolute inset-y-0 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent xl:block' />
    </div>

    <div className='relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 xl:grid-cols-[1.08fr_0.92fr]'>
      <section className='auth-noise glass-panel relative flex flex-col justify-between rounded-[2.4rem] p-6 sm:p-8 xl:p-10'>
        <div className='absolute inset-y-10 right-10 hidden w-[26rem] rounded-full border border-white/10 xl:block' />
        <div className='absolute left-10 top-10 hidden h-24 w-24 rounded-[2rem] border border-emerald-200/10 xl:block' />
        <div className='absolute bottom-14 left-16 hidden h-px w-52 bg-gradient-to-r from-white/0 via-emerald-200/45 to-white/0 xl:block' />

        <div className='relative'>
          <div className='inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/20 px-4 py-2 backdrop-blur'>
            <span className='h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_18px_rgba(120,240,195,0.7)]' />
            <span className='text-[0.7rem] uppercase tracking-[0.32em] text-emerald-100/80'>
              {sideLabel}
            </span>
          </div>

          <div className='mt-14 max-w-3xl'>
            <p className='text-sm uppercase tracking-[0.28em] text-slate-500'>{eyebrow}</p>
            <h1 className='mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.07em] text-white sm:text-6xl xl:text-[4.8rem]'>
              {title}
            </h1>
            <p className='mt-6 max-w-xl text-base leading-8 text-slate-300'>{description}</p>
          </div>

          <div className='mt-10 flex flex-wrap gap-3'>
            {sideChips.map((item) => (
              <span
                key={item}
                className='rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm text-slate-300'
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className='relative mt-10 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]'>
          <article className='rounded-[1.7rem] border border-white/10 bg-black/20 p-5'>
            <p className='text-[0.68rem] uppercase tracking-[0.24em] text-slate-500'>Focus</p>
            <h2 className='mt-4 text-2xl font-semibold tracking-[-0.04em] text-white'>
              {sideTitle}
            </h2>
            <p className='mt-3 text-sm leading-7 text-slate-300'>{sideDescription}</p>
          </article>

          <div className='grid gap-4 sm:grid-cols-3'>
            {metrics.map(({ value, label }) => (
              <article
                key={label}
                className='rounded-[1.7rem] border border-white/10 bg-black/20 p-5'
              >
                <p className='text-[0.68rem] uppercase tracking-[0.24em] text-slate-500'>
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

      <section className='glass-panel auth-noise relative overflow-hidden rounded-[2.4rem] bg-[rgba(5,14,13,0.88)] p-6 sm:p-8 xl:p-10'>
        <div className='absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-200/55 to-transparent' />
        <div className='absolute right-8 top-8 h-24 w-24 rounded-full bg-emerald-300/10 blur-2xl' />
        <div className='absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-orange-200/10 blur-2xl' />

        <div className='relative mx-auto flex h-full max-w-md flex-col justify-center'>
          {headerSlot}
          {children}
        </div>
      </section>
    </div>
  </main>
)
