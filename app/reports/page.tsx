'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'
import Nav from '../components/Nav'

export default function Reports() {
  const router = useRouter()
  const supabase = createClient()

  const [checkingAuth, setCheckingAuth] = useState(true)
  const [report, setReport] = useState<any>(null)
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')

  useEffect(function () {
    supabase.auth.getUser().then(function (result) {
      if (!result.data.user) {
        router.push('/login')
        return
      }
      setCheckingAuth(false)
    })
  }, [])

  const handleGenerateReport = async () => {
    setReportLoading(true)
    setReportError('')
    setReport(null)
    try {
      const res = await fetch('/api/generate-report', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) setReportError(data.error || 'Something went wrong')
      else setReport(data.report)
    } catch (err: any) {
      setReportError(err.message || String(err))
    } finally {
      setReportLoading(false)
    }
  }

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-500 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <div className="max-w-3xl mx-auto px-6 pb-16">
        <h1 className="text-white text-2xl font-bold mt-8">Weekly Report</h1>
        <p className="text-zinc-500 text-sm mt-2">An honest look at your last 7 days, not encouragement.</p>

        <button onClick={handleGenerateReport} disabled={reportLoading} className="mt-5 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-black font-bold text-sm rounded-xl">
          {reportLoading ? 'Generating...' : 'Generate Report'}
        </button>

        {reportError && <p className="text-rose-400 mt-4 text-sm">{reportError}</p>}

        {report && (
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <p className="text-zinc-300 text-sm leading-relaxed">{report.summary}</p>

            {report.insights && report.insights.length > 0 && (
              <div className="mt-5">
                <h4 className="text-zinc-600 text-xs font-bold uppercase tracking-wider">Insights</h4>
                <ul className="mt-2.5 pl-5 list-disc">
                  {report.insights.map(function (insight: string, i: number) { return <li key={i} className="text-zinc-300 text-sm mb-1.5">{insight}</li> })}
                </ul>
              </div>
            )}

            {report.flags && report.flags.length > 0 && (
              <div className="mt-5">
                <h4 className="text-rose-400 text-xs font-bold uppercase tracking-wider">Worth your attention</h4>
                <ul className="mt-2.5 pl-5 list-disc">
                  {report.flags.map(function (flag: string, i: number) { return <li key={i} className="text-rose-400 text-sm mb-1.5">{flag}</li> })}
                </ul>
              </div>
            )}
          </div>
        )}

        {!report && !reportLoading && !reportError && (
          <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
            <p className="text-zinc-600 text-sm">No report generated yet this session. Click the button above to generate one from your real transaction data.</p>
          </div>
        )}
      </div>
    </div>
  )
}
