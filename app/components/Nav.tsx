'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    document.cookie = 'naivo_pin_verified=; path=/; max-age=0'
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/wallets', label: 'Wallets' },
    { href: '/transactions', label: 'Transactions' },
    { href: '/reports', label: 'Reports' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <div className="sticky top-0 z-10 bg-[#0a0d0c]/90 backdrop-blur border-b border-zinc-800">
      <div className="max-w-3xl mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-600 text-black font-extrabold text-base flex items-center justify-center">N</div>
          <span className="text-white font-bold text-lg leading-none">Naivo</span>
        </div>
        <button onClick={handleSignOut} className="text-zinc-400 hover:text-white transition-colors text-sm font-medium">Sign out</button>
      </div>
      <div className="max-w-3xl mx-auto px-6 flex gap-1 overflow-x-auto">
        <div className="flex gap-1 -ml-3.5">
          {links.map(function (link) {
            const active = pathname === link.href
            const linkClass = 'px-3.5 pt-2 pb-3.5 text-sm font-semibold whitespace-nowrap border-b-[3px] transition-colors ' + (active ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200')
            return <a key={link.href} href={link.href} className={linkClass}>{link.label}</a>
          })}
        </div>
      </div>
    </div>
  )
}
