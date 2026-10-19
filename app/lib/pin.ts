import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'crypto'

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 32).toString('hex')
  return 'scrypt$' + salt + '$' + hash
}

export function verifyPinHash(pin: string, stored: string, userId: string): { ok: boolean, needsUpgrade: boolean } {
  if (stored.indexOf('scrypt$') === 0) {
    const parts = stored.split('$')
    const expected = Buffer.from(parts[2], 'hex')
    const actual = scryptSync(pin, parts[1], 32)
    const ok = expected.length === actual.length && timingSafeEqual(expected, actual)
    return { ok: ok, needsUpgrade: false }
  }

  const legacy = Buffer.from(createHash('sha256').update(pin + userId).digest('hex'))
  const existing = Buffer.from(stored)
  const legacyOk = legacy.length === existing.length && timingSafeEqual(legacy, existing)
  return { ok: legacyOk, needsUpgrade: legacyOk }
}
