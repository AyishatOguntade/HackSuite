import fp from 'fastify-plugin'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken } from '../lib/jwt.js'
import type { JwtPayload, OrgRole } from '@hacksuite/shared'

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>
    requireRole: (
      roles: OrgRole[]
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>
  }
  interface FastifyRequest {
    user: JwtPayload
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization
      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          type: 'https://api.hacksuite.app/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Missing or invalid Authorization header',
          instance: request.url,
        })
      }
      const token = authHeader.slice(7)
      try {
        request.user = await verifyAccessToken(token)
      } catch {
        return reply.status(401).send({
          type: 'https://api.hacksuite.app/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Invalid or expired token',
          instance: request.url,
        })
      }
    }
  )

  fastify.decorate('requireRole', (roles: OrgRole[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await fastify.authenticate(request, reply)
      if (reply.sent) return
      const hasRole = request.user.roles.some((r) => roles.includes(r))
      if (!hasRole) {
        return reply.status(403).send({
          type: 'https://api.hacksuite.app/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: `Required role: ${roles.join(' or ')}`,
          instance: request.url,
        })
      }
    }
  })
}

export default fp(authPlugin)
