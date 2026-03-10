import { jwtVerify, createRemoteJWKSet } from 'jose'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { config } from './config.js'

// Extende o tipo do request para incluir userId
declare module 'fastify' {
  interface FastifyRequest {
    userId: string
  }
}

// JWKS — busca e cacheia as chaves públicas do Supabase Auth
// Suporta automaticamente HS256 (legacy) + ES256 (ECC P-256 atual)
const JWKS = createRemoteJWKSet(
  new URL(`${config.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
)

// Fallback: HS256 com shared secret (caso JWKS falhe)
const legacySecret = config.SUPABASE_JWT_SECRET
  ? new TextEncoder().encode(config.SUPABASE_JWT_SECRET)
  : null

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const authHeader = request.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({ error: 'Token não fornecido' })
  }

  const token = authHeader.slice(7)

  try {
    // Tenta JWKS primeiro (suporta HS256 + ES256)
    const { payload } = await jwtVerify(token, JWKS)

    const sub = payload.sub
    if (!sub) {
      return reply.status(401).send({ error: 'Token inválido: sem sub' })
    }

    request.userId = sub
  } catch (jwksError) {
    // Fallback: tenta HS256 com legacy secret
    if (legacySecret) {
      try {
        const { payload } = await jwtVerify(token, legacySecret, {
          algorithms: ['HS256'],
        })

        const sub = payload.sub
        if (!sub) {
          return reply.status(401).send({ error: 'Token inválido: sem sub' })
        }

        request.userId = sub
        return
      } catch {
        // Ambos falharam
      }
    }

    console.error('[auth] JWT inválido:', jwksError)
    return reply.status(401).send({ error: 'Token inválido ou expirado' })
  }
}
