import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const UnauthorizedPage = () => {
  return (
    <main className='flex min-h-screen items-center justify-center px-4'>
      <section className='w-full max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/35 p-8 text-center shadow-2xl shadow-black/20 backdrop-blur'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-300/10 text-amber-200'>
          <ShieldAlert className='h-8 w-8' />
        </div>
        <h1 className='mt-6 text-3xl font-semibold text-white'>Acces non autorise</h1>
        <p className='mt-3 text-sm leading-6 text-slate-400'>
          Ton compte est connecte, mais il n&apos;a pas les droits pour acceder a cette page.
        </p>
        <Button
          asChild
          size='lg'
          className='mt-8 h-12 rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200'
        >
          <Link to='/'>Retour a l&apos;accueil</Link>
        </Button>
      </section>
    </main>
  )
}
