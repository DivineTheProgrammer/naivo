'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from './lib/supabase'
import { startRegistration } from '@simplewebauthn/browser'

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
  const [newWalletCurrency, setNewWalletCurrency] = useState('NGN')

  const [txAmount, setTxAmount] = useState('')
  const [txType, setTxType] = useState('debit')
  const [txDescription, setTxDescription] = useState('')

  const [report, setReport] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')

  const [passkeyStatus, setPasskeyStatus] = useState('')

  const [homeCurrency, setHomeCurrency] = useState('NGN')
  const [rates, setRates] = useState<any[]>([])

  useEffect(function () {
    supabase.auth.getUser().then(async function (result) {
      const currentUser = result.data.user
      setUser(currentUser)

      if (currentUser) {
        const profileResult = await supabase
          .from('users')
          .select('onboarding_completed, home_currency')
          .eq('id', currentUser.id)
          .single()

        if (profileResult.data && profileResult.data.onboarding_completed === false) {
          router.push('/onboarding')
          return
        }

        if (profileResult.data && profileResult.data.home_currency) {
          setHomeCurrency(profileResult.data.home_currency)
        }

        loadWallets()
        loadRates()
      }

      setCheckingAuth(false)
    })
  }, [])

  const loadRates = async () => {
    const res = await fetch('/api/exchange-rates')
    const data = await res.json()
    setRates(data.rates || [])
  }

  const convertToHome = function (amount: number, fromCurrency: string) {
    if (fromCurrency === homeCurrency) return amount
    if (fromCurrency === 'NGN') {
      const rate = rates.find(function (r) { return r.target_currency === homeCurrency })
      return rate ? amount * rate.rate : amount
    }
    const rateFromHome = rates.find(function (r) { return r.target_currency === fromCurrency })
    if (rateFromHome) {
      const inNgn = amount / rateFromHome.rate
      if (homeCurrency === 'NGN') return inNgn
      const rateToHome = rates.find(function (r) { return r.target_currency === homeCurrency })
      return rateToHome ? inNgn * rateToHome.rate : inNgn
    }
    return amount
  }

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
      body: JSON.stringify({ name: newWalletName, provider: newWalletProvider, currency: newWalletCurrency }),
    })
    setNewWalletName('')
    setNewWalletProvider('')
    setNewWalletCurrency('NGN')
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

  const handleGenerateReport = async () => {
    setReportLoading(true)
    setReportError('')
    setReport(null)
    try {
      const res = await fetch('/api/generate-report', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setReportError(data.error || 'Something went wrong')
      } else {
        setReport(data.report)
      }
    } catch (err: any) {
      setReportError(err.message || String(err))
    } finally {
      setReportLoading(false)
    }
  }

  const handleRegisterPasskey = async () => {
    setPasskeyStatus('Requesting options...')
    try {
      const optionsRes = await fetch('/api/webauthn/register-options', { method: 'POST' })
      const options = await optionsRes.json()
      setPasskeyStatus('Prompting device authenticator...')

      const registrationResponse = await startRegistration({ optionsJSON: options })
      setPasskeyStatus('Verifying with server...')

      const verifyRes = await fetch('/api/webauthn/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ response: registrationResponse, deviceName: 'My device' }),
      })
      const verifyData = await verifyRes.json()
      setPasskeyStatus(verifyData.message || verifyData.error || 'Unknown result')
    } catch (err: any) {
      setPasskeyStatus('Error: ' + (err.message || String(err)))
    }
  }

  const handleChangeHomeCurrency = async (currency: string) => {
    setHomeCurrency(currency)
    if (user) {
      await supabase.from('users').update({ home_currency: currency }).eq('id', user.id)
    }
  }

  const handleSignOut = async () => {
    document.cookie = 'naivo_pin_verified=; path=/; max-age=0'
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isLocked = function (lockedUntil: string | null) {
    if (!lockedUntil) return false
    return new Date(lockedUntil).getTime() > Date.now()
  }

  const timeRemaining = function (lockedUntil: string) {
    const ms = new Date(lockedUntil).getTime() - Date.now()
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    return hours + 'h ' + minutes + 'm'
  }

  const totalInHomeCurrency = wallets.reduce(function (sum, w) {
    return sum + convertToHome(Number(w.balance), w.currency)
  }, 0)

  const pageStyle = { minHeight: '100vh', background: 'var(--bg)', padding: '3rem 1.5rem' }
  const containerStyle = { maxWidth: '560px', margin: '0 auto' }
  const cardStyle = { marginTop: '1.5rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.5rem' }
  const labelStyle = { display: 'block', marginBottom: '0.4rem', fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }
  const inputStyle = { width: '100%', padding: '0.6rem 0.75rem', marginTop: '0.5rem', color: 'var(--text-primary)', backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }
  const buttonStyle = { marginTop: '0.75rem', padding: '0.6rem 1.1rem', cursor: 'pointer', backgroundColor: 'var(--accent)', color: 'var(--accent-text)', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '0.85rem' }
  const signInLinkStyle = { display: 'inline-block', marginTop: '1.5rem', padding: '0.7rem 1.4rem', backgroundColor: 'var(--accent)', color: 'var(--accent-text)', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: 700 }
  const walletChipStyle = function (active: boolean) {
    return { padding: '0.5rem 0.9rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: active ? 'var(--accent)' : 'transparent', color: active ? 'var(--accent-text)' : 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }
  }
  const lockBadgeStyle = { display: 'inline-block', padding: '0.15rem 0.5rem', borderRadius: '4px', background: '#2a2410', color: 'var(--locked)', fontSize: '0.7rem', fontWeight: 600, marginTop: '0.25rem' }
  const currencySymbol: any = { NGN: '\u20A6', USD: '$', EUR: '\u20AC', GBP: '\u00A3' }

  if (checkingAuth) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <p style={{ color: 'var(--text-muted)' }}>Loading</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div style={pageStyle}>
        <div style={containerStyle}>
          <h1>Naivo</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem', lineHeight: 1.6 }}>One place to see your money across every bank and wallet, without handing anyone your funds.</p>
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
          <h1 style={{ fontSize: '1.4rem' }}>Naivo</h1>
          <button onClick={handleSignOut} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.85rem', textDecoration: 'underline' }}>Sign out</button>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.4rem' }}>{user.email}</p>

        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Total across all wallets</h3>
            <select value={homeCurrency} onChange={function (e) { handleChangeHomeCurrency(e.target.value) }} style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>
              <option value="NGN">NGN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>
          <p className="numeric" style={{ color: 'var(--credit)', fontSize: '1.8rem', fontWeight: 700, marginTop: '0.5rem' }}>
            {currencySymbol[homeCurrency] || ''}{totalInHomeCurrency.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '0.2rem' }}>Converted using live rates, may not reflect real-time market movement exactly</p>
        </div>

        <div style={cardStyle}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1rem' }}>Passwordless Login</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>Register a passkey to sign in with your device instead of a magic link.</p>
          <button onClick={handleRegisterPasskey} style={buttonStyle}>Register Passkey</button>
          {passkeyStatus && <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{passkeyStatus}</p>}
        </div>

        <div style={cardStyle}>
          <h3>Add a wallet</h3>
          <input value={newWalletName} onChange={function (e) { setNewWalletName(e.target.value) }} placeholder="Wallet name, e.g. GTBank" style={inputStyle} />
          <input value={newWalletProvider} onChange={function (e) { setNewWalletProvider(e.target.value) }} placeholder="Provider, e.g. GTBank (optional)" style={inputStyle} />
          <select value={newWalletCurrency} onChange={function (e) { setNewWalletCurrency(e.target.value) }} style={inputStyle}>
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
          </select>
          <button onClick={handleAddWallet} style={buttonStyle}>Add Wallet</button>
        </div>

        {wallets.length > 0 && (
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' as const }}>
            {wallets.map(function (w) {
              return (
                <button key={w.id} onClick={function () { setSelectedWalletId(w.id); loadTransactions(w.id) }} style={walletChipStyle(w.id === selectedWalletId)}>
                  {w.name} ({w.currency})
                </button>
              )
            })}
          </div>
        )}

        {selectedWallet && (
          <div style={cardStyle}>
            <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>{selectedWallet.name}</h3>
            <p className="numeric" style={{ color: 'var(--credit)', fontSize: '1.5rem', fontWeight: 700, marginTop: '0.5rem' }}>
              {selectedWallet.currency} {Number(selectedWallet.balance).toLocaleString()}
            </p>
            {selectedWallet.currency !== homeCurrency && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                approx. {currencySymbol[homeCurrency] || ''}{convertToHome(Number(selectedWallet.balance), selectedWallet.currency).toLocaleString(undefined, { maximumFractionDigits: 2 })} in {homeCurrency}
              </p>
            )}

            <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <h3>Add a transaction</h3>
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
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No transactions yet.</p>
              ) : (
                transactions.map(function (t) {
                  const locked = isLocked(t.locked_until)
                  return (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{t.description || t.category || 'Transaction'}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{new Date(t.transaction_time).toLocaleString()}</div>
                        {locked && <div style={lockBadgeStyle}>Locked for {timeRemaining(t.locked_until)}</div>}
                      </div>
                      <div className="numeric" style={{ color: t.type === 'credit' ? 'var(--credit)' : 'var(--debit)', fontWeight: 700, fontSize: '0.9rem' }}>
                        {t.type === 'credit' ? '+' : '-'}{selectedWallet.currency} {Number(t.amount).toLocaleString()}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        <div style={cardStyle}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: '1.1rem' }}>Weekly Report</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.3rem' }}>An honest look at your last 7 days, not just encouragement.</p>
          <button onClick={handleGenerateReport} disabled={reportLoading} style={buttonStyle}>
            {reportLoading ? 'Generating...' : 'Generate Report'}
          </button>

          {reportError && <p style={{ color: 'var(--debit)', marginTop: '1rem', fontSize: '0.85rem' }}>{reportError}</p>}

          {report && (
            <div style={{ marginTop: '1.25rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.5 }}>{report.summary}</p>

              {report.insights && report.insights.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', margin: 0 }}>Insights</h4>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                    {report.insights.map(function (insight: string, i: number) {
                      return <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{insight}</li>
                    })}
                  </ul>
                </div>
              )}

              {report.flags && report.flags.length > 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ color: 'var(--debit)', fontSize: '0.8rem', margin: 0 }}>Worth Your Attention</h4>
                  <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.2rem' }}>
                    {report.flags.map(function (flag: string, i: number) {
                      return <li key={i} style={{ color: 'var(--debit)', fontSize: '0.85rem', marginBottom: '0.4rem' }}>{flag}</li>
                    })}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
