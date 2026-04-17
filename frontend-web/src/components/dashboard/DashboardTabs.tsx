import type { ComponentType } from 'react'

export type DashboardTab = {
  id: string
  label: string
  icon?: ComponentType<{ className?: string }>
  badge?: string | number
}

type DashboardTabsProps = {
  value: string
  onChange: (value: string) => void
  tabs: DashboardTab[]
}

export function DashboardTabs({ value, onChange, tabs }: DashboardTabsProps) {
  return (
    <div className='dashboard-card rounded-[1.6rem] p-2'>
      <div className='no-scrollbar flex gap-2 overflow-x-auto'>
        {tabs.map((tab) => {
          const active = tab.id === value
          const Icon = tab.icon

          return (
            <button
              key={tab.id}
              type='button'
              onClick={() => onChange(tab.id)}
              className={`group inline-flex items-center gap-2 rounded-[1.25rem] px-4 py-3 text-sm font-medium transition ${
                active
                  ? 'bg-[linear-gradient(135deg,rgba(82,174,255,0.22),rgba(25,185,147,0.16))] text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]'
                  : 'text-slate-700 hover:bg-white/70'
              }`}
            >
              {Icon ? (
                <Icon
                  className={`h-4 w-4 ${
                    active ? 'text-emerald-700' : 'text-slate-500 group-hover:text-slate-700'
                  }`}
                />
              ) : null}
              <span className='whitespace-nowrap'>{tab.label}</span>
              {tab.badge !== undefined ? (
                <span
                  className={`ml-1 rounded-full border px-2 py-1 text-[10px] uppercase tracking-[0.16em] ${
                    active
                      ? 'border-white/50 bg-white/70 text-slate-700'
                      : 'border-slate-200 bg-white text-slate-500'
                  }`}
                >
                  {tab.badge}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

