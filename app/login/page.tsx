'use client'

import { useState } from 'react'
import { createClient } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithOtp({
      email: email,
      options: {
        emailRedirectTo: window.location.origin + '/auth/callback',
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-black font-extrabold text-xl flex items-center justify-center">N</div>
        <h1 className="text-white text-2xl sm:text-3xl font-bold mt-8">Sign in to Naivo</h1>
        <p className="text-zinc-400 text-sm mt-3 leading-relaxed">We will email you a link. No password needed.</p>

        {sent ? (
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-green-400 text-sm font-semibold">Check your email</p>
            <p className="text-zinc-300 text-sm mt-2 leading-relaxed">We sent a sign in link to {email}. Open it on this device to continue.</p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            <input type="email" value={email} onChange={function (e) { setEmail(e.target.value) }} placeholder="you@example.com" className="w-full px-4 py-3.5 rounded-lg bg-[#121615] border border-zinc-800 text-white text-base sm:text-sm outline-none focus:border-emerald-600 transition-colors" />
            <button onClick={handleLogin} disabled={loading || !email} className="w-full px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-black font-bold text-sm rounded-lg">{loading ? 'Sending...' : 'Send magic link'}</button>
            {error && <p className="text-rose-400 text-sm">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
