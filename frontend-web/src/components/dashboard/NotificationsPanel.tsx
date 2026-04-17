import type { NotificationRecord } from '@/types/auth.types'

type NotificationsPanelProps = {
  title?: string
  description?: string
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
  description = '',
  notifications,
  loading,
  accentClassName,
  emptyLabel = 'Aucune notification.',
  onMarkAsRead,
}: NotificationsPanelProps) => (
  <article className='dashboard-panel rounded-[2rem] p-6 sm:p-8'>
    <div className='flex items-center justify-between gap-4'>
      <div>
        <p className='text-xs uppercase tracking-[0.24em] text-slate-600'>{title}</p>
        {description ? (
          <p className='mt-2 text-sm leading-6 text-slate-800'>{description}</p>
        ) : null}
      </div>
      <div className='rounded-full border border-slate-200 bg-white px-4 py-2 text-xs uppercase tracking-[0.18em] text-slate-600'>
        {notifications.filter((item) => !item.lu).length} non lue(s)
      </div>
    </div>

    <div className='mt-6 space-y-4'>
      {loading ? (
        <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-800'>
          Chargement des notifications...
        </div>
      ) : notifications.length === 0 ? (
        <div className='dashboard-card rounded-[1.5rem] p-5 text-sm text-slate-800'>
          {emptyLabel}
        </div>
      ) : (
        notifications.map((item) => (
          <div
            key={item.id}
            className={`rounded-[1.4rem] border p-5 ${
              item.lu
                ? 'border-slate-200 bg-white'
                : 'border-emerald-200 bg-emerald-50/80'
            }`}
          >
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div>
                <div className='flex flex-wrap items-center gap-3'>
                  <p className='text-sm font-medium text-slate-950'>{item.titre}</p>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.18em] ${
                      item.lu
                        ? 'border-slate-200 bg-slate-100 text-slate-500'
                        : `${accentClassName} border-current/10`
                    }`}
                  >
                    {item.lu ? 'Lue' : 'Nouvelle'}
                  </span>
                </div>
                <p className='mt-3 text-sm leading-6 text-slate-900'>{item.message}</p>
                <p className='mt-2 text-sm text-slate-700'>{formatDate(item.createdAt)}</p>
              </div>

              {!item.lu ? (
                <button
                  type='button'
                  onClick={() => onMarkAsRead(item.id)}
                  className='rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 transition hover:bg-slate-50'
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
