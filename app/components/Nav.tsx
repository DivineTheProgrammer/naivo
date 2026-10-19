'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', short: 'Home', icon: 'home' },
  { href: '/wallets', label: 'Wallets', short: 'Wallets', icon: 'wallet' },
  { href: '/transactions', label: 'Transactions', short: 'Activity', icon: 'list' },
  { href: '/reports', label: 'Reports', short: 'Reports', icon: 'chart' },
  { href: '/settings', label: 'Settings', short: 'Settings', icon: 'sliders' },
]

function Icon({ name }: { name: string }) {
  const props = { className: 'w-6 h-6', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  if (name === 'home') {
    return <svg {...props}><path d="M3 11l9-8 9 8v9a1 1 0 01-1 1h-5v-6H9v6H4a1 1 0 01-1-1z" /></svg>
  }
  if (name === 'wallet') {
    return <svg {...props}><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12.5h2" /></svg>
  }
  if (name === 'list') {
    return <svg {...props}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
  }
  if (name === 'chart') {
    return <svg {...props}><path d="M6 20V11M12 20V4M18 20v-6" /></svg>
  }
  return <svg {...props}><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></svg>
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await fetch('/api/pin/lock', { method: 'POST' })
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <header className="sticky top-0 z-20 bg-[#0a0d0c]/90 backdrop-blur border-b border-zinc-800">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 text-black font-extrabold text-base flex items-center justify-center">N</div>
            <span className="text-white font-bold text-lg">Naivo</span>
          </div>
          <nav className="hidden md:flex items-center gap-1">
            {LINKS.map(function (l) {
              const active = pathname === l.href
              const cls = 'px-4 py-2 rounded-lg text-sm font-semibold transition-colors ' + (active ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-900')
              return <a key={l.href} href={l.href} className={cls}>{l.label}</a>
            })}
          </nav>
          <button onClick={handleSignOut} className="text-zinc-400 hover:text-white transition-colors text-sm font-medium px-2 py-2">Sign out</button>
        </div>
      </header>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-[#0a0d0c]/95 backdrop-blur border-t border-zinc-800 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-3xl mx-auto grid grid-cols-5 px-2">
          {LINKS.map(function (l) {
            const active = pathname === l.href
            const cls = 'flex flex-col items-center gap-1 py-3 transition-colors ' + (active ? 'text-emerald-400' : 'text-zinc-500')
            return (
              <a key={l.href} href={l.href} className={cls}>
                <Icon name={l.icon} />
                <span className="text-[11px] font-semibold">{l.short}</span>
              </a>
            )
          })}
        </div>
      </nav>
    </>
  )
}
