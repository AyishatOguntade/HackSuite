import type { ApiError } from '@hacksuite/shared'

const BASE = '/api'

class ApiClient {
  private getToken(): string | null {
    try {
      const state = JSON.parse(localStorage.getItem('auth-store') ?? '{}')
      return state?.state?.accessToken ?? null
    } catch {
      return null
    }
  }

  private async refreshToken(): Promise<string | null> {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return null
      const data = await res.json()
      return data?.data?.accessToken ?? null
    } catch {
      return null
    }
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    retry = true
  ): Promise<T> {
    const token = this.getToken()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body != null ? JSON.stringify(body) : undefined,
    })

    if (res.status === 401 && retry) {
      const newToken = await this.refreshToken()
      if (newToken) {
        // Update store and retry
        const state = JSON.parse(localStorage.getItem('auth-store') ?? '{}')
        if (state?.state) {
          state.state.accessToken = newToken
          localStorage.setItem('auth-store', JSON.stringify(state))
        }
        return this.request<T>(method, path, body, false)
      }
    }

    if (!res.ok) {
      const error: ApiError = await res.json().catch(() => ({
        type: 'unknown',
        title: 'Request Failed',
        status: res.status,
        detail: res.statusText,
        instance: path,
      }))
      throw error
    }

    return res.json()
  }

  get<T>(path: string) {
    return this.request<T>('GET', path)
  }
  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body)
  }
  patch<T>(path: string, body?: unknown) {
    return this.request<T>('PATCH', path, body)
  }
  delete<T>(path: string) {
    return this.request<T>('DELETE', path)
  }
}

export const apiClient = new ApiClient()
