import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Sidebar } from '../components/layout/Sidebar'
import { apiClient } from '../api/client'
import CreateEvent from './events/CreateEvent'
import type { EventStatus } from '@hacksuite/shared'

interface OrgDetails {
  id: string
  name: string
  slug: string
  contactEmail: string
  memberCount: number
  createdAt: string
}

interface EventItem {
  id: string
  orgId: string
  name: string
  slug: string
  startDate: string | null
  endDate: string | null
  status: EventStatus
  createdAt: string
}

const EVENT_STATUS_COLOR: Record<EventStatus, 'gray' | 'blue' | 'green' | 'yellow'> = {
  draft: 'gray',
  published: 'blue',
  active: 'green',
  closed: 'yellow',
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Dashboard() {
  const { slug } = useParams<{ slug: string }>()
  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['org', slug],
    queryFn: () => apiClient.get<{ data: OrgDetails }>(`/orgs/${slug}`),
    enabled: !!slug,
  })

  const { data: eventsData } = useQuery({
    queryKey: ['events', slug],
    queryFn: () => apiClient.get<{ data: EventItem[] }>(`/orgs/${slug}/events`),
    enabled: !!slug,
  })

  const org = data?.data
  const events = eventsData?.data ?? []

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {isLoading && (
            <div className="flex items-center justify-center py-24 text-slate-400">
              Loading...
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 p-4 text-red-700">
              Failed to load organization
            </div>
          )}
          {org && (
            <>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{org.name}</h1>
                  <p className="mt-1 text-sm text-slate-500">
                    {org.contactEmail} &middot; {org.memberCount} member
                    {org.memberCount !== 1 ? 's' : ''}
                  </p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>Create Event</Button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
                {[
                  { label: 'Events', value: String(events.length), color: 'blue' as const },
                  { label: 'Team Members', value: String(org.memberCount), color: 'purple' as const },
                  { label: 'Active Events', value: String(events.filter((e) => e.status === 'active').length), color: 'green' as const },
                ].map((stat) => (
                  <Card key={stat.label}>
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                      <Badge color={stat.color}>{stat.value}</Badge>
                    </div>
                    <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                  </Card>
                ))}
              </div>

              <Card
                header={
                  <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-slate-900">Events</h2>
                    <Button size="sm" onClick={() => setCreateOpen(true)}>
                      New Event
                    </Button>
                  </div>
                }
              >
                {events.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-3 text-4xl font-bold text-slate-300">[ ]</div>
                    <h3 className="text-lg font-medium text-slate-900">No events yet</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Create your first hackathon to get started
                    </p>
                    <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                      Create Event
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 -mx-6 -my-4">
                    {events.map((event) => (
                      <Link
                        key={event.id}
                        to={`/org/${slug}/events/${event.slug}/registration`}
                        className="flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-slate-900">{event.name}</p>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {formatDate(event.startDate)}
                            {event.endDate && ` — ${formatDate(event.endDate)}`}
                          </p>
                        </div>
                        <Badge color={EVENT_STATUS_COLOR[event.status] ?? 'gray'}>
                          {event.status}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </main>

      <CreateEvent open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}
