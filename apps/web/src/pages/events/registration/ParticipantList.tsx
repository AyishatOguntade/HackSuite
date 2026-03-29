import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { Button } from '../../../components/ui/Button'
import { Input } from '../../../components/ui/Input'
import { Badge } from '../../../components/ui/Badge'
import { apiClient } from '../../../api/client'
import { useEvent } from '../../../hooks/useEvent'
import type { ParticipantStatus } from '@hacksuite/shared'

interface Participant {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  school: string | null
  status: ParticipantStatus
  qrCode: string | null
  checkedInAt: string | null
  createdAt: string
}

const STATUS_TABS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Applied', value: 'applied' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Waitlisted', value: 'waitlisted' },
  { label: 'Checked In', value: 'checked_in' },
  { label: 'Rejected', value: 'rejected' },
]

const STATUS_COLORS: Record<ParticipantStatus, 'blue' | 'green' | 'yellow' | 'purple' | 'red' | 'gray'> = {
  applied: 'blue',
  accepted: 'green',
  waitlisted: 'yellow',
  confirmed: 'green',
  checked_in: 'purple',
  no_show: 'gray',
  rejected: 'red',
}

function fullName(p: Participant): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || p.email
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ParticipantList() {
  const { slug: orgSlug, eventSlug } = useParams<{ slug: string; eventSlug: string }>()
  const { data: eventData } = useEvent(orgSlug, eventSlug)
  const eventId = eventData?.data?.id
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cursor, setCursor] = useState<string | undefined>(undefined)
  const [allParticipants, setAllParticipants] = useState<Participant[]>([])
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false)

  const queryKey = ['participants', eventId, statusFilter, search, cursor]

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (search) params.set('search', search)
      if (cursor) params.set('after', cursor)
      params.set('limit', '50')
      return apiClient.get<{ data: Participant[]; nextCursor: string | null }>(
        `/events/${eventId}/participants?${params.toString()}`
      )
    },
    enabled: !!eventId,
  })

  // Append new data when cursor changes, reset when filters change
  useState(() => {
    if (data?.data && !hasLoadedInitial) {
      setAllParticipants(data.data)
      setHasLoadedInitial(true)
    }
  })

  const participants = data?.data ?? []
  const nextCursor = data?.nextCursor

  const updateMutation = useMutation({
    mutationFn: ({ participantId, status, note }: { participantId: string; status: string; note?: string }) =>
      apiClient.patch(`/events/${eventId}/participants/${participantId}`, { status, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', eventId] })
      setSelected(new Set())
    },
  })

  const bulkMutation = useMutation({
    mutationFn: ({ participantIds, status }: { participantIds: string[]; status: string }) =>
      apiClient.post(`/events/${eventId}/participants/bulk`, { participantIds, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['participants', eventId] })
      setSelected(new Set())
    },
  })

  function handleStatusFilter(s: string) {
    setStatusFilter(s)
    setCursor(undefined)
    setSelected(new Set())
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setCursor(undefined)
    setSelected(new Set())
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === participants.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(participants.map((p) => p.id)))
    }
  }

  function handleExport() {
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    if (search) params.set('search', search)
    window.open(`/api/events/${eventId}/participants/export?${params.toString()}`, '_blank')
  }

  const selectedArray = Array.from(selected)

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Participants</h1>
        <Button variant="secondary" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </div>

      {/* Search + status filters */}
      <div className="mb-4 flex items-center gap-4 flex-wrap">
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            placeholder="Search name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-64"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
        </form>
      </div>

      {/* Status tabs */}
      <div className="mb-4 flex gap-1 border-b border-slate-200">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleStatusFilter(tab.value)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              statusFilter === tab.value
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-primary-50 border border-primary-200 px-4 py-3">
          <span className="text-sm font-medium text-primary-700">{selected.size} selected</span>
          <Button
            size="sm"
            onClick={() => bulkMutation.mutate({ participantIds: selectedArray, status: 'accepted' })}
            loading={bulkMutation.isPending}
          >
            Accept Selected
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => bulkMutation.mutate({ participantIds: selectedArray, status: 'waitlisted' })}
            loading={bulkMutation.isPending}
          >
            Waitlist Selected
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => bulkMutation.mutate({ participantIds: selectedArray, status: 'rejected' })}
            loading={bulkMutation.isPending}
          >
            Reject Selected
          </Button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-sm text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">Loading...</div>
      ) : participants.length === 0 ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          No participants found
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selected.size === participants.length && participants.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Name</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">School</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Applied</th>
                <th className="px-4 py-3 text-left font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleSelect(p.id)}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{fullName(p)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.email}</td>
                  <td className="px-4 py-3 text-slate-500">{p.school ?? '—'}</td>
                  <td className="px-4 py-3">
                    <Badge color={STATUS_COLORS[p.status] ?? 'gray'}>
                      {p.status.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {p.status !== 'accepted' && p.status !== 'checked_in' && (
                        <button
                          onClick={() => updateMutation.mutate({ participantId: p.id, status: 'accepted' })}
                          className="rounded px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
                        >
                          Accept
                        </button>
                      )}
                      {p.status !== 'waitlisted' && p.status !== 'checked_in' && (
                        <button
                          onClick={() => updateMutation.mutate({ participantId: p.id, status: 'waitlisted' })}
                          className="rounded px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                        >
                          Waitlist
                        </button>
                      )}
                      {p.status !== 'rejected' && p.status !== 'checked_in' && (
                        <button
                          onClick={() => updateMutation.mutate({ participantId: p.id, status: 'rejected' })}
                          className="rounded px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Load more */}
      {nextCursor && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => setCursor(nextCursor)}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
