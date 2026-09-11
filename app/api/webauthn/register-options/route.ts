import { NextRequest, NextResponse } from 'next/server'
import { generateRegistrationOptions } from '@simplewebauthn/server'
import { createServerSupabaseClient } from '../../../lib/supabase-server'

const challengeStore = new Map<string, string>()
export { challengeStore }

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const rpID = origin.replace('https://', '').replace('http://', '').split(':')[0]

    const existingCredsResult = await supabase
      .from('webauthn_credentials')
      .select('credential_id')
      .eq('user_id', user.id)

    const excludeCredentials = (existingCredsResult.data || []).map(function (cred) {
      return { id: cred.credential_id }
    })

    const options = await generateRegistrationOptions({
      rpName: 'Naivo',
      rpID: rpID,
      userName: user.email || 'user',
      userID: new TextEncoder().encode(user.id),
      attestationType: 'none',
      excludeCredentials: excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    })

    challengeStore.set(user.id, options.challenge)

    return NextResponse.json(options)
  } catch (err) {
    console.error('Register options error:', err)
    return NextResponse.json({ error: 'Something went wrong', details: String(err) }, { status: 500 })
  }
}
