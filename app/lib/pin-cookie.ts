export const PIN_COOKIE_NAME = 'naivo_pin_verified'
const MAX_AGE_SECONDS = 60 * 60 * 24

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer)).map(function (b) { return b.toString(16).padStart(2, '0') }).join('')
}

async function sign(message: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return toHex(signature)
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff = diff | (a.charCodeAt(i) ^ b.charCodeAt(i))
  }
  return diff === 0
}

export async function createPinCookieValue(userId: string, secret: string) {
  const expires = Date.now() + MAX_AGE_SECONDS * 1000
  const payload = userId + '.' + expires
  const signature = await sign(payload, secret)
  return payload + '.' + signature
}

export async function isPinCookieValid(value: string | undefined, secret: string | undefined) {
  if (!value || !secret) return false
  const parts = value.split('.')
  if (parts.length !== 3) return false
  const expected = await sign(parts[0] + '.' + parts[1], secret)
  if (!safeEqual(expected, parts[2])) return false
  return Number(parts[1]) > Date.now()
}

export function pinCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: MAX_AGE_SECONDS,
  }
}
