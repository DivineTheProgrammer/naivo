'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

const RECENT_SIGN_IN_MS = 10 * 60 * 1000

export default function PinPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'set' | 'verify' | 'reset' | 'loading'>('loading')
  const [recentSignIn, setRecentSignIn] = useState(false)
  const [showForgotInfo, setShowForgotInfo] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')

  useEffect(function () {
    supabase.auth.getUser().then(async function (result) {
      const user = result.data.user
      if (!user) {
        router.push('/login')
        return
      }

      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : 0
      setRecentSignIn(Date.now() - lastSignIn < RECENT_SIGN_IN_MS)

      const profileResult = await supabase.from('users').select('pin_hash').eq('id', user.id).single()
      const hasPin = profileResult.data && profileResult.data.pin_hash
      setMode(hasPin ? 'verify' : 'set')
    })
  }, [])

  const finishUnlock = function () {
    document.cookie = 'naivo_pin_verified=true; path=/; max-age=86400'
    router.push('/dashboard')
    router.refresh()
  }

  const savePin = async function (url: string) {
    setError('')
    if (pin.length !== 4) {
      setError('PIN must be 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })

    if (res.ok) {
      finishUnlock()
      return
    }

    const data = await res.json()
    if (data.needsFreshSignIn) {
      setMode('verify')
      setShowForgotInfo(true)
      return
    }
    setError(data.error || 'Failed to save PIN')
  }

  const handleVerifyPin = async function () {
    setError('')
    const res = await fetch('/api/pin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
    const data = await res.json()

    if (data.correct) {
      finishUnlock()
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  const handleForgot = function () {
    setError('')
    setPin('')
    setConfirmPin('')
    if (recentSignIn) {
      setMode('reset')
    } else {
      setShowForgotInfo(true)
    }
  }

  const handleSignOutForReset = async function () {
    document.cookie = 'naivo_pin_verified=; path=/; max-age=0'
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pinClass = 'w-full px-4 py-4 rounded-lg bg-[#121615] border border-zinc-800 text-white text-2xl text-center tracking-[0.5em] outline-none focus:border-emerald-600 transition-colors'
  const primaryClass = 'w-full mt-6 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-lg'
  const linkClass = 'mt-6 text-zinc-400 hover:text-white transition-colors text-sm font-medium'

  if (mode === 'loading') {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-black font-extrabold text-xl flex items-center justify-center mx-auto">N</div>

        {(mode === 'set' || mode === 'reset') && (
          <div>
            <h1 className="text-white text-2xl font-bold mt-8">{mode === 'reset' ? 'Reset your PIN' : 'Set a PIN'}</h1>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">{mode === 'reset' ? 'You signed in with your email just now, so you can choose a new PIN.' : 'This adds a lock to Naivo, separate from your sign in.'}</p>
            <div className="mt-8 flex flex-col gap-4">
              <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" className={pinClass} />
              <input value={confirmPin} onChange={function (e) { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="Confirm" className={pinClass} />
            </div>
            <button onClick={function () { savePin(mode === 'reset' ? '/api/pin/reset' : '/api/pin') }} className={primaryClass}>{mode === 'reset' ? 'Save new PIN' : 'Set PIN'}</button>
            {mode === 'reset' && <button onClick={function () { setMode('verify'); setError(''); setPin(''); setConfirmPin('') }} className={linkClass}>Back</button>}
            {error && <p className="text-rose-400 text-sm mt-5">{error}</p>}
          </div>
        )}

        {mode === 'verify' && (
          <div>
            <h1 className="text-white text-2xl font-bold mt-8">Enter your PIN</h1>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">Enter the 4 digit PIN you set up.</p>
            <div className="mt-8">
              <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" className={pinClass} />
            </div>
            <button onClick={handleVerifyPin} className={primaryClass}>Unlock</button>
            {error && <p className="text-rose-400 text-sm mt-5">{error}</p>}
            {!showForgotInfo && <button onClick={handleForgot} className={linkClass}>Forgot PIN?</button>}

            {showForgotInfo && (
              <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-left">
                <p className="text-white text-sm font-semibold">Reset your PIN</p>
                <p className="text-zinc-300 text-sm mt-2 leading-relaxed">To make sure it is really you, we will sign you out and email you a sign in link. After you open it, you can choose a new PIN.</p>
                <button onClick={handleSignOutForReset} className="w-full mt-5 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-lg">Sign out and email me a link</button>
                <button onClick={function () { setShowForgotInfo(false) }} className="w-full mt-3 px-6 py-3 border border-zinc-700 text-zinc-300 hover:text-white transition-colors text-sm font-semibold rounded-lg">Cancel</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
