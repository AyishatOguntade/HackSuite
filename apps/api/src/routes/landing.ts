import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'
import { query } from '../db/index.js'

const updateLandingSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  coverImageUrl: z.string().url().optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  heroText: z.string().max(500).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  socialLinks: z.record(z.string()).optional(),
  registrationOpen: z.boolean().optional(),
  published: z.boolean().optional(),
})

const landingRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /events/:eventId/landing — PUBLIC
  fastify.get('/events/:eventId/landing', async (request, reply) => {
    const { eventId } = request.params as { eventId: string }

    const eventResult = await query<{
      id: string
      name: string
      slug: string
      start_date: string | null
      end_date: string | null
      status: string
    }>(
      'SELECT id, name, slug, start_date, end_date, status FROM events WHERE id = $1',
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
    const event = eventResult.rows[0]

    const landingResult = await query<{
      id: string
      event_id: string
      logo_url: string | null
      cover_image_url: string | null
      primary_color: string
      hero_text: string | null
      description: string | null
      social_links: Record<string, string>
      registration_open: boolean
      published: boolean
    }>(
      'SELECT id, event_id, logo_url, cover_image_url, primary_color, hero_text, description, social_links, registration_open, published FROM landing_pages WHERE event_id = $1',
      [eventId]
    )

    let landing = null
    if (landingResult.rowCount && landingResult.rowCount > 0) {
      const l = landingResult.rows[0]
      landing = {
        id: l.id,
        eventId: l.event_id,
        logoUrl: l.logo_url,
        coverImageUrl: l.cover_image_url,
        primaryColor: l.primary_color,
        heroText: l.hero_text,
        description: l.description,
        socialLinks: l.social_links,
        registrationOpen: l.registration_open,
        published: l.published,
      }
    }

    // Include form definition if registration is open
    let formDefinition = null
    if (landing?.registrationOpen) {
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
      if (formResult.rowCount && formResult.rowCount > 0) {
        const f = formResult.rows[0]
        formDefinition = {
          id: f.id,
          eventId: f.event_id,
          fields: f.fields,
          version: f.version,
          updatedAt: f.updated_at,
        }
      }
    }

    return reply.send({
      data: {
        event: {
          id: event.id,
          name: event.name,
          slug: event.slug,
          startDate: event.start_date,
          endDate: event.end_date,
          status: event.status,
        },
        landing,
        formDefinition,
      },
    })
  })

  // PATCH /events/:eventId/landing — update landing page settings
  fastify.patch(
    '/events/:eventId/landing',
    { preHandler: fastify.authenticate },
    async (request, reply) => {
      const { eventId } = request.params as { eventId: string }

      const result = updateLandingSchema.safeParse(request.body)
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

      const memberCheck = await query<{ role: string; module_access: string[] }>(
        'SELECT role, module_access FROM organization_members WHERE org_id = $1 AND user_id = $2',
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
      const { role, module_access } = memberCheck.rows[0]
      if (!['owner', 'admin'].includes(role) && !module_access.includes('registration')) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'Registration module access required',
          instance: request.url,
        })
      }

      const {
        logoUrl,
        coverImageUrl,
        primaryColor,
        heroText,
        description,
        socialLinks,
        registrationOpen,
        published,
      } = result.data

      const updates: string[] = []
      const values: unknown[] = []
      let idx = 1

      if (logoUrl !== undefined) { updates.push(`logo_url = $${idx++}`); values.push(logoUrl) }
      if (coverImageUrl !== undefined) { updates.push(`cover_image_url = $${idx++}`); values.push(coverImageUrl) }
      if (primaryColor !== undefined) { updates.push(`primary_color = $${idx++}`); values.push(primaryColor) }
      if (heroText !== undefined) { updates.push(`hero_text = $${idx++}`); values.push(heroText) }
      if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(description) }
      if (socialLinks !== undefined) { updates.push(`social_links = $${idx++}`); values.push(JSON.stringify(socialLinks)) }
      if (registrationOpen !== undefined) { updates.push(`registration_open = $${idx++}`); values.push(registrationOpen) }
      if (published !== undefined) { updates.push(`published = $${idx++}`); values.push(published) }

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
        event_id: string
        logo_url: string | null
        cover_image_url: string | null
        primary_color: string
        hero_text: string | null
        description: string | null
        social_links: Record<string, string>
        registration_open: boolean
        published: boolean
      }>(
        `UPDATE landing_pages SET ${updates.join(', ')} WHERE event_id = $${idx}
         RETURNING id, event_id, logo_url, cover_image_url, primary_color, hero_text, description, social_links, registration_open, published`,
        values
      )

      if (!updated.rowCount || updated.rowCount === 0) {
        return reply.status(404).send({
          type: 'https://api.hacksuite.app/errors/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Landing page not found',
          instance: request.url,
        })
      }

      const l = updated.rows[0]
      return reply.send({
        data: {
          id: l.id,
          eventId: l.event_id,
          logoUrl: l.logo_url,
          coverImageUrl: l.cover_image_url,
          primaryColor: l.primary_color,
          heroText: l.hero_text,
          description: l.description,
          socialLinks: l.social_links,
          registrationOpen: l.registration_open,
          published: l.published,
        },
      })
    }
  )
}

export default landingRoutes
