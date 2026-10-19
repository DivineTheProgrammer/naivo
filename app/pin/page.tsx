'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function PinPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'set' | 'verify' | 'reset' | 'loading'>('loading')
  const [recentSignIn, setRecentSignIn] = useState(false)
  const [showForgotInfo, setShowForgotInfo] = useState(false)
  const [lockedFor, setLockedFor] = useState(0)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(function () {
    fetch('/api/pin/status').then(async function (res) {
      if (!res.ok) {
        router.push('/login')
        return
      }
      const data = await res.json()
      setRecentSignIn(data.recentSignIn === true)
      setLockedFor(data.lockedForSeconds || 0)
      setMode(data.hasPin ? 'verify' : 'set')
    }).catch(function () {
      router.push('/login')
    })
  }, [])

  const lockMessage = function (seconds: number) {
    const mins = Math.max(1, Math.ceil(seconds / 60))
    return 'Too many attempts. Try again in ' + mins + ' minute' + (mins === 1 ? '' : 's') + '.'
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

    setBusy(true)
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
      const data = await res.json()

      if (res.ok) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      if (data.needsFreshSignIn) {
        setMode('verify')
        setShowForgotInfo(true)
        return
      }

      setError(data.error || 'Failed to save PIN')
    } catch (err) {
      setError('Network problem. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleVerifyPin = async function () {
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/pin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pin }) })
      const data = await res.json()

      if (res.ok && data.correct) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      setPin('')

      if (res.status === 429) {
        setLockedFor(data.retryAfterSeconds || 900)
        return
      }

      if (data.attemptsLeft !== undefined) {
        setError('Incorrect PIN. ' + data.attemptsLeft + ' attempt' + (data.attemptsLeft === 1 ? '' : 's') + ' left.')
        return
      }

      setError(data.error || 'Could not check your PIN.')
    } catch (err) {
      setError('Network problem. Try again.')
    } finally {
      setBusy(false)
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
    await fetch('/api/pin/lock', { method: 'POST' })
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pinClass = 'w-full px-4 py-4 rounded-lg bg-[#121615] border border-zinc-800 text-white text-2xl text-center tracking-[0.5em] outline-none focus:border-emerald-600 transition-colors'
  const primaryClass = 'w-full mt-6 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-black font-bold text-sm rounded-lg'
  const linkClass = 'mt-6 text-zinc-400 hover:text-white transition-colors text-sm font-medium'
  const shownError = error || (lockedFor > 0 ? lockMessage(lockedFor) : '')

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
              <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" aria-label="PIN" className={pinClass} />
              <input value={confirmPin} onChange={function (e) { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="Confirm" aria-label="Confirm PIN" className={pinClass} />
            </div>
            <button onClick={function () { savePin(mode === 'reset' ? '/api/pin/reset' : '/api/pin') }} disabled={busy} className={primaryClass}>{mode === 'reset' ? 'Save new PIN' : 'Set PIN'}</button>
            {mode === 'reset' && <button onClick={function () { setMode('verify'); setError(''); setPin(''); setConfirmPin('') }} className={linkClass}>Back</button>}
            {error && <p className="text-rose-400 text-sm mt-5">{error}</p>}
          </div>
        )}

        {mode === 'verify' && (
          <div>
            <h1 className="text-white text-2xl font-bold mt-8">Enter your PIN</h1>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">Enter the 4 digit PIN you set up.</p>
            <div className="mt-8">
              <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" aria-label="PIN" className={pinClass} />
            </div>
            <button onClick={handleVerifyPin} disabled={busy || lockedFor > 0} className={primaryClass}>Unlock</button>
            {shownError && <p className="text-rose-400 text-sm mt-5">{shownError}</p>}
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
