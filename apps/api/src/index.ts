import 'dotenv/config'
import Fastify from 'fastify'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import { config } from './config.js'
import corsPlugin from './plugins/cors.js'
import authPlugin from './plugins/auth.js'
import healthRoutes from './routes/health.js'
import authRoutes from './routes/auth.js'
import orgRoutes from './routes/orgs.js'
import eventRoutes from './routes/events.js'
import formRoutes from './routes/forms.js'
import participantRoutes from './routes/participants.js'
import landingRoutes from './routes/landing.js'

const app = Fastify({
  logger: {
    level: config.isDev ? 'info' : 'warn',
    transport: config.isDev ? { target: 'pino-pretty' } : undefined,
  },
})

async function start() {
  // Plugins
  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cookie, { secret: config.cookieSecret })
  await app.register(rateLimit, { max: 500, timeWindow: '1 minute' })
  await app.register(corsPlugin)
  await app.register(authPlugin)

  // Routes
  await app.register(healthRoutes)
  await app.register(authRoutes)
  await app.register(orgRoutes)
  await app.register(eventRoutes)
  await app.register(formRoutes)
  await app.register(participantRoutes)
  await app.register(landingRoutes)

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      type: 'https://api.hacksuite.app/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: `Route ${request.method} ${request.url} not found`,
      instance: request.url,
    })
  })

  // Error handler
  app.setErrorHandler((error: Error, request, reply) => {
    app.log.error(error)
    reply.status(500).send({
      type: 'https://api.hacksuite.app/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail: config.isDev ? error.message : 'An unexpected error occurred',
      instance: request.url,
    })
  })

  // Start
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' })
    app.log.info(`API running at http://0.0.0.0:${config.port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
const shutdown = async () => {
  app.log.info('Shutting down...')
  await app.close()
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

start()
