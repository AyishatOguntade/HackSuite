import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { query, withTransaction } from '../db/index.js'

const createEventSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
})

const updateEventSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: z.enum(['draft', 'published', 'active', 'closed']).optional(),
})

const eventRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /orgs/:slug/events — create event
  fastify.post(
    '/orgs/:slug/events',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { slug } = request.params as { slug: string }

      const result = createEventSchema.safeParse(request.body)
      if (!result.success) {
        return reply.status(422).send({
          type: 'https://api.hacksuite.app/errors/validation',
          title: 'Validation Error',
          status: 422,
          detail: result.error.issues.map((i) => i.message).join(', '),
          instance: request.url,
        })
      }

      const orgResult = await query<{ id: string }>(
        'SELECT id FROM organizations WHERE slug = $1',
        [slug]
      )
      if (!orgResult.rowCount || orgResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Organization '${slug}' not found`,
          instance: request.url,
        })
      }
      const orgId = orgResult.rows[0].id

      // Check user is admin or owner
      const memberCheck = await query<{ role: string }>(
        'SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2',
        [orgId, request.user.userId]
      )
      if (!memberCheck.rowCount || !['admin', 'owner'].includes(memberCheck.rows[0]?.role)) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Only admins and owners can create events',
          instance: request.url,
        })
      }

      const { name, slug: eventSlug, startDate, endDate } = result.data

      // Check slug uniqueness within org
      const slugCheck = await query(
        'SELECT id FROM events WHERE org_id = $1 AND slug = $2',
        [orgId, eventSlug]
      )
      if (slugCheck.rowCount && slugCheck.rowCount > 0) {
        return reply.status(409).send({
          type: 'https://api.hacksuite.app/errors/conflict',
          title: 'Conflict',
          status: 409,
          detail: `Event slug '${eventSlug}' is already taken in this organization`,
          instance: request.url,
        })
      }

      const event = await withTransaction(async (client) => {
        const eventResult = await client.query<{
          id: string
          org_id: string
          name: string
          slug: string
          start_date: string | null
          end_date: string | null
          status: string
          created_at: string
        }>(
          `INSERT INTO events (org_id, name, slug, start_date, end_date)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, org_id, name, slug, start_date, end_date, status, created_at`,
          [orgId, name, eventSlug, startDate ?? null, endDate ?? null]
        )
        const ev = eventResult.rows[0]

        // Create empty form_definition
        await client.query(
          'INSERT INTO form_definitions (event_id, fields, version) VALUES ($1, $2, $3)',
          [ev.id, JSON.stringify([]), 1]
        )

        // Create landing_page row
        await client.query(
          'INSERT INTO landing_pages (event_id) VALUES ($1)',
          [ev.id]
        )

        return ev
      })

      return reply.status(201).send({
        data: {
          id: event.id,
          orgId: event.org_id,
          name: event.name,
          slug: event.slug,
          startDate: event.start_date,
          endDate: event.end_date,
          status: event.status,
          createdAt: event.created_at,
        },
      })
    }
  )

  // GET /orgs/:slug/events — list events for org
  fastify.get(
    '/orgs/:slug/events',
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
          detail: `Organization '${slug}' not found`,
          instance: request.url,
        })
      }
      const orgId = orgResult.rows[0].id

      // Verify membership
      const memberCheck = await query(
        'SELECT id FROM organization_members WHERE org_id = $1 AND user_id = $2',
        [orgId, request.user.userId]
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

      const events = await query<{
        id: string
        org_id: string
        name: string
        slug: string
        start_date: string | null
        end_date: string | null
        status: string
        created_at: string
      }>(
        'SELECT id, org_id, name, slug, start_date, end_date, status, created_at FROM events WHERE org_id = $1 ORDER BY created_at DESC',
        [orgId]
      )

      return reply.send({
        data: events.rows.map((e) => ({
          id: e.id,
          orgId: e.org_id,
          name: e.name,
          slug: e.slug,
          startDate: e.start_date,
          endDate: e.end_date,
          status: e.status,
          createdAt: e.created_at,
        })),
      })
    }
  )

  // GET /orgs/:slug/events/:eventSlug — get single event
  fastify.get(
    '/orgs/:slug/events/:eventSlug',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { slug, eventSlug } = request.params as { slug: string; eventSlug: string }

      const orgResult = await query<{ id: string }>(
        'SELECT id FROM organizations WHERE slug = $1',
        [slug]
      )
      if (!orgResult.rowCount || orgResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Organization '${slug}' not found`,
          instance: request.url,
        })
      }
      const orgId = orgResult.rows[0].id

      // Verify membership
      const memberCheck = await query(
        'SELECT id FROM organization_members WHERE org_id = $1 AND user_id = $2',
        [orgId, request.user.userId]
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

      const eventResult = await query<{
        id: string
        org_id: string
        name: string
        slug: string
        start_date: string | null
        end_date: string | null
        status: string
        created_at: string
      }>(
        'SELECT id, org_id, name, slug, start_date, end_date, status, created_at FROM events WHERE org_id = $1 AND slug = $2',
        [orgId, eventSlug]
      )

      if (!eventResult.rowCount || eventResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Event '${eventSlug}' not found`,
          instance: request.url,
        })
      }

      const e = eventResult.rows[0]
      return reply.send({
        data: {
          id: e.id,
          orgId: e.org_id,
          name: e.name,
          slug: e.slug,
          startDate: e.start_date,
          endDate: e.end_date,
          status: e.status,
          createdAt: e.created_at,
        },
      })
    }
  )

  // PATCH /orgs/:slug/events/:eventSlug — update event
  fastify.patch(
    '/orgs/:slug/events/:eventSlug',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { slug, eventSlug } = request.params as { slug: string; eventSlug: string }

      const result = updateEventSchema.safeParse(request.body)
      if (!result.success) {
        return reply.status(422).send({
          type: 'https://api.hacksuite.app/errors/validation',
          title: 'Validation Error',
          status: 422,
          detail: result.error.issues.map((i) => i.message).join(', '),
          instance: request.url,
        })
      }

      const orgResult = await query<{ id: string }>(
        'SELECT id FROM organizations WHERE slug = $1',
        [slug]
      )
      if (!orgResult.rowCount || orgResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Organization '${slug}' not found`,
          instance: request.url,
        })
      }
      const orgId = orgResult.rows[0].id

      const memberCheck = await query<{ role: string }>(
        'SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2',
        [orgId, request.user.userId]
      )
      if (!memberCheck.rowCount || !['admin', 'owner'].includes(memberCheck.rows[0]?.role)) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Only admins and owners can update events',
          instance: request.url,
        })
      }

      const eventResult = await query<{ id: string }>(
        'SELECT id FROM events WHERE org_id = $1 AND slug = $2',
        [orgId, eventSlug]
      )
      if (!eventResult.rowCount || eventResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Event '${eventSlug}' not found`,
          instance: request.url,
        })
      }
      const eventId = eventResult.rows[0].id

      const { name, startDate, endDate, status } = result.data
      const updates: string[] = []
      const values: unknown[] = []
      let idx = 1

      if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name) }
      if (startDate !== undefined) { updates.push(`start_date = $${idx++}`); values.push(startDate) }
      if (endDate !== undefined) { updates.push(`end_date = $${idx++}`); values.push(endDate) }
      if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status) }

      if (updates.length === 0) {
        return reply.status(400).send({
          type: 'https://api.hacksuite.app/errors/bad-request',
          title: 'Bad Request',
          status: 400,
          detail: 'No fields to update',
          instance: request.url,
        })
      }

      updates.push(`updated_at = NOW()`)
      values.push(eventId)

      const updated = await query<{
        id: string
        org_id: string
        name: string
        slug: string
        start_date: string | null
        end_date: string | null
        status: string
        created_at: string
      }>(
        `UPDATE events SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, org_id, name, slug, start_date, end_date, status, created_at`,
        values
      )

      const e = updated.rows[0]
      return reply.send({
        data: {
          id: e.id,
          orgId: e.org_id,
          name: e.name,
          slug: e.slug,
          startDate: e.start_date,
          endDate: e.end_date,
          status: e.status,
          createdAt: e.created_at,
        },
      })
    }
  )
}

export default eventRoutes
