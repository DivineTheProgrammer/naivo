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
      return NextResponse.json({ error: txResult.error.message }, { status: 500 })
    }

    const transactions = txResult.data || []

    if (transactions.length === 0) {
      return NextResponse.json({ error: 'No transactions in the last 7 days to report on' }, { status: 400 })
    }

    const totalCredit = transactions
      .filter(function (t) { return t.type === 'credit' })
      .reduce(function (sum, t) { return sum + Number(t.amount) }, 0)

    const totalDebit = transactions
      .filter(function (t) { return t.type === 'debit' })
      .reduce(function (sum, t) { return sum + Number(t.amount) }, 0)

    const prompt = 'You are a blunt, honest personal finance assistant. You do not flatter the user or give generic encouragement. You point out real patterns, real risks, and real specifics based only on the data given. If spending looks fine, say so plainly. If something looks risky or worth attention, say exactly what and why.\n\n' +
      'Here is the last 7 days of transactions for this user:\n' +
      JSON.stringify(transactions.map(function (t) {
        return { amount: t.amount, type: t.type, description: t.description, category: t.category, date: t.transaction_time }
      }), null, 2) +
      '\n\nTotal money in: ' + totalCredit + '\nTotal money out: ' + totalDebit +
      '\n\nReturn ONLY valid JSON, no markdown, in this exact structure:\n' +
      '{\n' +
      '  "summary": "a 2-3 sentence honest summary of the week",\n' +
      '  "insights": ["specific insight 1", "specific insight 2"],\n' +
      '  "flags": ["anything genuinely worth the user\'s attention, or empty array if nothing stands out"]\n' +
      '}'

    const completion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.3,
    })

    const responseText = completion.choices[0]?.message?.content || ''
    const cleanedJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const reportData = JSON.parse(cleanedJson)

    const now = new Date()
    const periodStart = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7)

    const saveResult = await supabase
      .from('ai_reports')
      .insert({
        user_id: user.id,
        report_period_start: periodStart.toISOString(),
        report_period_end: now.toISOString(),
        summary: reportData.summary,
        insights: reportData,
      })
      .select()
      .single()

    if (saveResult.error) {
      console.error('Failed to save report:', saveResult.error)
    }

    return NextResponse.json({ report: reportData, saved: !saveResult.error })
  } catch (err) {
    console.error('Generate report error:', err)
    return NextResponse.json({ error: 'Something went wrong', details: String(err) }, { status: 500 })
  }
}
