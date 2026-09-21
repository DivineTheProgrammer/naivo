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
      router.push('/')
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
      router.push('/')
      router.refresh()
    } else {
      setError('Incorrect PIN')
      setPin('')
    }
  }

  const pageStyle = { minHeight: '100vh', background: 'var(--bg)', padding: '3rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const containerStyle = { maxWidth: '360px', width: '100%', textAlign: 'center' as const }
  const inputStyle = { width: '100%', padding: '0.75rem', marginTop: '1rem', color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '1.3rem', textAlign: 'center' as const, letterSpacing: '0.5rem' }
  const buttonStyle = { marginTop: '1.25rem', width: '100%', padding: '0.75rem', cursor: 'pointer', backgroundColor: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.95rem' }

  if (mode === 'loading') {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: 'var(--text-muted)' }}>Loading</p>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        {mode === 'set' ? (
          <div>
            <h1 style={{ fontSize: '1.3rem' }}>Set a PIN</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.4rem' }}>This adds a lock to Naivo, separate from your sign in.</p>
            <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" style={inputStyle} />
            <input value={confirmPin} onChange={function (e) { setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="Confirm PIN" style={inputStyle} />
            <button onClick={handleSetPin} style={buttonStyle}>Set PIN</button>
            {error && <p style={{ color: 'var(--debit)', marginTop: '1rem', fontSize: '0.85rem' }}>{error}</p>}
          </div>
        ) : (
          <div>
            <h1 style={{ fontSize: '1.3rem' }}>Enter your PIN</h1>
            <input value={pin} onChange={function (e) { setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }} type="password" inputMode="numeric" placeholder="0000" style={inputStyle} />
            <button onClick={handleVerifyPin} style={buttonStyle}>Unlock</button>
            {error && <p style={{ color: 'var(--debit)', marginTop: '1rem', fontSize: '0.85rem' }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
