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

  const pageStyle = { minHeight: '100vh', background: '#0a0a0a', padding: '3rem 1.5rem', fontFamily: '-apple-system, sans-serif' }
  const containerStyle = { maxWidth: '400px', margin: '0 auto' }
  const inputStyle = { width: '100%', padding: '0.65rem 0.75rem', marginTop: '0.75rem', color: '#111', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', fontSize: '0.95rem' }
  const buttonStyle = { marginTop: '1rem', padding: '0.7rem 1.2rem', cursor: 'pointer', backgroundColor: 'white', color: '#0a0a0a', border: 'none', borderRadius: '6px', fontWeight: 700 }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 700 }}>Sign in to Naivo</h1>

        {sent ? (
          <p style={{ color: '#3ecf8e', marginTop: '1rem' }}>Check your email for a magic link to sign in.</p>
        ) : (
          <div>
            <input type="email" value={email} onChange={function (e) { setEmail(e.target.value) }} placeholder="you@example.com" style={inputStyle} />
            <button onClick={handleLogin} disabled={loading || !email} style={buttonStyle}>{loading ? 'Sending...' : 'Send Magic Link'}</button>
            {error && <p style={{ color: '#f0576b', marginTop: '1rem' }}>{error}</p>}
          </div>
        )}
      </div>
    </div>
  )
}
