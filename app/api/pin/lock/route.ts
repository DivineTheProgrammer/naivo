import { NextResponse } from 'next/server'
import { PIN_COOKIE_NAME, pinCookieOptions } from '../../../lib/pin-cookie'

export async function POST() {
  const res = NextResponse.json({ message: 'Locked' })
  res.cookies.set(PIN_COOKIE_NAME, '', { ...pinCookieOptions(), maxAge: 0 })
  return res
}
