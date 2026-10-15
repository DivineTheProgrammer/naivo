import Groq from 'groq-sdk'
import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '../../lib/supabase-server'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const sevenDaysAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString()

    const txResult = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .gte('transaction_time', sevenDaysAgo)
      .order('transaction_time', { ascending: true })

    if (txResult.error) {
      return NextResponse.json({ error: 'Could not load transactions' }, { status: 500 })
    }

    const walletsResult = await supabase.from('wallets').select('id, currency').eq('user_id', user.id)

    const currencyByWallet: any = {}
    const wallets = walletsResult.data || []
    wallets.forEach(function (w) { currencyByWallet[w.id] = w.currency })

    const transactions = txResult.data || []

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'No transactions in the last 7 days to report on' }, { status: 400 })
    }

    const totals: any = {}
    transactions.forEach(function (t) {
      const cur = currencyByWallet[t.wallet_id] || 'NGN'
      if (!totals[cur]) totals[cur] = { money_in: 0, money_out: 0 }
      if (t.type === 'credit') totals[cur].money_in += Number(t.amount)
      else totals[cur].money_out += Number(t.amount)
    })

    const rows = transactions.map(function (t) {
      return { amount: t.amount, currency: currencyByWallet[t.wallet_id] || 'NGN', type: t.type, description: t.description, category: t.category, date: t.transaction_time }
    })

    const prompt = 'You are a blunt, honest personal finance assistant. You do not flatter the user or give generic encouragement. You point out real patterns, real risks, and real specifics based only on the data given. If spending looks fine, say so plainly. If something looks risky or worth attention, say exactly what and why.\n\n' +
      'Every amount has its own currency code. Always write amounts with that code, for example NGN 5,000 or USD 20. Never use a dollar sign unless the currency is USD. Never add amounts in different currencies together.\n\n' +
      'Here are the last 7 days of transactions:\n' + JSON.stringify(rows, null, 2) +
      '\n\nTotals per currency:\n' + JSON.stringify(totals, null, 2) +
      '\n\nReturn ONLY valid JSON, no markdown, in this exact structure:\n' +
      '{\n' +
      '  "summary": "a 2-3 sentence honest summary of the week",\n' +
      '  "insights": ["specific insight 1", "specific insight 2"],\n' +
      '  "flags": ["anything genuinely worth attention, or an empty array if nothing stands out"]\n' +
      '}'

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    const cleanedJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const reportData = JSON.parse(cleanedJson)

    const saveResult = await supabase
      .from('ai_reports')
      .insert({
        user_id: user.id,
        report_period_start: sevenDaysAgo,
        report_period_end: new Date().toISOString(),
        summary: reportData.summary,
        insights: reportData,
      })

    if (saveResult.error) {
      console.error('Failed to save report:', saveResult.error)
    }

    return NextResponse.json({ report: reportData, saved: !saveResult.error })
  } catch (err) {
    console.error('Generate report error:', err)
    return NextResponse.json({ error: 'Could not generate the report. Try again in a moment.' }, { status: 500 })
  }
}
