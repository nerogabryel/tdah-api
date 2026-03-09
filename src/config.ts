function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Variável de ambiente obrigatória: ${name}`)
  return value
}

export const config = {
  DATABASE_URL: requireEnv('DATABASE_URL'),
  SUPABASE_JWT_SECRET: requireEnv('SUPABASE_JWT_SECRET'),
  PORT: parseInt(process.env.PORT ?? '3333', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:5175',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const
