import { NavLink, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import { useAuthStore } from '../../stores/auth'

const modules = [
  { label: 'Dashboard', path: '', icon: 'D' },
  { label: 'Registration', path: '/registration', icon: 'R' },
  { label: 'Check-in', path: '/checkin', icon: 'C' },
  { label: 'Schedule', path: '/schedule', icon: 'S' },
  { label: 'Judging', path: '/judging', icon: 'J' },
  { label: 'Sponsors', path: '/sponsors', icon: 'Sp' },
  { label: 'Finance', path: '/finance', icon: 'F' },
  { label: 'Marketing', path: '/marketing', icon: 'M' },
  { label: 'Reports', path: '/reports', icon: 'Rp' },
]

export function Sidebar() {
  const { slug } = useParams()
  const { org, signOut } = useAuthStore()
  const base = `/org/${slug}`

  return (
    <aside className="flex h-full w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-700 text-white text-sm font-bold">
          {org?.name?.[0] ?? 'H'}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{org?.name ?? 'HackSuite'}</p>
          <p className="text-xs text-slate-500">Organizer</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {modules.map((mod) => (
          <NavLink
            key={mod.path}
            to={`${base}/dashboard${mod.path}`}
            end={mod.path === ''}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors mb-0.5',
                isActive
                  ? 'bg-primary-50 text-primary-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              )
            }
          >
            <span className="w-5 text-center text-xs font-bold text-slate-400">{mod.icon}</span>
            {mod.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 px-3 py-3">
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <span className="w-5 text-center text-xs font-bold text-slate-400">X</span>
          Sign out
        </button>
      </div>
    </aside>
  )
}
