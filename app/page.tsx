'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './lib/supabase'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)

  useEffect(function () {
    supabase.auth.getUser().then(function (result) {
      setUser(result.data.user)
      setCheckingAuth(false)
    })
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pageStyle = { minHeight: '100vh', background: '#0a0a0a', padding: '3rem 1.5rem', fontFamily: '-apple-system, sans-serif' }
  const containerStyle = { maxWidth: '480px', margin: '0 auto' }
  const signInLinkStyle = { display: 'inline-block', marginTop: '1.5rem', padding: '0.7rem 1.4rem', backgroundColor: 'white', color: '#0a0a0a', borderRadius: '6px', textDecoration: 'none', fontWeight: 700 }

  if (checkingAuth) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: '#666' }}>Loading</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <h1 style={{ color: 'white', fontSize: '1.6rem', fontWeight: 700 }}>Naivo</h1>
          <p style={{ color: '#888', marginTop: '0.75rem', lineHeight: 1.5 }}>One place to see your money across every bank and wallet, without handing anyone your funds.</p>
          <a href="/login" style={signInLinkStyle}>Sign In</a>
        </div>
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700 }}>Naivo</h1>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Sign out</button>
        </div>

        <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.4rem' }}>{user.email}</p>

        <div style={{ marginTop: '2rem', background: '#141414', border: '1px solid #232323', borderRadius: '8px', padding: '1.5rem' }}>
          <p style={{ color: '#888', fontSize: '0.9rem' }}>No wallets connected yet.</p>
        </div>
      </div>
    </div>
  )
}
