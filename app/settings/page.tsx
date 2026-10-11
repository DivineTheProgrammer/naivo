'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'
import { startRegistration } from '@simplewebauthn/browser'
import Nav from '../components/Nav'

function SettingRow({ icon, title, description, children }: { icon: string, title: string, description: string, children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-5">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">{icon}</div>
        <div>
          <h3 className="text-white text-sm font-semibold">{title}</h3>
          <p className="text-zinc-400 text-xs mt-0.5">{description}</p>
        </div>
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

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
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <h1 className="text-white text-2xl font-bold mt-10">Settings</h1>
        <p className="text-zinc-400 text-sm mt-1">{user ? user.email : ''}</p>

        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mt-10 mb-3">Preferences</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6">
          <SettingRow icon={'\uD83D\uDCB1'} title="Home currency" description="Used for your total balance across all wallets">
            <select value={homeCurrency} onChange={function (e) { handleChangeHomeCurrency(e.target.value) }} className="bg-[#121615] text-white border border-zinc-600 hover:border-zinc-500 transition-colors rounded-lg px-4 py-2 text-sm font-semibold outline-none cursor-pointer">
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </SettingRow>
        </div>

        <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider mt-10 mb-3">Security</p>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6">
          <SettingRow icon={'\uD83D\uDD11'} title="Passkey sign in" description="Use your device instead of a magic link">
            <button onClick={handleRegisterPasskey} className="bg-[#121615] text-zinc-100 border border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800 transition-colors rounded-lg px-4 py-2 text-sm font-semibold">Register</button>
          </SettingRow>
          {passkeyStatus && <p className="text-zinc-300 text-xs pb-5 -mt-2">{passkeyStatus}</p>}
        </div>
      </div>
    </div>
  )
}
