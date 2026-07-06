# Preview Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dev-only `/preview` route that renders each of the 7 wizard steps (plus the 2 loading states) pre-filled with mock happy-path data, with zero live API calls.

**Architecture:** Mount the real step components inside a `WizardProvider` seeded with mock state. A toolbar switches between "views"; each view remounts the provider (via React `key`) with the seed that view needs. A `previewMode` context flag suppresses the audit/generate fetch effects. The route 404s in production via `VERCEL_ENV`.

**Tech Stack:** Next.js 16.2.9 (App Router), React 19, TypeScript, Tailwind, react-hook-form, jest + @testing-library/react (deps present, config to be added).

## Global Constraints

- **This is Next.js 16.2.9 — not necessarily the Next.js in training data.** Before writing route/gating code, read: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` and `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/not-found.md`. Heed any deprecation notices.
- **No new runtime dependencies.** Everything needed is already installed.
- **Do not change the behavior of the real wizard (`/`).** All edits to shared files must be additive/backward-compatible: no props → identical behavior to today.
- **Gate on `process.env.VERCEL_ENV === 'production'`, never `NODE_ENV`** (preview deployments run with `NODE_ENV=production`).
- **Colors/styles:** reuse existing Tailwind classes from the step components; brand blue is `#81A1D3`, ink is `#1E212E`.
- **Mock data is one happy-path gym** ("Iron Peak Fitness", channels: instagram, facebook, website, email).
- Type-check gate for every task: `npx tsc --noEmit` must pass.
- Commit after each task.

---

### Task 1: Provider seeding + `previewMode` + export `WizardContent`

Foundation. Makes `WizardProvider` seedable and adds the `previewMode` flag other tasks depend on.

**Files:**
- Modify: `hooks/useWizard.tsx`
- Modify: `components/wizard/WizardLayout.tsx`

**Interfaces:**
- Produces: `WizardProvider` now accepts optional props `{ initialState?: Partial<WizardState>; previewMode?: boolean }`. Context value becomes `{ state: WizardState; dispatch: React.Dispatch<WizardAction>; previewMode: boolean }`. `useWizard()` returns that shape.
- Produces: `WizardContent` exported from `components/wizard/WizardLayout.tsx` (the sidebar + step-area renderer, reads `useWizard()`).

- [ ] **Step 1: Edit `hooks/useWizard.tsx` — seedable provider + previewMode**

Replace the `WizardProvider` definition and the context type. Full new content of the context/provider/hook section (keep `initialState` const and `wizardReducer` above unchanged):

```tsx
const WizardContext = createContext<{
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
  previewMode: boolean
} | null>(null)

export function WizardProvider({
  children,
  initialState: seed,
  previewMode = false,
}: {
  children: ReactNode
  initialState?: Partial<WizardState>
  previewMode?: boolean
}) {
  const [state, dispatch] = useReducer(wizardReducer, { ...initialState, ...seed })
  return (
    <WizardContext.Provider value={{ state, dispatch, previewMode }}>
      {children}
    </WizardContext.Provider>
  )
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}
```

Note: the reducer's default `initialState` const is the base; `seed` overrides. The prop is named `initialState` externally but aliased to `seed` to avoid clashing with the module-level `initialState` const.

- [ ] **Step 2: Edit `components/wizard/WizardLayout.tsx` — export `WizardContent`**

Change the `WizardContent` declaration from `function WizardContent()` to `export function WizardContent()`. Leave `WizardLayout` and everything else unchanged.

```tsx
export function WizardContent() {
  const { state } = useWizard()
  // ... unchanged body ...
}
```

- [ ] **Step 3: Verify types + real app unaffected**

Run: `npx tsc --noEmit`
Expected: exit 0, no errors. (`WizardProvider` used in `WizardLayout` with no new props still type-checks because both new props are optional.)

- [ ] **Step 4: Commit**

```bash
git add hooks/useWizard.tsx components/wizard/WizardLayout.tsx
git commit -m "feat: make WizardProvider seedable + add previewMode flag

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Suppress audit/generate fetches in preview (with test)

Adds jest infrastructure (deps already installed, no config yet) and the `previewMode` guards on the two fetch-firing effects, locked by a test.

**Files:**
- Create: `jest.config.ts`
- Create: `jest.setup.ts`
- Modify: `package.json` (add `test` script)
- Modify: `components/steps/StepAuditLoading.tsx`
- Modify: `components/steps/StepYourPlan.tsx`
- Test: `components/steps/__tests__/preview-mode-fetch.test.tsx`

**Interfaces:**
- Consumes: `previewMode` from `useWizard()` (Task 1).
- Produces: when `previewMode` is true, neither `StepAuditLoading` nor `StepYourPlan` calls `fetch`.

- [ ] **Step 1: Create `jest.config.ts`**

```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
}

export default createJestConfig(config)
```

- [ ] **Step 2: Create `jest.setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 3: Add `test` script to `package.json`**

In the `"scripts"` block add:

```json
"test": "jest"
```

- [ ] **Step 4: Write the failing test**

Create `components/steps/__tests__/preview-mode-fetch.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { StepAuditLoading } from '@/components/steps/StepAuditLoading'
import { StepYourPlan } from '@/components/steps/StepYourPlan'
import { WizardState } from '@/lib/types'

const baseSeed: Partial<WizardState> = {
  businessInfo: { gymName: 'Test Gym', services: ['Open Gym'], icp: 'x', channels: ['instagram'] },
  channelDetails: { instagram: { url: 'https://instagram.com/test' } },
  preflightResults: { instagram: { status: 'pass' } },
  auditResults: [],
  storyMineAnswers: {},
}

describe('previewMode suppresses network calls', () => {
  beforeEach(() => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
  })
  afterEach(() => jest.resetAllMocks())

  it('StepAuditLoading does not fetch in preview mode', () => {
    render(
      <WizardProvider previewMode initialState={baseSeed}>
        <StepAuditLoading />
      </WizardProvider>
    )
    expect(global.fetch).not.toHaveBeenCalled()
    // spinner text still renders
    expect(screen.getByText(/This usually takes/i)).toBeInTheDocument()
  })

  it('StepYourPlan does not fetch in preview mode when no storyPlan', () => {
    render(
      <WizardProvider previewMode initialState={baseSeed}>
        <StepYourPlan />
      </WizardProvider>
    )
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByText(/Building your 30-day content plan/i)).toBeInTheDocument()
  })

  it('StepAuditLoading DOES fetch when previewMode is off', () => {
    render(
      <WizardProvider initialState={baseSeed}>
        <StepAuditLoading />
      </WizardProvider>
    )
    expect(global.fetch).toHaveBeenCalledWith('/api/audit', expect.anything())
  })
})
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm test -- preview-mode-fetch`
Expected: the two `not.toHaveBeenCalled()` assertions FAIL (fetch fires today because there is no guard).

- [ ] **Step 6: Add the guard to `StepAuditLoading.tsx`**

Read `previewMode` from the hook and bail out of the fetch effect early. Change line 16 and the top of the fetch effect (line 31 region):

```tsx
  const { state, dispatch, previewMode } = useWizard()
```

Inside the audit `useEffect` (the one with `runAudit`), make the very first lines:

```tsx
  useEffect(() => {
    if (previewMode) return // preview harness: show spinner, never hit the API
    if (startedAttempt.current === attempt) return
    startedAttempt.current = attempt
    // ... rest unchanged ...
```

(The message-cycling `useEffect` is left untouched — the spinner keeps animating.)

- [ ] **Step 7: Add the guard to `StepYourPlan.tsx`**

Change line 10 and the top of the generate effect:

```tsx
  const { state, dispatch, previewMode } = useWizard()
```

Inside the generate `useEffect`, first lines:

```tsx
  useEffect(() => {
    if (previewMode) return // preview harness: show loading spinner, never hit the API
    if (state.storyPlan) return
    if (startedAttempt.current === attempt) return
    startedAttempt.current = attempt
    // ... rest unchanged ...
```

Note: `loading` is initialized `!state.storyPlan`; with the seed lacking `storyPlan` it stays `true`, so the spinner renders indefinitely — the desired "Your Plan (loading)" view.

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm test -- preview-mode-fetch`
Expected: all 3 tests PASS.

- [ ] **Step 9: Type-check + commit**

Run: `npx tsc --noEmit` (expect exit 0)

```bash
git add jest.config.ts jest.setup.ts package.json components/steps/StepAuditLoading.tsx components/steps/StepYourPlan.tsx components/steps/__tests__/preview-mode-fetch.test.tsx
git commit -m "feat: suppress audit/generate fetches when previewMode is on

Adds jest config + test locking the guard.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Mock data module

The single source of truth for the happy-path gym and the view list.

**Files:**
- Create: `lib/preview/mock-data.ts`

**Interfaces:**
- Consumes: types from `@/lib/types`.
- Produces:
  - `HAPPY_PATH: WizardState` — a fully populated wizard state.
  - `PREVIEW_VIEWS: PreviewView[]` where `interface PreviewView { id: string; label: string; seed: Partial<WizardState> }`.
  - Each `seed` includes `currentStep` and exactly the fields that view should show.

- [ ] **Step 1: Create `lib/preview/mock-data.ts`**

```ts
import { WizardState } from '@/lib/types'

export interface PreviewView {
  id: string
  label: string
  seed: Partial<WizardState>
}

// One happy-path gym, reused to derive every view's seed.
export const HAPPY_PATH: WizardState = {
  currentStep: 7,
  businessInfo: {
    gymName: 'Iron Peak Fitness',
    services: ['Group Classes', 'Personal Training', 'Open Gym'],
    icp: 'Adults 30–50 looking to lose weight and build consistency',
    channels: ['instagram', 'facebook', 'website', 'email'],
  },
  channelDetails: {
    instagram: { url: 'https://instagram.com/ironpeakfitness' },
    facebook: { url: 'https://facebook.com/ironpeakfitness' },
    website: { url: 'https://ironpeakfitness.com' },
    email: { platform: 'Mailchimp', subscriberCount: 340, sendFrequency: 'Weekly' },
  },
  preflightResults: {
    instagram: { status: 'pass' },
    facebook: { status: 'pass' },
    website: { status: 'pass' },
    email: { status: 'pass' },
  },
  auditResults: [
    {
      channel: 'instagram',
      score: 7,
      narrative:
        'Consistent posting (3–4x/week) with strong member engagement — workout tips, member spotlights, class announcements. Room to lean into transformation storytelling and behind-the-scenes culture.',
      doingWell: ['Consistent posting schedule', 'Good visual quality', 'Clear CTAs for class sign-ups'],
      opportunities: ['Lacking origin/founder story', 'Limited transformation narratives', 'Few "day in the life" posts'],
      selfReported: false,
    },
    {
      channel: 'facebook',
      score: 5,
      narrative:
        'Presence exists but less active (1–2 posts/week), reaching an older demographic. Community building via comments/engagement is limited.',
      doingWell: ['Reaches older demographic', 'Clear event announcements'],
      opportunities: ['More member testimonials', 'Greater engagement focus', 'Story-based content'],
      selfReported: false,
    },
    {
      channel: 'website',
      score: null,
      narrative:
        'Clean navigation and a working class schedule, but team bios read generic and the homepage emphasizes features over member stories.',
      doingWell: ['Clean layout', 'Functional class scheduling'],
      opportunities: ['Add member testimonials', 'Founder story section', 'Transformation gallery'],
      selfReported: true,
    },
    {
      channel: 'email',
      score: null,
      narrative:
        'Weekly email to 340 subscribers covers class updates and promotions. Opportunity to add narrative-driven content (member wins, behind-the-scenes).',
      doingWell: ['Regular schedule', 'Clear calls-to-action'],
      opportunities: ['More narrative-driven content', 'Less promo-focused'],
      selfReported: true,
    },
  ],
  storyMineAnswers: {
    0: 'Sarah came to us 6 months ago unable to do a single pushup. Last month she did 20 in a row and teared up — she said it changed how she sees herself.',
    1: '6 AM early-bird class: music pumping, coach energizing the room, coffee brewing, regulars laughing in the lobby between sessions.',
    2: 'I once launched a new program without getting member feedback first. Low signups. Learned to involve members in decisions, not just broadcast at them.',
    3: 'My own transformation changed my life. I wanted to build a place where transformation is the culture, not the exception.',
    4: 'Busy professionals tired of cookie-cutter gyms. They were afraid of judgment and wanted a community, not just equipment.',
    5: 'We care about member transformations, not just monthly fees. Coaches know names. We celebrate wins like they are our own.',
    6: 'Help people become the strongest version of themselves — physically, mentally, and as a community.',
    7: 'A member who had struggled for 2 years hit her squat PR in front of the whole class. Everyone erupted. That is when I knew we had built something real.',
    8: 'Iron Peak is not just a gym — it is a community committed to becoming our best selves, together.',
    9: 'Packed morning class, contagious energy, everyone cheering each other on, people leaving more confident than when they arrived.',
  },
  storyPlan: {
    stories: [
      {
        title: "Sarah's 20 Pushup Journey",
        type: 'Member Transformation',
        whySelected:
          'Concrete, emotional proof that the transformation culture is real and celebrated — exactly what a prospective member wants to see.',
        channels: {
          instagram: {
            copy: "Sarah couldn't do ONE pushup 6 months ago. Last month? 20 in a row. 💪 Ready to start YOUR transformation? DM us.",
            visualRecommendation: 'Before/after carousel or short clip of Sarah (with consent)',
            suggestedPostDate: 'Week 1, Wednesday',
          },
          facebook: {
            copy: 'Meet Sarah. Six months ago she couldn\'t do a single pushup. Today she crushed 20 — and couldn\'t hold back the tears. We don\'t just count reps. We celebrate transformations.',
            visualRecommendation: 'Before/after photos or a short testimonial video',
            suggestedPostDate: 'Week 2, Monday',
          },
          website: {
            copy: "Sarah's Transformation — six months ago she walked in nervous and unable to do a pushup. With her coaches and community behind her, she trained consistently. Last month: 20 pushups, and tears of joy. That's what transformation looks like at Iron Peak.",
            visualRecommendation: 'High-quality before/after photos or embedded testimonial video',
            suggestedPostDate: 'Week 1, Friday',
          },
          email: {
            copy: "Subject: Sarah's Story — Six months ago Sarah couldn't do a single pushup. She showed up. Her coaches believed in her. Last month she did 20 in a row and cried. That moment is Iron Peak. Let's write your transformation story next.",
            visualRecommendation: 'Embedded photo of Sarah or a link to the testimonial video',
            suggestedPostDate: 'Week 2, Wednesday',
          },
        },
      },
      {
        title: 'A Morning at Iron Peak',
        type: 'Day in the Life',
        whySelected:
          'The 6 AM energy — music, coaches, camaraderie — is a real differentiator. Shows prospects what the culture feels like, not just what happens.',
        channels: {
          instagram: {
            copy: "5:55 AM at Iron Peak. Coffee's brewing. Music's up. Regulars streaming in. 🌅 Then class starts and the room comes alive. Ready to join the early-bird flock?",
            visualRecommendation: 'Short reel of the morning class: arrivals, coach energizing, camaraderie',
            suggestedPostDate: 'Week 2, Thursday',
          },
          facebook: {
            copy: 'Every morning at Iron Peak tells the same story: transformation, community, and real human connection. People show up for the workout — and for each other.',
            visualRecommendation: 'Photo carousel of morning-class energy',
            suggestedPostDate: 'Week 3, Tuesday',
          },
          website: {
            copy: 'A Morning at Iron Peak — 6 AM, the doors open, regular faces stream in, coffee brewing, music pumping. Coaches greet people by name. By the time class ends, everyone leaves a little stronger. That is the Iron Peak difference.',
            visualRecommendation: 'High-quality photo gallery or embedded morning-class video',
            suggestedPostDate: 'Week 1, Monday',
          },
          email: {
            copy: "Subject: A Day in the Life at Iron Peak — The doors open at 5:55. Coach is pumped. Music is playing. For 60 minutes everyone is fully present, pushing and celebrating each other. That's Iron Peak every single day.",
            visualRecommendation: 'Embedded photos or a clip from morning class',
            suggestedPostDate: 'Week 3, Friday',
          },
        },
      },
      {
        title: 'The Lesson I Learned the Hard Way',
        type: 'Mistake/Lesson',
        whySelected:
          'Vulnerability builds trust. Sharing the "launched without member input" mistake shows authentic leadership and validates the community-first approach.',
        channels: {
          instagram: {
            copy: 'I once launched a new program without asking our members what they wanted. Flop. Lesson learned: build WITH your community, not AT them. 🙌',
            visualRecommendation: 'Candid founder photo or a lighthearted meme',
            suggestedPostDate: 'Week 2, Friday',
          },
          facebook: {
            copy: 'Real talk: I made a mistake. I announced a new program without asking members first. Nobody signed up. It taught me this gym only thrives when we build it together.',
            visualRecommendation: 'Honest, relatable founder photo',
            suggestedPostDate: 'Week 3, Wednesday',
          },
          website: {
            copy: 'Building Iron Peak Together — early on I thought I had all the answers and launched a program without asking members. It failed. Now we listen, ask, and collaborate before we launch anything. Your voice shapes our decisions.',
            visualRecommendation: 'Candid founder or behind-the-scenes image',
            suggestedPostDate: 'Week 2, Tuesday',
          },
          email: {
            copy: 'Subject: Why I Listen — I designed a program I was sure members would love, didn\'t ask anyone, and got zero signups. Humbling. The lesson: we build WITH you, not at you. Every decision now starts with listening.',
            visualRecommendation: 'Personal letter-style format',
            suggestedPostDate: 'Week 3, Monday',
          },
        },
      },
      {
        title: 'Why I Started Iron Peak',
        type: 'Origin Story',
        whySelected:
          "Roots everything in purpose: a personal transformation that became a movement. Directly answers 'why should I join?' and builds emotional buy-in.",
        channels: {
          instagram: {
            copy: 'Why I started Iron Peak: my own transformation changed my life, and I wanted to build a place where transformation is the culture — all of us getting stronger, together. 🏋️',
            visualRecommendation: 'Founder photo (then vs. now) with a mission-statement overlay',
            suggestedPostDate: 'Week 3, Thursday',
          },
          facebook: {
            copy: 'The story behind Iron Peak: my fitness journey gave me confidence, health, and purpose. I built this place so people don\'t transform alone — they lift each other up. It\'s not just a gym. It\'s a movement.',
            visualRecommendation: 'Founder testimony photo or video intro',
            suggestedPostDate: 'Week 1, Thursday',
          },
          website: {
            copy: 'The Story of Iron Peak — my transformation changed my life, but I kept it private for years. Then I realized I could build a place where transformation is the CULTURE: a community committed to lifting each other up. We are not here to sell memberships. We are here to build a movement.',
            visualRecommendation: 'Founder bio section with transformation photo and mission statement',
            suggestedPostDate: 'Week 1, Wednesday',
          },
          email: {
            copy: 'Subject: Why I Built Iron Peak — my own transformation changed my life, and I realized I\'d been keeping the gift to myself. Iron Peak exists so people transform together, not alone. We\'re not a gym business. We\'re a transformation movement — and you\'re the heart of it.',
            visualRecommendation: 'Personal letter format with founder photo or video link',
            suggestedPostDate: 'Week 1, Tuesday',
          },
        },
      },
    ],
  },
}

// Derive each view's seed from HAPPY_PATH so the mock gym stays a single source of truth.
export const PREVIEW_VIEWS: PreviewView[] = [
  { id: 'welcome', label: '1 · Welcome', seed: { currentStep: 1 } },
  {
    id: 'business-info',
    label: '2 · Business Info',
    seed: { currentStep: 2, businessInfo: HAPPY_PATH.businessInfo },
  },
  {
    id: 'channel-details',
    label: '3 · Channel Details',
    seed: {
      currentStep: 3,
      businessInfo: HAPPY_PATH.businessInfo,
      channelDetails: HAPPY_PATH.channelDetails,
      preflightResults: HAPPY_PATH.preflightResults,
    },
  },
  {
    id: 'audit-loading',
    label: '4 · Story Audit (loading)',
    seed: {
      currentStep: 4,
      businessInfo: HAPPY_PATH.businessInfo,
      channelDetails: HAPPY_PATH.channelDetails,
      preflightResults: HAPPY_PATH.preflightResults,
      // no auditResults → StepAuditLoading shows the spinner (fetch suppressed by previewMode)
    },
  },
  {
    id: 'audit-results',
    label: '5 · Audit Results',
    seed: {
      currentStep: 5,
      businessInfo: HAPPY_PATH.businessInfo,
      channelDetails: HAPPY_PATH.channelDetails,
      preflightResults: HAPPY_PATH.preflightResults,
      auditResults: HAPPY_PATH.auditResults,
    },
  },
  {
    id: 'story-mine',
    label: '6 · Story Mine',
    seed: {
      currentStep: 6,
      businessInfo: HAPPY_PATH.businessInfo,
      auditResults: HAPPY_PATH.auditResults,
      storyMineAnswers: HAPPY_PATH.storyMineAnswers,
    },
  },
  {
    id: 'plan-loading',
    label: '7 · Your Plan (loading)',
    seed: {
      currentStep: 7,
      businessInfo: HAPPY_PATH.businessInfo,
      auditResults: HAPPY_PATH.auditResults,
      storyMineAnswers: HAPPY_PATH.storyMineAnswers,
      // no storyPlan → StepYourPlan shows the loading spinner (fetch suppressed)
    },
  },
  {
    id: 'plan-result',
    label: '7 · Your Plan (result)',
    seed: {
      currentStep: 7,
      businessInfo: HAPPY_PATH.businessInfo,
      auditResults: HAPPY_PATH.auditResults,
      storyMineAnswers: HAPPY_PATH.storyMineAnswers,
      storyPlan: HAPPY_PATH.storyPlan,
    },
  },
]
```

- [ ] **Step 2: Verify types**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add lib/preview/mock-data.ts
git commit -m "feat: add happy-path mock data + preview view definitions

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Hydrate `StepChannelDetails` from seeded state

The only form that doesn't pre-fill today. Makes seeded URLs + preflight badges appear (also improves real-app "Back" navigation).

**Files:**
- Modify: `components/steps/StepChannelDetails.tsx`

**Interfaces:**
- Consumes: `state.channelDetails`, `state.preflightResults` (Task 3 seeds these for view 3).
- Produces: on mount, URL inputs and email fields are populated from `channelDetails`, and `channelStates` reflects `preflightResults` (so ✓ badges / Begin-Audit button appear).

- [ ] **Step 1: Add default values to the form**

Replace the `useForm` call (line 24) so the URL and email inputs hydrate from state. Insert a `defaultValues` builder above the component and pass it in:

```tsx
function seededFormValues(cd: ChannelDetailsData | null): Record<string, string> {
  if (!cd) return {}
  const v: Record<string, string> = {}
  if (cd.instagram) v.instagram = cd.instagram.url
  if (cd.facebook) v.facebook = cd.facebook.url
  if (cd.linkedin) v.linkedin = cd.linkedin.url
  if (cd.website) v.website = cd.website.url
  if (cd.email) {
    v['email-platform'] = cd.email.platform
    v['email-subscribers'] = String(cd.email.subscriberCount)
    v['email-frequency'] = cd.email.sendFrequency
  }
  return v
}
```

Then:

```tsx
  const { register, getValues } = useForm<Record<string, string>>({
    defaultValues: seededFormValues(state.channelDetails),
  })
```

- [ ] **Step 2: Seed `channelStates` and `fallbackData` from preflight results**

Replace the two `useState` initializers (lines 25–26) with lazy initializers derived from `state.preflightResults`:

```tsx
  const [channelStates, setChannelStates] = useState<Partial<Record<Channel, ChannelState>>>(() => {
    const pf = state.preflightResults
    if (!pf) return {}
    const out: Partial<Record<Channel, ChannelState>> = {}
    for (const [c, r] of Object.entries(pf) as [Channel, PreflightStatus][]) {
      if (c === 'email') continue // email has no URL row / badge
      if (r.status === 'pass') out[c] = 'pass'
      else if (r.status === 'fallback') out[c] = 'fallback-done'
      else if (r.status === 'skipped') out[c] = 'skipped'
      else if (r.status === 'unreachable') out[c] = 'unreachable'
      else if (r.status === 'blocked') out[c] = 'blocked'
    }
    return out
  })
  const [fallbackData, setFallbackData] = useState<Partial<Record<Channel, FallbackChannelData>>>(() => {
    const pf = state.preflightResults
    if (!pf) return {}
    const out: Partial<Record<Channel, FallbackChannelData>> = {}
    for (const [c, r] of Object.entries(pf) as [Channel, PreflightStatus][]) {
      if (r.status === 'fallback') out[c as Channel] = r.data
    }
    return out
  })
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: exit 0. (`ChannelState`, `PreflightStatus`, `FallbackChannelData`, `ChannelDetailsData` are already imported in this file.)

- [ ] **Step 4: Commit**

```bash
git add components/steps/StepChannelDetails.tsx
git commit -m "feat: hydrate StepChannelDetails inputs + preflight badges from state

Also improves real-app Back navigation (entered URLs now persist).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Preview route, harness, and toolbar (gated)

The user-facing staging page.

**Files:**
- Create: `components/preview/PreviewToolbar.tsx`
- Create: `components/preview/PreviewHarness.tsx`
- Create: `app/preview/page.tsx`

**Interfaces:**
- Consumes: `PREVIEW_VIEWS` (Task 3), `WizardProvider` + `WizardContent` (Task 1).
- Produces: a route at `/preview` that 404s when `VERCEL_ENV === 'production'`.

- [ ] **Step 1: Read the Next 16 route/notFound docs**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` and `.../04-functions/not-found.md`. Confirm the `notFound()` import path (`next/navigation`) and that a `page.tsx` server component can call it at request time.

- [ ] **Step 2: Create `components/preview/PreviewToolbar.tsx`**

```tsx
'use client'

import { PREVIEW_VIEWS } from '@/lib/preview/mock-data'

export function PreviewToolbar({
  activeId,
  onSelect,
}: {
  activeId: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="sticky top-0 z-50 bg-[#1E212E] border-b-2 border-[#81A1D3] px-4 py-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#81A1D3] text-[11px] font-extrabold tracking-[1.5px] uppercase mr-2">
          Preview
        </span>
        {PREVIEW_VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => onSelect(v.id)}
            className={`text-[12px] font-bold px-2.5 py-1 rounded-md transition-colors ${
              activeId === v.id
                ? 'bg-[#81A1D3] text-[#1E212E]'
                : 'bg-white/10 text-white/70 hover:bg-white/20'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `components/preview/PreviewHarness.tsx`**

Keying the `WizardProvider` by `activeId` forces a full remount on view change, so each view gets a clean seed.

```tsx
'use client'

import { useState } from 'react'
import { WizardProvider } from '@/hooks/useWizard'
import { WizardContent } from '@/components/wizard/WizardLayout'
import { PreviewToolbar } from './PreviewToolbar'
import { PREVIEW_VIEWS } from '@/lib/preview/mock-data'

export function PreviewHarness() {
  const [activeId, setActiveId] = useState(PREVIEW_VIEWS[0].id)
  const view = PREVIEW_VIEWS.find((v) => v.id === activeId) ?? PREVIEW_VIEWS[0]

  return (
    <div className="min-h-screen flex flex-col">
      <PreviewToolbar activeId={activeId} onSelect={setActiveId} />
      <div className="flex-1">
        <WizardProvider key={activeId} initialState={view.seed} previewMode>
          <WizardContent />
        </WizardProvider>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create `app/preview/page.tsx` (gated server component)**

```tsx
import { notFound } from 'next/navigation'
import { PreviewHarness } from '@/components/preview/PreviewHarness'

export const metadata = { title: 'StoryBuildr — Preview' }

export default function PreviewPage() {
  // Available in local dev (VERCEL_ENV undefined) and preview deployments; 404 in production.
  if (process.env.VERCEL_ENV === 'production') notFound()
  return <PreviewHarness />
}
```

- [ ] **Step 5: Verify types + build**

Run: `npx tsc --noEmit` (expect exit 0)
Run: `npm run lint` (expect no errors in new files)

- [ ] **Step 6: Commit**

```bash
git add app/preview/page.tsx components/preview/PreviewHarness.tsx components/preview/PreviewToolbar.tsx
git commit -m "feat: add dev-only /preview staging harness

Toolbar switches between 8 pre-filled views; provider remounts per view.
Route 404s when VERCEL_ENV is production.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: End-to-end manual verification

Confirms the whole thing works in the running app and fires no forbidden network calls.

**Files:** none (verification only).

- [ ] **Step 1: Ensure a launch config exists, then start the dev server**

If `.claude/launch.json` does not already define a StoryBuildr dev server, create it:

```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "storybuildr-dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 3000 }
  ]
}
```

Start it (via the preview/run tooling) and open `http://localhost:3000/preview`.

- [ ] **Step 2: Click through all 8 views**

For each toolbar button confirm:
- Welcome → intro screen.
- Business Info → gym name "Iron Peak Fitness", services + channels chips selected, ICP filled.
- Channel Details → Instagram/Facebook/Website URLs populated, ✓ Accessible badges shown, email fields (Mailchimp / 340 / Weekly) filled, "Begin Audit →" visible.
- Story Audit (loading) → spinner + cycling messages.
- Audit Results → 4 channel cards with scores/narratives.
- Story Mine → first question shows Sarah pushup answer in the textarea.
- Your Plan (loading) → "Building your 30-day content plan…" spinner.
- Your Plan (result) → 4 story cards with per-channel copy; first card expanded.

- [ ] **Step 3: Confirm NO forbidden network calls**

With the browser network panel open, switch to the "Story Audit (loading)" and "Your Plan (loading)" views. Confirm **no** `POST /api/audit` and **no** `POST /api/generate` requests fire.
Expected: neither request appears.

- [ ] **Step 4: Confirm PDF still works**

On "Your Plan (result)", click "Download your full report →". Confirm a `storybuildr-report.pdf` downloads and opens (renders from seeded state).

- [ ] **Step 5: Confirm the real app is unchanged**

Open `http://localhost:3000/` — confirm a fresh wizard at step 1 with empty fields (no mock data leaking in).

- [ ] **Step 6: Confirm production gating logic**

Run: `VERCEL_ENV=production npm run build` then note that `app/preview/page.tsx` will `notFound()` at request time in production. (No commit; this step is a reasoning/confirmation check that the guard reads `VERCEL_ENV`.)

- [ ] **Step 7: Final full test + type-check**

Run: `npm test` (expect the Task 2 tests to pass)
Run: `npx tsc --noEmit` (expect exit 0)

---

## Self-Review

**Spec coverage:**
- Mock-seeded real components → Tasks 1, 3, 5 ✓
- All 7 steps + 2 loading views → Task 3 `PREVIEW_VIEWS` (8 views), verified in Task 6 ✓
- No live API calls → Task 2 guards + Task 6 Step 3 ✓
- Dev + preview, 404 in production via `VERCEL_ENV` → Task 5 Step 4, Task 6 Step 6 ✓
- Reuse real components/styles → `WizardContent` reused (Task 1/5) ✓
- Form hydration (steps 2/3/6) → StepBusinessInfo & StepStoryMine already hydrate (verified in Task 6); StepChannelDetails → Task 4 ✓
- PDF stays live → Task 6 Step 4 ✓
- `/api/preflight` not auto-fired → user-triggered only; seeded results shown via Task 4 ✓

**Placeholder scan:** No TBD/TODO; all code blocks are complete and runnable.

**Type consistency:** `WizardProvider` prop `initialState?: Partial<WizardState>` + `previewMode?: boolean`, context adds `previewMode: boolean`, `useWizard()` destructured as `{ state, dispatch, previewMode }` consistently across Tasks 1/2/5. `PreviewView { id, label, seed }` used identically in Tasks 3 and 5. `ChannelState` values (`'pass' | 'fallback-done' | 'skipped' | 'unreachable' | 'blocked'`) in Task 4 match the type defined in `StepChannelDetails.tsx`.
