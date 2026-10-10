'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'
import { startRegistration } from '@simplewebauthn/browser'
import Nav from '../components/Nav'

export default function Settings() {
  const router = useRouter()
  const supabase = createClient()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [homeCurrency, setHomeCurrency] = useState('NGN')
  const [passkeyStatus, setPasskeyStatus] = useState('')

  useEffect(function () {
    supabase.auth.getUser().then(async function (result) {
      const currentUser = result.data.user
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)

      const profileResult = await supabase.from('users').select('home_currency').eq('id', currentUser.id).single()
      if (profileResult.data && profileResult.data.home_currency) setHomeCurrency(profileResult.data.home_currency)

      setCheckingAuth(false)
    })
  }, [])

  const handleChangeHomeCurrency = async (currency: string) => {
    setHomeCurrency(currency)
    if (user) await supabase.from('users').update({ home_currency: currency }).eq('id', user.id)
  }

  const handleRegisterPasskey = async () => {
    setPasskeyStatus('Requesting options...')
    try {
      const optionsRes = await fetch('/api/webauthn/register-options', { method: 'POST' })
      const options = await optionsRes.json()
      setPasskeyStatus('Prompting device authenticator...')
      const registrationResponse = await startRegistration({ optionsJSON: options })
      setPasskeyStatus('Verifying with server...')
      const verifyRes = await fetch('/api/webauthn/register-verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ response: registrationResponse, deviceName: 'My device' }) })
      const verifyData = await verifyRes.json()
      setPasskeyStatus(verifyData.message || verifyData.error || 'Unknown result')
    } catch (err: any) {
      setPasskeyStatus('Error: ' + (err.message || String(err)))
    }
  }

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-500 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <h1 className="text-white text-2xl font-bold mt-8">Settings</h1>
        <p className="text-zinc-500 text-sm mt-1">{user ? user.email : ''}</p>

        <p className="text-zinc-600 text-xs font-bold uppercase tracking-wider mt-8 mb-3">Preferences</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-white text-sm font-semibold">Home currency</h3>
              <p className="text-zinc-600 text-xs mt-1">Used for your total balance across all wallets</p>
            </div>
            <select value={homeCurrency} onChange={function (e) { handleChangeHomeCurrency(e.target.value) }} className="bg-[#121615] text-white border border-zinc-800 rounded-lg px-3 py-2 text-sm outline-none">
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
        </div>

        <p className="text-zinc-600 text-xs font-bold uppercase tracking-wider mt-8 mb-3">Security</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-white text-sm font-semibold">Passkey sign in</h3>
              <p className="text-zinc-600 text-xs mt-1">Use your device instead of a magic link</p>
            </div>
            <button onClick={handleRegisterPasskey} className="px-4 py-2 border border-zinc-700 text-zinc-300 hover:border-zinc-600 transition-colors text-xs font-semibold rounded-lg">Register</button>
          </div>
          {passkeyStatus && <p className="text-zinc-400 text-xs mt-3">{passkeyStatus}</p>}
        </div>
      </div>
    </div>
  )
}
