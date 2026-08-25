'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './lib/supabase'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  const [user, setUser] = useState<any>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [wallets, setWallets] = useState<any[]>([])
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<any[]>([])

  const [newWalletName, setNewWalletName] = useState('')
  const [newWalletProvider, setNewWalletProvider] = useState('')

  const [txAmount, setTxAmount] = useState('')
  const [txType, setTxType] = useState('debit')
  const [txDescription, setTxDescription] = useState('')

  useEffect(function () {
    supabase.auth.getUser().then(function (result) {
      setUser(result.data.user)
      setCheckingAuth(false)
      if (result.data.user) {
        loadWallets()
      }
    })
  }, [])

  const loadWallets = async () => {
    const res = await fetch('/api/wallets')
    const data = await res.json()
    setWallets(data.wallets || [])
    if (data.wallets && data.wallets.length > 0 && !selectedWalletId) {
      setSelectedWalletId(data.wallets[0].id)
      loadTransactions(data.wallets[0].id)
    }
  }

  const loadTransactions = async (walletId: string) => {
    const res = await fetch('/api/transactions?walletId=' + walletId)
    const data = await res.json()
    setTransactions(data.transactions || [])
  }

  const handleAddWallet = async () => {
    if (!newWalletName) return
    await fetch('/api/wallets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newWalletName, provider: newWalletProvider }),
    })
    setNewWalletName('')
    setNewWalletProvider('')
    loadWallets()
  }

  const handleAddTransaction = async () => {
    if (!selectedWalletId || !txAmount) return
    await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        walletId: selectedWalletId,
        amount: parseFloat(txAmount),
        type: txType,
        description: txDescription,
      }),
    })
    setTxAmount('')
    setTxDescription('')
    loadWallets()
    loadTransactions(selectedWalletId)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const pageStyle = { minHeight: '100vh', background: '#0a0a0a', padding: '3rem 1.5rem', fontFamily: '-apple-system, sans-serif' }
  const containerStyle = { maxWidth: '560px', margin: '0 auto' }
  const cardStyle = { marginTop: '1.5rem', background: '#141414', border: '1px solid #232323', borderRadius: '8px', padding: '1.5rem' }
  const inputStyle = { width: '100%', padding: '0.55rem 0.7rem', marginTop: '0.5rem', color: '#111', backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '6px', fontSize: '0.9rem' }
  const buttonStyle = { marginTop: '0.75rem', padding: '0.55rem 1rem', cursor: 'pointer', backgroundColor: 'white', color: '#0a0a0a', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem' }
  const signInLinkStyle = { display: 'inline-block', marginTop: '1.5rem', padding: '0.7rem 1.4rem', backgroundColor: 'white', color: '#0a0a0a', borderRadius: '6px', textDecoration: 'none', fontWeight: 700 }
  const walletChipStyle = function (active: boolean) {
    return { padding: '0.5rem 0.9rem', borderRadius: '6px', border: '1px solid #333', background: active ? '#4f8ef0' : 'transparent', color: active ? '#0a0a0a' : '#ccc', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }
  }

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

  const selectedWallet = wallets.find(function (w) { return w.id === selectedWalletId })

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ color: 'white', fontSize: '1.4rem', fontWeight: 700 }}>Naivo</h1>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Sign out</button>
        </div>
        <p style={{ color: '#666', fontSize: '0.85rem', marginTop: '0.4rem' }}>{user.email}</p>

        <div style={cardStyle}>
          <h3 style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>Add a wallet</h3>
          <input value={newWalletName} onChange={function (e) { setNewWalletName(e.target.value) }} placeholder="Wallet name, e.g. GTBank" style={inputStyle} />
          <input value={newWalletProvider} onChange={function (e) { setNewWalletProvider(e.target.value) }} placeholder="Provider, e.g. GTBank (optional)" style={inputStyle} />
          <button onClick={handleAddWallet} style={buttonStyle}>Add Wallet</button>
        </div>

        {wallets.length > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
            {wallets.map(function (w) {
              return (
                <button key={w.id} onClick={function () { setSelectedWalletId(w.id); loadTransactions(w.id) }} style={walletChipStyle(w.id === selectedWalletId)}>
                  {w.name}
                </button>
              )
            })}
          </div>
        )}

        {selectedWallet && (
          <div style={cardStyle}>
            <h3 style={{ color: 'white', fontSize: '1.1rem', margin: 0 }}>{selectedWallet.name}</h3>
            <p style={{ color: '#3ecf8e', fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem' }}>
              {selectedWallet.currency} {Number(selectedWallet.balance).toLocaleString()}
            </p>

            <div style={{ marginTop: '1.25rem', borderTop: '1px solid #232323', paddingTop: '1.25rem' }}>
              <h3 style={{ color: '#888', fontSize: '0.9rem', margin: 0 }}>Add a transaction</h3>
              <input value={txAmount} onChange={function (e) { setTxAmount(e.target.value) }} placeholder="Amount" type="number" style={inputStyle} />
              <select value={txType} onChange={function (e) { setTxType(e.target.value) }} style={inputStyle}>
                <option value="debit">Debit (money out)</option>
                <option value="credit">Credit (money in)</option>
              </select>
              <input value={txDescription} onChange={function (e) { setTxDescription(e.target.value) }} placeholder="Description (optional)" style={inputStyle} />
              <button onClick={handleAddTransaction} style={buttonStyle}>Add Transaction</button>
            </div>

            <div style={{ marginTop: '1.25rem' }}>
              {transactions.length === 0 ? (
                <p style={{ color: '#666', fontSize: '0.85rem' }}>No transactions yet.</p>
              ) : (
                transactions.map(function (t) {
                  return (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #232323' }}>
                      <div>
                        <div style={{ color: 'white', fontSize: '0.9rem' }}>{t.description || t.category || 'Transaction'}</div>
                        <div style={{ color: '#666', fontSize: '0.75rem' }}>{new Date(t.transaction_time).toLocaleString()}</div>
                      </div>
                      <div style={{ color: t.type === 'credit' ? '#3ecf8e' : '#f0576b', fontWeight: 700, fontSize: '0.9rem' }}>
                        {t.type === 'credit' ? '+' : '-'}{selectedWallet.currency} {Number(t.amount).toLocaleString()}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
