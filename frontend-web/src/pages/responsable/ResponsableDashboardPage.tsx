import { useEffect, useMemo, useState } from 'react'
import { Activity, UsersRound, Wrench } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { BackToLoginButton } from '@/components/auth/BackToLoginButton'
import { listTechnicians } from '@/services/authApi'
import type { TechnicianRecord } from '@/types/auth.types'

export const ResponsableDashboardPage = () => {
  const [technicians, setTechnicians] = useState<TechnicianRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await listTechnicians()
        setTechnicians(data)
      } catch (error: any) {
        toast.error(error?.response?.data?.message ?? 'Impossible de charger les techniciens.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const stats = useMemo(() => {
    const total = technicians.length
    const actifs = technicians.filter((item) => item.utilisateur.actif).length
    return { total, actifs, inactifs: total - actifs }
  }, [technicians])

  return (
    <main className='min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.14),transparent_18%),radial-gradient(circle_at_88%_14%,rgba(255,187,120,0.10),transparent_18%),linear-gradient(135deg,#06101c_0%,#091826_42%,#10253c_100%)] px-4 py-6 sm:px-6 lg:px-8'>
      <div className='mx-auto max-w-7xl'>
        <header className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8'>
          <div className='flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between'>
            <div className='max-w-3xl'>
              <div className='inline-flex items-center gap-2 rounded-full border border-blue-300/15 bg-blue-300/8 px-4 py-2 text-xs uppercase tracking-[0.24em] text-blue-200'>
                <UsersRound className='h-4 w-4' />
                Dashboard responsable branche sur GET /users/techniciens
              </div>
              <h1 className='mt-5 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl'>
                Coordination equipe terrain
              </h1>
              <p className='mt-4 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base'>
                Cette vue est maintenant alignee avec le backend de ton binome: le responsable
                peut lire la liste des techniciens utiles pour l affectation des interventions.
              </p>
            </div>

            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
              <BackToLoginButton />
              <article className='rounded-[1.4rem] border border-white/10 bg-black/15 p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Techniciens</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.total}</p>
              </article>
              <article className='rounded-[1.4rem] border border-white/10 bg-black/15 p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Actifs</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.actifs}</p>
              </article>
              <article className='rounded-[1.4rem] border border-white/10 bg-black/15 p-4'>
                <p className='text-xs uppercase tracking-[0.22em] text-slate-500'>Inactifs</p>
                <p className='mt-3 text-3xl font-semibold text-white'>{stats.inactifs}</p>
              </article>
            </div>
          </div>
        </header>

        <section className='mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]'>
          <article className='rounded-[2rem] border border-blue-300/15 bg-[linear-gradient(135deg,rgba(96,165,250,0.08),rgba(255,255,255,0.02))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-blue-200'>
              <Wrench className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Ressources mobilisables</p>
            </div>

            <div className='mt-6 space-y-4'>
              {loading ? (
                <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5 text-sm text-slate-300'>Chargement des techniciens...</div>
              ) : technicians.length === 0 ? (
                <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5 text-sm text-slate-300'>Aucun technicien renvoye par l API pour le moment.</div>
              ) : (
                technicians.map((technician) => (
                  <div key={technician.id} className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                    <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                      <div>
                        <p className='text-sm font-medium text-white'>{technician.utilisateur.prenom} {technician.utilisateur.nom}</p>
                        <p className='mt-2 text-sm leading-7 text-slate-300'>{technician.utilisateur.email}</p>
                        <p className='text-sm leading-7 text-slate-400'>{technician.utilisateur.telephone || 'Telephone non renseigne'}</p>
                      </div>

                      <span className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${technician.utilisateur.actif ? 'border-emerald-300/15 bg-emerald-300/8 text-emerald-200' : 'border-rose-300/15 bg-rose-300/8 text-rose-200'}`}>
                        {technician.utilisateur.actif ? 'Disponible' : 'Inactif'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </article>

          <article className='rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-8'>
            <div className='flex items-center gap-3 text-blue-200'>
              <Activity className='h-5 w-5' />
              <p className='text-xs uppercase tracking-[0.24em]'>Lecture backend</p>
            </div>

            <div className='mt-6 space-y-4'>
              <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                <p className='text-sm font-medium text-white'>Ce que le backend fournit deja</p>
                <p className='mt-2 text-sm leading-7 text-slate-300'>
                  Le responsable peut recuperer les techniciens sans passer par des mocks frontend,
                  ce qui prepare directement l ecran d affectation.
                </p>
              </div>
              <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                <p className='text-sm font-medium text-white'>Prochaine extension naturelle</p>
                <p className='mt-2 text-sm leading-7 text-slate-300'>
                  Brancher ensuite la liste des tickets et relier chaque ticket a un technicien
                  depuis cette vue.
                </p>
              </div>
              <div className='rounded-[1.4rem] border border-white/10 bg-black/15 p-5'>
                <p className='text-sm font-medium text-white'>Valeur immediate</p>
                <p className='mt-2 text-sm leading-7 text-slate-300'>
                  Meme sans module d interventions, tu peux deja tester le flux de lecture des
                  comptes techniciens crees par l admin.
                </p>
              </div>
            </div>
          </article>
        </section>
      </div>
    </main>
  )
}
