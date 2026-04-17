import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

export const UnauthorizedPage = () => {
  return (
    <main className='flex min-h-screen items-center justify-center px-4'>
      <section className='glass-panel w-full max-w-xl rounded-[2rem] p-8 text-center'>
        <div className='mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-700'>
          <ShieldAlert className='h-8 w-8' />
        </div>
        <h1 className='mt-6 text-3xl font-semibold text-slate-950'>Acces non autorise</h1>
        <p className='mt-3 text-sm leading-6 text-slate-700'>
          Ton compte est connecte, mais il n&apos;a pas les droits pour acceder a cette page.
        </p>
        <Button
          asChild
          size='lg'
          className='mt-8 h-12 rounded-2xl border-0 bg-[linear-gradient(135deg,#b8ffe7_0%,#6ee7b7_52%,#ffbe78_100%)] text-slate-950 hover:brightness-105'
        >
          <Link to='/'>Retour a l&apos;accueil</Link>
        </Button>
      </section>
    </main>
  )
}
