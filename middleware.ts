import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname

  const publicPaths = ['/login', '/pin', '/auth', '/onboarding']
  const isPublicPath = publicPaths.some(function (p) { return path.startsWith(p) })

  if (isPublicPath || path.startsWith('/api') || path.startsWith('/_next')) {
    return NextResponse.next()
  }

  const pinVerified = req.cookies.get('naivo_pin_verified')

  if (!pinVerified) {
    return NextResponse.redirect(new URL('/pin', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
