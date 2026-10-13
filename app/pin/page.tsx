'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function PinPage() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode] = useState<'set' | 'verify' | 'loading'>('loading')
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

      const profileResult = await supabase
        .from('users')
        .select('pin_hash')
        .eq('id', user.id)
        .single()

      const hasPin = profileResult.data && profileResult.data.pin_hash
      setMode(hasPin ? 'verify' : 'set')
    })
  }, [])

  const handleSetPin = async () => {
    setError('')
    if (pin.length !== 4) {
      setError('PIN must be 4 digits')
      return
    }
    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    const res = await fetch('/api/pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin }),
    })

    if (res.ok) {
      document.cookie = 'naivo_pin_verified=true; path=/; max-age=86400'
      router.push('/dashboard')
      router.refresh()
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to set PIN')
    }
  }

  const handleVerifyPin = async () => {
    setError('')
    const res = await fetch('/api/pin/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: pin }),
    })

    const data = await res.json()

    if (data.correct) {
      document.cookie = 'naivo_pin_verified=true; path=/; max-age=86400'
      router.push('/dashboard')
      router.refresh()
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  const pinClass = 'w-full px-4 py-4 rounded-lg bg-[#121615] border border-zinc-800 text-white text-2xl text-center tracking-[0.5em] outline-none focus:border-emerald-600 transition-colors'

  if (mode === 'loading') {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 text-black font-extrabold text-xl flex items-center justify-center mx-auto">N</div>

        {mode === 'set' ? (
          <div>
            <h1 className="text-white text-2xl font-bold mt-8">Set a PIN</h1>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">This adds a lock to Naivo, separate from your sign in.</p>
            <div className="mt-8 flex flex-col gap-4">
              <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" className={pinClass} />
              <input value={confirmPin} onChange={function (e) { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="Confirm" className={pinClass} />
            </div>
            <button onClick={handleSetPin} className="w-full mt-6 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-lg">Set PIN</button>
            {error && <p className="text-rose-400 text-sm mt-5">{error}</p>}
          </div>
        ) : (
          <div>
            <h1 className="text-white text-2xl font-bold mt-8">Enter your PIN</h1>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">Enter the 4 digit PIN you set up.</p>
            <div className="mt-8">
              <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" className={pinClass} />
            </div>
            <button onClick={handleVerifyPin} className="w-full mt-6 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-lg">Unlock</button>
            {error && <p className="text-rose-400 text-sm mt-5">{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
