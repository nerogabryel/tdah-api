import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { pool, checkConnection } from './db.js'
import { lessonsRoutes } from './routes/lessons.js'
import { syncRoutes } from './routes/sync.js'
import { studentsRoutes } from './routes/students.js'
import { teacherRoutes } from './routes/teacher.js'

const app = Fastify({
  logger: {
    level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  },
})

// CORS
await app.register(cors, {
  origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
})

// Health check
app.get('/api/health', async (_request, reply) => {
  const dbOk = await checkConnection()
  const poolStatus = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  }

  if (!dbOk) {
    return reply.status(503).send({ status: 'unhealthy', db: false, pool: poolStatus })
  }

  return reply.status(200).send({ status: 'ok', db: true, pool: poolStatus })
})

// Registrar rotas
await app.register(lessonsRoutes)
await app.register(syncRoutes)
await app.register(studentsRoutes)
await app.register(teacherRoutes)

// Boot
try {
  await app.listen({ port: config.PORT, host: '0.0.0.0' })
  console.log(`🚀 TDAH API rodando em http://0.0.0.0:${config.PORT}`)
  console.log(`📊 Pool: max=${pool.totalCount}, idle=${pool.idleCount}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

// Graceful shutdown
const shutdown = async () => {
  console.log('\n🛑 Encerrando...')
  await app.close()
  await pool.end()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
