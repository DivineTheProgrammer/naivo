import { NextRequest, NextResponse } from 'next/server'
import { verifyRegistrationResponse } from '@simplewebauthn/server'
import { createServerSupabaseClient } from '../../../lib/supabase-server'
import { challengeStore } from '../register-options/route'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'You must be signed in' }, { status: 401 })
    }

    const body = await req.json()
    const response = body.response
    const deviceName = body.deviceName || 'Unnamed device'

    const expectedChallenge = challengeStore.get(user.id)

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'No pending registration found' }, { status: 400 })
    }

    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const rpID = origin.replace('https://', '').replace('http://', '').split(':')[0]

    const verification = await verifyRegistrationResponse({
      response: response,
      expectedChallenge: expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    })

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 400 })
    }

    const credential = verification.registrationInfo.credential

    const insertResult = await supabase.from('webauthn_credentials').insert({
      user_id: user.id,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey).toString('base64'),
      counter: credential.counter,
      device_name: deviceName,
    })

    if (insertResult.error) {
      return NextResponse.json({ error: 'Failed to save credential' }, { status: 500 })
    }

    challengeStore.delete(user.id)

    return NextResponse.json({ message: 'Passkey registered successfully' })
  } catch (err) {
    console.error('Register verify error:', err)
    return NextResponse.json({ error: 'Something went wrong', details: String(err) }, { status: 500 })
  }
}
