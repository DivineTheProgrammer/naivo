import { NextRequest, NextResponse } from 'next/server'
import { verifyAuthenticationResponse } from '@simplewebauthn/server'
import { createClient } from '@supabase/supabase-js'
import { loginChallengeStore } from '../login-options/route'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const userId = body.userId
    const response = body.response

    const expectedChallenge = loginChallengeStore.get(userId)

    if (!expectedChallenge) {
      return NextResponse.json({ error: 'No pending login found' }, { status: 400 })
    }

    const credResult = await supabaseAdmin
      .from('webauthn_credentials')
      .select('*')
      .eq('user_id', userId)
      .eq('credential_id', response.id)
      .single()

    if (credResult.error || !credResult.data) {
      return NextResponse.json({ error: 'Credential not found' }, { status: 400 })
    }

    const storedCredential = credResult.data
    const origin = req.headers.get('origin') || 'http://localhost:3000'
    const rpID = origin.replace('https://', '').replace('http://', '').split(':')[0]

    const verification = await verifyAuthenticationResponse({
      response: response,
      expectedChallenge: expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: storedCredential.credential_id,
        publicKey: new Uint8Array(Buffer.from(storedCredential.public_key, 'base64')),
        counter: storedCredential.counter,
      },
    })

    if (!verification.verified) {
      return NextResponse.json({ error: 'Verification failed' }, { status: 401 })
    }

    await supabaseAdmin
      .from('webauthn_credentials')
      .update({ counter: verification.authenticationInfo.newCounter })
      .eq('id', storedCredential.id)

    loginChallengeStore.delete(userId)

    return NextResponse.json({ message: 'Passkey login successful', userId: userId })
  } catch (err) {
    console.error('Login verify error:', err)
    return NextResponse.json({ error: 'Something went wrong', details: String(err) }, { status: 500 })
  }
}
