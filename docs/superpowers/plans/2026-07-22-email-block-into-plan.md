# Email Block → Plan Calibration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Channel Details email block calibrate the user's 30-day plan to their email marketing maturity, driven by a required "Do you use an email marketing platform?" gating question.

**Architecture:** A pure helper module (`lib/email-context.ts`) turns the stored email details into prompt snippets. The plan route (`/api/generate`) — which currently never receives `channelDetails` — is wired to include an email-context block with tier-appropriate guidance. The audit route reuses the same helper for a maturity-aware line. The Channel Details step gains the gating toggle, expanded platform list, conditional inputs, and a targeted required-answer gate.

**Tech Stack:** Next.js (App Router, custom build — read `node_modules/next/dist/docs/` before touching routing), React, react-hook-form, Zod, Vercel AI SDK (`streamObject`), Jest + Testing Library (jsdom).

## Global Constraints

- **Never recommend buying, upgrading, or switching email tools** — the plan calibrates tactics to current capability only. This rule text must appear verbatim in the plan prompt.
- **Only the gating yes/no is required.** URLs, platform name, "Other" text, subscriber count, and frequency stay optional (generic fallback is fine).
- **Platform dropdown options, in order:** `Mailchimp, Klaviyo, ConvertKit, HubSpot, GoHighLevel, Other` (`Other` last).
- **Gating question copy (verbatim):** `Do you use an email marketing platform? (e.g., MailChimp, ConvertKit, HubSpot, etc.)`
- **No em dashes in user-facing copy.**
- Follow existing file patterns; match the `#81A1D3` / `#444444` / `#1E212E` color tokens and chip styling already in `StepChannelDetails.tsx`.
- `platformDisplayName` must never emit the literal string `"Other"`.

---

### Task 1: Email-context helper + data model

**Files:**
- Modify: `lib/types.ts` (email shape in `ChannelDetailsData`, ~lines 20-24)
- Create: `lib/email-context.ts`
- Modify: `components/steps/StepChannelDetails.tsx` (one line in `seededFormValues`, ~line 26 — required to keep the build compiling after `platform` becomes optional)
- Test: `lib/__tests__/email-context.test.ts`

**Interfaces:**
- Produces:
  - `type EmailDetails = NonNullable<ChannelDetailsData['email']>`
  - `platformDisplayName(email: EmailDetails): string`
  - `buildEmailContext(email: EmailDetails): string` — the plan prompt block
  - `buildAuditEmailBlock(email: EmailDetails): string` — the audit prompt block
- Consumes: `ChannelDetailsData` from `@/lib/types`

- [ ] **Step 1: Extend the email type**

In `lib/types.ts`, replace the `email` field of `ChannelDetailsData`:

```ts
  email?: {
    usesPlatform?: boolean
    platform?: string
    otherPlatform?: string
    subscriberCount: number
    sendFrequency: string
  }
```

- [ ] **Step 2: Keep the build green in seededFormValues**

In `components/steps/StepChannelDetails.tsx`, `seededFormValues`, the line that reads the platform now handles the optional type. Change:

```ts
    v['email-platform'] = cd.email.platform
```

to:

```ts
    v['email-platform'] = cd.email.platform ?? ''
```

- [ ] **Step 3: Write the failing test**

Create `lib/__tests__/email-context.test.ts`:

```ts
import {
  platformDisplayName,
  buildEmailContext,
  buildAuditEmailBlock,
  EmailDetails,
} from '@/lib/email-context'

const base: EmailDetails = { subscriberCount: 340, sendFrequency: 'Weekly' }

describe('platformDisplayName', () => {
  it('returns the named platform', () => {
    expect(platformDisplayName({ ...base, usesPlatform: true, platform: 'Mailchimp' })).toBe('Mailchimp')
  })
  it('returns the Other free-text when platform is Other', () => {
    expect(platformDisplayName({ ...base, usesPlatform: true, platform: 'Other', otherPlatform: 'Brevo' })).toBe('Brevo')
  })
  it('never emits the literal "Other" when the free-text is blank', () => {
    expect(platformDisplayName({ ...base, usesPlatform: true, platform: 'Other', otherPlatform: '' })).toBe('a dedicated platform')
  })
})

describe('buildEmailContext', () => {
  it('describes the platform tier and uses the segmentation guidance', () => {
    const out = buildEmailContext({ ...base, usesPlatform: true, platform: 'Klaviyo' })
    expect(out).toContain('Uses a dedicated email platform (Klaviyo)')
    expect(out).toContain('segment members vs past leads')
    expect(out).toContain('NEVER recommend purchasing, upgrading, or switching email tools')
  })
  it('describes the manual tier and uses low-lift guidance', () => {
    const out = buildEmailContext({ ...base, usesPlatform: false })
    expect(out).toContain('No dedicated platform')
    expect(out).toContain('low-lift and plain-text friendly')
    expect(out).toContain('NEVER recommend purchasing, upgrading, or switching email tools')
  })
  it('treats undefined usesPlatform as the manual tier', () => {
    expect(buildEmailContext({ ...base })).toContain('No dedicated platform')
  })
})

describe('buildAuditEmailBlock', () => {
  it('prints the platform when one is used', () => {
    expect(buildAuditEmailBlock({ ...base, usesPlatform: true, platform: 'HubSpot' })).toContain('Platform: HubSpot')
  })
  it('flags manual sending when no platform is used', () => {
    expect(buildAuditEmailBlock({ ...base, usesPlatform: false })).toContain('Email sending: manual (no dedicated platform)')
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `npm test -- email-context`
Expected: FAIL — cannot find module `@/lib/email-context`.

- [ ] **Step 5: Implement the helper**

Create `lib/email-context.ts`:

```ts
import { ChannelDetailsData } from '@/lib/types'

export type EmailDetails = NonNullable<ChannelDetailsData['email']>

// Human-readable platform name. Assumes a platform is in use; never emits "Other".
export function platformDisplayName(email: EmailDetails): string {
  if (email.platform === 'Other') {
    return email.otherPlatform?.trim() || 'a dedicated platform'
  }
  return email.platform?.trim() || 'a dedicated platform'
}

// Prompt block for the PLAN route: describes the email setup and forks the
// email tactics guidance by marketing maturity. Undefined usesPlatform is
// treated as the manual (conservative) tier.
export function buildEmailContext(email: EmailDetails): string {
  const maturity = email.usesPlatform
    ? `Uses a dedicated email platform (${platformDisplayName(email)})`
    : 'No dedicated platform — sends manually (e.g. BCC or a basic email list)'

  const rules = email.usesPlatform
    ? 'They run a real email platform. You MAY use platform-native tactics: segment members vs past leads, suggest simple automated sequences, and use richer formatting. Lean into the two-audience split (members vs leads).'
    : 'They send manually. Keep email guidance low-lift and plain-text friendly: one story-driven send, simple structure, no segmentation or automation assumptions.'

  return `## Email Context
- List size: ${email.subscriberCount} subscribers
- Current cadence: ${email.sendFrequency}
- Email maturity: ${maturity}

Email guidance rules:
- ${rules}
- NEVER recommend purchasing, upgrading, or switching email tools. Meet them where they are; calibrate tactics to their current capability only.`
}

// Prompt block for the AUDIT route's self-reported email channel.
export function buildAuditEmailBlock(email: EmailDetails): string {
  const maturity = email.usesPlatform
    ? `Platform: ${platformDisplayName(email)}`
    : 'Email sending: manual (no dedicated platform)'

  return `## email (Self-reported)
${maturity}
Subscribers: ${email.subscriberCount}
Send frequency: ${email.sendFrequency}`
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `npm test -- email-context`
Expected: PASS (all cases).

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/email-context.ts lib/__tests__/email-context.test.ts components/steps/StepChannelDetails.tsx
git commit -m "feat: add email-context helper and extend email model"
```

---

### Task 2: Wire the email block into the plan

**Files:**
- Modify: `components/steps/StepYourPlan.tsx` (fetch body, ~lines 34-38)
- Modify: `app/api/generate/route.ts` (body type ~lines 38-42; prompt ~lines 53-76)
- Test: `components/steps/__tests__/plan-request-payload.test.tsx`

**Interfaces:**
- Consumes: `buildEmailContext` from `@/lib/email-context`; `ChannelDetailsData` from `@/lib/types`
- Produces: `/api/generate` request body now includes `channelDetails`

- [ ] **Step 1: Write the failing test**

Create `components/steps/__tests__/plan-request-payload.test.tsx`:

```tsx
import { render } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { StepYourPlan } from '@/components/steps/StepYourPlan'
import { WizardState } from '@/lib/types'

const seed: Partial<WizardState> = {
  businessInfo: { gymName: 'Test Gym', services: ['Open Gym'], icp: 'x', channels: ['email'] },
  channelDetails: { email: { usesPlatform: true, platform: 'Mailchimp', subscriberCount: 340, sendFrequency: 'Weekly' } },
  preflightResults: { email: { status: 'pass' } },
  auditResults: [],
  storyMineAnswers: {},
}

describe('plan request payload', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
  })
  afterEach(() => jest.resetAllMocks())

  it('sends channelDetails to /api/generate', () => {
    render(
      <WizardProvider initialState={seed}>
        <StepYourPlan />
      </WizardProvider>
    )
    const call = (global.fetch as jest.Mock).mock.calls.find((c) => c[0] === '/api/generate')
    expect(call).toBeDefined()
    const body = JSON.parse(call![1].body)
    expect(body.channelDetails.email.usesPlatform).toBe(true)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- plan-request-payload`
Expected: FAIL — `body.channelDetails` is undefined.

- [ ] **Step 3: Send channelDetails from StepYourPlan**

In `components/steps/StepYourPlan.tsx`, in the `/api/generate` fetch body, add `channelDetails`:

```ts
          body: JSON.stringify({
            businessInfo: state.businessInfo,
            auditResults: state.auditResults,
            storyMineAnswers: state.storyMineAnswers,
            channelDetails: state.channelDetails,
          }),
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- plan-request-payload`
Expected: PASS.

- [ ] **Step 5: Accept channelDetails and inject the email context in the route**

In `app/api/generate/route.ts`:

Update the import on line 7:

```ts
import { AuditResult, Channel, ChannelDetailsData } from '@/lib/types'
import { buildEmailContext } from '@/lib/email-context'
```

Extend the body type (~lines 38-42):

```ts
  const body: {
    businessInfo: { gymName: string; channels: Channel[]; services: string[]; icp: string }
    auditResults: AuditResult[]
    storyMineAnswers: Partial<Record<number, string>>
    channelDetails?: ChannelDetailsData
  } = await request.json()
```

Immediately before the `const prompt = ` line (~line 53), build the block:

```ts
  const emailContextBlock =
    body.businessInfo.channels.includes('email') && body.channelDetails?.email
      ? '\n\n' + buildEmailContext(body.channelDetails.email)
      : ''
```

Insert `${emailContextBlock}` into the prompt template, right after the Owner Interview Answers block and before the `Based on the interview answers` line:

```ts
## Owner Interview Answers
${answersText}
${emailContextBlock}

Based on the interview answers and audit findings, select the 4 most compelling stories and produce a 30-day content plan.
```

- [ ] **Step 6: Typecheck and run the full test suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 7: Commit**

```bash
git add components/steps/StepYourPlan.tsx app/api/generate/route.ts components/steps/__tests__/plan-request-payload.test.tsx
git commit -m "feat: feed email context into plan generation"
```

---

### Task 3: Maturity-aware audit email line

**Files:**
- Modify: `app/api/audit/route.ts` (import; email branch ~lines 57-63)

**Interfaces:**
- Consumes: `buildAuditEmailBlock` from `@/lib/email-context`

- [ ] **Step 1: Replace the inline email block with the helper**

In `app/api/audit/route.ts`, add the import near the top (beside the existing imports):

```ts
import { buildAuditEmailBlock } from '@/lib/email-context'
```

Replace the email branch (currently):

```ts
      if (channel === 'email') {
        const em = body.channelDetails.email
        return `## email (Self-reported)
Platform: ${em?.platform ?? 'unknown'}
Subscribers: ${em?.subscriberCount ?? 'unknown'}
Send frequency: ${em?.sendFrequency ?? 'unknown'}`
      }
```

with:

```ts
      if (channel === 'email') {
        const em = body.channelDetails.email
        return em ? buildAuditEmailBlock(em) : '## email (Self-reported)\nNo details provided'
      }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors. (Behavior is covered by `buildAuditEmailBlock` unit tests from Task 1; this route calls an external model and has no unit test of its own.)

- [ ] **Step 3: Commit**

```bash
git add app/api/audit/route.ts
git commit -m "feat: maturity-aware email line in audit prompt"
```

---

### Task 4: Channel Details gating toggle + conditional platform UI

**Files:**
- Modify: `components/steps/StepChannelDetails.tsx` (useForm hook ~line 40; add state; email section ~lines 189-215; `proceed` ~lines 120-126; `seededFormValues` ~lines 25-29)
- Test: `components/steps/__tests__/channel-details-email.test.tsx`

**Interfaces:**
- Consumes: `EmailDetails` shape (from Task 1)
- Produces: `state.channelDetails.email` now carries `usesPlatform`, `platform`, `otherPlatform`

- [ ] **Step 1: Write the failing test**

Create `components/steps/__tests__/channel-details-email.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { StepChannelDetails } from '@/components/steps/StepChannelDetails'
import { WizardState } from '@/lib/types'

const seed: Partial<WizardState> = {
  businessInfo: { gymName: 'Test Gym', services: ['Open Gym'], icp: 'x', channels: ['email'] },
  channelDetails: {},
  preflightResults: {},
}

function renderStep() {
  return render(
    <WizardProvider initialState={seed}>
      <StepChannelDetails />
    </WizardProvider>
  )
}

describe('Channel Details email gating UI', () => {
  it('hides the platform dropdown until "Yes" is chosen', () => {
    renderStep()
    expect(screen.queryByText('Select platform')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText('Select platform')).toBeInTheDocument()
  })

  it('shows the "Other" free-text input when platform is Other', () => {
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    const select = screen.getByText('Select platform').closest('select') as HTMLSelectElement
    fireEvent.change(select, { target: { value: 'Other' } })
    expect(screen.getByPlaceholderText('Which platform?')).toBeInTheDocument()
  })

  it('offers HubSpot and GoHighLevel as options', () => {
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText('HubSpot')).toBeInTheDocument()
    expect(screen.getByText('GoHighLevel')).toBeInTheDocument()
  })

  it('hides the dropdown again when switching to "No"', () => {
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
    expect(screen.getByText('Select platform')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    expect(screen.queryByText('Select platform')).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- channel-details-email`
Expected: FAIL — no "Yes" button exists.

- [ ] **Step 3: Add form watch/setValue and gating state**

In `components/steps/StepChannelDetails.tsx`, change the `useForm` destructure (~line 40):

```ts
  const { register, getValues, watch, setValue } = useForm<Record<string, string>>({
    defaultValues: seededFormValues(state.channelDetails),
  })
```

Add these near the other `useState` hooks (after the `isChecking` state, ~line 66):

```ts
  const [emailUsesPlatform, setEmailUsesPlatform] = useState<boolean | undefined>(
    state.channelDetails?.email?.usesPlatform
  )
  const [emailError, setEmailError] = useState<string | null>(null)
  const platformValue = watch('email-platform')
```

- [ ] **Step 4: Seed the Other free-text value**

In `seededFormValues` (~lines 25-29), inside the `if (cd.email)` block, add:

```ts
    v['email-other-platform'] = cd.email.otherPlatform ?? ''
```

- [ ] **Step 5: Render the gating question and make the dropdown conditional**

In the email section, replace the Platform `<div>` (currently the first child inside the `flex flex-col gap-3` container, ~lines 193-199) with the gating question followed by the conditional dropdown:

```tsx
              <div>
                <label className="block text-xs text-[#444444] mb-1.5">Do you use an email marketing platform? (e.g., MailChimp, ConvertKit, HubSpot, etc.)</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setEmailUsesPlatform(true); setEmailError(null) }}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                      emailUsesPlatform === true
                        ? 'border-[#81A1D3] bg-[#f0f5fb] text-[#81A1D3]'
                        : 'border-gray-200 bg-white text-[#444444] hover:border-[#81A1D3]'
                    }`}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmailUsesPlatform(false); setEmailError(null); setValue('email-platform', ''); setValue('email-other-platform', '') }}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
                      emailUsesPlatform === false
                        ? 'border-[#81A1D3] bg-[#f0f5fb] text-[#81A1D3]'
                        : 'border-gray-200 bg-white text-[#444444] hover:border-[#81A1D3]'
                    }`}
                  >
                    No
                  </button>
                </div>
                {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
              </div>
              {emailUsesPlatform === true && (
                <div>
                  <label className="block text-xs text-[#444444] mb-1">Platform</label>
                  <select {...register('email-platform')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
                    <option value="">Select platform</option>
                    {['Mailchimp', 'Klaviyo', 'ConvertKit', 'HubSpot', 'GoHighLevel', 'Other'].map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                  {platformValue === 'Other' && (
                    <input
                      {...register('email-other-platform')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3] mt-2"
                      placeholder="Which platform?"
                    />
                  )}
                </div>
              )}
```

Leave the Subscriber count / Send frequency `<div className="flex gap-3">` block unchanged (still shown whenever email is active).

- [ ] **Step 6: Persist the new fields in proceed()**

In `proceed` (~lines 120-126), replace the `if (hasEmail)` block:

```ts
    if (hasEmail) {
      channelDetails.email = {
        usesPlatform: emailUsesPlatform,
        platform: emailUsesPlatform ? (getValues('email-platform') || undefined) : undefined,
        otherPlatform: emailUsesPlatform && getValues('email-platform') === 'Other'
          ? (getValues('email-other-platform') || undefined)
          : undefined,
        subscriberCount: parseInt(vals['email-subscribers'] || '0'),
        sendFrequency: vals['email-frequency'],
      }
    }
```

(`vals` is the existing `getValues()` result at the top of `proceed`.)

- [ ] **Step 7: Run the test to verify it passes**

Run: `npm test -- channel-details-email`
Expected: PASS (all four cases).

- [ ] **Step 8: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add components/steps/StepChannelDetails.tsx components/steps/__tests__/channel-details-email.test.tsx
git commit -m "feat: email platform gating question and conditional inputs"
```

---

### Task 5: Require the gating answer before proceeding

**Files:**
- Modify: `components/steps/StepChannelDetails.tsx` (`runPreflight` ~line 72; `proceed` ~line 112)
- Test: `components/steps/__tests__/channel-details-email.test.tsx` (add cases)

**Interfaces:**
- Consumes: `emailUsesPlatform`, `emailError`/`setEmailError`, `hasEmail` (from Task 4)

- [ ] **Step 1: Write the failing test (append to the existing describe block)**

Add these cases inside the `describe('Channel Details email gating UI', ...)` block in `components/steps/__tests__/channel-details-email.test.tsx`:

```tsx
  it('blocks proceeding and shows an error when the gating question is unanswered', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /Check & Continue/i }))
    expect(screen.getByText('Let us know so we can tailor your email plan.')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
    jest.resetAllMocks()
  })

  it('allows proceeding once the gating question is answered', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({}) })) as unknown as typeof fetch
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    fireEvent.click(screen.getByRole('button', { name: /Check & Continue/i }))
    await new Promise((r) => setTimeout(r, 0))
    expect(global.fetch).toHaveBeenCalledWith('/api/preflight', expect.anything())
    jest.resetAllMocks()
  })
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- channel-details-email`
Expected: the two new cases FAIL (no error text; fetch called even when unanswered).

- [ ] **Step 3: Add the required-answer guard**

In `components/steps/StepChannelDetails.tsx`, add a guard helper and apply it at the top of both `runPreflight` and `proceed`.

At the top of `runPreflight` (before `setIsChecking(true)`):

```ts
    if (hasEmail && emailUsesPlatform === undefined) {
      setEmailError('Let us know so we can tailor your email plan.')
      return
    }
```

At the top of `proceed` (before `const vals = getValues()`):

```ts
    if (hasEmail && emailUsesPlatform === undefined) {
      setEmailError('Let us know so we can tailor your email plan.')
      return
    }
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- channel-details-email`
Expected: PASS (all six cases).

- [ ] **Step 5: Typecheck and run the full suite**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 6: Commit**

```bash
git add components/steps/StepChannelDetails.tsx components/steps/__tests__/channel-details-email.test.tsx
git commit -m "feat: require the email-platform answer before proceeding"
```

---

### Task 6: Preview fixture + end-to-end browser verification

**Files:**
- Modify: `lib/preview/mock-data.ts` (HAPPY_PATH email object, ~lines 20-23 area)

- [ ] **Step 1: Make the preview fixture representative**

In `lib/preview/mock-data.ts`, update the `HAPPY_PATH` email object to include the new field:

```ts
    email: { usesPlatform: true, platform: 'Mailchimp', subscriberCount: 340, sendFrequency: 'Weekly' },
```

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 3: Verify in the browser via the preview harness**

Start the dev server (if not already running) and open `/preview`.
- Select the **3 · Channel Details** view. Confirm: the gating question renders with the example copy; because the fixture is "Yes", the Platform dropdown shows with Mailchimp selected and lists HubSpot + GoHighLevel.
- Toggle to **No**: the dropdown disappears; Subscriber count and Send frequency remain.
- Toggle back to **Yes**, choose **Other**: the "Which platform?" input appears.
- With email as the only channel and the question unanswered, click Check & Continue and confirm the inline error appears and the flow does not advance.

- [ ] **Step 4: Commit**

```bash
git add lib/preview/mock-data.ts
git commit -m "chore: seed usesPlatform in preview email fixture"
```

---

## Self-Review

**Spec coverage:**
- Data model (§1) → Task 1.
- Gating question copy + toggle + conditional dropdown/Other (§2) → Task 4.
- Expanded platform options (§2) → Task 4 (options array) + test.
- Required-answer gate (§2a) → Task 5.
- Plan wiring + calibration + "never recommend tools" (§3) → Task 2 (route) + Task 1 (`buildEmailContext`).
- Audit cleanup (§4) → Task 3.
- Edge cases (undefined → manual tier; Other-empty → "a dedicated platform") → Task 1 tests.
- Preview fixture → Task 6.
- Testing plan → Tasks 1, 2, 4, 5 unit/interaction tests; Task 6 browser pass. No assertions on generated prose, per spec.

**Placeholder scan:** none — every code step shows complete code; every run step shows the command and expected result.

**Type consistency:** `EmailDetails`, `platformDisplayName`, `buildEmailContext`, `buildAuditEmailBlock` are defined in Task 1 and consumed with matching signatures in Tasks 2 and 3. The `email` fields written in Task 4's `proceed` (`usesPlatform`, `platform`, `otherPlatform`, `subscriberCount`, `sendFrequency`) match the type from Task 1. Form field keys (`email-platform`, `email-other-platform`, `email-subscribers`, `email-frequency`) are consistent across `seededFormValues`, the JSX `register` calls, and `proceed`.
