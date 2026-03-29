import 'dotenv/config'

function required(key: string): string {
  const val = process.env[key]
  if (!val) throw new Error(`Missing required environment variable: ${key}`)
  return val
}

function optional(key: string, defaultVal: string): string {
  return process.env[key] ?? defaultVal
}

export const config = {
  databaseUrl: required('DATABASE_URL'),
  redisUrl: optional('REDIS_URL', 'redis://localhost:6379'),
  jwtPrivateKey: optional('JWT_PRIVATE_KEY', ''),
  jwtPublicKey: optional('JWT_PUBLIC_KEY', ''),
  resendApiKey: optional('RESEND_API_KEY', ''),
  appUrl: optional('APP_URL', 'http://localhost:5173'),
  apiUrl: optional('API_URL', 'http://localhost:3000'),
  nodeEnv: optional('NODE_ENV', 'development'),
  cookieSecret: optional('COOKIE_SECRET', 'dev-secret-change-in-production-32c'),
  port: parseInt(optional('PORT', '3000'), 10),
  isDev: optional('NODE_ENV', 'development') === 'development',
} as const
