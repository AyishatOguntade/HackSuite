import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { query, withTransaction } from '../db/index.js'
import { sendInviteEmail } from '../lib/email.js'
import { signAccessToken, signRefreshToken } from '../lib/jwt.js'
import { nanoid } from 'nanoid'
import crypto from 'crypto'
import { config } from '../config.js'
import type { JwtPayload } from '@hacksuite/shared'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'organizer']),
  moduleAccess: z
    .array(
      z.enum([
        'registration',
        'checkin',
        'schedule',
        'judging',
        'sponsors',
        'finance',
        'marketing',
        'reporting',
      ])
    )
    .default([]),
})

const acceptInviteSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
})

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

const orgRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /orgs/:slug — get org details
  fastify.get(
    '/orgs/:slug',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }

      const orgResult = await query<{
        id: string
        name: string
        slug: string
        contact_email: string
        created_at: string
      }>('SELECT id, name, slug, contact_email, created_at FROM organizations WHERE slug = $1', [
        slug,
      ])

      if (!orgResult.rowCount || orgResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Organization '${slug}' not found`,
          instance: request.url,
        })
      }

      const org = orgResult.rows[0]

      // Verify user is a member
      const memberCheck = await query(
        'SELECT id FROM organization_members WHERE org_id = $1 AND user_id = $2',
        [org.id, request.user.userId]
      )
      if (!memberCheck.rowCount || memberCheck.rowCount === 0) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'You are not a member of this organization',
          instance: request.url,
        })
      }

      const memberCount = await query<{ count: string }>(
        'SELECT COUNT(*) FROM organization_members WHERE org_id = $1',
        [org.id]
      )

      return reply.send({
        data: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          contactEmail: org.contact_email,
          createdAt: org.created_at,
          memberCount: parseInt(memberCount.rows[0].count),
        },
      })
    }
  )

  // GET /orgs/:slug/members
  fastify.get(
    '/orgs/:slug/members',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }

      const orgResult = await query<{ id: string }>(
        'SELECT id FROM organizations WHERE slug = $1',
        [slug]
      )
      if (!orgResult.rowCount || orgResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Org not found',
          instance: request.url,
        })
      }
      const orgId = orgResult.rows[0].id

      const members = await query<{
        member_id: string
        user_id: string
        email: string
        first_name: string
        last_name: string
        role: string
        module_access: string[]
        joined_at: string
      }>(
        `SELECT om.id as member_id, u.id as user_id, u.email, u.first_name, u.last_name,
                om.role, om.module_access, om.created_at as joined_at
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         WHERE om.org_id = $1
         ORDER BY om.created_at`,
        [orgId]
      )

      return reply.send({ data: members.rows })
    }
  )

  // POST /orgs/:slug/invites — create invite
  fastify.post(
    '/orgs/:slug/invites',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }
      const result = inviteSchema.safeParse(request.body)

      if (!result.success) {
        return reply.status(422).send({
          type: 'https://api.hacksuite.app/errors/validation',
          title: 'Validation Error',
          status: 422,
          detail: result.error.issues.map((i) => i.message).join(', '),
          instance: request.url,
        })
      }

      const orgResult = await query<{ id: string; name: string }>(
        'SELECT id, name FROM organizations WHERE slug = $1',
        [slug]
      )
      if (!orgResult.rowCount || orgResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Org not found',
          instance: request.url,
        })
      }
      const org = orgResult.rows[0]

      // Check invoker is admin or owner
      const memberCheck = await query<{ role: string }>(
        'SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2',
        [org.id, request.user.userId]
      )
      if (
        !memberCheck.rowCount ||
        !['admin', 'owner'].includes(memberCheck.rows[0]?.role)
      ) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Only admins and owners can invite members',
          instance: request.url,
        })
      }

      const { email, role, moduleAccess } = result.data
      const token = nanoid(32)
      const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000)

      await query(
        'INSERT INTO invitations (org_id, email, role, module_access, token, invited_by, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [org.id, email, role, moduleAccess, token, request.user.userId, expiresAt]
      )

      const acceptUrl = `${config.appUrl}/invites/${token}`
      await sendInviteEmail(email, org.name, role, acceptUrl)

      return reply.status(201).send({
        data: { message: `Invitation sent to ${email}`, expiresAt },
      })
    }
  )

  // POST /invites/:token/accept
  fastify.post('/invites/:token/accept', async (request, reply) => {
    const { token } = request.params as { token: string }
    const result = acceptInviteSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(422).send({
        type: 'https://api.hacksuite.app/errors/validation',
        title: 'Validation Error',
        status: 422,
        detail: 'Invalid input',
        instance: request.url,
      })
    }

    const inviteResult = await query<{
      id: string
      org_id: string
      email: string
      role: string
      module_access: string[]
      accepted_at: string | null
      expires_at: string
    }>(
      'SELECT id, org_id, email, role, module_access, accepted_at, expires_at FROM invitations WHERE token = $1',
      [token]
    )

    if (!inviteResult.rowCount || inviteResult.rowCount === 0) {
      return reply.status(404).send({
        type: 'https://api.hacksuite.app/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Invitation not found',
        instance: request.url,
      })
    }

    const invite = inviteResult.rows[0]

    if (invite.accepted_at) {
      return reply.status(409).send({
        type: 'https://api.hacksuite.app/errors/conflict',
        title: 'Already Used',
        status: 409,
        detail: 'This invitation link has already been used',
        instance: request.url,
      })
    }

    if (new Date(invite.expires_at) < new Date()) {
      return reply.status(410).send({
        type: 'https://api.hacksuite.app/errors/expired',
        title: 'Link Expired',
        status: 410,
        detail: 'This invitation link has expired',
        instance: request.url,
      })
    }

    const { firstName, lastName } = result.data

    const { user } = await withTransaction(async (client) => {
      // Get or create user
      let userId: string
      const existing = await client.query<{ id: string }>(
        'SELECT id FROM users WHERE email = $1',
        [invite.email]
      )
      if (existing.rowCount && existing.rowCount > 0) {
        userId = existing.rows[0].id
      } else {
        const newUser = await client.query<{ id: string }>(
          'INSERT INTO users (email, first_name, last_name, email_verified) VALUES ($1, $2, $3, true) RETURNING id',
          [invite.email, firstName ?? null, lastName ?? null]
        )
        userId = newUser.rows[0].id
      }

      // Add to org
      await client.query(
        `INSERT INTO organization_members (org_id, user_id, role, module_access)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (org_id, user_id) DO UPDATE SET role = $3, module_access = $4`,
        [invite.org_id, userId, invite.role, invite.module_access]
      )

      // Mark invite accepted
      await client.query('UPDATE invitations SET accepted_at = NOW() WHERE id = $1', [invite.id])

      return { user: { id: userId, email: invite.email } }
    })

    // Issue tokens
    const payload: JwtPayload = {
      userId: user.id,
      orgId: invite.org_id,
      roles: [invite.role as 'admin' | 'organizer'],
      eventPermissions: {},
    }
    const accessToken = await signAccessToken(payload)
    const refreshFamily = nanoid()
    const refreshToken = await signRefreshToken(user.id, refreshFamily)
    const tokenHash = hashToken(refreshToken)
    const expiresAt = new Date(Date.now() + 7 * 86400 * 1000)

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

    return reply.status(200).send({
      data: {
        user: { id: user.id, email: user.email },
        orgId: invite.org_id,
        role: invite.role,
        accessToken,
      },
    })
  })

  // DELETE /orgs/:slug/members/:userId
  fastify.delete(
    '/orgs/:slug/members/:userId',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { slug, userId } = request.params as { slug: string; userId: string }

      const orgResult = await query<{ id: string }>(
        'SELECT id FROM organizations WHERE slug = $1',
        [slug]
      )
      if (!orgResult.rowCount || orgResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Org not found',
          instance: request.url,
        })
      }
      const orgId = orgResult.rows[0].id

      const invokerCheck = await query<{ role: string }>(
        'SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2',
        [orgId, request.user.userId]
      )
      if (!invokerCheck.rowCount || invokerCheck.rows[0].role !== 'owner') {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Only owners can remove members',
          instance: request.url,
        })
      }

      if (userId === request.user.userId) {
        return reply.status(400).send({
          type: 'https://api.hacksuite.app/errors/bad-request',
          title: 'Bad Request',
          status: 400,
          detail: 'Cannot remove yourself',
          instance: request.url,
        })
      }

      await query('DELETE FROM organization_members WHERE org_id = $1 AND user_id = $2', [
        orgId,
        userId,
      ])

      return reply.send({ data: { message: 'Member removed' } })
    }
  )
}

export default orgRoutes
