'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'
import Nav from '../components/Nav'

export default function Wallets() {
  const router = useRouter()
  const supabase = createClient()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [wallets, setWallets] = useState<any[]>([])
  const [showAddWallet, setShowAddWallet] = useState(false)
  const [newWalletName, setNewWalletName] = useState('')
  const [newWalletProvider, setNewWalletProvider] = useState('')
  const [newWalletCurrency, setNewWalletCurrency] = useState('NGN')
  const [addError, setAddError] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editProvider, setEditProvider] = useState('')
  const [editError, setEditError] = useState('')

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteTyped, setDeleteTyped] = useState('')
  const [deleteTxCount, setDeleteTxCount] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(function () {
    supabase.auth.getUser().then(async function (result) {
      if (!result.data.user) {
        router.push('/login')
        return
      }
      await loadWallets()
      setCheckingAuth(false)
    })
  }, [])

  const loadWallets = async () => {
    const res = await fetch('/api/wallets')
    const data = await res.json()
    setWallets(data.wallets || [])
  }

  const handleAddWallet = async () => {
    setAddError('')
    if (!newWalletName.trim()) {
      setAddError('Enter a wallet name.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/wallets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newWalletName, provider: newWalletProvider, currency: newWalletCurrency }) })
      const data = await res.json()
      if (!res.ok) {
        setAddError(data.error || 'Could not create the wallet.')
        return
      }
      setNewWalletName('')
      setNewWalletProvider('')
      setNewWalletCurrency('NGN')
      setShowAddWallet(false)
      await loadWallets()
    } catch (err) {
      setAddError('Network problem. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = function (w: any) {
    setDeletingId(null)
    setEditError('')
    setEditingId(w.id)
    setEditName(w.name)
    setEditProvider(w.provider || '')
  }

  const handleSaveEdit = async () => {
    setEditError('')
    if (!editName.trim()) {
      setEditError('Enter a wallet name.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/wallets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, name: editName, provider: editProvider }) })
      const data = await res.json()
      if (!res.ok) {
        setEditError(data.error || 'Could not save the changes.')
        return
      }
      setEditingId(null)
      await loadWallets()
    } catch (err) {
      setEditError('Network problem. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const startDelete = async function (w: any) {
    setEditingId(null)
    setDeleteError('')
    setDeleteTyped('')
    setDeleteTxCount(null)
    setDeletingId(w.id)
    try {
      const res = await fetch('/api/transactions?walletId=' + w.id)
      const data = await res.json()
      setDeleteTxCount((data.transactions || []).length)
    } catch (err) {
      setDeleteTxCount(null)
    }
  }

  const handleConfirmDelete = async (w: any) => {
    setDeleteError('')
    setBusy(true)
    try {
      const res = await fetch('/api/wallets?id=' + w.id, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) {
        setDeleteError(data.error || 'Could not delete the wallet.')
        return
      }
      setDeletingId(null)
      await loadWallets()
    } catch (err) {
      setDeleteError('Network problem. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const displayName = function (name: string) {
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  const formatBalance = function (amount: number, currency: string) {
    const sign = amount < 0 ? '-' : ''
    return sign + currency + ' ' + Math.abs(amount).toLocaleString()
  }

  const inputClass = 'w-full px-4 py-3 rounded-lg bg-[#121615] border border-zinc-800 text-white text-base sm:text-sm outline-none focus:border-emerald-600 transition-colors'

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-32 md:pb-20">
        <div className="flex justify-between items-center gap-4">
          <h1 className="text-white text-2xl sm:text-3xl font-bold">Wallets</h1>
          <button onClick={function () { setAddError(''); setShowAddWallet(!showAddWallet) }} className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 transition-colors text-black font-bold text-sm rounded-lg flex-shrink-0">{showAddWallet ? 'Close' : '+ Add wallet'}</button>
        </div>

        {showAddWallet && (
          <div className="mt-8 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <h2 className="text-white text-base font-semibold">New wallet</h2>
            <div className="mt-5 flex flex-col gap-4">
              <input value={newWalletName} onChange={function (e) { setNewWalletName(e.target.value) }} placeholder="Wallet name, e.g. GTBank" maxLength={40} aria-label="Wallet name" className={inputClass} />
              <input value={newWalletProvider} onChange={function (e) { setNewWalletProvider(e.target.value) }} placeholder="Provider (optional)" maxLength={40} aria-label="Provider" className={inputClass} />
              <select value={newWalletCurrency} onChange={function (e) { setNewWalletCurrency(e.target.value) }} aria-label="Currency" className={inputClass}>
                <option value="NGN">NGN</option><option value="USD">USD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
              </select>
            </div>
            {addError && <p className="text-rose-400 text-sm mt-5">{addError}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={handleAddWallet} disabled={busy} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-black font-bold text-sm rounded-lg">Add wallet</button>
              <button onClick={function () { setShowAddWallet(false); setAddError('') }} className="px-6 py-3 border border-zinc-700 text-zinc-300 hover:text-white hover:border-zinc-500 transition-colors text-sm font-semibold rounded-lg">Cancel</button>
            </div>
          </div>
        )}

        <div className="mt-10 grid gap-4">
          {wallets.length === 0 ? (
            <p className="text-zinc-400 text-sm text-center py-12">No wallets yet. Add your first one above.</p>
          ) : (
            wallets.map(function (w) {
              const editing = editingId === w.id
              const deleting = deletingId === w.id
              const confirmed = deleteTyped.trim().toLowerCase() === w.name.trim().toLowerCase()
              return (
                <div key={w.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <a href={'/transactions?walletId=' + w.id} className="hover:bg-zinc-800/60 transition-colors rounded-2xl p-5 sm:p-7 flex justify-between items-center gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-full bg-emerald-600/15 text-emerald-400 font-bold text-lg flex items-center justify-center flex-shrink-0">
                        {displayName(w.name).charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-white text-base font-semibold truncate">{displayName(w.name)}</h3>
                        {w.provider && <p className="text-zinc-400 text-xs mt-1 truncate">{w.provider}</p>}
                      </div>
                    </div>
                    <p className={'text-base sm:text-lg font-bold tabular-nums flex-shrink-0 ' + (Number(w.balance) < 0 ? 'text-rose-400' : 'text-green-400')}>{formatBalance(Number(w.balance), w.currency)}</p>
                  </a>

                  {!editing && !deleting && (
                    <div className="flex items-center gap-6 px-5 sm:px-7 pb-3 -mt-1">
                      <button onClick={function () { startEdit(w) }} className="py-2 text-zinc-300 hover:text-white text-xs font-semibold">Edit</button>
                      <button onClick={function () { startDelete(w) }} className="py-2 text-zinc-400 hover:text-rose-400 text-xs font-semibold">Delete</button>
                    </div>
                  )}

                  {editing && (
                    <div className="border-t border-zinc-800 p-5 sm:p-7">
                      <div className="flex flex-col gap-4">
                        <input value={editName} onChange={function (e) { setEditName(e.target.value) }} maxLength={40} aria-label="Wallet name" className={inputClass} />
                        <input value={editProvider} onChange={function (e) { setEditProvider(e.target.value) }} placeholder="Provider (optional)" maxLength={40} aria-label="Provider" className={inputClass} />
                      </div>
                      <p className="text-zinc-500 text-xs mt-3">Currency and balance cannot be changed here.</p>
                      {editError && <p className="text-rose-400 text-sm mt-4">{editError}</p>}
                      <div className="flex gap-3 mt-5">
                        <button onClick={handleSaveEdit} disabled={busy} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-black font-bold text-sm rounded-lg">Save</button>
                        <button onClick={function () { setEditingId(null) }} className="px-5 py-2.5 border border-zinc-700 text-zinc-300 hover:text-white transition-colors text-sm font-semibold rounded-lg">Cancel</button>
                      </div>
                    </div>
                  )}

                  {deleting && (
                    <div className="border-t border-zinc-800 p-5 sm:p-7">
                      <p className="text-rose-300 text-sm font-semibold">Delete {displayName(w.name)}?</p>
                      <p className="text-zinc-300 text-sm mt-2 leading-relaxed">{deleteTxCount === null ? 'This also deletes all of its transactions.' : 'This also deletes its ' + deleteTxCount + ' transaction' + (deleteTxCount === 1 ? '' : 's') + '.'} This cannot be undone.</p>
                      <p className="text-zinc-400 text-xs mt-4">Type <span className="text-white font-semibold">{w.name}</span> to confirm.</p>
                      <input value={deleteTyped} onChange={function (e) { setDeleteTyped(e.target.value) }} aria-label="Type the wallet name to confirm" className={inputClass + ' mt-2'} />
                      {deleteError && <p className="text-rose-400 text-sm mt-4">{deleteError}</p>}
                      <div className="flex gap-3 mt-5">
                        <button onClick={function () { handleConfirmDelete(w) }} disabled={busy || !confirmed} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 transition-colors text-white font-bold text-sm rounded-lg">Delete wallet</button>
                        <button onClick={function () { setDeletingId(null) }} className="px-5 py-2.5 border border-zinc-700 text-zinc-300 hover:text-white transition-colors text-sm font-semibold rounded-lg">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </main>
    </div>
  )
}
