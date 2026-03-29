import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { apiClient } from '../../api/client'

interface CreateEventProps {
  open: boolean
  onClose: () => void
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)
}

interface EventData {
  id: string
  name: string
  slug: string
  status: string
  orgId: string
}

export default function CreateEvent({ open, onClose }: CreateEventProps) {
  const { slug: orgSlug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (body: { name: string; slug: string; startDate?: string; endDate?: string }) =>
      apiClient.post<{ data: EventData }>(`/orgs/${orgSlug}/events`, body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['events', orgSlug] })
      const event = data.data
      navigate(`/org/${orgSlug}/events/${event.slug}/registration`)
      onClose()
    },
    onError: (err: unknown) => {
      const apiErr = err as { detail?: string }
      setError(apiErr?.detail ?? 'Failed to create event')
    },
  })

  function handleNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setName(val)
    if (!slugManuallyEdited) {
      setSlug(slugify(val))
    }
  }

  function handleSlugChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSlugManuallyEdited(true)
    setSlug(e.target.value)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim() || !slug.trim()) {
      setError('Name and slug are required')
      return
    }
    mutation.mutate({
      name: name.trim(),
      slug: slug.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    })
  }

  function handleClose() {
    setName('')
    setSlug('')
    setStartDate('')
    setEndDate('')
    setSlugManuallyEdited(false)
    setError(null)
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Event">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Event Name"
          value={name}
          onChange={handleNameChange}
          placeholder="HackURI 2026"
          required
        />
        <Input
          label="Slug"
          value={slug}
          onChange={handleSlugChange}
          placeholder="hackuri-2026"
          hint="Lowercase letters, numbers, and hyphens only"
        />
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">Start Date</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-slate-700">End Date</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Create Event
          </Button>
        </div>
      </form>
    </Modal>
  )
}
