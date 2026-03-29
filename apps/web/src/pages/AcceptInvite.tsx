import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useAuthStore } from '../stores/auth'
import { apiClient } from '../api/client'
import type { ApiError } from '@hacksuite/shared'

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({ firstName: '', lastName: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.post<{
        data: {
          user: { id: string; email: string }
          orgId: string
          role: string
          accessToken: string
        }
      }>(`/invites/${token}/accept`, form)

      setAuth(
        {
          id: res.data.user.id,
          email: res.data.user.email,
          firstName: form.firstName || null,
          lastName: form.lastName || null,
          emailVerified: true,
          createdAt: '',
        },
        null,
        res.data.accessToken
      )
      navigate(`/org/${res.data.orgId}/dashboard`)
    } catch (err) {
      const e = err as ApiError
      if (e.status === 409) setError('This invitation has already been accepted')
      else if (e.status === 410) setError('This invitation link has expired')
      else if (e.status === 404) setError('Invitation not found')
      else setError(e.detail ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-700">HackSuite</h1>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Accept Invitation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Enter your name to complete your account
              </p>
            </div>
            <Input
              label="First name"
              value={form.firstName}
              onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
              required
            />
            <Input
              label="Last name"
              value={form.lastName}
              onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
              required
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" loading={loading} className="w-full">
              Accept &amp; Join
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
