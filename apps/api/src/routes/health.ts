import type { FastifyPluginAsync } from 'fastify'
import { pool } from '../db/index.js'
import { Redis } from 'ioredis'
import { config } from '../config.js'

const health: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', async (request, reply) => {
    let dbStatus = 'connected'
    let redisStatus = 'connected'

    try {
      await pool.query('SELECT 1')
    } catch {
      dbStatus = 'error'
    }

    try {
      const redis = new Redis(config.redisUrl, { lazyConnect: true, connectTimeout: 1000 })
      await redis.ping()
      await redis.disconnect()
    } catch {
      redisStatus = 'error'
    }

    const status =
      dbStatus === 'connected' && redisStatus === 'connected' ? 'ok' : 'degraded'
    return reply.status(status === 'ok' ? 200 : 503).send({
      status,
      db: dbStatus,
      redis: redisStatus,
      timestamp: new Date().toISOString(),
    })
  })
}

export default health
