import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Card } from '../components/ui/Card'
import { useAuthStore } from '../stores/auth'
import { apiClient } from '../api/client'
import type { ApiError } from '@hacksuite/shared'

export default function SignIn() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.post<{
        data: {
          user?: {
            id: string
            email: string
            firstName: string | null
            lastName: string | null
          }
          orgId?: string | null
          accessToken?: string
        }
      }>('/auth/login', { email })

      if (res.data.accessToken && res.data.user) {
        setAuth(
          {
            id: res.data.user.id,
            email: res.data.user.email,
            firstName: res.data.user.firstName,
            lastName: res.data.user.lastName,
            emailVerified: true,
            createdAt: '',
          },
          null,
          res.data.accessToken
        )
        navigate(res.data.orgId ? `/org/${res.data.orgId}/dashboard` : '/create-org')
      } else {
        setSent(true)
      }
    } catch (err) {
      const e = err as ApiError
      setError(e.detail ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md text-center">
          <div className="py-4">
            <div className="mb-4 text-4xl">---</div>
            <h2 className="text-xl font-semibold text-slate-900">Check your email</h2>
            <p className="mt-2 text-sm text-slate-500">
              We sent a login link to <strong>{email}</strong>
            </p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-primary-700">HackSuite</h1>
          <p className="mt-2 text-slate-500">The OS for university hackathons</p>
        </div>
        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold text-slate-900">Sign in</h2>
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@university.edu"
              required
              error={error}
            />
            <Button type="submit" loading={loading} className="w-full">
              Continue with email
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            New to HackSuite?{' '}
            <Link to="/create-org" className="text-primary-700 hover:underline font-medium">
              Create an organization
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
