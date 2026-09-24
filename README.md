# Naivo

A personal finance app for people juggling money across multiple banks, wallets, and currencies, built without ever holding a single naira of anyone's actual funds.

Live: https://naivo-lilac.vercel.app
Code: https://github.com/DivineTheProgrammer/naivo

## The problem

Most people managing money across more than one bank or mobile money app do not have one place that tells them the truth about their whole financial picture. They have four apps, four balances, and no honest total. Naivo exists to be that one place, without asking anyone to hand over their actual money to do it.

## What it does

A user signs up, sets a PIN separate from their login, and can add wallets representing any bank or mobile money account they use, each in its own currency. Every transaction they log is tracked with a twenty four hour safety window, visible on screen, meant to give a moment of pause before a mistake becomes permanent. Balances across every wallet are converted into a single home currency using live exchange rates, not fixed or fake ones. And once a week, an AI report looks honestly at what happened, not to praise or encourage, but to say plainly what the data actually shows, including when there is not enough data to say much at all.

Sign in works two ways, a passwordless magic link, or a registered passkey tied to the user's own device.

## Architecture

- Next.js and TypeScript, deployed on Vercel
- Supabase for the database, with Row Level Security enforced on every table from the first table created
- A PIN lock implemented as server side middleware rather than a client side component, specifically because the client side version hit a real hydration bug that middleware avoids entirely by deciding access before any page ever renders
- Live currency conversion using a free, no key required exchange rate API that actually supports the Nigerian Naira, after discovering that a more well known option did not
- Groq running an open model for the weekly report, prompted explicitly to avoid generic praise and instead point out real, specific patterns in the data, including admitting when there simply is not enough data yet to say anything meaningful
- WebAuthn passkey support, reusing the same pattern proven while building a separate identity service earlier the same day

## What is deliberately not in it yet

- Automatic bank account syncing. This was originally meant to be the primary way transactions get logged, ahead of manual entry, using an open banking provider like Mono. That plan is on hold because every legitimate provider in this space requires a verified business email to even create a developer account, which is a real, honest blocker, not a technical one, and it is being worked through rather than worked around.
- Automatic SMS transaction reading. Even once bank sync exists, this remains a lower priority bonus feature, since it only works on Android by the nature of how mobile operating systems handle SMS permissions, and building a primary feature that half of all phones cannot use was not the right call.

## What actually happened during the build

The original version of Naivo was built with an AI website builder rather than by hand, and it did not reflect real, defensible engineering, which is exactly why this version exists, rebuilt from an empty repository with the same discipline applied to every other project built that day.

The PIN lock feature broke in a specific, instructive way. A client side React component was built to check whether a PIN existed and either prompt for one or ask for it, and it worked in isolation but silently failed to ever finish loading once wired into the real app, with no error thrown anywhere. Diagnosing it meant checking, step by step, whether the browser's JavaScript root even existed on the page, which it did not. Rather than keep patching a component with a fundamentally fragile approach, the whole feature was rebuilt using server side middleware instead, which sidestepped the entire class of problem by deciding access before the page had anything to hydrate in the first place. That is not a workaround, it is the better architecture, arrived at because the first one broke honestly rather than quietly.

## Status

Live and working end to end right now. Sign up, set a PIN, add a wallet in any currency, log a transaction, and generate a real weekly report, all of it real, none of it a mock.
