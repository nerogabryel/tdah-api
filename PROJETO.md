# tdah-api

## O que é
Backend API para o TDAH Portal. Fastify + pg pool, container Docker, deploy via docker-compose. Suporta JWKS (ECC P-256) com fallback HS256.

## Ideia inicial
API minimalista, performática (pool 50 conexões), pronta para deploy em VPS via container. Substitui chamadas diretas do frontend ao Supabase em endpoints que precisam de lógica server-side.

## Expectativa para o projeto final
- Auth com JWKS (curva ECC P-256) + fallback HS256.
- Pool de 50 conexões PostgreSQL.
- Health check otimizado.
- Deploy via Dockerfile + docker-compose, dist/ versionado para deploy direto no container.

## Onde paramos
- Último commit: `42d2d6f perf: pool 50 conexões + health check otimizado`.
- **Repo limpo** — sem mudanças locais.
- Remote: `https://github.com/nerogabryel/tdah-api.git`.
- Aparenta estar em produção via VPS Hostinger (api.method1.cloud, mencionado em sessão tdah-portal 25/04).

## Stack
TypeScript, Fastify, pg (pool), JWKS, Docker.

## Como retomar
```bash
cd /Users/method/tdah-api
docker compose up
```

## Risco
BAIXO. Repo sincronizado.
