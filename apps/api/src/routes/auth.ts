import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { withTransaction, query } from '../db/index.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js'
import { sendWelcomeEmail } from '../lib/email.js'
import { nanoid } from 'nanoid'
import crypto from 'crypto'
import type { JwtPayload } from '@hacksuite/shared'

const signupSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  orgName: z.string().min(2).max(100),
  orgSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
})

const loginSchema = z.object({
  email: z.string().email(),
})

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const REFRESH_TOKEN_TTL_DAYS = 7

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /auth/signup — create user + org
  fastify.post('/auth/signup', async (request, reply) => {
    const result = signupSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(422).send({
        type: 'https://api.hacksuite.app/errors/validation',
        title: 'Validation Error',
        status: 422,
        detail: result.error.issues.map((i) => i.message).join(', '),
        instance: request.url,
      })
    }

    const { email, firstName, lastName, orgName, orgSlug } = result.data

    try {
      const { user, org } = await withTransaction(async (client) => {
        // Check slug uniqueness
        const slugCheck = await client.query(
          'SELECT id FROM organizations WHERE slug = $1',
          [orgSlug]
        )
        if (slugCheck.rowCount && slugCheck.rowCount > 0) {
          throw Object.assign(new Error('Slug already taken'), { code: 'SLUG_TAKEN' })
        }

        // Create or get user
        let userId: string
        const existingUser = await client.query<{ id: string }>(
          'SELECT id FROM users WHERE email = $1',
          [email]
        )
        if (existingUser.rowCount && existingUser.rowCount > 0) {
          userId = existingUser.rows[0].id
        } else {
          const newUser = await client.query<{ id: string }>(
            'INSERT INTO users (email, first_name, last_name, email_verified) VALUES ($1, $2, $3, true) RETURNING id',
            [email, firstName, lastName]
          )
          userId = newUser.rows[0].id
        }

        // Create org
        const newOrg = await client.query<{ id: string }>(
          'INSERT INTO organizations (name, slug, contact_email) VALUES ($1, $2, $3) RETURNING id',
          [orgName, orgSlug, email]
        )
        const orgId = newOrg.rows[0].id

        // Add as owner
        await client.query(
          'INSERT INTO organization_members (org_id, user_id, role, module_access) VALUES ($1, $2, $3, $4)',
          [
            orgId,
            userId,
            'owner',
            ['registration', 'checkin', 'schedule', 'judging', 'sponsors', 'finance', 'marketing', 'reporting'],
          ]
        )

        const user = { id: userId, email, firstName, lastName }
        const org = { id: orgId, name: orgName, slug: orgSlug }
        return { user, org }
      })

      // Issue tokens
      const payload: JwtPayload = {
        userId: user.id,
        orgId: org.id,
        roles: ['owner'],
        eventPermissions: {},
      }
      const accessToken = await signAccessToken(payload)
      const refreshFamily = nanoid()
      const refreshToken = await signRefreshToken(user.id, refreshFamily)
      const tokenHash = hashToken(refreshToken)
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000)

      await query(
        'INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at) VALUES ($1, $2, $3, $4)',
        [user.id, tokenHash, refreshFamily, expiresAt]
      )

      reply.setCookie('refresh_token', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/auth/refresh',
        expires: expiresAt,
      })

      await sendWelcomeEmail(user.email, org.name)

      return reply.status(201).send({
        data: { user, org, accessToken },
        message: 'Organization created successfully',
      })
    } catch (err: unknown) {
      const e = err as { code?: string; message: string }
      if (e.code === 'SLUG_TAKEN') {
        return reply.status(409).send({
          type: 'https://api.hacksuite.app/errors/conflict',
          title: 'Slug Already Taken',
          status: 409,
          detail: `The slug "${orgSlug}" is already in use`,
          instance: request.url,
        })
      }
      fastify.log.error(err)
      return reply.status(500).send({
        type: 'https://api.hacksuite.app/errors/internal',
        title: 'Internal Server Error',
        status: 500,
        detail: 'An unexpected error occurred',
        instance: request.url,
      })
    }
  })

  // POST /auth/login — issue tokens for existing user
  fastify.post('/auth/login', async (request, reply) => {
    const result = loginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(422).send({
        type: 'https://api.hacksuite.app/errors/validation',
        title: 'Validation Error',
        status: 422,
        detail: 'Invalid email address',
        instance: request.url,
      })
    }

    const { email } = result.data
    const userResult = await query<{
      id: string
      first_name: string
      last_name: string
      email: string
    }>('SELECT id, first_name, last_name, email FROM users WHERE email = $1', [email])

    if (!userResult.rowCount || userResult.rowCount === 0) {
      // Return 200 even for unknown emails (security: don't reveal existence)
      return reply.send({ data: { message: 'If that email exists, a login link has been sent.' } })
    }

    const user = userResult.rows[0]

    // Get org membership
    const memberResult = await query<{ org_id: string; role: string }>(
      'SELECT org_id, role FROM organization_members WHERE user_id = $1 LIMIT 1',
      [user.id]
    )
    const orgId = memberResult.rows[0]?.org_id ?? null
    const role = memberResult.rows[0]?.role ?? 'organizer'

    const payload: JwtPayload = {
      userId: user.id,
      orgId,
      roles: [role as 'owner' | 'admin' | 'organizer'],
      eventPermissions: {},
    }

    const accessToken = await signAccessToken(payload)
    const refreshFamily = nanoid()
    const refreshToken = await signRefreshToken(user.id, refreshFamily)
    const tokenHash = hashToken(refreshToken)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000)

    await query(
      'INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at) VALUES ($1, $2, $3, $4)',
      [user.id, tokenHash, refreshFamily, expiresAt]
    )

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/auth/refresh',
      expires: expiresAt,
    })

    return reply.send({
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
        orgId,
        accessToken,
      },
    })
  })

  // POST /auth/refresh — rotate refresh token
  fastify.post('/auth/refresh', async (request, reply) => {
    const refreshToken = request.cookies['refresh_token']
    if (!refreshToken) {
      return reply.status(401).send({
        type: 'https://api.hacksuite.app/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'No refresh token',
        instance: request.url,
      })
    }

    try {
      const { userId, family } = await verifyRefreshToken(refreshToken)
      const tokenHash = hashToken(refreshToken)

      // Check token exists and not used
      const tokenResult = await query<{
        id: string
        used_at: string | null
        expires_at: string
      }>(
        'SELECT id, used_at, expires_at FROM refresh_tokens WHERE token_hash = $1 AND user_id = $2',
        [tokenHash, userId]
      )

      if (!tokenResult.rowCount || tokenResult.rowCount === 0) {
        // Token reuse detected — invalidate entire family
        await query('DELETE FROM refresh_tokens WHERE family = $1', [family])
        return reply.status(401).send({
          type: 'https://api.hacksuite.app/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Token reuse detected — please sign in again',
          instance: request.url,
        })
      }

      const tokenRow = tokenResult.rows[0]
      if (tokenRow.used_at) {
        await query('DELETE FROM refresh_tokens WHERE family = $1', [family])
        return reply.status(401).send({
          type: 'https://api.hacksuite.app/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Token already used',
          instance: request.url,
        })
      }

      // Mark as used
      await query('UPDATE refresh_tokens SET used_at = NOW() WHERE id = $1', [tokenRow.id])

      // Get user + org
      const memberResult = await query<{ org_id: string; role: string }>(
        'SELECT org_id, role FROM organization_members WHERE user_id = $1 LIMIT 1',
        [userId]
      )
      const orgId = memberResult.rows[0]?.org_id ?? null
      const role = memberResult.rows[0]?.role ?? 'organizer'

      const payload: JwtPayload = {
        userId,
        orgId,
        roles: [role as 'owner' | 'admin' | 'organizer'],
        eventPermissions: {},
      }

      const newAccessToken = await signAccessToken(payload)
      const newRefreshToken = await signRefreshToken(userId, family)
      const newHash = hashToken(newRefreshToken)
      const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 86400 * 1000)

      await query(
        'INSERT INTO refresh_tokens (user_id, token_hash, family, expires_at) VALUES ($1, $2, $3, $4)',
        [userId, newHash, family, expiresAt]
      )

      reply.setCookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/auth/refresh',
        expires: expiresAt,
      })

      return reply.send({ data: { accessToken: newAccessToken } })
    } catch {
      return reply.status(401).send({
        type: 'https://api.hacksuite.app/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Invalid refresh token',
        instance: request.url,
      })
    }
  })

  // POST /auth/logout
  fastify.post('/auth/logout', async (request, reply) => {
    const refreshToken = request.cookies['refresh_token']
    if (refreshToken) {
      const tokenHash = hashToken(refreshToken)
      await query('DELETE FROM refresh_tokens WHERE token_hash = $1', [tokenHash])
    }
    reply.clearCookie('refresh_token', { path: '/auth/refresh' })
    return reply.send({ data: { message: 'Logged out successfully' } })
  })
}

export default authRoutes
