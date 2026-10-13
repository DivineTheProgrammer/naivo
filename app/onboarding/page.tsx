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

    router.push('/dashboard')
    router.refresh()
  }

  const inputClass = 'w-full px-4 py-3.5 rounded-lg bg-[#121615] border border-zinc-800 text-white text-base sm:text-sm outline-none focus:border-emerald-600 transition-colors'
  const primaryClass = 'w-full mt-8 px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-black font-bold text-sm rounded-lg'

  return (
    <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center px-5 py-12">
      <div className="w-full max-w-md">
        <div className="flex gap-2 justify-center mb-12">
          <div className={'h-2 rounded-full transition-all ' + (step === 1 ? 'w-8 bg-emerald-500' : 'w-2 bg-zinc-700')}></div>
          <div className={'h-2 rounded-full transition-all ' + (step === 2 ? 'w-8 bg-emerald-500' : 'w-2 bg-zinc-700')}></div>
          <div className={'h-2 rounded-full transition-all ' + (step === 3 ? 'w-8 bg-emerald-500' : 'w-2 bg-zinc-700')}></div>
        </div>

        {step === 1 && (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-black font-extrabold text-2xl flex items-center justify-center mx-auto">N</div>
            <h1 className="text-white text-2xl sm:text-3xl font-bold mt-8">Welcome to Naivo</h1>
            <p className="text-zinc-400 text-sm sm:text-base mt-4 leading-relaxed">One place to see your money across every bank and wallet. Naivo never holds your funds, it only helps you see them clearly.</p>
            <button onClick={function () { setStep(2) }} className={primaryClass}>Get started</button>
          </div>
        )}

        {step === 2 && (
          <div className="text-center">
            <h1 className="text-white text-2xl sm:text-3xl font-bold">How it works right now</h1>
            <p className="text-zinc-400 text-sm sm:text-base mt-4 leading-relaxed">You can add wallets and log transactions manually today. Automatic bank syncing is coming soon, but is not live yet, so what you enter is what Naivo sees.</p>
            <button onClick={function () { setStep(3) }} className={primaryClass}>Continue</button>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-white text-2xl sm:text-3xl font-bold text-center">Add your first wallet</h1>
            <p className="text-zinc-400 text-sm mt-4 text-center leading-relaxed">You can always add more later.</p>
            <div className="mt-8 flex flex-col gap-4">
              <input value={walletName} onChange={function (e) { setWalletName(e.target.value) }} placeholder="Wallet name, e.g. GTBank" className={inputClass} />
              <input value={walletProvider} onChange={function (e) { setWalletProvider(e.target.value) }} placeholder="Provider (optional)" className={inputClass} />
            </div>
            <button onClick={handleFinish} disabled={saving} className={primaryClass}>{saving ? 'Setting up...' : 'Finish setup'}</button>
            <button onClick={handleFinish} disabled={saving} className="w-full mt-3 px-6 py-3.5 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors text-sm font-semibold rounded-lg">Skip for now</button>
          </div>
        )}
      </div>
    </div>
  )
}
