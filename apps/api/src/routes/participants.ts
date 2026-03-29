import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { query, withTransaction } from '../db/index.js'
import {
  sendConfirmationEmail,
  sendAcceptanceEmail,
  sendWaitlistEmail,
} from '../lib/email.js'

const applicationSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  school: z.string().max(200).optional(),
  responses: z.record(z.unknown()).default({}),
})

const updateParticipantSchema = z.object({
  status: z.enum(['applied', 'waitlisted', 'accepted', 'confirmed', 'checked_in', 'no_show', 'rejected']),
  note: z.string().optional(),
})

const bulkUpdateSchema = z.object({
  participantIds: z.array(z.string().uuid()),
  status: z.enum(['applied', 'waitlisted', 'accepted', 'confirmed', 'checked_in', 'no_show', 'rejected']),
  note: z.string().optional(),
})

export async function promoteFromWaitlist(eventId: string, count: number): Promise<void> {
  const waitlisted = await query<{
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  }>(
    `SELECT id, email, first_name, last_name FROM participants
     WHERE event_id = $1 AND status = 'waitlisted'
     ORDER BY created_at ASC
     LIMIT $2`,
    [eventId, count]
  )

  for (const p of waitlisted.rows) {
    const qrCode = nanoid(12)
    await query(
      `UPDATE participants SET status = 'accepted', qr_code = $1, updated_at = NOW()
       WHERE id = $2`,
      [qrCode, p.id]
    )
    await query(
      `INSERT INTO participant_audit_log (participant_id, event_id, old_status, new_status, note)
       VALUES ($1, $2, 'waitlisted', 'accepted', 'Auto-promoted from waitlist')`,
      [p.id, eventId]
    )

    const eventResult = await query<{ name: string }>('SELECT name FROM events WHERE id = $1', [eventId])
    const eventName = eventResult.rows[0]?.name ?? 'the event'
    await sendAcceptanceEmail(p.email, eventName, qrCode)
  }
}

async function getEventOrgId(eventId: string): Promise<string | null> {
  const result = await query<{ org_id: string }>('SELECT org_id FROM events WHERE id = $1', [eventId])
  return result.rows[0]?.org_id ?? null
}

async function checkRegistrationAccess(
  eventId: string,
  userId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const orgId = await getEventOrgId(eventId)
  if (!orgId) return { allowed: false, reason: 'Event not found' }

  const memberCheck = await query<{ role: string; module_access: string[] }>(
    'SELECT role, module_access FROM organization_members WHERE org_id = $1 AND user_id = $2',
    [orgId, userId]
  )
  if (!memberCheck.rowCount || memberCheck.rowCount === 0) {
    return { allowed: false, reason: 'Access denied' }
  }
  const { role, module_access } = memberCheck.rows[0]
  if (['owner', 'admin'].includes(role)) return { allowed: true }
  if (module_access.includes('registration')) return { allowed: true }
  return { allowed: false, reason: 'Registration module access required' }
}

const participantRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /events/:eventId/applications — PUBLIC submission
  fastify.post('/events/:eventId/applications', async (request, reply) => {
    const { eventId } = request.params as { eventId: string }

    const result = applicationSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(422).send({
        type: 'https://api.hacksuite.app/errors/validation',
        title: 'Validation Error',
        status: 422,
        detail: result.error.issues.map((i) => i.message).join(', '),
        instance: request.url,
      })
    }

    // Check event exists and registration is open
    const eventResult = await query<{ id: string; name: string }>(
      'SELECT e.id, e.name FROM events e WHERE e.id = $1',
      [eventId]
    )
    if (!eventResult.rowCount || eventResult.rowCount === 0) {
      return reply.status(404).send({
        type: 'https://api.hacksuite.app/errors/not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Event not found',
        instance: request.url,
      })
    }

    const landingCheck = await query<{ registration_open: boolean }>(
      'SELECT registration_open FROM landing_pages WHERE event_id = $1',
      [eventId]
    )
    if (landingCheck.rowCount && landingCheck.rows[0]?.registration_open === false) {
      return reply.status(403).send({
        type: 'https://api.hacksuite.app/errors/forbidden',
        title: 'Registration Closed',
        status: 403,
        detail: 'Registration is currently closed for this event',
        instance: request.url,
      })
    }

    const { firstName, lastName, email, school, responses } = result.data
    const eventName = eventResult.rows[0].name

    try {
      const participant = await query<{ id: string; status: string }>(
        `INSERT INTO participants (event_id, email, first_name, last_name, school, status, metadata)
         VALUES ($1, $2, $3, $4, $5, 'applied', $6)
         RETURNING id, status`,
        [eventId, email, firstName, lastName, school ?? null, JSON.stringify(responses)]
      )

      const p = participant.rows[0]
      await sendConfirmationEmail(email, eventName)

      return reply.status(201).send({
        data: {
          participantId: p.id,
          status: p.status,
        },
      })
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr?.code === '23505') {
        return reply.status(409).send({
          type: 'https://api.hacksuite.app/errors/conflict',
          title: 'Already Applied',
          status: 409,
          detail: 'An application with this email already exists for this event',
          instance: request.url,
        })
      }
      throw err
    }
  })

  // GET /events/:eventId/participants — list participants (auth: registration)
  fastify.get(
    '/events/:eventId/participants',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string }
      const query_ = request.query as {
        status?: string
        school?: string
        search?: string
        after?: string
        limit?: string
      }

      const access = await checkRegistrationAccess(eventId, request.user.userId)
      if (!access.allowed) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: access.reason ?? 'Access denied',
          instance: request.url,
        })
      }

      const limit = Math.min(parseInt(query_.limit ?? '50', 10), 200)
      const conditions: string[] = ['event_id = $1']
      const values: unknown[] = [eventId]
      let idx = 2

      if (query_.status) {
        conditions.push(`status = $${idx++}`)
        values.push(query_.status)
      }
      if (query_.school) {
        conditions.push(`school ILIKE $${idx++}`)
        values.push(`%${query_.school}%`)
      }
      if (query_.search) {
        conditions.push(`(first_name ILIKE $${idx} OR last_name ILIKE $${idx} OR email ILIKE $${idx})`)
        values.push(`%${query_.search}%`)
        idx++
      }
      if (query_.after) {
        conditions.push(`created_at > $${idx++}`)
        values.push(query_.after)
      }

      const whereClause = conditions.join(' AND ')
      const participants = await query<{
        id: string
        email: string
        first_name: string | null
        last_name: string | null
        school: string | null
        status: string
        qr_code: string | null
        checked_in_at: string | null
        created_at: string
      }>(
        `SELECT id, email, first_name, last_name, school, status, qr_code, checked_in_at, created_at
         FROM participants WHERE ${whereClause}
         ORDER BY created_at ASC LIMIT $${idx}`,
        [...values, limit + 1]
      )

      const rows = participants.rows
      const hasMore = rows.length > limit
      const data = hasMore ? rows.slice(0, limit) : rows

      return reply.send({
        data: data.map((p) => ({
          id: p.id,
          email: p.email,
          firstName: p.first_name,
          lastName: p.last_name,
          school: p.school,
          status: p.status,
          qrCode: p.qr_code,
          checkedInAt: p.checked_in_at,
          createdAt: p.created_at,
        })),
        nextCursor: hasMore ? data[data.length - 1].created_at : null,
        total: data.length,
      })
    }
  )

  // PATCH /events/:eventId/participants/:participantId — update single participant
  fastify.patch(
    '/events/:eventId/participants/:participantId',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { eventId, participantId } = request.params as {
        eventId: string
        participantId: string
      }

      const result = updateParticipantSchema.safeParse(request.body)
      if (!result.success) {
        return reply.status(422).send({
          type: 'https://api.hacksuite.app/errors/validation',
          title: 'Validation Error',
          status: 422,
          detail: result.error.issues.map((i) => i.message).join(', '),
          instance: request.url,
        })
      }

      const access = await checkRegistrationAccess(eventId, request.user.userId)
      if (!access.allowed) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: access.reason ?? 'Access denied',
          instance: request.url,
        })
      }

      const participantResult = await query<{
        id: string
        email: string
        status: string
        first_name: string | null
      }>(
        'SELECT id, email, status, first_name FROM participants WHERE id = $1 AND event_id = $2',
        [participantId, eventId]
      )
      if (!participantResult.rowCount || participantResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Participant not found',
          instance: request.url,
        })
      }

      const participant = participantResult.rows[0]
      const { status, note } = result.data
      const oldStatus = participant.status

      let qrCode: string | null = null
      if (status === 'accepted' && oldStatus !== 'accepted') {
        qrCode = nanoid(12)
      }

      const updated = await withTransaction(async (client) => {
        const updateResult = await client.query<{
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          school: string | null
          status: string
          qr_code: string | null
          checked_in_at: string | null
          created_at: string
        }>(
          `UPDATE participants
           SET status = $1, qr_code = COALESCE($2, qr_code), updated_at = NOW()
           WHERE id = $3
           RETURNING id, email, first_name, last_name, school, status, qr_code, checked_in_at, created_at`,
          [status, qrCode, participantId]
        )

        await client.query(
          `INSERT INTO participant_audit_log (participant_id, event_id, changed_by, old_status, new_status, note)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [participantId, eventId, request.user.userId, oldStatus, status, note ?? null]
        )

        return updateResult.rows[0]
      })

      // Send emails
      const eventResult = await query<{ name: string }>('SELECT name FROM events WHERE id = $1', [eventId])
      const eventName = eventResult.rows[0]?.name ?? 'the event'

      if (status === 'accepted' && qrCode) {
        await sendAcceptanceEmail(participant.email, eventName, qrCode)
      } else if (status === 'waitlisted' && oldStatus !== 'waitlisted') {
        // Get waitlist position
        const posResult = await query<{ count: string }>(
          `SELECT COUNT(*) FROM participants WHERE event_id = $1 AND status = 'waitlisted' AND created_at <= (SELECT created_at FROM participants WHERE id = $2)`,
          [eventId, participantId]
        )
        const position = parseInt(posResult.rows[0]?.count ?? '1', 10)
        await sendWaitlistEmail(participant.email, eventName, position)
      }

      return reply.send({
        data: {
          id: updated.id,
          email: updated.email,
          firstName: updated.first_name,
          lastName: updated.last_name,
          school: updated.school,
          status: updated.status,
          qrCode: updated.qr_code,
          checkedInAt: updated.checked_in_at,
          createdAt: updated.created_at,
        },
      })
    }
  )

  // POST /events/:eventId/participants/bulk — bulk status update
  fastify.post(
    '/events/:eventId/participants/bulk',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string }

      const result = bulkUpdateSchema.safeParse(request.body)
      if (!result.success) {
        return reply.status(422).send({
          type: 'https://api.hacksuite.app/errors/validation',
          title: 'Validation Error',
          status: 422,
          detail: result.error.issues.map((i) => i.message).join(', '),
          instance: request.url,
        })
      }

      const access = await checkRegistrationAccess(eventId, request.user.userId)
      if (!access.allowed) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: access.reason ?? 'Access denied',
          instance: request.url,
        })
      }

      const { participantIds, status, note } = result.data
      const eventResult = await query<{ name: string }>('SELECT name FROM events WHERE id = $1', [eventId])
      const eventName = eventResult.rows[0]?.name ?? 'the event'

      let updated = 0
      const errors: Array<{ participantId: string; error: string }> = []

      for (const participantId of participantIds) {
        try {
          const participantResult = await query<{
            id: string
            email: string
            status: string
          }>(
            'SELECT id, email, status FROM participants WHERE id = $1 AND event_id = $2',
            [participantId, eventId]
          )
          if (!participantResult.rowCount || participantResult.rowCount === 0) {
            errors.push({ participantId, error: 'Not found' })
            continue
          }
          const participant = participantResult.rows[0]
          const oldStatus = participant.status

          let qrCode: string | null = null
          if (status === 'accepted' && oldStatus !== 'accepted') {
            qrCode = nanoid(12)
          }

          await withTransaction(async (client) => {
            await client.query(
              `UPDATE participants SET status = $1, qr_code = COALESCE($2, qr_code), updated_at = NOW() WHERE id = $3`,
              [status, qrCode, participantId]
            )
            await client.query(
              `INSERT INTO participant_audit_log (participant_id, event_id, changed_by, old_status, new_status, note)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [participantId, eventId, request.user.userId, oldStatus, status, note ?? null]
            )
          })

          if (status === 'accepted' && qrCode) {
            await sendAcceptanceEmail(participant.email, eventName, qrCode)
          }

          updated++
        } catch (err) {
          errors.push({ participantId, error: err instanceof Error ? err.message : 'Unknown error' })
        }
      }

      return reply.send({ data: { updated, errors } })
    }
  )

  // GET /events/:eventId/participants/export — CSV export
  fastify.get(
    '/events/:eventId/participants/export',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string }

      const access = await checkRegistrationAccess(eventId, request.user.userId)
      if (!access.allowed) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: access.reason ?? 'Access denied',
          instance: request.url,
        })
      }

      const participants = await query<{
        first_name: string | null
        last_name: string | null
        email: string
        school: string | null
        status: string
        checked_in_at: string | null
      }>(
        `SELECT first_name, last_name, email, school, status, checked_in_at
         FROM participants WHERE event_id = $1 ORDER BY created_at ASC`,
        [eventId]
      )

      const csvRows = [
        'First Name,Last Name,Email,School,Status,Checked In At',
        ...participants.rows.map((p) =>
          [
            p.first_name ?? '',
            p.last_name ?? '',
            p.email,
            p.school ?? '',
            p.status,
            p.checked_in_at ?? '',
          ]
            .map((v) => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
        ),
      ]

      const csv = csvRows.join('\n')

      reply.header('Content-Type', 'text/csv')
      reply.header('Content-Disposition', `attachment; filename="participants-${eventId}.csv"`)
      return reply.send(csv)
    }
  )
}

export default participantRoutes
