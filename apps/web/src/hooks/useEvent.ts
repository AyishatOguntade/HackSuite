import { useQuery } from '@tanstack/react-query'
import { apiClient } from '../api/client'

export function useEvent(orgSlug: string | undefined, eventSlug: string | undefined) {
  return useQuery({
    queryKey: ['event', orgSlug, eventSlug],
    queryFn: () =>
      apiClient.get<{ data: { id: string; name: string; slug: string; status: string; orgId: string } }>(
        `/orgs/${orgSlug}/events/${eventSlug}`
      ),
    enabled: !!orgSlug && !!eventSlug,
  })
}
