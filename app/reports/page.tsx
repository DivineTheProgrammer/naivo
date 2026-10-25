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
  const [history, setHistory] = useState<any[]>([])
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(function () {
    supabase.auth.getUser().then(async function (result) {
      if (!result.data.user) {
        router.push('/login')
        return
      }
      await loadHistory()
      setCheckingAuth(false)
    })
  }, [])

  const loadHistory = async () => {
    const res = await supabase
      .from('ai_reports')
      .select('id, report_period_start, report_period_end, summary, insights, generated_at')
      .order('generated_at', { ascending: false })
      .limit(20)

    setHistory(res.data || [])
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
        await loadHistory()
      }
    } catch (err: any) {
      setReportError('Network problem. Try again.')
    } finally {
      setReportLoading(false)
    }
  }

  const formatDay = function (iso: string) {
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const parts = function (row: any) {
    const data = row.insights && typeof row.insights === 'object' ? row.insights : {}
    return {
      summary: row.summary || data.summary || '',
      insights: Array.isArray(data.insights) ? data.insights : [],
      flags: Array.isArray(data.flags) ? data.flags : [],
    }
  }

  if (checkingAuth) {
    return <div className="min-h-screen bg-[#0a0d0c] flex items-center justify-center"><p className="text-zinc-400 text-sm">Loading</p></div>
  }

  return (
    <div className="min-h-screen bg-[#0a0d0c]">
      <Nav />
      <main className="max-w-3xl mx-auto px-5 sm:px-8 pt-10 sm:pt-14 pb-32 md:pb-20">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-5">
          <div>
            <h1 className="text-white text-2xl sm:text-3xl font-bold">Weekly report</h1>
            <p className="text-zinc-400 text-sm mt-3 leading-relaxed">An honest look at your last 7 days, not encouragement.</p>
          </div>
          <button onClick={handleGenerateReport} disabled={reportLoading} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors text-black font-bold text-sm rounded-lg flex-shrink-0 self-start">
            {reportLoading ? 'Generating...' : 'Generate'}
          </button>
        </div>

        {reportError && <p className="text-rose-400 mt-8 text-sm">{reportError}</p>}

        {report && (
          <div className="mt-10 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 sm:p-8">
            <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider">New report</p>
            <p className="text-zinc-200 text-sm sm:text-base leading-relaxed mt-3">{report.summary}</p>

            {report.insights && report.insights.length > 0 && (
              <div className="mt-8">
                <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Insights</h2>
                <ul className="mt-4 pl-5 list-disc">
                  {report.insights.map(function (insight: string, i: number) { return <li key={i} className="text-zinc-200 text-sm leading-relaxed mb-3">{insight}</li> })}
                </ul>
              </div>
            )}

            {report.flags && report.flags.length > 0 && (
              <div className="mt-8">
                <h2 className="text-rose-400 text-xs font-bold uppercase tracking-wider">Worth your attention</h2>
                <ul className="mt-4 pl-5 list-disc">
                  {report.flags.map(function (flag: string, i: number) { return <li key={i} className="text-rose-300 text-sm leading-relaxed mb-3">{flag}</li> })}
                </ul>
              </div>
            )}
          </div>
        )}

        <h2 className="text-zinc-400 text-xs font-bold uppercase tracking-wider mt-12 mb-4">Past reports</h2>

        {history.length === 0 ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl px-6 py-14 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-white text-lg font-bold mt-6">No reports yet</h3>
            <p className="text-zinc-300 text-sm mt-3 max-w-xs leading-relaxed">Generate one to see a plain summary of your last 7 days. It will be saved here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {history.map(function (row) {
              const p = parts(row)
              const open = openId === row.id
              return (
                <div key={row.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl">
                  <button onClick={function () { setOpenId(open ? null : row.id) }} aria-expanded={open} className="w-full text-left p-5 sm:p-6 hover:bg-zinc-800/50 transition-colors rounded-2xl">
                    <div className="flex justify-between items-center gap-4">
                      <p className="text-white text-sm font-semibold">{formatDay(row.report_period_start)} to {formatDay(row.report_period_end)}</p>
                      <span className="text-zinc-400 text-xs flex-shrink-0">{open ? 'Hide' : 'Show'}</span>
                    </div>
                    <p className={'text-zinc-400 text-sm mt-2 leading-relaxed ' + (open ? '' : 'line-clamp-2')}>{p.summary}</p>
                  </button>

                  {open && (
                    <div className="border-t border-zinc-800 px-5 sm:px-6 pb-6 pt-5">
                      {p.insights.length > 0 && (
                        <div>
                          <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-wider">Insights</h3>
                          <ul className="mt-3 pl-5 list-disc">
                            {p.insights.map(function (insight: string, i: number) { return <li key={i} className="text-zinc-200 text-sm leading-relaxed mb-2">{insight}</li> })}
                          </ul>
                        </div>
                      )}
                      {p.flags.length > 0 && (
                        <div className={p.insights.length > 0 ? 'mt-6' : ''}>
                          <h3 className="text-rose-400 text-xs font-bold uppercase tracking-wider">Worth your attention</h3>
                          <ul className="mt-3 pl-5 list-disc">
                            {p.flags.map(function (flag: string, i: number) { return <li key={i} className="text-rose-300 text-sm leading-relaxed mb-2">{flag}</li> })}
                          </ul>
                        </div>
                      )}
                      <p className="text-zinc-500 text-xs mt-6">Generated {new Date(row.generated_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
