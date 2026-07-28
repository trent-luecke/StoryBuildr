# Progressive Channel Details Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Step 3 (Channel Details) from one dense wall of forms into a progressive, one-screen-at-a-time flow: a lead-in, then one focused screen per selected channel, with visible progress.

**Architecture:** Step 3 becomes an internal state machine inside a rewritten `StepChannelDetails` orchestrator. It derives an ordered screen list from `businessInfo.channels`, owns a local cursor + lead-in visibility, and renders one screen at a time (lead-in → social screens → website → email). Website/email inputs move into their own screen components; social screens reuse the existing `SocialChannelInput`. Existing wizard state and dispatches are preserved; the final "Begin Audit" assembles `channelDetails`/`preflightResults` and advances to Step 4 exactly as today. The 7-step wizard and sidebar are untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind v4, jest + React Testing Library.

## Global Constraints

- **Wizard structure unchanged:** `WizardStep` stays `1..7`; no sidebar change. The progressive flow is internal to Step 3.
- **Color tokens (verbatim):** accent `#81A1D3`, accent-hover `#6b8fbf`, ink `#1E212E`, body `#444444`, accent-bg `#f0f5fb`, borders `gray-200`, progress-track `#eef1f6`.
- **Repo uses `next/jest` (SWC):** jest does NOT type-check. The type gate is a separate `npx tsc --noEmit`. Run both.
- **Screens & progress derive from `businessInfo.channels`.** A channel the user didn't select never renders a screen. `total` = selected channel count.
- **Channel order:** social channels (in selection order) → website → email.
- **Lead-in shows once**, gated by persisted `channelIntroSeen`. Linear navigation only (Back/Continue).
- **Commit trailer (verbatim) on every commit:**
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Verbatim copy — lead-in:**
  - Eyebrow: `Step 3 · Channel details`
  - Heading: `First — the part that does the heavy lifting`
  - Body: `Everything after this (your audit and your 30-day plan) is built from what you share here. A couple of real minutes now = a sharper, more personalized result.`
  - Value props: `Real examples beat guesses` / `Paste a few actual posts and we audit the real thing — not a rough description.` · `About 2–3 minutes` / `We'll take one channel at a time so it never feels like a wall of forms.` · `No wrong answers` / `Not sure? Just describe the channel in your own words — that works too.`
  - Buttons: `Let's do it →` and `← Back`
- **Verbatim copy — social screen:** eyebrow = channel label uppercased; heading `Your {Label}`; sub `Show us what you're posting so the audit reflects your real content.`
- **Verbatim copy — example-URL placeholders:** Instagram `https://instagram.com/p/...`, Facebook `https://facebook.com/yourgym/posts/...`, LinkedIn `https://linkedin.com/posts/...`.
- **Verbatim copy — manual examples (persistent line, prefixed `Example: `):**
  - Instagram: `A Reel of a coach demoing proper squat form, shot on a phone; a carousel of a member's 12-week transformation with a caption about training 4×/week; a Monday-motivation quote in our brand colors.`
  - Facebook: `A photo album from our Saturday community workout with 20+ members tagged; a post promoting our 6-week challenge with a sign-up link; a shared 5-star member review with a thank-you.`
  - LinkedIn: `A post celebrating a coach's certification; a short thread on why strength training matters for desk workers; a client win with a photo and a tag.`
  - Manual textarea placeholder: `Describe them here…`
- **Primary button label:** `Continue →` on every screen except the last, which reads `Begin Audit →`.

## File Structure

- **Create** `components/ui/ChannelProgress.tsx` — "Channel X of N" label + bar (presentational).
- **Create** `components/steps/ChannelDetailsIntro.tsx` — the lead-in screen (presentational).
- **Create** `components/steps/WebsiteChannelScreen.tsx` — website URL + preflight + inline skip.
- **Create** `components/steps/EmailChannelScreen.tsx` — the email-marketing questions.
- **Rewrite** `components/steps/StepChannelDetails.tsx` — the orchestrator/state machine.
- **Modify** `lib/types.ts` — add `channelIntroSeen` + `MARK_CHANNEL_INTRO_SEEN`.
- **Modify** `hooks/useWizard.tsx` — seed + reducer case.
- **Modify** `components/ui/PostLinkField.tsx` — accept a `placeholder` prop.
- **Modify** `components/ui/SocialChannelInput.tsx` — example-URL placeholder, persistent manual example, `hideHeader`.
- **Modify** `lib/preview/mock-data.ts` — `channelIntroSeen` in HAPPY_PATH + preview seeds.
- **Modify** `components/steps/__tests__/channel-details-email.test.tsx` — drive the paged email flow.

---

### Task 1: Wizard state — `channelIntroSeen`

**Files:**
- Modify: `lib/types.ts`
- Modify: `hooks/useWizard.tsx`
- Modify: `lib/preview/mock-data.ts:10-11` (HAPPY_PATH — add the required field)
- Test: `__tests__/hooks/useWizard.test.tsx`

**Interfaces:**
- Produces: `WizardState.channelIntroSeen: boolean` (default `false`); action `{ type: 'MARK_CHANNEL_INTRO_SEEN' }` which sets it `true`.

- [ ] **Step 1: Write the failing tests** — append to `__tests__/hooks/useWizard.test.tsx`:

```tsx
test('channelIntroSeen defaults to false', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  expect(result.current.state.channelIntroSeen).toBe(false)
})

test('MARK_CHANNEL_INTRO_SEEN sets channelIntroSeen true', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  act(() => result.current.dispatch({ type: 'MARK_CHANNEL_INTRO_SEEN' }))
  expect(result.current.state.channelIntroSeen).toBe(true)
})
```

- [ ] **Step 2: Run and watch them fail**

Run: `npm test -- useWizard`
Expected: FAIL — `channelIntroSeen` is `undefined`; the `MARK_CHANNEL_INTRO_SEEN` action is not in the `WizardAction` union (and jest/SWC runs it, so the second test fails on the assertion, not a type error).

- [ ] **Step 3: Add the type + action** — in `lib/types.ts`, add the field to `WizardState` (after `currentStep`) and the action to `WizardAction`:

```ts
// inside WizardState, right after `currentStep: WizardStep`
  channelIntroSeen: boolean
```

```ts
// add to the WizardAction union
  | { type: 'MARK_CHANNEL_INTRO_SEEN' }
```

- [ ] **Step 4: Seed + handle it** — in `hooks/useWizard.tsx`, add to `initialState` (after `currentStep: 1,`):

```ts
  channelIntroSeen: false,
```

and add the reducer case (before `default:`):

```ts
    case 'MARK_CHANNEL_INTRO_SEEN':
      return { ...state, channelIntroSeen: true }
```

- [ ] **Step 5: Satisfy the `WizardState` literal in mock-data** — in `lib/preview/mock-data.ts`, add to the `HAPPY_PATH` object (right after `currentStep: 7,`):

```ts
  channelIntroSeen: true,
```

- [ ] **Step 6: Run tests + type gate**

Run: `npm test -- useWizard`
Expected: PASS (all, including the two new).

Run: `npx tsc --noEmit`
Expected: clean (no errors).

Run: `npm test`
Expected: full suite green.

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts hooks/useWizard.tsx lib/preview/mock-data.ts __tests__/hooks/useWizard.test.tsx
git commit -m "feat: add channelIntroSeen wizard state for the lead-in

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Social input copy + example enhancements

**Files:**
- Modify: `components/ui/PostLinkField.tsx`
- Modify: `components/ui/SocialChannelInput.tsx`
- Test: `components/ui/__tests__/PostLinkField.test.tsx`
- Test: `components/ui/__tests__/SocialChannelInput.test.tsx`

**Interfaces:**
- `PostLinkField` gains prop `placeholder?: string` (default `Paste a link to one ${platformLabel} post`).
- `SocialChannelInput` gains prop `hideHeader?: boolean` (default `false`). When `true`, it omits its internal `<label>` and the "How would you like to share…" prompt (the parent screen supplies the heading).
- `SocialChannelInput` passes a per-channel example-URL as `placeholder` to each `PostLinkField`, and renders a per-channel persistent manual example under the "Describe 2–3 recent posts" textarea (textarea placeholder becomes `Describe them here…`).

- [ ] **Step 1: Write the failing tests** — append to `components/ui/__tests__/PostLinkField.test.tsx`:

```tsx
it('uses a provided placeholder when passed', () => {
  render(
    <PostLinkField
      platformLabel="Instagram"
      placeholder="https://instagram.com/p/..."
      onResolved={() => {}}
      onSwitchToManual={() => {}}
    />
  )
  expect(screen.getByPlaceholderText('https://instagram.com/p/...')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test -- PostLinkField`
Expected: FAIL — the input still renders the default "Paste a link to one Instagram post" placeholder; no element matches `https://instagram.com/p/...`.

- [ ] **Step 3: Add the `placeholder` prop to `PostLinkField`** — in `components/ui/PostLinkField.tsx`, extend the props interface and destructuring, and use it on the input:

```tsx
interface PostLinkFieldProps {
  platformLabel: string
  placeholder?: string
  initialPost?: FetchedPost
  previewMode?: boolean
  onResolved: (post: FetchedPost | null) => void
  onSwitchToManual: () => void
}
```

```tsx
export function PostLinkField({
  platformLabel,
  placeholder,
  initialPost,
  previewMode = false,
  onResolved,
  onSwitchToManual,
}: PostLinkFieldProps) {
```

Change the input's placeholder attribute from
`placeholder={`Paste a link to one ${platformLabel} post`}`
to:

```tsx
        placeholder={placeholder ?? `Paste a link to one ${platformLabel} post`}
```

- [ ] **Step 4: Run PostLinkField tests**

Run: `npm test -- PostLinkField`
Expected: PASS (existing tests still green — the default is unchanged; new test passes).

- [ ] **Step 5: Write the failing SocialChannelInput tests** — append to `components/ui/__tests__/SocialChannelInput.test.tsx` (it already imports `render, screen, fireEvent`):

```tsx
it('shows the per-platform example-URL placeholder in the links branch', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /Paste example posts/i }))
  expect(screen.getByPlaceholderText('https://instagram.com/p/...')).toBeInTheDocument()
})

it('shows a persistent manual example under the describe field', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /Describe it manually/i }))
  expect(screen.getByPlaceholderText('Describe them here…')).toBeInTheDocument()
  expect(screen.getByText(/Example:/)).toHaveTextContent(/Reel of a coach demoing proper squat form/)
})

it('hides its internal header when hideHeader is set', () => {
  render(
    <WizardProvider previewMode>
      <SocialChannelInput channel="instagram" hideHeader onChange={() => {}} />
    </WizardProvider>
  )
  expect(screen.queryByText(/How would you like to share/i)).toBeNull()
})
```

- [ ] **Step 6: Run and watch them fail**

Run: `npm test -- SocialChannelInput`
Expected: FAIL — no `https://instagram.com/p/...` placeholder, no `Describe them here…`, no `Example:` text, and the header still renders with `hideHeader`.

- [ ] **Step 7: Implement in `components/ui/SocialChannelInput.tsx`.**

Add the per-channel maps near the top (after `CHANNEL_LABELS`):

```tsx
const CHANNEL_EXAMPLE_URL: Partial<Record<Channel, string>> = {
  instagram: 'https://instagram.com/p/...',
  facebook: 'https://facebook.com/yourgym/posts/...',
  linkedin: 'https://linkedin.com/posts/...',
}
const CHANNEL_MANUAL_EXAMPLE: Partial<Record<Channel, string>> = {
  instagram:
    "A Reel of a coach demoing proper squat form, shot on a phone; a carousel of a member's 12-week transformation with a caption about training 4×/week; a Monday-motivation quote in our brand colors.",
  facebook:
    'A photo album from our Saturday community workout with 20+ members tagged; a post promoting our 6-week challenge with a sign-up link; a shared 5-star member review with a thank-you.',
  linkedin:
    "A post celebrating a coach's certification; a short thread on why strength training matters for desk workers; a client win with a photo and a tag.",
}
```

Add `hideHeader` to the props interface and destructuring:

```tsx
interface SocialChannelInputProps {
  channel: Channel
  value?: SocialInput
  hideHeader?: boolean
  onChange: (input: SocialInput) => void
}
```

```tsx
export function SocialChannelInput({ channel, value, hideHeader = false, onChange }: SocialChannelInputProps) {
```

Wrap the internal header (the `<label>` and the "How would you like to share…" `<p>`) so it only renders when `!hideHeader`:

```tsx
      {!hideHeader && (
        <>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">
            {label}
          </label>
          <p className="text-sm text-[#444444] mb-2">How would you like to share your {label}?</p>
        </>
      )}
```

Pass the example-URL placeholder to each `PostLinkField` (add the prop to the existing element):

```tsx
            <PostLinkField
              key={i}
              platformLabel={label}
              placeholder={CHANNEL_EXAMPLE_URL[channel]}
              previewMode={previewMode}
              initialPost={posts[i] ?? undefined}
              onResolved={(post) => setPostAt(i, post)}
              onSwitchToManual={() => chooseMethod('manual')}
            />
```

Replace the manual "Describe 2–3 recent posts" `<textarea>` block with a short placeholder plus a persistent example line:

```tsx
          <div>
            <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">
              Describe 2–3 recent posts
            </label>
            <textarea
              value={manual.recentPosts}
              onChange={(e) => updateManual({ recentPosts: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] resize-none focus:outline-none focus:border-[#81A1D3]"
              placeholder="Describe them here…"
            />
            {CHANNEL_MANUAL_EXAMPLE[channel] && (
              <p className="mt-2 text-xs text-[#444444]/70 leading-relaxed">
                <span className="font-bold text-[#444444]">Example:</span> {CHANNEL_MANUAL_EXAMPLE[channel]}
              </p>
            )}
          </div>
```

- [ ] **Step 8: Run tests + type gate**

Run: `npm test -- SocialChannelInput`
Expected: PASS (all, including the three new).

Run: `npm test -- PostLinkField`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: full suite green.

- [ ] **Step 9: Commit**

```bash
git add components/ui/PostLinkField.tsx components/ui/SocialChannelInput.tsx components/ui/__tests__/PostLinkField.test.tsx components/ui/__tests__/SocialChannelInput.test.tsx
git commit -m "feat: example-URL placeholders, persistent manual example, hideHeader in social inputs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `ChannelProgress` component

**Files:**
- Create: `components/ui/ChannelProgress.tsx`
- Test: `components/ui/__tests__/ChannelProgress.test.tsx`

**Interfaces:**
- Produces: `ChannelProgress({ current, total }: { current: number; total: number })` — renders `Channel {current} of {total}` and a bar filled `round(current/total*100)%`.

- [ ] **Step 1: Write the failing test** — `components/ui/__tests__/ChannelProgress.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { ChannelProgress } from '@/components/ui/ChannelProgress'

it('renders the current/total label', () => {
  render(<ChannelProgress current={2} total={4} />)
  expect(screen.getByText('Channel 2 of 4')).toBeInTheDocument()
})

it('fills the bar proportionally', () => {
  const { container } = render(<ChannelProgress current={2} total={4} />)
  const fill = container.querySelector('[data-progress-fill]') as HTMLElement
  expect(fill).toHaveStyle({ width: '50%' })
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test -- ChannelProgress`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component** — `components/ui/ChannelProgress.tsx`:

```tsx
// components/ui/ChannelProgress.tsx
interface ChannelProgressProps {
  current: number
  total: number
}

export function ChannelProgress({ current, total }: ChannelProgressProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-bold text-[#444444] tracking-wide whitespace-nowrap">
        Channel {current} of {total}
      </span>
      <div className="flex-1 h-1.5 rounded-full bg-[#eef1f6] overflow-hidden">
        <div
          data-progress-fill
          className="h-full bg-[#81A1D3] rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test + type gate**

Run: `npm test -- ChannelProgress`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/ui/ChannelProgress.tsx components/ui/__tests__/ChannelProgress.test.tsx
git commit -m "feat: add ChannelProgress indicator

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `ChannelDetailsIntro` component

**Files:**
- Create: `components/steps/ChannelDetailsIntro.tsx`
- Test: `components/steps/__tests__/ChannelDetailsIntro.test.tsx`

**Interfaces:**
- Produces: `ChannelDetailsIntro({ onContinue, onBack }: { onContinue: () => void; onBack: () => void })`.

- [ ] **Step 1: Write the failing test** — `components/steps/__tests__/ChannelDetailsIntro.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ChannelDetailsIntro } from '@/components/steps/ChannelDetailsIntro'

it('renders the lead-in heading and value props', () => {
  render(<ChannelDetailsIntro onContinue={() => {}} onBack={() => {}} />)
  expect(screen.getByText(/the part that does the heavy lifting/i)).toBeInTheDocument()
  expect(screen.getByText('Real examples beat guesses')).toBeInTheDocument()
  expect(screen.getByText('About 2–3 minutes')).toBeInTheDocument()
  expect(screen.getByText('No wrong answers')).toBeInTheDocument()
})

it('fires onContinue and onBack', () => {
  const onContinue = jest.fn()
  const onBack = jest.fn()
  render(<ChannelDetailsIntro onContinue={onContinue} onBack={onBack} />)
  fireEvent.click(screen.getByRole('button', { name: /Let's do it/i }))
  fireEvent.click(screen.getByRole('button', { name: /Back/i }))
  expect(onContinue).toHaveBeenCalledTimes(1)
  expect(onBack).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test -- ChannelDetailsIntro`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component** — `components/steps/ChannelDetailsIntro.tsx`:

```tsx
// components/steps/ChannelDetailsIntro.tsx
'use client'

interface ChannelDetailsIntroProps {
  onContinue: () => void
  onBack: () => void
}

const VALUE_PROPS = [
  { icon: '✦', title: 'Real examples beat guesses', body: 'Paste a few actual posts and we audit the real thing — not a rough description.' },
  { icon: '⏱', title: 'About 2–3 minutes', body: "We'll take one channel at a time so it never feels like a wall of forms." },
  { icon: '↺', title: 'No wrong answers', body: 'Not sure? Just describe the channel in your own words — that works too.' },
]

export function ChannelDetailsIntro({ onContinue, onBack }: ChannelDetailsIntroProps) {
  return (
    <div>
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Step 3 · Channel details</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-2">First — the part that does the heavy lifting</h2>
      <p className="text-sm text-[#444444] mb-6">
        Everything after this (your audit and your 30-day plan) is built from what you share here. A couple of real
        minutes now = a sharper, more personalized result.
      </p>

      <div className="flex flex-col gap-4 mb-8">
        {VALUE_PROPS.map((v) => (
          <div key={v.title} className="flex gap-3 items-start">
            <span className="w-8 h-8 rounded-lg bg-[#f0f5fb] text-[#81A1D3] flex items-center justify-center text-base shrink-0">
              {v.icon}
            </span>
            <div>
              <p className="text-sm font-bold text-[#1E212E]">{v.title}</p>
              <p className="text-sm text-[#444444] mt-0.5">{v.body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center">
        <button type="button" onClick={onBack} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        <button
          type="button"
          onClick={onContinue}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
        >
          Let&apos;s do it →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test + type gate**

Run: `npm test -- ChannelDetailsIntro`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/steps/ChannelDetailsIntro.tsx components/steps/__tests__/ChannelDetailsIntro.test.tsx
git commit -m "feat: add ChannelDetailsIntro lead-in screen

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `WebsiteChannelScreen` component

**Files:**
- Create: `components/steps/WebsiteChannelScreen.tsx`
- Test: `components/steps/__tests__/WebsiteChannelScreen.test.tsx`

**Interfaces:**
- Produces: `WebsiteChannelScreen(props)` where
  `props = { current: number; total: number; isLast: boolean; initialUrl?: string; onBack: () => void; onContinue: (result: { url: string; status: 'pass' | 'skipped' }) => void }`.
- Consumes: `ChannelProgress` (Task 3). Calls `POST /api/preflight` with body `{ urls: { website: <url> } }`; the response is `Partial<Record<Channel, PreflightStatus>>` (reads `.website.status`).

- [ ] **Step 1: Write the failing tests** — `components/steps/__tests__/WebsiteChannelScreen.test.tsx`:

```tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { WebsiteChannelScreen } from '@/components/steps/WebsiteChannelScreen'

function fetchOnce(status: string) {
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: async () => ({ website: { status } }) })
  ) as unknown as typeof fetch
}

afterEach(() => jest.resetAllMocks())

it('renders the website URL field and progress', () => {
  render(<WebsiteChannelScreen current={1} total={2} isLast={false} onBack={() => {}} onContinue={() => {}} />)
  expect(screen.getByText('Channel 1 of 2')).toBeInTheDocument()
  expect(screen.getByPlaceholderText('https://yourgym.com')).toBeInTheDocument()
})

it('advances with status pass when the preflight passes', async () => {
  fetchOnce('pass')
  const onContinue = jest.fn()
  render(<WebsiteChannelScreen current={1} total={2} isLast={false} onBack={() => {}} onContinue={onContinue} />)
  fireEvent.change(screen.getByPlaceholderText('https://yourgym.com'), { target: { value: 'https://g.com' } })
  fireEvent.click(screen.getByRole('button', { name: /Check & continue/i }))
  await waitFor(() => expect(onContinue).toHaveBeenCalledWith({ url: 'https://g.com', status: 'pass' }))
})

it('offers skip on unreachable, and skipping advances with status skipped', async () => {
  fetchOnce('unreachable')
  const onContinue = jest.fn()
  render(<WebsiteChannelScreen current={1} total={2} isLast={false} onBack={() => {}} onContinue={onContinue} />)
  fireEvent.change(screen.getByPlaceholderText('https://yourgym.com'), { target: { value: 'https://bad.com' } })
  fireEvent.click(screen.getByRole('button', { name: /Check & continue/i }))
  const skip = await screen.findByRole('button', { name: /Skip this channel/i })
  expect(onContinue).not.toHaveBeenCalled()
  fireEvent.click(skip)
  expect(onContinue).toHaveBeenCalledWith({ url: 'https://bad.com', status: 'skipped' })
})

it('last screen shows the Begin Audit label', () => {
  render(<WebsiteChannelScreen current={2} total={2} isLast onBack={() => {}} onContinue={() => {}} />)
  expect(screen.getByRole('button', { name: /Begin Audit/i })).toBeInTheDocument()
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test -- WebsiteChannelScreen`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component** — `components/steps/WebsiteChannelScreen.tsx`:

```tsx
// components/steps/WebsiteChannelScreen.tsx
'use client'

import { useState } from 'react'
import { ChannelProgress } from '@/components/ui/ChannelProgress'
import { Channel, PreflightStatus } from '@/lib/types'

type WebsiteState = 'idle' | 'checking' | 'unreachable'

interface WebsiteChannelScreenProps {
  current: number
  total: number
  isLast: boolean
  initialUrl?: string
  onBack: () => void
  onContinue: (result: { url: string; status: 'pass' | 'skipped' }) => void
}

export function WebsiteChannelScreen({ current, total, isLast, initialUrl, onBack, onContinue }: WebsiteChannelScreenProps) {
  const [url, setUrl] = useState(initialUrl ?? '')
  const [ws, setWs] = useState<WebsiteState>('idle')

  async function runCheck() {
    setWs('checking')
    const res = await fetch('/api/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: { website: url } }),
    })
    const results: Partial<Record<Channel, PreflightStatus>> = await res.json()
    const status = results.website?.status ?? 'unreachable'
    if (status === 'pass' || status === 'skipped') {
      onContinue({ url, status: 'pass' })
    } else {
      setWs('unreachable')
    }
  }

  return (
    <div>
      <ChannelProgress current={current} total={total} />
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2 mt-4">Website</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your website</h2>
      <p className="text-sm text-[#444444] mb-5">We&apos;ll take a quick look to make sure it&apos;s reachable, then audit it.</p>

      <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Website URL</label>
      <input
        type="url"
        value={url}
        onChange={(e) => { setUrl(e.target.value); if (ws === 'unreachable') setWs('idle') }}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]"
        placeholder="https://yourgym.com"
      />
      <p className="text-xs text-[#444444]/60 mt-2">We only read public pages — nothing behind a login.</p>

      {ws === 'unreachable' && (
        <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-xs text-red-700 mb-2">We had trouble reaching this URL. You can update it and try again, or skip this channel.</p>
          <button
            type="button"
            onClick={() => onContinue({ url, status: 'skipped' })}
            className="text-xs text-[#444444]/60 hover:text-[#444444]"
          >
            Skip this channel
          </button>
        </div>
      )}

      <div className="flex justify-between items-center mt-6">
        <button type="button" onClick={onBack} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        <button
          type="button"
          onClick={runCheck}
          disabled={ws === 'checking'}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors"
        >
          {ws === 'checking' ? 'Checking…' : isLast ? 'Begin Audit →' : 'Check & continue →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test + type gate**

Run: `npm test -- WebsiteChannelScreen`
Expected: PASS (all four).

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/steps/WebsiteChannelScreen.tsx components/steps/__tests__/WebsiteChannelScreen.test.tsx
git commit -m "feat: add WebsiteChannelScreen with in-context preflight

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `EmailChannelScreen` component

**Files:**
- Create: `components/steps/EmailChannelScreen.tsx`
- Test: `components/steps/__tests__/EmailChannelScreen.test.tsx`

**Interfaces:**
- Produces: `EmailChannelScreen(props)` where
  `props = { current: number; total: number; isLast: boolean; initial?: NonNullable<ChannelDetailsData['email']>; onBack: () => void; onContinue: (data: NonNullable<ChannelDetailsData['email']>) => void }`.
- The "uses a platform" question is required: Continue with it unanswered shows an inline error and does NOT call `onContinue`.

- [ ] **Step 1: Write the failing tests** — `components/steps/__tests__/EmailChannelScreen.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { EmailChannelScreen } from '@/components/steps/EmailChannelScreen'

it('renders progress and the gating question', () => {
  render(<EmailChannelScreen current={1} total={1} isLast onBack={() => {}} onContinue={() => {}} />)
  expect(screen.getByText('Channel 1 of 1')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Yes' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'No' })).toBeInTheDocument()
})

it('blocks Continue with an error until the gating question is answered', () => {
  const onContinue = jest.fn()
  render(<EmailChannelScreen current={1} total={1} isLast onBack={() => {}} onContinue={onContinue} />)
  fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
  expect(screen.getByText('Let us know so we can tailor your email plan.')).toBeInTheDocument()
  expect(onContinue).not.toHaveBeenCalled()
})

it('shows the platform dropdown only after choosing Yes', () => {
  render(<EmailChannelScreen current={1} total={1} isLast onBack={() => {}} onContinue={() => {}} />)
  expect(screen.queryByText('Select platform')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Yes' }))
  expect(screen.getByText('Select platform')).toBeInTheDocument()
})

it('submits the email data once gating is answered', () => {
  const onContinue = jest.fn()
  render(<EmailChannelScreen current={1} total={1} isLast onBack={() => {}} onContinue={onContinue} />)
  fireEvent.click(screen.getByRole('button', { name: 'No' }))
  fireEvent.change(screen.getByPlaceholderText('e.g. 340'), { target: { value: '340' } })
  fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
  expect(onContinue).toHaveBeenCalledWith(
    expect.objectContaining({ usesPlatform: false, subscriberCount: 340 })
  )
})
```

- [ ] **Step 2: Run and watch it fail**

Run: `npm test -- EmailChannelScreen`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the component** — `components/steps/EmailChannelScreen.tsx`:

```tsx
// components/steps/EmailChannelScreen.tsx
'use client'

import { useState } from 'react'
import { ChannelProgress } from '@/components/ui/ChannelProgress'
import { ChannelDetailsData } from '@/lib/types'

type EmailData = NonNullable<ChannelDetailsData['email']>

interface EmailChannelScreenProps {
  current: number
  total: number
  isLast: boolean
  initial?: EmailData
  onBack: () => void
  onContinue: (data: EmailData) => void
}

const PLATFORMS = ['Mailchimp', 'Klaviyo', 'ConvertKit', 'HubSpot', 'GoHighLevel', 'Other']
const FREQUENCIES = ['Weekly', 'Bi-weekly', 'Monthly', 'Rarely']

const pill = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
    active ? 'border-[#81A1D3] bg-[#f0f5fb] text-[#81A1D3]' : 'border-gray-200 bg-white text-[#444444] hover:border-[#81A1D3]'
  }`

export function EmailChannelScreen({ current, total, isLast, initial, onBack, onContinue }: EmailChannelScreenProps) {
  const [usesPlatform, setUsesPlatform] = useState<boolean | undefined>(initial?.usesPlatform)
  const [platform, setPlatform] = useState(initial?.platform ?? '')
  const [otherPlatform, setOtherPlatform] = useState(initial?.otherPlatform ?? '')
  const [subscribers, setSubscribers] = useState(initial?.subscriberCount ? String(initial.subscriberCount) : '')
  const [frequency, setFrequency] = useState(initial?.sendFrequency ?? '')
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (usesPlatform === undefined) {
      setError('Let us know so we can tailor your email plan.')
      return
    }
    onContinue({
      usesPlatform,
      platform: usesPlatform ? (platform || undefined) : undefined,
      otherPlatform: usesPlatform && platform === 'Other' ? (otherPlatform || undefined) : undefined,
      subscriberCount: parseInt(subscribers || '0'),
      sendFrequency: frequency,
    })
  }

  return (
    <div>
      <ChannelProgress current={current} total={total} />
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2 mt-4">Email</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your email list</h2>
      <p className="text-xs text-[#444444]/70 mb-4">
        Your marketing list — promos, new offerings, and events you send to members and past leads, not a members-only newsletter.
      </p>

      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-xs text-[#444444] mb-1.5">Do you use an email marketing platform? (e.g., MailChimp, ConvertKit, HubSpot, etc.)</label>
          <div className="flex gap-2">
            <button type="button" onClick={() => { setUsesPlatform(true); setError(null) }} className={pill(usesPlatform === true)}>Yes</button>
            <button type="button" onClick={() => { setUsesPlatform(false); setError(null); setPlatform(''); setOtherPlatform('') }} className={pill(usesPlatform === false)}>No</button>
          </div>
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        {usesPlatform === true && (
          <div>
            <label className="block text-xs text-[#444444] mb-1">Platform</label>
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
              <option value="">Select platform</option>
              {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            {platform === 'Other' && (
              <input
                value={otherPlatform}
                onChange={(e) => setOtherPlatform(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3] mt-2"
                placeholder="Which platform?"
              />
            )}
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs text-[#444444] mb-1">Subscriber count</label>
            <input type="number" value={subscribers} onChange={(e) => setSubscribers(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. 340" />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-[#444444] mb-1">Send frequency</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
              <option value="">Select</option>
              {FREQUENCIES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mt-6">
        <button type="button" onClick={onBack} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        <button type="button" onClick={submit} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors">
          {isLast ? 'Begin Audit →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test + type gate**

Run: `npm test -- EmailChannelScreen`
Expected: PASS (all four).

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add components/steps/EmailChannelScreen.tsx components/steps/__tests__/EmailChannelScreen.test.tsx
git commit -m "feat: add EmailChannelScreen with required-gating

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Rewrite `StepChannelDetails` as the progressive orchestrator

**Files:**
- Rewrite: `components/steps/StepChannelDetails.tsx`
- Modify: `components/steps/__tests__/channel-details-email.test.tsx` (seed `channelIntroSeen: true` so the email screen shows without stepping through the intro)
- Test: `components/steps/__tests__/StepChannelDetails.flow.test.tsx` (new)

**Interfaces:**
- Consumes: `ChannelDetailsIntro` (T4), `ChannelProgress` (T3), `WebsiteChannelScreen` (T5), `EmailChannelScreen` (T6), `SocialChannelInput` with `hideHeader` (T2), `channelIntroSeen` + `MARK_CHANNEL_INTRO_SEEN` (T1).
- Behavior: derives ordered screens from `businessInfo.channels` (socials in order → website → email); linear Back/Continue; lead-in shown once; final screen's Continue assembles `channelDetails` + `preflightResults` and dispatches `SET_STEP: 4`.

- [ ] **Step 1: Update the existing email test's seed** — in `components/steps/__tests__/channel-details-email.test.tsx`, change the `seed` object to skip the lead-in:

```tsx
const seed: Partial<WizardState> = {
  channelIntroSeen: true,
  businessInfo: { gymName: 'Test Gym', services: ['Open Gym'], icp: 'x', channels: ['email'] },
  channelDetails: {},
  preflightResults: {},
}
```

(No other lines in that file change — an email-only gym lands directly on the email screen, whose last-screen button already reads "Begin Audit →", matching the existing `name: /Begin Audit/i` queries.)

- [ ] **Step 2: Write the failing flow tests** — `components/steps/__tests__/StepChannelDetails.flow.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { WizardProvider, useWizard } from '@/hooks/useWizard'
import { StepChannelDetails } from '@/components/steps/StepChannelDetails'
import { WizardState, Channel } from '@/lib/types'

function renderStep(seed: Partial<WizardState>) {
  const probe = { step: 0 as number }
  function Probe() {
    const { state } = useWizard()
    probe.step = state.currentStep
    return null
  }
  render(
    <WizardProvider previewMode initialState={seed}>
      <StepChannelDetails />
      <Probe />
    </WizardProvider>
  )
  return probe
}

function baseSeed(channels: Channel[], extra: Partial<WizardState> = {}): Partial<WizardState> {
  return {
    currentStep: 3,
    channelIntroSeen: true,
    businessInfo: { gymName: 'Test', services: ['Open Gym'], icp: 'x', channels },
    ...extra,
  }
}

it('shows the lead-in first when the intro has not been seen', () => {
  renderStep({ ...baseSeed(['instagram']), channelIntroSeen: false })
  expect(screen.getByText(/the part that does the heavy lifting/i)).toBeInTheDocument()
})

it('skips the lead-in on return (intro already seen) and shows the first channel', () => {
  renderStep(baseSeed(['instagram', 'website']))
  expect(screen.queryByText(/the part that does the heavy lifting/i)).toBeNull()
  expect(screen.getByRole('heading', { name: 'Your Instagram' })).toBeInTheDocument()
  expect(screen.getByText('Channel 1 of 2')).toBeInTheDocument()
})

it('only renders screens for selected channels — no email screen when email is not selected', () => {
  renderStep(baseSeed(['instagram']))
  // advance past the single Instagram screen → Begin Audit, no email screen ever shown
  expect(screen.getByRole('button', { name: /Begin Audit/i })).toBeInTheDocument()
  expect(screen.queryByText('Your email list')).toBeNull()
})

it('advances linearly and the last screen begins the audit', () => {
  const probe = renderStep(baseSeed(['instagram']))
  fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
  expect(probe.step).toBe(4)
})

it('walks instagram → website → begin audit, dispatching website details', () => {
  global.fetch = jest.fn(() => Promise.resolve({ json: async () => ({ website: { status: 'pass' } }) })) as unknown as typeof fetch
  const probe = renderStep(baseSeed(['instagram', 'website']))
  // Instagram screen (1 of 2) → Continue
  fireEvent.click(screen.getByRole('button', { name: /Continue/i }))
  // Website screen (2 of 2)
  fireEvent.change(screen.getByPlaceholderText('https://yourgym.com'), { target: { value: 'https://g.com' } })
  fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
  return Promise.resolve().then(() => {
    // preflight resolves → finalize → step 4
    expect(probe.step).toBe(4)
    jest.resetAllMocks()
  })
})

it('Back from the first channel returns to Business Info (step 2) on a return visit', () => {
  const probe = renderStep(baseSeed(['instagram']))
  fireEvent.click(screen.getByRole('button', { name: /← Back/i }))
  expect(probe.step).toBe(2)
})
```

- [ ] **Step 3: Run and watch them fail**

Run: `npm test -- StepChannelDetails.flow`
Expected: FAIL — the current `StepChannelDetails` renders the old single-page form; there is no lead-in, no "Your Instagram" heading, no "Channel 1 of 2".

- [ ] **Step 4: Rewrite `components/steps/StepChannelDetails.tsx`:**

```tsx
// components/steps/StepChannelDetails.tsx
'use client'

import { useState } from 'react'
import { useWizard } from '@/hooks/useWizard'
import { STEP_CARD } from '@/components/wizard/stepLayout'
import { SocialChannelInput } from '@/components/ui/SocialChannelInput'
import { ChannelProgress } from '@/components/ui/ChannelProgress'
import { ChannelDetailsIntro } from '@/components/steps/ChannelDetailsIntro'
import { WebsiteChannelScreen } from '@/components/steps/WebsiteChannelScreen'
import { EmailChannelScreen } from '@/components/steps/EmailChannelScreen'
import { Channel, ChannelDetailsData, PreflightStatus } from '@/lib/types'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', website: 'Website', email: 'Email',
}

type WebsiteResult = { url: string; status: 'pass' | 'skipped' }
type EmailData = NonNullable<ChannelDetailsData['email']>

export function StepChannelDetails() {
  const { state, dispatch } = useWizard()
  const channels = state.businessInfo?.channels ?? []
  const socialChannels = channels.filter((c) => c !== 'website' && c !== 'email')
  const ordered: Channel[] = [
    ...socialChannels,
    ...(channels.includes('website') ? (['website'] as Channel[]) : []),
    ...(channels.includes('email') ? (['email'] as Channel[]) : []),
  ]
  const total = ordered.length

  const [showIntro, setShowIntro] = useState(!state.channelIntroSeen)
  const [cursor, setCursor] = useState(0)
  const [websiteResult, setWebsiteResult] = useState<WebsiteResult | null>(() => {
    const w = state.preflightResults?.website
    if (w?.status === 'skipped') return { url: state.channelDetails?.website?.url ?? '', status: 'skipped' }
    if (w?.status === 'pass' && state.channelDetails?.website) return { url: state.channelDetails.website.url, status: 'pass' }
    return null
  })
  const [emailData, setEmailData] = useState<EmailData | null>(state.channelDetails?.email ?? null)

  function finalize(finalWebsite: WebsiteResult | null, finalEmail: EmailData | null) {
    const channelDetails: ChannelDetailsData = {}
    if (finalWebsite && finalWebsite.status !== 'skipped') channelDetails.website = { url: finalWebsite.url }
    if (finalEmail) channelDetails.email = finalEmail

    const preflightResults: Partial<Record<Channel, PreflightStatus>> = {}
    if (channels.includes('website')) preflightResults.website = finalWebsite?.status === 'skipped' ? { status: 'skipped' } : { status: 'pass' }
    if (channels.includes('email')) preflightResults.email = { status: 'pass' }

    dispatch({ type: 'SET_CHANNEL_DETAILS', data: channelDetails })
    dispatch({ type: 'SET_PREFLIGHT_RESULTS', data: preflightResults })
    dispatch({ type: 'SET_STEP', step: 4 })
  }

  function back() {
    if (cursor > 0) { setCursor(cursor - 1); return }
    if (!state.channelIntroSeen) { setShowIntro(true); return } // first pass: return to the lead-in
    dispatch({ type: 'SET_STEP', step: 2 })
  }

  // Lead-in (once).
  if (showIntro) {
    return (
      <div className={STEP_CARD}>
        <ChannelDetailsIntro
          onBack={() => dispatch({ type: 'SET_STEP', step: 2 })}
          onContinue={() => { dispatch({ type: 'MARK_CHANNEL_INTRO_SEEN' }); setShowIntro(false) }}
        />
      </div>
    )
  }

  // Defensive: no channels selected (Business Info should require ≥1).
  if (total === 0) {
    return (
      <div className={STEP_CARD}>
        <h2 className="text-2xl font-extrabold text-[#1E212E] mb-4">Your channel details</h2>
        <div className="flex justify-between items-center">
          <button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
          <button type="button" onClick={() => finalize(null, null)} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors">Begin Audit →</button>
        </div>
      </div>
    )
  }

  const channel = ordered[cursor]
  const current = cursor + 1
  const isLast = current >= total

  if (channel === 'website') {
    return (
      <div className={STEP_CARD}>
        <WebsiteChannelScreen
          current={current}
          total={total}
          isLast={isLast}
          initialUrl={websiteResult?.url ?? state.channelDetails?.website?.url}
          onBack={back}
          onContinue={(result) => {
            setWebsiteResult(result)
            if (isLast) finalize(result, emailData)
            else setCursor(cursor + 1)
          }}
        />
      </div>
    )
  }

  if (channel === 'email') {
    return (
      <div className={STEP_CARD}>
        <EmailChannelScreen
          current={current}
          total={total}
          isLast={isLast}
          initial={emailData ?? undefined}
          onBack={back}
          onContinue={(data) => {
            setEmailData(data)
            if (isLast) finalize(websiteResult, data)
            else setCursor(cursor + 1)
          }}
        />
      </div>
    )
  }

  // Social channel screen.
  const label = CHANNEL_LABELS[channel]
  return (
    <div className={STEP_CARD}>
      <ChannelProgress current={current} total={total} />
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2 mt-4">{label}</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your {label}</h2>
      <p className="text-sm text-[#444444] mb-5">Show us what you&apos;re posting so the audit reflects your real content.</p>

      <SocialChannelInput
        hideHeader
        channel={channel}
        value={state.socialInputs[channel]}
        onChange={(input) => dispatch({ type: 'SET_SOCIAL_INPUT', channel, input })}
      />

      <div className="flex justify-between items-center mt-6">
        <button type="button" onClick={back} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        <button
          type="button"
          onClick={() => { if (isLast) finalize(websiteResult, emailData); else setCursor(cursor + 1) }}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
        >
          {isLast ? 'Begin Audit →' : 'Continue →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run the flow + email tests**

Run: `npm test -- StepChannelDetails.flow`
Expected: PASS (all).

Run: `npm test -- channel-details-email`
Expected: PASS (all — the email-only gym now lands on the email screen directly).

- [ ] **Step 6: Type gate + full suite**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: full suite green.

- [ ] **Step 7: Commit**

```bash
git add components/steps/StepChannelDetails.tsx components/steps/__tests__/channel-details-email.test.tsx components/steps/__tests__/StepChannelDetails.flow.test.tsx
git commit -m "feat: rewrite StepChannelDetails as progressive one-channel-at-a-time flow

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Preview harness + cleanup

**Files:**
- Modify: `lib/preview/mock-data.ts` (preview seeds)
- Delete: `public/mockup-channel-details.html` (throwaway prototype)

**Interfaces:**
- Consumes: everything above. The `3 · Channel Details` view now shows the **lead-in** (seed leaves `channelIntroSeen` unset → `false`); the three social views seed `channelIntroSeen: true` so they render the social channel screen directly.

- [ ] **Step 1: Verify the current preview seeds render the intended screens** — start the dev server and open `/preview`. Note which social views currently show (they will show the lead-in until seeded). This is the manual baseline; no code yet.

Run: (dev server already running) open `http://localhost:3000/preview`

- [ ] **Step 2: Seed the social preview views past the intro** — in `lib/preview/mock-data.ts`, add `channelIntroSeen: true,` to the `seed` object of each of the three social views: `channel-links-success`, `channel-manual`, and `channel-links-blocked` (add the line right after `currentStep: 3,` in each).

- [ ] **Step 3: Leave `channel-details` as the lead-in view** — no change needed; without `channelIntroSeen`, it renders the lead-in. Optionally relabel it for clarity:

```ts
  {
    id: 'channel-details',
    label: '3 · Channel Details (intro)',
    seed: {
      currentStep: 3,
      businessInfo: HAPPY_PATH.businessInfo,
      channelDetails: HAPPY_PATH.channelDetails,
      preflightResults: HAPPY_PATH.preflightResults,
    },
  },
```

- [ ] **Step 4: Verify in the browser.** Reload `/preview` and click each of: `3 · Channel Details (intro)` (shows the lead-in), `3 · Social: link success` / `3 · Social: manual` / `3 · Social: blocked` (each shows a single social channel screen — "Your Instagram", "Channel 1 of 1", the settled link/manual/blocked state within it).

Use the browser preview tools: `read_console_messages` (expect no errors), and a screenshot of each social view.

- [ ] **Step 5: Delete the throwaway prototype**

```bash
rm public/mockup-channel-details.html
```

- [ ] **Step 6: Type gate + full suite**

Run: `npx tsc --noEmit`
Expected: clean.

Run: `npm test`
Expected: full suite green.

- [ ] **Step 7: Commit**

```bash
git add lib/preview/mock-data.ts
git commit -m "chore: update preview views for progressive channel details; drop prototype

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final Verification (after all tasks)

- `npm test` — full suite green.
- `npx tsc --noEmit` — clean.
- Dev server walk-through for a multi-channel gym (Business Info selecting Instagram + Facebook + Website + Email): lead-in → IG → FB → website (Check & continue) → email (Begin Audit) → Step 4. Confirm: progress reads "Channel X of 4"; a deselected channel produces no screen; returning to Step 3 from Step 4 skips the lead-in; pasting a real public IG post link on a social screen still live-resolves.

## Self-Review

**Spec coverage:**
- Lead-in (once, persisted) → Task 1 (state) + Task 4 (screen) + Task 7 (gating/skip logic). ✓
- One screen per selected channel, derived from `businessInfo.channels` → Task 7. ✓
- Progress "Channel X of N" → Task 3 + Task 7. ✓
- Linear nav; last screen "Begin Audit" → Task 7. ✓
- Social screen reuses `SocialChannelInput` (with `hideHeader`) → Task 2 + Task 7. ✓
- Example-URL placeholders → Task 2. ✓
- Persistent manual example → Task 2. ✓
- Website screen (in-context preflight + skip) → Task 5. ✓
- Email screen (required gating) → Task 6. ✓
- Final assemble + dispatch (`SET_CHANNEL_DETAILS`/`SET_PREFLIGHT_RESULTS`/`SET_STEP 4`), socials via `SET_SOCIAL_INPUT` on change → Task 7. ✓
- Edge cases (zero channels, single channel, website-last, return visit) → Task 7. ✓
- Preview updates → Task 8. ✓

**Placeholder scan:** none — every step has concrete code/commands.

**Type consistency:** `WebsiteResult = { url; status: 'pass'|'skipped' }` and `EmailData = NonNullable<ChannelDetailsData['email']>` are used identically in Tasks 5/6/7. `channelIntroSeen` / `MARK_CHANNEL_INTRO_SEEN` names match across Tasks 1 and 7. `hideHeader` / `placeholder` prop names match across Tasks 2 and 7. `ChannelProgress({current,total})` signature matches across Tasks 3/5/6/7.
