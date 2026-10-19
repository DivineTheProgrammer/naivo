import { NextRequest, NextResponse } from 'next/server'
import { PIN_COOKIE_NAME, isPinCookieValid } from './app/lib/pin-cookie'

const PUBLIC_PAGES = ['/login', '/pin', '/auth']
const OPEN_API = ['/api/pin', '/api/webauthn/login-options', '/api/webauthn/login-verify', '/api/exchange-rates']

function matches(path: string, prefixes: string[]) {
  return prefixes.some(function (p) { return path === p || path.indexOf(p + '/') === 0 })
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isApi = path.indexOf('/api') === 0

  if (path === '/') return NextResponse.next()
  if (isApi && matches(path, OPEN_API)) return NextResponse.next()
  if (!isApi && matches(path, PUBLIC_PAGES)) return NextResponse.next()

  const cookieValue = req.cookies.get(PIN_COOKIE_NAME)
  const valid = await isPinCookieValid(cookieValue ? cookieValue.value : undefined, process.env.PIN_COOKIE_SECRET)

  if (valid) return NextResponse.next()

  if (isApi) {
    return NextResponse.json({ error: 'PIN required' }, { status: 401 })
  }

  return NextResponse.redirect(new URL('/pin', req.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
