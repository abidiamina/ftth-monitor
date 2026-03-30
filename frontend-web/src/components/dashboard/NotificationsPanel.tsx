import type { NotificationRecord } from '@/types/auth.types'

type NotificationsPanelProps = {
  title?: string
  description: string
  notifications: NotificationRecord[]
  loading: boolean
  accentClassName: string
  emptyLabel?: string
  onMarkAsRead: (notificationId: number) => void
}

const formatDate = (value?: string | null) => {
  if (!value) return 'Non planifiee'

  return new Date(value).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export const NotificationsPanel = ({
  title = 'Notifications',
  description,
  notifications,
  loading,
  accentClassName,
  emptyLabel = 'Aucune notification.',
  onMarkAsRead,
}: NotificationsPanelProps) => (
  <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
    <div className='flex items-center justify-between gap-4'>
      <div>
        <p className='text-xs uppercase tracking-[0.24em] text-slate-500'>{title}</p>
        <p className='mt-3 text-sm leading-7 text-slate-300'>{description}</p>
      </div>
      <div className='rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-300'>
        {notifications.filter((item) => !item.lu).length} non lue(s)
      </div>
    </div>

    <div className='mt-6 space-y-4'>
      {loading ? (
        <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>
          Chargement des notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-300'>
          {emptyLabel}
        </div>
      ) : (
        notifications.map((item) => (
          <div
            key={item.id}
            className={`rounded-[1.4rem] border p-5 ${
              item.lu
                ? 'border-white/10 bg-black/15'
                : 'border-emerald-300/15 bg-emerald-300/[0.08]'
            }`}
          >
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <div className='flex flex-wrap items-center gap-3'>
                  <p className='text-sm font-medium text-white'>{item.titre}</p>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                      item.lu
                        ? 'border-white/10 bg-white/5 text-slate-400'
                        : `${accentClassName} border-current/10`
                    }`}
                  >
                    {item.lu ? 'Lue' : 'Nouvelle'}
                  </span>
                </div>
                <p className='mt-3 text-sm leading-7 text-slate-300'>{item.message}</p>
                <p className='mt-2 text-sm text-slate-500'>{formatDate(item.createdAt)}</p>
              </div>

              {!item.lu ? (
                <button
                  type='button'
                  onClick={() => onMarkAsRead(item.id)}
                  className='rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white transition hover:bg-white/10'
                >
                  Marquer lue
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  </article>
)
