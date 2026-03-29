import { NavLink, useParams, Outlet } from 'react-router-dom'
import { clsx } from 'clsx'
import { Sidebar } from '../../components/layout/Sidebar'
import { useEvent } from '../../hooks/useEvent'

const eventModules = [
  { label: 'Registration', path: 'registration' },
  { label: 'Form Builder', path: 'registration/form' },
  { label: 'Landing Page', path: 'registration/landing' },
  { label: 'Check-in', path: 'checkin' },
  { label: 'Schedule', path: 'schedule' },
  { label: 'Judging', path: 'judging' },
  { label: 'Sponsors', path: 'sponsors' },
  { label: 'Finance', path: 'finance' },
  { label: 'Marketing', path: 'marketing' },
  { label: 'Reports', path: 'reports' },
]

export default function EventLayout() {
  const { slug, eventSlug } = useParams<{ slug: string; eventSlug: string }>()
  const { data } = useEvent(slug, eventSlug)
  const event = data?.data
  const base = `/org/${slug}/events/${eventSlug}`

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-1 overflow-hidden">
        {/* Event sub-nav */}
        <aside className="w-52 flex-shrink-0 border-r border-slate-200 bg-white overflow-y-auto">
          <div className="px-4 py-4 border-b border-slate-200">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Event</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 truncate">
              {event?.name ?? eventSlug}
            </p>
          </div>
          <nav className="px-2 py-2">
            {eventModules.map((mod) => (
              <NavLink
                key={mod.path}
                to={`${base}/${mod.path}`}
                className={({ isActive }) =>
                  clsx(
                    'block rounded-lg px-3 py-2 text-sm transition-colors mb-0.5',
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )
                }
              >
                {mod.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
