'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function Onboarding() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [walletName, setWalletName] = useState('')
  const [walletProvider, setWalletProvider] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFinish = async () => {
    setSaving(true)

    if (walletName) {
      await fetch('/api/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: walletName, provider: walletProvider }),
      })
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('users').update({ onboarding_completed: true }).eq('id', user.id)
    }

    router.push('/')
    router.refresh()
  }

  const pageStyle = { minHeight: '100vh', background: 'var(--bg)', padding: '3rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }
  const containerStyle = { maxWidth: '420px', width: '100%' }
  const inputStyle = { width: '100%', padding: '0.65rem 0.75rem', marginTop: '0.75rem', color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.95rem' }
  const buttonStyle = { marginTop: '1.5rem', width: '100%', padding: '0.75rem', cursor: 'pointer', backgroundColor: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.95rem' }
  const secondaryButtonStyle = { marginTop: '0.75rem', width: '100%', padding: '0.75rem', cursor: 'pointer', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontWeight: 600, fontSize: '0.9rem' }
  const stepDotsStyle = { display: 'flex', gap: '0.4rem', justifyContent: 'center', marginBottom: '2rem' }
  const dotStyle = function (active: boolean) {
    return { width: '8px', height: '8px', borderRadius: '50%', background: active ? 'var(--accent)' : 'var(--border)' }
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={stepDotsStyle}>
          <div style={dotStyle(step === 1)}></div>
          <div style={dotStyle(step === 2)}></div>
          <div style={dotStyle(step === 3)}></div>
        </div>

        {step === 1 && (
          <div style={{ textAlign: 'center' as const }}>
            <h1>Welcome to Naivo</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: 1.6 }}>
              One place to see your money across every bank and wallet. Naivo never holds your funds, it only helps you see them clearly.
            </p>
            <button onClick={function () { setStep(2) }} style={buttonStyle}>Get Started</button>
          </div>
        )}

        {step === 2 && (
          <div style={{ textAlign: 'center' as const }}>
            <h1 style={{ fontSize: '1.4rem' }}>How it works right now</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: 1.6 }}>
              You can add wallets and log transactions manually today. Automatic bank syncing is coming soon, but is not live yet, so what you enter is what Naivo sees.
            </p>
            <button onClick={function () { setStep(3) }} style={buttonStyle}>Continue</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 style={{ fontSize: '1.4rem', textAlign: 'center' as const }}>Add your first wallet</h1>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center' as const, fontSize: '0.9rem' }}>You can always add more later.</p>
            <input value={walletName} onChange={function (e) { setWalletName(e.target.value) }} placeholder="Wallet name, e.g. GTBank" style={inputStyle} />
            <input value={walletProvider} onChange={function (e) { setWalletProvider(e.target.value) }} placeholder="Provider (optional)" style={inputStyle} />
            <button onClick={handleFinish} disabled={saving} style={buttonStyle}>{saving ? 'Setting up...' : 'Finish Setup'}</button>
            <button onClick={handleFinish} disabled={saving} style={secondaryButtonStyle}>Skip for now</button>
          </div>
        )}
      </div>
    </div>
  )
}
