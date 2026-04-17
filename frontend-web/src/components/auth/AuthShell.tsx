import type { ReactNode } from 'react'

type AuthShellLayout = 'split' | 'single'

type AuthShellProps = {
  layout?: AuthShellLayout
  eyebrow?: string
  title: ReactNode
  description?: string
  sideLabel?: string
  sideTitle?: string
  sideDescription?: string
  sideChips?: string[]
  metrics?: Array<{ value: string; label: string }>
  headerSlot?: ReactNode
  children: ReactNode
}

export const AuthShell = ({
  layout = 'split',
  eyebrow = '',
  title,
  description = '',
  sideLabel = 'FTTH',
  sideTitle = '',
  sideDescription = '',
  sideChips = [],
  metrics = [],
  headerSlot,
  children,
}: AuthShellProps) => {
  const isSingle = layout === 'single'

  return (
    <main className='relative min-h-screen overflow-hidden px-4 py-6 sm:px-6 lg:px-8'>
    <div className='pointer-events-none absolute inset-0'>
      <div className='absolute -left-20 top-12 h-72 w-72 rounded-full bg-emerald-300/12 blur-3xl' />
      <div className='absolute right-0 top-24 h-80 w-80 rounded-full bg-orange-200/10 blur-3xl' />
      <div className='absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-cyan-300/8 blur-3xl' />
      {!isSingle ? (
        <div className='absolute inset-y-0 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent xl:block' />
      ) : null}
    </div>

    <div
      className={`relative mx-auto min-h-[calc(100vh-3rem)] ${
        isSingle ? 'flex max-w-xl items-center' : 'grid max-w-7xl gap-6 xl:grid-cols-[1.08fr_0.92fr]'
      }`}
    >
      {!isSingle ? (
        <section className='auth-noise glass-panel relative flex flex-col justify-between rounded-[2.4rem] p-6 sm:p-8 xl:p-10'>
          <div className='absolute inset-y-10 right-10 hidden w-[26rem] rounded-full border border-slate-200 xl:block' />
          <div className='absolute left-10 top-10 hidden h-24 w-24 rounded-[2rem] border border-emerald-200/40 xl:block' />
          <div className='absolute bottom-14 left-16 hidden h-px w-52 bg-gradient-to-r from-white/0 via-emerald-400/45 to-white/0 xl:block' />

          <div className='relative'>
            {sideLabel ? (
              <div className='inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 backdrop-blur'>
                <span className='h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(25,185,147,0.35)]' />
                <span className='text-[0.7rem] uppercase tracking-[0.32em] text-emerald-700'>
                  {sideLabel}
                </span>
              </div>
            ) : null}

            <div className='mt-14 max-w-3xl'>
              {eyebrow ? (
                <p className='text-sm uppercase tracking-[0.28em] text-slate-500'>{eyebrow}</p>
              ) : null}
              <h1 className='mt-5 text-5xl font-semibold leading-[0.92] tracking-[-0.07em] text-slate-950 sm:text-6xl xl:text-[4.8rem]'>
                {title}
              </h1>
              {description ? (
                <p className='mt-6 max-w-xl text-base leading-8 text-slate-600'>{description}</p>
              ) : null}
            </div>

            {sideChips.length ? (
              <div className='mt-10 flex flex-wrap gap-3'>
                {sideChips.map((item) => (
                  <span
                    key={item}
                    className='rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600'
                  >
                    {item}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {sideTitle || sideDescription || metrics.length ? (
            <div className='relative mt-10 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]'>
              {sideTitle || sideDescription ? (
                <article className='rounded-[1.7rem] border border-slate-200 bg-white/75 p-5'>
                  <p className='text-[0.68rem] uppercase tracking-[0.24em] text-slate-500'>Focus</p>
                  {sideTitle ? (
                    <h2 className='mt-4 text-2xl font-semibold tracking-[-0.04em] text-slate-950'>
                      {sideTitle}
                    </h2>
                  ) : null}
                  {sideDescription ? (
                    <p className='mt-3 text-sm leading-7 text-slate-600'>{sideDescription}</p>
                  ) : null}
                </article>
              ) : null}

              {metrics.length ? (
                <div className='grid gap-4 sm:grid-cols-3'>
                  {metrics.map(({ value, label }) => (
                    <article
                      key={label}
                      className='rounded-[1.7rem] border border-slate-200 bg-white/75 p-5'
                    >
                      <p className='text-[0.68rem] uppercase tracking-[0.24em] text-slate-500'>
                        {label}
                      </p>
                      <p className='mt-4 text-3xl font-semibold tracking-tight text-slate-950'>
                        {value}
                      </p>
                    </article>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section
        className={`glass-panel auth-noise relative w-full overflow-hidden rounded-[2.4rem] bg-[rgba(255,255,255,0.92)] p-6 text-slate-950 sm:p-8 xl:p-10 ${
          isSingle ? '' : ''
        }`}
      >
        <div className='absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/55 to-transparent' />
        <div className='absolute right-8 top-8 h-24 w-24 rounded-full bg-emerald-300/14 blur-2xl' />
        <div className='absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-orange-200/14 blur-2xl' />

        <div className='relative mx-auto flex h-full max-w-md flex-col justify-center'>
          {isSingle ? (
            <div className='mb-10'>
              {sideLabel ? (
                <div className='inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 backdrop-blur'>
                  <span className='h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_18px_rgba(25,185,147,0.35)]' />
                  <span className='text-[0.7rem] uppercase tracking-[0.32em] text-emerald-700'>
                    {sideLabel}
                  </span>
                </div>
              ) : null}
              {eyebrow ? (
                <p className='mt-6 text-sm uppercase tracking-[0.28em] text-slate-500'>{eyebrow}</p>
              ) : null}
              <div className='mt-3 text-3xl font-semibold tracking-[-0.05em] text-slate-950'>
                {title}
              </div>
              {description ? (
                <p className='mt-3 text-sm leading-7 text-slate-700'>{description}</p>
              ) : null}
              {sideChips.length ? (
                <div className='mt-6 flex flex-wrap gap-2'>
                  {sideChips.map((item) => (
                    <span
                      key={item}
                      className='rounded-full border border-slate-200 bg-white px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-700'
                    >
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          {headerSlot}
          {children}
        </div>
      </section>
    </div>
  </main>
  )
}
