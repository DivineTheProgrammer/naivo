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
      <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-black font-extrabold text-sm flex items-center justify-center">N</div>
          <span className="text-white font-bold">Naivo</span>
        </div>
        <button onClick={handleSignOut} className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm">Sign out</button>
      </div>
      <div className="max-w-3xl mx-auto px-6 flex gap-1 overflow-x-auto pb-0">
        {links.map(function (link) {
          const active = pathname === link.href
          const linkClass = 'px-3.5 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ' + (active ? 'border-emerald-500 text-white' : 'border-transparent text-zinc-500 hover:text-zinc-300')
          return <a key={link.href} href={link.href} className={linkClass}>{link.label}</a>
        })}
      </div>
    </div>
  )
}
