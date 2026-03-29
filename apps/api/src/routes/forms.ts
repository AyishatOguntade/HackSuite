import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { query } from '../db/index.js'

const formFieldSchema = z.object({
  id: z.string(),
  type: z.enum(['text', 'textarea', 'email', 'select', 'multiselect', 'checkbox', 'file', 'header', 'mlh_consent']),
  label: z.string(),
  required: z.boolean(),
  options: z.array(z.string()).optional(),
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  conditionalOn: z.object({ fieldId: z.string(), value: z.string() }).optional(),
  maxLength: z.number().int().positive().optional(),
})

const putFormSchema = z.object({
  fields: z.array(formFieldSchema),
})

const formRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /events/:eventId/form — get form definition
  fastify.get(
    '/events/:eventId/form',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string }

      // Verify event exists and user has access
      const eventResult = await query<{ id: string; org_id: string }>(
        'SELECT id, org_id FROM events WHERE id = $1',
        [eventId]
      )
      if (!eventResult.rowCount || eventResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: `Event not found`,
          instance: request.url,
        })
      }
      const orgId = eventResult.rows[0].org_id

      const memberCheck = await query(
        'SELECT id FROM organization_members WHERE org_id = $1 AND user_id = $2',
        [orgId, request.user.userId]
      )
      if (!memberCheck.rowCount || memberCheck.rowCount === 0) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Access denied',
          instance: request.url,
        })
      }

      const formResult = await query<{
        id: string
        event_id: string
        fields: unknown
        version: number
        updated_at: string
      }>(
        'SELECT id, event_id, fields, version, updated_at FROM form_definitions WHERE event_id = $1',
        [eventId]
      )

      if (!formResult.rowCount || formResult.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Form definition not found',
          instance: request.url,
        })
      }

      const form = formResult.rows[0]
      return reply.send({
        data: {
          id: form.id,
          eventId: form.event_id,
          fields: form.fields,
          version: form.version,
          updatedAt: form.updated_at,
        },
      })
    }
  )

  // PUT /events/:eventId/form — save form definition
  fastify.put(
    '/events/:eventId/form',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string }

      const result = putFormSchema.safeParse(request.body)
      if (!result.success) {
        return reply.status(422).send({
          type: 'https://api.hacksuite.app/errors/validation',
          title: 'Validation Error',
          status: 422,
          detail: result.error.issues.map((i) => i.message).join(', '),
          instance: request.url,
        })
      }

      const eventResult = await query<{ id: string; org_id: string }>(
        'SELECT id, org_id FROM events WHERE id = $1',
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
      const orgId = eventResult.rows[0].org_id

      const memberCheck = await query<{ role: string }>(
        'SELECT role FROM organization_members WHERE org_id = $1 AND user_id = $2',
        [orgId, request.user.userId]
      )
      if (!memberCheck.rowCount || !['admin', 'owner'].includes(memberCheck.rows[0]?.role)) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Only admins and owners can edit forms',
          instance: request.url,
        })
      }

      const { fields } = result.data

      const updated = await query<{
        id: string
        event_id: string
        fields: unknown
        version: number
        updated_at: string
      }>(
        `UPDATE form_definitions
         SET fields = $1, version = version + 1, updated_at = NOW()
         WHERE event_id = $2
         RETURNING id, event_id, fields, version, updated_at`,
        [JSON.stringify(fields), eventId]
      )

      if (!updated.rowCount || updated.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Form definition not found',
          instance: request.url,
        })
      }

      const form = updated.rows[0]
      return reply.send({
        data: {
          id: form.id,
          eventId: form.event_id,
          fields: form.fields,
          version: form.version,
          updatedAt: form.updated_at,
        },
      })
    }
  )
}

export default formRoutes
