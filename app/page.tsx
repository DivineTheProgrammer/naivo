'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './lib/supabase'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(function () {
    supabase.auth.getUser().then(function (result) {
      if (result.data.user) {
        router.replace('/dashboard')
      }
    })
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-black font-extrabold text-xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-900/40">N</div>
        <h1 className="text-white text-2xl font-bold mt-6 tracking-tight">Naivo</h1>
        <p className="text-zinc-400 mt-3 leading-relaxed">One place to see your money across every bank and wallet, without handing anyone your funds.</p>
        <a href="/login" className="inline-block mt-7 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 transition-colors duration-150 text-black font-bold rounded-xl shadow-lg shadow-emerald-900/30">Sign In</a>
      </div>
    </div>
  )
}
