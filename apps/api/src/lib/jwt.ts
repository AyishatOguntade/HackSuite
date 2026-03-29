import {
  SignJWT,
  jwtVerify,
  generateKeyPair as joseGenerateKeyPair,
  importPKCS8,
  importSPKI,
} from 'jose'
import { config } from '../config.js'
import type { JwtPayload } from '@hacksuite/shared'

const ALG = 'RS256'
const ACCESS_TOKEN_TTL = '15m'
const REFRESH_TOKEN_TTL = '7d'

async function getPrivateKey() {
  if (!config.jwtPrivateKey) {
    const { privateKey } = await joseGenerateKeyPair(ALG)
    return privateKey
  }
  const pem = Buffer.from(config.jwtPrivateKey, 'base64').toString('utf-8')
  return importPKCS8(pem, ALG)
}

async function getPublicKey() {
  if (!config.jwtPublicKey) {
    throw new Error('JWT_PUBLIC_KEY not set')
  }
  const pem = Buffer.from(config.jwtPublicKey, 'base64').toString('utf-8')
  return importSPKI(pem, ALG)
}

// For dev convenience: generate and cache a key pair
let devKeyPair: Awaited<ReturnType<typeof joseGenerateKeyPair>> | null = null
async function getDevKeys() {
  if (!devKeyPair) {
    devKeyPair = await joseGenerateKeyPair(ALG)
  }
  return devKeyPair
}

export async function signAccessToken(payload: JwtPayload): Promise<string> {
  let privateKey
  if (!config.jwtPrivateKey && config.isDev) {
    privateKey = (await getDevKeys()).privateKey
  } else {
    privateKey = await getPrivateKey()
  }
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_TTL)
    .setIssuer('hacksuite')
    .sign(privateKey)
}

export async function signRefreshToken(userId: string, family: string): Promise<string> {
  let privateKey
  if (!config.jwtPrivateKey && config.isDev) {
    privateKey = (await getDevKeys()).privateKey
  } else {
    privateKey = await getPrivateKey()
  }
  return new SignJWT({ userId, family, type: 'refresh' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_TTL)
    .setJti(crypto.randomUUID())
    .setIssuer('hacksuite')
    .sign(privateKey)
}

export async function verifyAccessToken(token: string): Promise<JwtPayload> {
  let publicKey
  if (!config.jwtPublicKey && config.isDev) {
    publicKey = (await getDevKeys()).publicKey
  } else {
    publicKey = await getPublicKey()
  }
  const { payload } = await jwtVerify(token, publicKey, { issuer: 'hacksuite' })
  return payload as unknown as JwtPayload
}

export async function verifyRefreshToken(
  token: string
): Promise<{ userId: string; family: string; jti: string }> {
  let publicKey
  if (!config.jwtPublicKey && config.isDev) {
    publicKey = (await getDevKeys()).publicKey
  } else {
    publicKey = await getPublicKey()
  }
  const { payload } = await jwtVerify(token, publicKey, { issuer: 'hacksuite' })
  return {
    userId: payload['userId'] as string,
    family: payload['family'] as string,
    jti: payload.jti as string,
  }
}
