'use client'

import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'
import { startRegistration } from '@simplewebauthn/browser'
import Nav from '../components/Nav'

function SettingRow({ icon, title, description, children }: { icon: string, title: string, description: string, children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-6">
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-11 h-11 rounded-lg bg-zinc-800 flex items-center justify-center text-lg flex-shrink-0">{icon}</div>
        <div className="min-w-0">
          <h3 className="text-white text-sm font-semibold">{title}</h3>
          <p className="text-zinc-400 text-xs mt-1 leading-relaxed">{description}</p>
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

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteEmail, setDeleteEmail] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)

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

  const handleDeleteAccount = async () => {
    setDeleteError('')
    setDeleting(true)
    try {
      const res = await fetch('/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: deleteEmail }) })
      const data = await res.json()

      if (!res.ok) {
        setDeleteError(data.error || 'Could not delete your account.')
        return
      }

      await supabase.auth.signOut({ scope: 'local' })
      router.push('/')
      router.refresh()
    } catch (err) {
      setDeleteError('Network problem. Nothing was deleted. Try again.')
    } finally {
      setDeleting(false)
    }
  }

  const emailMatches = user && user.email && deleteEmail.trim().toLowerCase() === user.email.toLowerCase()

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-32 md:pb-20">
        <h1 className="text-white text-2xl sm:text-3xl font-bold">Settings</h1>
        <p className="text-zinc-400 text-sm mt-3 break-all">{user ? user.email : ''}</p>

        <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mt-12 mb-4">Preferences</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 sm:px-7">
          <SettingRow icon={'\uD83D\uDCB1'} title="Home currency" description="Used for your total balance across all wallets">
            <select value={homeCurrency} onChange={function (e) { handleChangeHomeCurrency(e.target.value) }} aria-label="Home currency" className="bg-[#121615] text-white border border-zinc-600 hover:border-zinc-500 transition-colors rounded-lg px-4 py-2.5 text-base sm:text-sm font-semibold outline-none cursor-pointer">
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </SettingRow>
        </div>

        <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mt-12 mb-4">Security</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-5 sm:px-7">
          <SettingRow icon={'\uD83D\uDD11'} title="Passkey sign in" description="Use your device instead of a magic link">
            <button onClick={handleRegisterPasskey} className="bg-[#121615] text-zinc-100 border border-zinc-600 hover:border-zinc-500 hover:bg-zinc-800 transition-colors rounded-lg px-5 py-2.5 text-sm font-semibold">Register</button>
          </SettingRow>
          {passkeyStatus && <p className="text-zinc-300 text-xs pb-6 -mt-2 leading-relaxed">{passkeyStatus}</p>}
        </div>

        <h2 className="text-rose-400 text-xs font-bold uppercase tracking-wider mt-12 mb-4">Danger zone</h2>
        <div className="bg-zinc-900 border border-rose-900/50 rounded-2xl px-5 sm:px-7">
          <SettingRow icon={'\uD83D\uDDD1'} title="Delete account" description="Permanently deletes your login, wallets, transactions and reports">
            <button onClick={function () { setDeleteError(''); setDeleteEmail(''); setDeleteOpen(!deleteOpen) }} className="bg-[#121615] text-rose-300 border border-rose-900 hover:border-rose-700 hover:bg-rose-950/40 transition-colors rounded-lg px-5 py-2.5 text-sm font-semibold">{deleteOpen ? 'Cancel' : 'Delete'}</button>
          </SettingRow>

          {deleteOpen && (
            <div className="pb-6 -mt-1">
              <p className="text-zinc-300 text-sm leading-relaxed">This cannot be undone. Everything in your Naivo account is erased, including your history and passkeys.</p>
              <p className="text-zinc-400 text-xs mt-4">Type <span className="text-white font-semibold break-all">{user ? user.email : ''}</span> to confirm.</p>
              <input value={deleteEmail} onChange={function (e) { setDeleteEmail(e.target.value) }} type="email" autoComplete="off" aria-label="Type your email to confirm" className="w-full mt-2 px-4 py-3 rounded-lg bg-[#121615] border border-zinc-800 text-white text-base sm:text-sm outline-none focus:border-rose-600 transition-colors" />
              {deleteError && <p className="text-rose-400 text-sm mt-4 leading-relaxed">{deleteError}</p>}
              <button onClick={handleDeleteAccount} disabled={deleting || !emailMatches} className="mt-5 px-6 py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 transition-colors text-white font-bold text-sm rounded-lg">{deleting ? 'Deleting...' : 'Permanently delete my account'}</button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
