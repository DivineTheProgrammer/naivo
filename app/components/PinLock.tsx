'use client'

import { useState, useEffect } from 'react'
import { createClient } from '../lib/supabase'

export default function PinLock({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [unlocked, setUnlocked] = useState(false)
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'set' | 'verify' | null>(null)

  useEffect(function () {
    console.log('PinLock mounted, starting check')
    checkStatus()
  }, [])

  const checkStatus = async () => {
    console.log('checkStatus: start')

    const sessionUnlocked = sessionStorage.getItem('naivo_pin_unlocked')
    console.log('checkStatus: sessionUnlocked =', sessionUnlocked)

    if (sessionUnlocked === 'true') {
      setUnlocked(true)
      setChecking(false)
      return
    }

    try {
      console.log('checkStatus: calling getUser')
      const result = await supabase.auth.getUser()
      console.log('checkStatus: getUser result =', result)

      const user = result.data.user

      if (!user) {
        console.log('checkStatus: no user found')
        setChecking(false)
        return
      }

      console.log('checkStatus: querying users table for', user.id)
      const profileResult = await supabase
        .from('users')
        .select('pin_hash')
        .eq('id', user.id)
        .single()

      console.log('checkStatus: profileResult =', profileResult)

      const existingHash = profileResult.data ? profileResult.data.pin_hash : null

      if (existingHash === null || existingHash === undefined || existingHash === '') {
        console.log('checkStatus: setting mode to SET')
        setMode('set')
      } else {
        console.log('checkStatus: setting mode to VERIFY')
        setMode('verify')
      }

      setChecking(false)
    } catch (err) {
      console.error('checkStatus: caught error', err)
      setChecking(false)
      setMode('set')
    }
  }

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
      sessionStorage.setItem('naivo_pin_unlocked', 'true')
      setUnlocked(true)
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
      sessionStorage.setItem('naivo_pin_unlocked', 'true')
      setUnlocked(true)
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  if (checking || mode === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: 'white', padding: '2rem' }}>
        Checking PIN status, see console for details...
      </div>
    )
  }

  if (unlocked) {
    return <>{children}</>
  }

  const pageStyle = { minHeight: '100vh', background: '#0a0a0a', padding: '3rem 1.5rem', fontFamily: '-apple-system, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const containerStyle = { maxWidth: '360px', width: '100%', textAlign: 'center' as const }
  const inputStyle = { width: '100%', padding: '0.75rem', marginTop: '1rem', color: '#111', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', fontSize: '1.3rem', textAlign: 'center' as const, letterSpacing: '0.5rem' }
  const buttonStyle = { marginTop: '1.25rem', width: '100%', padding: '0.75rem', cursor: 'pointer', backgroundColor: 'white', color: '#0a0a0a', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.95rem' }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {mode === 'set' ? (
          <div>
            <h1 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700 }}>Set a PIN</h1>
            <p style={{ color: '#888', fontSize: '0.85rem', marginTop: '0.4rem' }}>This adds a lock to Naivo, separate from your sign in.</p>
            <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" style={inputStyle} />
            <input value={confirmPin} onChange={function (e) { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="Confirm PIN" style={inputStyle} />
            <button onClick={handleSetPin} style={buttonStyle}>Set PIN</button>
            {error && <p style={{ color: '#f0576b', marginTop: '1rem', fontSize: '0.85rem' }}>{error}</p>}
          </div>
        ) : (
          <div>
            <h1 style={{ color: 'white', fontSize: '1.3rem', fontWeight: 700 }}>Enter your PIN</h1>
            <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" style={inputStyle} />
            <button onClick={handleVerifyPin} style={buttonStyle}>Unlock</button>
            {error && <p style={{ color: '#f0576b', marginTop: '1rem', fontSize: '0.85rem' }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
