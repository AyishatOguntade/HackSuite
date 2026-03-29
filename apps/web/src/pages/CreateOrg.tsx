import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useAuthStore } from '../stores/auth'
import { apiClient } from '../api/client'
import type { ApiError } from '@hacksuite/shared'

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CreateOrg() {
  const navigate = useNavigate()
  const { setAuth, user } = useAuthStore()
  const [form, setForm] = useState({
    orgName: '',
    orgSlug: '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleNameChange = (name: string) => {
    setForm((f) => ({ ...f, orgName: name, orgSlug: slugify(name) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      const email = user?.email ?? prompt('Enter your email:') ?? ''
      const res = await apiClient.post<{
        data: {
          user: { id: string; email: string; firstName: string; lastName: string }
          org: { id: string; name: string; slug: string }
          accessToken: string
        }
      }>('/auth/signup', { ...form, email })

      setAuth(
        {
          id: res.data.user.id,
          email: res.data.user.email,
          firstName: res.data.user.firstName,
          lastName: res.data.user.lastName,
          emailVerified: true,
          createdAt: '',
        },
        {
          id: res.data.org.id,
          name: res.data.org.name,
          slug: res.data.org.slug,
          contactEmail: res.data.user.email,
          createdAt: '',
        },
        res.data.accessToken
      )
      navigate(`/org/${res.data.org.slug}/dashboard`)
    } catch (err) {
      const e = err as ApiError
      if (e.status === 409) setErrors({ orgSlug: 'This slug is already taken' })
      else setErrors({ _: e.detail ?? 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-700">HackSuite</h1>
          <p className="mt-2 text-slate-500">Set up your hackathon organization</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Create organization</h2>
            {!user && (
              <>
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
              </>
            )}
            <Input
              label="Organization name"
              value={form.orgName}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="URI Hacks"
              required
            />
            <Input
              label="URL slug"
              value={form.orgSlug}
              onChange={(e) => setForm((f) => ({ ...f, orgSlug: e.target.value }))}
              hint={`Your org will be at hacksuite.app/${form.orgSlug}`}
              error={errors.orgSlug}
              required
            />
            {errors._ && <p className="text-sm text-red-600">{errors._}</p>}
            <Button type="submit" loading={loading} className="w-full">
              Create organization
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
