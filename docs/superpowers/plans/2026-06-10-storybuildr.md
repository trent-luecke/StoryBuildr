# StoryBuildr Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build StoryBuildr — a 7-step standalone web app that audits a gym's content channels, mines stories via an interview flow, and delivers a downloadable 30-day content plan PDF.

**Architecture:** Next.js 15 App Router, single-page wizard with client-side step state (React context + useReducer), two server-side Claude calls (audit + story generation via AI SDK streamObject), Firecrawl for channel scraping, `@react-pdf/renderer` for server-side PDF export.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, `ai` + `@ai-sdk/anthropic`, `firecrawl`, `@react-pdf/renderer`, `react-hook-form` + `zod`, Jest + React Testing Library

---

## File Map

```
StoryBuildr/
├── app/
│   ├── layout.tsx                   # Root layout, fonts, metadata
│   ├── page.tsx                     # Renders WizardLayout with step routing
│   ├── globals.css                  # Tailwind base + CSS vars
│   └── api/
│       ├── preflight/route.ts       # POST: HEAD-check URLs, return per-channel status
│       ├── audit/route.ts           # POST: Firecrawl + Claude audit (streamObject)
│       ├── generate/route.ts        # POST: Claude story generation (streamObject)
│       └── pdf/route.ts             # POST: render ReportDocument, return PDF binary
├── components/
│   ├── wizard/
│   │   ├── WizardLayout.tsx         # Sidebar + content area shell
│   │   └── WizardSidebar.tsx        # Step list + progress bar
│   ├── steps/
│   │   ├── StepWelcome.tsx          # Step 1
│   │   ├── StepBusinessInfo.tsx     # Step 2
│   │   ├── StepChannelDetails.tsx   # Step 3 (includes preflight inline)
│   │   ├── StepAuditLoading.tsx     # Step 4
│   │   ├── StepAuditResults.tsx     # Step 5
│   │   ├── StepStoryMine.tsx        # Step 6
│   │   └── StepYourPlan.tsx         # Step 7
│   ├── audit/
│   │   ├── ChannelCard.tsx          # Score + narrative + doing-well/opportunities
│   │   └── ScoreBar.tsx             # Colored progress bar (blue ≥6, red <6)
│   ├── plan/
│   │   ├── StoryCard.tsx            # Expandable story card
│   │   ├── PlatformTabs.tsx         # Channel tab switcher
│   │   └── CopyBlock.tsx            # Copy text + visual rec + suggested post date
│   └── ui/
│       ├── ChipSelect.tsx           # Multi-select pill chips
│       ├── PdfCallout.tsx           # "Results saved to report" banner
│       └── FallbackChannelForm.tsx  # Self-report form for blocked channels
├── hooks/
│   └── useWizard.ts                 # Context + useReducer wizard state
├── lib/
│   ├── types.ts                     # All shared TypeScript types
│   ├── preflight.ts                 # URL HEAD-check logic
│   ├── firecrawl.ts                 # Firecrawl client wrapper
│   └── prompts/
│       └── gym-marketing.ts         # Claude system prompt
└── __tests__/
    ├── lib/preflight.test.ts
    └── components/
        ├── ChipSelect.test.tsx
        ├── ScoreBar.test.tsx
        ├── ChannelCard.test.tsx
        └── StoryCard.test.tsx
```

---

## Task 1: Project Scaffold

**Files:**
- Create: all root config files

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd /Users/trentluecke/dev/Claude-Projects/StoryBuildr
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --import-alias "@/*" \
  --yes
```

- [ ] **Step 2: Install dependencies**

```bash
npm install ai @ai-sdk/anthropic firecrawl @react-pdf/renderer react-hook-form @hookform/resolvers zod
npm install --save-dev jest jest-environment-jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/jest ts-jest
```

- [ ] **Step 3: Install shadcn/ui**

```bash
npx shadcn@latest init --defaults
npx shadcn@latest add button input label badge tabs textarea select
```

- [ ] **Step 4: Configure Jest**

Create `jest.config.ts`:
```ts
import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jsdom',
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/$1' },
}

export default createJestConfig(config)
```

Create `jest.setup.ts`:
```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add env file + .gitignore entry**

Create `.env.local`:
```
ANTHROPIC_API_KEY=
FIRECRAWL_API_KEY=
```

Append to `.gitignore`:
```
.env.local
.superpowers/
```

- [ ] **Step 6: Verify scaffold compiles**

```bash
npm run build
```
Expected: successful build with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js 15 app with dependencies and Jest"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `lib/types.ts`

- [ ] **Step 1: Write types**

```ts
// lib/types.ts

export type Channel = 'instagram' | 'facebook' | 'linkedin' | 'email' | 'website'

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface BusinessInfo {
  gymName: string
  services: string[]
  icp: string
  channels: Channel[]
}

export interface ChannelDetailsData {
  instagram?: { url: string }
  facebook?: { url: string }
  linkedin?: { url: string }
  website?: { url: string }
  email?: {
    platform: string
    subscriberCount: number
    sendFrequency: string
  }
}

export interface FallbackChannelData {
  postFrequency: string
  contentTypes: string[]
  recentPosts: string
}

export type PreflightStatus =
  | { status: 'pass' }
  | { status: 'unreachable' }
  | { status: 'blocked' }
  | { status: 'skipped' }
  | { status: 'fallback'; data: FallbackChannelData }

export interface AuditResult {
  channel: Channel
  score: number | null
  narrative: string
  doingWell: string[]
  opportunities: string[]
  selfReported: boolean
}

export interface StoryChannelCopy {
  copy: string
  visualRecommendation: string
  suggestedPostDate: string
}

export interface Story {
  title: string
  type: string
  whySelected: string
  channels: Partial<Record<Channel, StoryChannelCopy>>
}

export interface StoryPlan {
  stories: Story[]
}

export interface WizardState {
  currentStep: WizardStep
  businessInfo: BusinessInfo | null
  channelDetails: ChannelDetailsData | null
  preflightResults: Partial<Record<Channel, PreflightStatus>> | null
  auditResults: AuditResult[] | null
  storyMineAnswers: Partial<Record<number, string>>
  storyPlan: StoryPlan | null
}

export type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_BUSINESS_INFO'; data: BusinessInfo }
  | { type: 'SET_CHANNEL_DETAILS'; data: ChannelDetailsData }
  | { type: 'SET_PREFLIGHT_RESULTS'; data: Partial<Record<Channel, PreflightStatus>> }
  | { type: 'SET_AUDIT_RESULTS'; data: AuditResult[] }
  | { type: 'SET_STORY_MINE_ANSWER'; questionIndex: number; answer: string }
  | { type: 'SET_STORY_PLAN'; data: StoryPlan }
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add shared TypeScript types"
```

---

## Task 3: ChipSelect Component

**Files:**
- Create: `components/ui/ChipSelect.tsx`
- Create: `__tests__/components/ChipSelect.test.tsx`

- [ ] **Step 1: Write failing tests**

```tsx
// __tests__/components/ChipSelect.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipSelect } from '@/components/ui/ChipSelect'

const options = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'email', label: 'Email' },
]

test('renders all options as chips', () => {
  render(<ChipSelect options={options} value={[]} onChange={() => {}} />)
  expect(screen.getByText('Instagram')).toBeInTheDocument()
  expect(screen.getByText('Facebook')).toBeInTheDocument()
  expect(screen.getByText('Email')).toBeInTheDocument()
})

test('selected chips have active styling', () => {
  render(<ChipSelect options={options} value={['instagram']} onChange={() => {}} />)
  expect(screen.getByText('Instagram').closest('button')).toHaveAttribute('data-selected', 'true')
  expect(screen.getByText('Facebook').closest('button')).toHaveAttribute('data-selected', 'false')
})

test('clicking an unselected chip adds it to value', async () => {
  const onChange = jest.fn()
  render(<ChipSelect options={options} value={['instagram']} onChange={onChange} />)
  await userEvent.click(screen.getByText('Facebook'))
  expect(onChange).toHaveBeenCalledWith(['instagram', 'facebook'])
})

test('clicking a selected chip removes it from value', async () => {
  const onChange = jest.fn()
  render(<ChipSelect options={options} value={['instagram', 'facebook']} onChange={onChange} />)
  await userEvent.click(screen.getByText('Instagram'))
  expect(onChange).toHaveBeenCalledWith(['facebook'])
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/components/ChipSelect.test.tsx
```
Expected: FAIL — "Cannot find module"

- [ ] **Step 3: Implement component**

```tsx
// components/ui/ChipSelect.tsx
'use client'

interface Option {
  value: string
  label: string
}

interface ChipSelectProps {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
}

export function ChipSelect({ options, value, onChange }: ChipSelectProps) {
  function toggle(optionValue: string) {
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue))
    } else {
      onChange([...value, optionValue])
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const selected = value.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            data-selected={selected}
            onClick={() => toggle(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
              selected
                ? 'border-[#81A1D3] bg-[#f0f5fb] text-[#81A1D3]'
                : 'border-gray-200 bg-white text-[#444444] hover:border-[#81A1D3]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/components/ChipSelect.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add components/ui/ChipSelect.tsx __tests__/components/ChipSelect.test.tsx
git commit -m "feat: add ChipSelect multi-select component"
```

---

## Task 4: Wizard State Hook + Layout

**Files:**
- Create: `hooks/useWizard.ts`
- Create: `components/wizard/WizardLayout.tsx`
- Create: `components/wizard/WizardSidebar.tsx`

- [ ] **Step 1: Write failing hook tests**

```ts
// __tests__/hooks/useWizard.test.ts
import { renderHook, act } from '@testing-library/react'
import { WizardProvider, useWizard } from '@/hooks/useWizard'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WizardProvider>{children}</WizardProvider>
)

test('starts on step 1', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  expect(result.current.state.currentStep).toBe(1)
})

test('SET_STEP advances the step', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  act(() => result.current.dispatch({ type: 'SET_STEP', step: 3 }))
  expect(result.current.state.currentStep).toBe(3)
})

test('SET_BUSINESS_INFO stores business info', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  const info = { gymName: 'Iron Peak', services: ['Personal Training'], icp: 'Adults 30-50', channels: ['instagram' as const] }
  act(() => result.current.dispatch({ type: 'SET_BUSINESS_INFO', data: info }))
  expect(result.current.state.businessInfo).toEqual(info)
})

test('SET_STORY_MINE_ANSWER stores individual answer', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  act(() => result.current.dispatch({ type: 'SET_STORY_MINE_ANSWER', questionIndex: 0, answer: 'Sarah lost 22 lbs' }))
  expect(result.current.state.storyMineAnswers[0]).toBe('Sarah lost 22 lbs')
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/hooks/useWizard.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement hook**

```ts
// hooks/useWizard.ts
'use client'

import { createContext, useContext, useReducer, ReactNode } from 'react'
import { WizardState, WizardAction, WizardStep } from '@/lib/types'

const initialState: WizardState = {
  currentStep: 1,
  businessInfo: null,
  channelDetails: null,
  preflightResults: null,
  auditResults: null,
  storyMineAnswers: {},
  storyPlan: null,
}

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step }
    case 'SET_BUSINESS_INFO':
      return { ...state, businessInfo: action.data }
    case 'SET_CHANNEL_DETAILS':
      return { ...state, channelDetails: action.data }
    case 'SET_PREFLIGHT_RESULTS':
      return { ...state, preflightResults: action.data }
    case 'SET_AUDIT_RESULTS':
      return { ...state, auditResults: action.data }
    case 'SET_STORY_MINE_ANSWER':
      return {
        ...state,
        storyMineAnswers: { ...state.storyMineAnswers, [action.questionIndex]: action.answer },
      }
    case 'SET_STORY_PLAN':
      return { ...state, storyPlan: action.data }
    default:
      return state
  }
}

const WizardContext = createContext<{
  state: WizardState
  dispatch: React.Dispatch<WizardAction>
} | null>(null)

export function WizardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wizardReducer, initialState)
  return <WizardContext.Provider value={{ state, dispatch }}>{children}</WizardContext.Provider>
}

export function useWizard() {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside WizardProvider')
  return ctx
}
```

- [ ] **Step 4: Run hook tests — verify they pass**

```bash
npx jest __tests__/hooks/useWizard.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: Implement WizardSidebar**

```tsx
// components/wizard/WizardSidebar.tsx
import { WizardStep } from '@/lib/types'

const STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: 'Welcome' },
  { step: 2, label: 'Business Info' },
  { step: 3, label: 'Channel Details' },
  { step: 4, label: 'Story Audit' },
  { step: 5, label: 'Audit Results' },
  { step: 6, label: 'Story Mine' },
  { step: 7, label: 'Your Plan' },
]

interface WizardSidebarProps {
  currentStep: WizardStep
}

export function WizardSidebar({ currentStep }: WizardSidebarProps) {
  return (
    <aside className="w-[180px] shrink-0 bg-[#1E212E] flex flex-col px-4 py-5">
      <span className="text-[#81A1D3] text-[11px] font-extrabold tracking-[1.5px] uppercase mb-6">
        StoryBuildr
      </span>

      <nav className="flex flex-col gap-3 flex-1">
        {STEPS.map(({ step, label }) => {
          const done = currentStep > step
          const active = currentStep === step
          return (
            <div
              key={step}
              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 -mx-2 transition-colors ${
                active ? 'bg-white/10' : ''
              }`}
            >
              <div
                className={`w-[22px] h-[22px] rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${
                  done || active
                    ? 'bg-[#81A1D3] text-[#1E212E]'
                    : 'bg-white/10 text-[#81A1D3]'
                }`}
              >
                {done ? '✓' : step}
              </div>
              <span
                className={`text-[9px] font-${active ? 'bold' : 'normal'} ${
                  active ? 'text-white' : done ? 'text-[#81A1D3]' : 'text-white/40'
                }`}
              >
                {label}
              </span>
            </div>
          )
        })}
      </nav>

      <div className="mt-4 pt-4 border-t border-white/10">
        <p className="text-[9px] text-[#81A1D3]/50 mb-1.5">{currentStep} of 7</p>
        <div className="h-1 bg-white/10 rounded-full">
          <div
            className="h-1 bg-[#81A1D3] rounded-full transition-all"
            style={{ width: `${(currentStep / 7) * 100}%` }}
          />
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 6: Implement WizardLayout**

```tsx
// components/wizard/WizardLayout.tsx
'use client'

import { WizardProvider, useWizard } from '@/hooks/useWizard'
import { WizardSidebar } from './WizardSidebar'
import { StepWelcome } from '@/components/steps/StepWelcome'
import { StepBusinessInfo } from '@/components/steps/StepBusinessInfo'
import { StepChannelDetails } from '@/components/steps/StepChannelDetails'
import { StepAuditLoading } from '@/components/steps/StepAuditLoading'
import { StepAuditResults } from '@/components/steps/StepAuditResults'
import { StepStoryMine } from '@/components/steps/StepStoryMine'
import { StepYourPlan } from '@/components/steps/StepYourPlan'

function WizardContent() {
  const { state } = useWizard()

  const steps = {
    1: <StepWelcome />,
    2: <StepBusinessInfo />,
    3: <StepChannelDetails />,
    4: <StepAuditLoading />,
    5: <StepAuditResults />,
    6: <StepStoryMine />,
    7: <StepYourPlan />,
  }

  return (
    <div className="min-h-screen flex">
      <WizardSidebar currentStep={state.currentStep} />
      <main className="flex-1 bg-white overflow-auto">
        {steps[state.currentStep]}
      </main>
    </div>
  )
}

export function WizardLayout() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  )
}
```

- [ ] **Step 7: Wire into app/page.tsx**

```tsx
// app/page.tsx
import { WizardLayout } from '@/components/wizard/WizardLayout'

export default function Home() {
  return <WizardLayout />
}
```

- [ ] **Step 8: Commit**

```bash
git add hooks/useWizard.ts components/wizard/ app/page.tsx __tests__/hooks/
git commit -m "feat: add wizard state hook and layout shell"
```

---

## Task 5: Steps 1 & 2 — Welcome + Business Info

**Files:**
- Create: `components/steps/StepWelcome.tsx`
- Create: `components/steps/StepBusinessInfo.tsx`

- [ ] **Step 1: Implement StepWelcome**

```tsx
// components/steps/StepWelcome.tsx
'use client'

import { useWizard } from '@/hooks/useWizard'

export function StepWelcome() {
  const { dispatch } = useWizard()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-12 py-16 max-w-2xl mx-auto text-center">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-3">Free Content Audit</p>
      <h1 className="text-4xl font-extrabold text-[#1E212E] leading-tight mb-4">
        Your gym has better stories<br />than you think.
      </h1>
      <p className="text-[#444444] text-base leading-relaxed mb-8 max-w-md">
        StoryBuildr audits your current content, uncovers the stories you're sitting on,
        and builds you a 30-day content plan with copy ready to post.
      </p>
      <div className="flex gap-6 mb-10 text-sm text-[#444444]">
        <div className="flex items-center gap-2"><span className="text-[#81A1D3] font-bold">1.</span> Channel audit</div>
        <div className="flex items-center gap-2"><span className="text-[#81A1D3] font-bold">2.</span> Story mining</div>
        <div className="flex items-center gap-2"><span className="text-[#81A1D3] font-bold">3.</span> 30-day plan + PDF</div>
      </div>
      <button
        onClick={() => dispatch({ type: 'SET_STEP', step: 2 })}
        className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-8 py-3 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
      >
        Start your free audit →
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Implement StepBusinessInfo**

```tsx
// components/steps/StepBusinessInfo.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useWizard } from '@/hooks/useWizard'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { BusinessInfo, Channel } from '@/lib/types'

const schema = z.object({
  gymName: z.string().min(1, 'Required'),
  services: z.array(z.string()).min(1, 'Select at least one'),
  icp: z.string().min(1, 'Required'),
  channels: z.array(z.string()).min(1, 'Select at least one channel') as z.ZodType<Channel[]>,
})

const SERVICE_OPTIONS = [
  { value: 'Group Classes', label: 'Group Classes' },
  { value: 'Personal Training', label: 'Personal Training' },
  { value: 'Nutrition Coaching', label: 'Nutrition Coaching' },
  { value: 'Youth Programs', label: 'Youth Programs' },
  { value: 'Open Gym', label: 'Open Gym' },
  { value: 'Other', label: 'Other' },
]

const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website' },
]

export function StepBusinessInfo() {
  const { state, dispatch } = useWizard()
  const { register, control, handleSubmit, formState: { errors } } = useForm<BusinessInfo>({
    resolver: zodResolver(schema),
    defaultValues: state.businessInfo ?? { gymName: '', services: [], icp: '', channels: [] },
  })

  function onSubmit(data: BusinessInfo) {
    dispatch({ type: 'SET_BUSINESS_INFO', data })
    dispatch({ type: 'SET_STEP', step: 3 })
  }

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Step 2</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Tell us about your gym</h2>
      <p className="text-sm text-[#444444] mb-6">This helps us tailor your audit and content plan.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Gym Name</label>
          <input {...register('gymName')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. Iron Peak Fitness" />
          {errors.gymName && <p className="text-red-500 text-xs mt-1">{errors.gymName.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Services Offered</label>
          <Controller name="services" control={control} render={({ field }) => (
            <ChipSelect options={SERVICE_OPTIONS} value={field.value} onChange={field.onChange} />
          )} />
          {errors.services && <p className="text-red-500 text-xs mt-1">{errors.services.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Who is your ideal member?</label>
          <input {...register('icp')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. Adults 30–50 looking to lose weight and build consistency" />
          {errors.icp && <p className="text-red-500 text-xs mt-1">{errors.icp.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Active Channels</label>
          <Controller name="channels" control={control} render={({ field }) => (
            <ChipSelect options={CHANNEL_OPTIONS} value={field.value} onChange={field.onChange} />
          )} />
          {errors.channels && <p className="text-red-500 text-xs mt-1">{errors.channels.message}</p>}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 1 })} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
          <button type="submit" className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors">Continue →</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 3: Create stub step components (so WizardLayout compiles)**

Create `components/steps/StepChannelDetails.tsx`:
```tsx
'use client'
export function StepChannelDetails() { return <div className="p-8">Step 3 — coming soon</div> }
```

Create `components/steps/StepAuditLoading.tsx`:
```tsx
'use client'
export function StepAuditLoading() { return <div className="p-8">Step 4 — coming soon</div> }
```

Create `components/steps/StepAuditResults.tsx`:
```tsx
'use client'
export function StepAuditResults() { return <div className="p-8">Step 5 — coming soon</div> }
```

Create `components/steps/StepStoryMine.tsx`:
```tsx
'use client'
export function StepStoryMine() { return <div className="p-8">Step 6 — coming soon</div> }
```

Create `components/steps/StepYourPlan.tsx`:
```tsx
'use client'
export function StepYourPlan() { return <div className="p-8">Step 7 — coming soon</div> }
```

- [ ] **Step 4: Verify app runs**

```bash
npm run dev
```
Open http://localhost:3000 — verify Step 1 renders and clicking "Start your free audit" advances to Step 2.

- [ ] **Step 5: Commit**

```bash
git add components/steps/
git commit -m "feat: add Welcome and Business Info steps"
```

---

## Task 6: URL Preflight Logic

**Files:**
- Create: `lib/preflight.ts`
- Create: `app/api/preflight/route.ts`
- Create: `__tests__/lib/preflight.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// __tests__/lib/preflight.test.ts
import { checkUrl } from '@/lib/preflight'

// Mock global fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

afterEach(() => mockFetch.mockReset())

test('returns pass for a 200 response', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, status: 200 })
  const result = await checkUrl('https://example.com')
  expect(result.status).toBe('pass')
})

test('returns unreachable when fetch throws (timeout/DNS)', async () => {
  mockFetch.mockRejectedValueOnce(new Error('fetch failed'))
  const result = await checkUrl('https://notareal.domain')
  expect(result.status).toBe('unreachable')
})

test('returns blocked for 403 response', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 403 })
  const result = await checkUrl('https://instagram.com/somegym')
  expect(result.status).toBe('blocked')
})

test('returns unreachable for 404 response', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 404 })
  const result = await checkUrl('https://example.com/missing')
  expect(result.status).toBe('unreachable')
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/lib/preflight.test.ts
```
Expected: FAIL

- [ ] **Step 3: Implement preflight logic**

```ts
// lib/preflight.ts
import { PreflightStatus } from '@/lib/types'

export async function checkUrl(url: string): Promise<PreflightStatus> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 6000)

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StoryBuildr/1.0)' },
    })
    clearTimeout(timeout)

    if (response.ok) return { status: 'pass' }
    // 403 / 429 = bot-blocked (common for social platforms)
    if (response.status === 403 || response.status === 429) return { status: 'blocked' }
    return { status: 'unreachable' }
  } catch {
    clearTimeout(timeout)
    return { status: 'unreachable' }
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npx jest __tests__/lib/preflight.test.ts
```
Expected: PASS (4 tests)

- [ ] **Step 5: Implement API route**

```ts
// app/api/preflight/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { checkUrl } from '@/lib/preflight'
import { Channel } from '@/lib/types'

export async function POST(request: NextRequest) {
  const body: { urls: Partial<Record<Channel, string>> } = await request.json()

  const results = await Promise.all(
    Object.entries(body.urls).map(async ([channel, url]) => {
      if (!url) return [channel, { status: 'skipped' }]
      const result = await checkUrl(url)
      return [channel, result]
    })
  )

  return NextResponse.json(Object.fromEntries(results))
}
```

- [ ] **Step 6: Commit**

```bash
git add lib/preflight.ts app/api/preflight/route.ts __tests__/lib/preflight.test.ts
git commit -m "feat: add URL preflight check logic and API route"
```

---

## Task 7: FallbackChannelForm + Step 3 (Channel Details)

**Files:**
- Create: `components/ui/FallbackChannelForm.tsx`
- Create: `components/ui/PdfCallout.tsx`
- Implement: `components/steps/StepChannelDetails.tsx` (replace stub)

- [ ] **Step 1: Implement FallbackChannelForm**

```tsx
// components/ui/FallbackChannelForm.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { ChipSelect } from './ChipSelect'
import { FallbackChannelData } from '@/lib/types'

const CONTENT_TYPE_OPTIONS = [
  { value: 'promos', label: 'Promotions & announcements' },
  { value: 'tips', label: 'Workout tips' },
  { value: 'spotlights', label: 'Member spotlights' },
  { value: 'bts', label: 'Behind-the-scenes' },
  { value: 'motivation', label: 'Motivational content' },
]

const FREQUENCY_OPTIONS = ['Daily', 'A few times a week', 'Weekly', 'Rarely']

interface FallbackChannelFormProps {
  channelLabel: string
  onSubmit: (data: FallbackChannelData) => void
  onSkip: () => void
}

export function FallbackChannelForm({ channelLabel, onSubmit, onSkip }: FallbackChannelFormProps) {
  const { register, control, handleSubmit } = useForm<FallbackChannelData>({
    defaultValues: { postFrequency: '', contentTypes: [], recentPosts: '' },
  })

  return (
    <div className="bg-[#f0f5fb] border border-[#81A1D3] rounded-lg p-4 mt-3">
      <p className="text-xs font-bold text-[#1E212E] mb-0.5">
        {channelLabel} often restricts automated access — no big deal, we can do this a different way.
      </p>
      <p className="text-xs text-[#444444] mb-4">Tell us a bit about your {channelLabel} presence and we'll include it in your audit.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">How often do you post?</label>
          <select {...register('postFrequency', { required: true })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
            <option value="">Select frequency</option>
            {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">What types of content do you mostly share?</label>
          <Controller name="contentTypes" control={control} render={({ field }) => (
            <ChipSelect options={CONTENT_TYPE_OPTIONS} value={field.value} onChange={field.onChange} />
          )} />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">Describe 2–3 recent posts</label>
          <textarea {...register('recentPosts', { required: true })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] resize-none focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. Before/after transformation photo for a member, a class schedule graphic, a motivational quote..." />
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onSkip} className="text-xs text-[#444444]/60 hover:text-[#444444] px-3 py-1.5">Skip this channel</button>
          <button type="submit" className="bg-[#81A1D3] text-[#1E212E] font-bold px-4 py-1.5 rounded-lg text-xs hover:bg-[#6b8fbf] transition-colors">Use this info →</button>
        </div>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Implement PdfCallout**

```tsx
// components/ui/PdfCallout.tsx
export function PdfCallout() {
  return (
    <div className="flex items-center gap-3 bg-[#f0f5fb] border border-[#81A1D3] rounded-lg px-4 py-3 mb-5">
      <span className="text-xl shrink-0">📄</span>
      <div>
        <p className="text-xs font-bold text-[#1E212E] mb-0.5">These results are saved to your report</p>
        <p className="text-xs text-[#444444] leading-relaxed">
          Finish the full workflow and you'll get everything — audit results, your stories, and your 30-day content plan — in a downloadable PDF.
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Implement StepChannelDetails**

```tsx
// components/steps/StepChannelDetails.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useWizard } from '@/hooks/useWizard'
import { FallbackChannelForm } from '@/components/ui/FallbackChannelForm'
import { Channel, ChannelDetailsData, PreflightStatus, FallbackChannelData } from '@/lib/types'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

type ChannelState = 'idle' | 'checking' | 'pass' | 'unreachable' | 'blocked' | 'skipped' | 'fallback-done'

export function StepChannelDetails() {
  const { state, dispatch } = useWizard()
  const channels = state.businessInfo?.channels ?? []
  const socialChannels = channels.filter((c) => c !== 'email' && c !== 'website')
  const hasWebsite = channels.includes('website')
  const hasEmail = channels.includes('email')

  const { register, getValues } = useForm<Record<string, string>>()
  const [channelStates, setChannelStates] = useState<Partial<Record<Channel, ChannelState>>>({})
  const [fallbackData, setFallbackData] = useState<Partial<Record<Channel, FallbackChannelData>>>({})
  const [isChecking, setIsChecking] = useState(false)

  function setChannelState(channel: Channel, s: ChannelState) {
    setChannelStates((prev) => ({ ...prev, [channel]: s }))
  }

  async function runPreflight() {
    setIsChecking(true)
    const vals = getValues()
    const urls: Partial<Record<Channel, string>> = {}
    if (hasWebsite) urls.website = vals.website
    socialChannels.forEach((c) => { urls[c] = vals[c] })

    const res = await fetch('/api/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls }),
    })
    const results: Partial<Record<Channel, PreflightStatus>> = await res.json()

    const newStates: Partial<Record<Channel, ChannelState>> = {}
    for (const [channel, result] of Object.entries(results) as [Channel, PreflightStatus][]) {
      newStates[channel] = result.status === 'pass' ? 'pass' : result.status
    }
    setChannelStates(newStates)
    setIsChecking(false)

    const allResolved = channels
      .filter((c) => c !== 'email')
      .every((c) => {
        const s = newStates[c]
        return s === 'pass' || s === 'skipped' || s === 'fallback-done'
      })

    if (allResolved) proceed(newStates)
  }

  function handleFallbackSubmit(channel: Channel, data: FallbackChannelData) {
    setFallbackData((prev) => ({ ...prev, [channel]: data }))
    setChannelState(channel, 'fallback-done')
  }

  function handleSkip(channel: Channel) {
    setChannelState(channel, 'skipped')
  }

  function proceed(states: Partial<Record<Channel, ChannelState>>) {
    const vals = getValues()
    const channelDetails: ChannelDetailsData = {}
    socialChannels.forEach((c) => {
      const s = states[c]
      if (s !== 'skipped') (channelDetails as any)[c] = { url: vals[c] }
    })
    if (hasWebsite && states.website !== 'skipped') channelDetails.website = { url: vals.website }
    if (hasEmail) {
      channelDetails.email = {
        platform: vals['email-platform'],
        subscriberCount: parseInt(vals['email-subscribers'] || '0'),
        sendFrequency: vals['email-frequency'],
      }
    }

    const preflightResults: Partial<Record<Channel, PreflightStatus>> = {}
    for (const c of channels) {
      const s = states[c]
      if (s === 'pass') preflightResults[c] = { status: 'pass' }
      else if (s === 'skipped') preflightResults[c] = { status: 'skipped' }
      else if (s === 'fallback-done') preflightResults[c] = { status: 'fallback', data: fallbackData[c]! }
      else if (c === 'email') preflightResults[c] = { status: 'pass' }
    }

    dispatch({ type: 'SET_CHANNEL_DETAILS', data: channelDetails })
    dispatch({ type: 'SET_PREFLIGHT_RESULTS', data: preflightResults })
    dispatch({ type: 'SET_STEP', step: 4 })
  }

  const nonEmailChannels = channels.filter((c) => c !== 'email')
  const allResolved = nonEmailChannels.every((c) => {
    const s = channelStates[c]
    return s === 'pass' || s === 'skipped' || s === 'fallback-done'
  })
  const anyChecked = Object.keys(channelStates).length > 0

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Step 3</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your channel details</h2>
      <p className="text-sm text-[#444444] mb-6">We'll use these to audit your current content.</p>

      <div className="flex flex-col gap-4">
        {[...socialChannels, ...(hasWebsite ? ['website' as Channel] : [])].map((channel) => {
          const s = channelStates[channel]
          return (
            <div key={channel}>
              <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">
                {CHANNEL_LABELS[channel]} {channel !== 'website' ? 'URL or handle' : 'URL'}
                {s === 'pass' && <span className="ml-2 text-green-600 normal-case font-normal">✓ Accessible</span>}
                {s === 'unreachable' && <span className="ml-2 text-red-500 normal-case font-normal">⚠ Unreachable</span>}
                {s === 'skipped' && <span className="ml-2 text-[#444444]/50 normal-case font-normal">Skipped</span>}
              </label>
              <input
                {...register(channel)}
                disabled={s === 'skipped' || s === 'fallback-done'}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3] disabled:bg-gray-50 disabled:text-gray-400"
                placeholder={channel === 'website' ? 'https://yourgym.com' : `https://${channel}.com/yourgym`}
              />
              {s === 'unreachable' && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-700 mb-2">We had trouble reaching this URL. You can update it and try again, or skip this channel.</p>
                  <button type="button" onClick={() => handleSkip(channel)} className="text-xs text-[#444444]/60 hover:text-[#444444]">Skip this channel</button>
                </div>
              )}
              {s === 'blocked' && (
                <FallbackChannelForm
                  channelLabel={CHANNEL_LABELS[channel]}
                  onSubmit={(data) => handleFallbackSubmit(channel, data)}
                  onSkip={() => handleSkip(channel)}
                />
              )}
            </div>
          )
        })}

        {hasEmail && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-3">Email List</p>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-[#444444] mb-1">Platform</label>
                <select {...register('email-platform')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
                  <option value="">Select platform</option>
                  {['Mailchimp', 'Klaviyo', 'ConvertKit', 'Other'].map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-[#444444] mb-1">Subscriber count</label>
                  <input type="number" {...register('email-subscribers')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. 340" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-[#444444] mb-1">Send frequency</label>
                  <select {...register('email-frequency')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
                    <option value="">Select</option>
                    {['Weekly', 'Bi-weekly', 'Monthly', 'Rarely'].map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between items-center mt-6">
        <button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
        {!anyChecked ? (
          <button type="button" onClick={runPreflight} disabled={isChecking} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors">
            {isChecking ? 'Checking…' : 'Check & Continue →'}
          </button>
        ) : allResolved ? (
          <button type="button" onClick={() => proceed(channelStates)} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors">Begin Audit →</button>
        ) : (
          <button type="button" onClick={runPreflight} disabled={isChecking} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors">
            {isChecking ? 'Checking…' : 'Re-check →'}
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/FallbackChannelForm.tsx components/ui/PdfCallout.tsx components/steps/StepChannelDetails.tsx
git commit -m "feat: add Channel Details step with URL preflight and fallback form"
```

---

## Task 8: Claude System Prompt

**Files:**
- Create: `lib/prompts/gym-marketing.ts`

- [ ] **Step 1: Write the system prompt**

```ts
// lib/prompts/gym-marketing.ts

export const GYM_MARKETING_SYSTEM_PROMPT = `
You are an expert gym content marketing strategist. You help independent gym owners — CrossFit boxes, boutique fitness studios, personal training gyms, and traditional health clubs — create authentic content that attracts new members and retains existing ones.

## Gym Owner ICP
The typical independent gym owner you're helping:
- Runs a facility of 50–500 members
- Is the face of the brand; members chose the gym partly because of them
- Has almost no time for marketing; content either doesn't get made or is low-quality
- Believes their gym is "boring" or that "nobody cares about this stuff"
- Is deeply proud of their community but rarely talks about it publicly
- Knows their members' names and stories but never thinks to share them

## What Good Gym Content Looks Like
Strong gym content is:
- **Specific** — "Sarah lost 22 lbs in 90 days" not "our members get results"
- **Authentic** — written in the owner's voice, not a corporate brand voice
- **Story-driven** — has a protagonist, a challenge, and a resolution or insight
- **Community-centered** — celebrates members, coaches, and the gym culture
- **Honest** — includes struggle, failure, and vulnerability, not just wins

Weak gym content is:
- Promotional only (class schedules, pricing, promotions)
- Generic motivational quotes
- Stock fitness photography with no connection to the real gym
- First-person boasting with no member-centric perspective

## Content Scoring Rubric (1–10)
Score each channel on:
- **Authenticity** (0–2): Does it sound like a real person? Is it the owner's genuine voice?
- **Specificity** (0–2): Are there real names, numbers, dates, and details — or is it vague?
- **Consistency** (0–2): Is there a regular posting cadence? Is the content type consistent?
- **Story presence** (0–2): Is there narrative — a before/after, a challenge, a moment of truth?
- **CTA quality** (0–2): Is there a clear next step for someone who isn't already a member?

Total = sum of above (0–10). 6+ = doing reasonably well. 5 or below = significant story gap.

## Channel Benchmarks
- **Instagram:** Best for transformation stories, behind-the-scenes, member spotlights. 3–5 posts/week is healthy. Reels outperform static. No CTAs = missed opportunity.
- **Facebook:** Best for longer-form stories, event announcements, community engagement. Less reach than Instagram but high loyalty. Event pages convert well.
- **LinkedIn:** Best for owner thought leadership, B2B adjacent content (e.g. corporate wellness partnerships). Often ignored by gym owners — if present, treat it seriously.
- **Website:** Homepage should have at least one member success story visible above the fold. About page should read like a founder story, not a feature list.
- **Email:** Most underutilized channel for gyms. Direct line to members. Best for longer member stories, monthly community roundups, and retention-focused content.

## Story Narrative Frameworks
Use these to identify and frame stories from owner interview answers:
1. **Transformation Arc** — member before state → catalyst → specific changes → outcome. Highest converting for non-members.
2. **Day in the Life** — behind-the-scenes of a typical morning, coach, or member. Builds community identity.
3. **Origin Story** — why the owner started the gym. The real reason, not the PR answer. Builds trust.
4. **Mistake / Lesson** — something the owner got wrong and learned from. Rare in gym content — highly memorable.
5. **Philosophy** — what the gym believes that most gyms don't. Attracts aligned members and repels misaligned ones.

## Platform Copy Conventions
- **Instagram caption:** Open with a hook (first 125 characters before "more"). Use line breaks. End with a soft CTA. 3–5 hashtags max.
- **Facebook post:** Can be longer. Open with the story. No hashtags needed. CTA should drive to DM or link.
- **Email:** Subject line is everything. Body should read like a letter — personal, direct, conversational. One CTA only.
- **Website copy:** Use the member's name. Keep testimonials under 50 words. Pair with a photo if possible.
- **LinkedIn:** Professional but personal. First-person owner voice. Longer paragraphs okay. End with a question to drive comments.

## 30-Day Posting Cadence Guidelines
Across all active channels, aim for:
- 3–4 story posts per week across all platforms combined
- Distribute: transformation story on Tuesday or Wednesday (highest mid-week engagement)
- Behind-the-scenes on Monday (sets community tone for the week)
- Owner philosophy or origin on Thursday or Friday (thought leadership peak)
- Member spotlight on the weekend (community engagement is highest Saturday)
- Email: bi-weekly, anchored to a story from the week's content
`.trim()
```

- [ ] **Step 2: Commit**

```bash
git add lib/prompts/gym-marketing.ts
git commit -m "feat: add Claude gym marketing system prompt"
```

---

## Task 9: Firecrawl Client + Audit API Route

**Files:**
- Create: `lib/firecrawl.ts`
- Create: `app/api/audit/route.ts`

- [ ] **Step 1: Implement Firecrawl wrapper**

```ts
// lib/firecrawl.ts
import FirecrawlApp from 'firecrawl'
import { Channel } from '@/lib/types'

const firecrawl = new FirecrawlApp({ apiKey: process.env.FIRECRAWL_API_KEY! })

interface ScrapeResult {
  channel: Channel
  content: string
  selfReported: boolean
}

export async function scrapeChannel(channel: Channel, url: string): Promise<ScrapeResult> {
  try {
    const result = await firecrawl.scrapeUrl(url, {
      formats: ['markdown'],
      onlyMainContent: true,
      timeout: 15000,
    })

    if (!result.success || !result.markdown || result.markdown.trim().length < 100) {
      return { channel, content: 'scrape_unavailable', selfReported: false }
    }

    // Truncate to 3000 chars to keep prompt size manageable
    return { channel, content: result.markdown.slice(0, 3000), selfReported: false }
  } catch {
    return { channel, content: 'scrape_unavailable', selfReported: false }
  }
}

export async function scrapeChannels(
  urls: Partial<Record<Channel, string>>
): Promise<ScrapeResult[]> {
  return Promise.all(
    Object.entries(urls).map(([channel, url]) =>
      scrapeChannel(channel as Channel, url!)
    )
  )
}
```

- [ ] **Step 2: Implement audit API route**

```ts
// app/api/audit/route.ts
import { NextRequest } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { streamObject } from 'ai'
import { z } from 'zod'
import { scrapeChannels } from '@/lib/firecrawl'
import { GYM_MARKETING_SYSTEM_PROMPT } from '@/lib/prompts/gym-marketing'
import { Channel, ChannelDetailsData, PreflightStatus, FallbackChannelData } from '@/lib/types'

const auditResultSchema = z.object({
  channel: z.string(),
  score: z.number().nullable(),
  narrative: z.string(),
  doingWell: z.array(z.string()),
  opportunities: z.array(z.string()),
  selfReported: z.boolean(),
})

const auditResponseSchema = z.object({
  channels: z.array(auditResultSchema),
})

export async function POST(request: NextRequest) {
  const body: {
    channelDetails: ChannelDetailsData
    preflightResults: Partial<Record<Channel, PreflightStatus>>
    businessInfo: { gymName: string; icp: string; channels: Channel[] }
  } = await request.json()

  // Collect URLs for scraping
  const scrapableUrls: Partial<Record<Channel, string>> = {}
  for (const channel of body.businessInfo.channels) {
    const preflight = body.preflightResults[channel]
    if (!preflight || preflight.status === 'skipped') continue
    if (preflight.status === 'pass') {
      const details = (body.channelDetails as any)[channel]
      if (details?.url) scrapableUrls[channel] = details.url
    }
  }

  const scraped = await scrapeChannels(scrapableUrls)

  // Build channel summaries for the prompt
  const channelSummaries = body.businessInfo.channels.map((channel) => {
    const preflight = body.preflightResults[channel]
    if (preflight?.status === 'skipped') {
      return `## ${channel} (SKIPPED — exclude from audit)`
    }
    if (preflight?.status === 'fallback') {
      const fb = preflight.data as FallbackChannelData
      return `## ${channel} (Self-reported — no score, use "Self-reported" badge)
Post frequency: ${fb.postFrequency}
Content types: ${fb.contentTypes.join(', ')}
Recent posts described: ${fb.recentPosts}`
    }
    if (channel === 'email') {
      const em = body.channelDetails.email
      return `## email (Self-reported)
Platform: ${em?.platform ?? 'unknown'}
Subscribers: ${em?.subscriberCount ?? 'unknown'}
Send frequency: ${em?.sendFrequency ?? 'unknown'}`
    }
    const scrapeResult = scraped.find((s) => s.channel === channel)
    if (!scrapeResult || scrapeResult.content === 'scrape_unavailable') {
      return `## ${channel} (Scrape unavailable — note this in narrative, do not score)`
    }
    return `## ${channel}\n${scrapeResult.content}`
  }).join('\n\n')

  const prompt = `
Gym: ${body.businessInfo.gymName}
Their ideal member: ${body.businessInfo.icp}
Active channels: ${body.businessInfo.channels.join(', ')}

Analyze each channel below and return a structured audit result for each.
For self-reported channels: set score to null and selfReported to true.
For skipped channels: omit them entirely.
For unavailable scrapes: set score to null, explain in narrative, selfReported to false.

${channelSummaries}
`.trim()

  const result = streamObject({
    model: anthropic('claude-sonnet-4-6'),
    system: GYM_MARKETING_SYSTEM_PROMPT,
    prompt,
    schema: auditResponseSchema,
  })

  return result.toTextStreamResponse()
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/firecrawl.ts app/api/audit/route.ts
git commit -m "feat: add Firecrawl client and audit API route with Claude streaming"
```

---

## Task 10: ScoreBar + ChannelCard Components

**Files:**
- Create: `components/audit/ScoreBar.tsx`
- Create: `components/audit/ChannelCard.tsx`
- Create: `__tests__/components/ScoreBar.test.tsx`
- Create: `__tests__/components/ChannelCard.test.tsx`

- [ ] **Step 1: Write ScoreBar tests**

```tsx
// __tests__/components/ScoreBar.test.tsx
import { render } from '@testing-library/react'
import { ScoreBar } from '@/components/audit/ScoreBar'

test('renders score text', () => {
  const { getByText } = render(<ScoreBar score={7} />)
  expect(getByText('7')).toBeInTheDocument()
  expect(getByText('/10')).toBeInTheDocument()
})

test('uses accent color for score >= 6', () => {
  const { container } = render(<ScoreBar score={6} />)
  const bar = container.querySelector('[data-testid="score-bar-fill"]')
  expect(bar).toHaveClass('bg-[#81A1D3]')
})

test('uses red color for score < 6', () => {
  const { container } = render(<ScoreBar score={4} />)
  const bar = container.querySelector('[data-testid="score-bar-fill"]')
  expect(bar).toHaveClass('bg-[#f87171]')
})

test('renders null score as self-reported badge', () => {
  const { getByText } = render(<ScoreBar score={null} />)
  expect(getByText('Self-reported')).toBeInTheDocument()
})
```

- [ ] **Step 2: Implement ScoreBar**

```tsx
// components/audit/ScoreBar.tsx
interface ScoreBProps { score: number | null }

export function ScoreBar({ score }: ScoreBProps) {
  if (score === null) {
    return (
      <span className="text-xs text-[#81A1D3] font-semibold bg-[#f0f5fb] px-2.5 py-1 rounded-full">
        Self-reported
      </span>
    )
  }

  const pct = (score / 10) * 100
  const color = score >= 6 ? 'bg-[#81A1D3]' : 'bg-[#f87171]'

  return (
    <div className="text-right">
      <div className="flex items-baseline gap-0.5 justify-end">
        <span className="text-2xl font-extrabold text-[#1E212E] leading-none">{score}</span>
        <span className="text-xs text-[#444444]">/10</span>
      </div>
      <div className="w-20 h-1 bg-gray-100 rounded-full mt-1">
        <div
          data-testid="score-bar-fill"
          className={`h-1 rounded-full transition-all ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run ScoreBar tests**

```bash
npx jest __tests__/components/ScoreBar.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 4: Write ChannelCard tests**

```tsx
// __tests__/components/ChannelCard.test.tsx
import { render, screen } from '@testing-library/react'
import { ChannelCard } from '@/components/audit/ChannelCard'
import { AuditResult } from '@/lib/types'

const mockResult: AuditResult = {
  channel: 'instagram',
  score: 4,
  narrative: 'You post consistently but content is 100% promotional.',
  doingWell: ['Posts 3x/week', 'Good use of Reels'],
  opportunities: ['No member stories', 'No behind-the-scenes content'],
  selfReported: false,
}

test('renders channel name', () => {
  render(<ChannelCard result={mockResult} />)
  expect(screen.getByText('instagram')).toBeInTheDocument()
})

test('renders narrative text', () => {
  render(<ChannelCard result={mockResult} />)
  expect(screen.getByText(mockResult.narrative)).toBeInTheDocument()
})

test('renders all doingWell items', () => {
  render(<ChannelCard result={mockResult} />)
  expect(screen.getByText('Posts 3x/week')).toBeInTheDocument()
  expect(screen.getByText('Good use of Reels')).toBeInTheDocument()
})

test('renders all opportunity items', () => {
  render(<ChannelCard result={mockResult} />)
  expect(screen.getByText('No member stories')).toBeInTheDocument()
})
```

- [ ] **Step 5: Implement ChannelCard**

```tsx
// components/audit/ChannelCard.tsx
import { AuditResult, Channel } from '@/lib/types'
import { ScoreBar } from './ScoreBar'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

interface ChannelCardProps { result: AuditResult }

export function ChannelCard({ result }: ChannelCardProps) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 mb-3">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-[#444444] uppercase tracking-wide">
            {CHANNEL_LABELS[result.channel] ?? result.channel}
          </p>
        </div>
        <ScoreBar score={result.score} />
      </div>

      <p className="text-sm text-[#444444] leading-relaxed mb-3">{result.narrative}</p>

      <div className="flex gap-2">
        <div className="flex-1 bg-[#f0f5fb] border-l-[3px] border-[#81A1D3] rounded-r-lg px-3 py-2">
          <p className="text-xs font-bold text-[#1E212E] mb-1.5">Doing well</p>
          <ul className="flex flex-col gap-1">
            {result.doingWell.map((item, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-[#1E212E]">
                <span className="text-[#81A1D3] shrink-0">✓</span>{item}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex-1 bg-red-50 border-l-[3px] border-[#f87171] rounded-r-lg px-3 py-2">
          <p className="text-xs font-bold text-[#1E212E] mb-1.5">Opportunities</p>
          <ul className="flex flex-col gap-1">
            {result.opportunities.map((item, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-[#1E212E]">
                <span className="text-[#f87171] shrink-0">→</span>{item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run ChannelCard tests**

```bash
npx jest __tests__/components/ChannelCard.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add components/audit/ __tests__/components/ScoreBar.test.tsx __tests__/components/ChannelCard.test.tsx
git commit -m "feat: add ScoreBar and ChannelCard audit components"
```

---

## Task 11: Steps 4 & 5 — Audit Loading + Results

**Files:**
- Implement: `components/steps/StepAuditLoading.tsx`
- Implement: `components/steps/StepAuditResults.tsx`

- [ ] **Step 1: Implement StepAuditLoading**

This step fires the audit API call and transitions to Step 5 when complete.

```tsx
// components/steps/StepAuditLoading.tsx
'use client'

import { useEffect, useState } from 'react'
import { useWizard } from '@/hooks/useWizard'
import { AuditResult } from '@/lib/types'

const MESSAGES = [
  'Reading your website…',
  'Scanning your social presence…',
  'Identifying story gaps…',
  'Scoring your content channels…',
  'Putting together your results…',
]

export function StepAuditLoading() {
  const { state, dispatch } = useWizard()
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length)
    }, 2200)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function runAudit() {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelDetails: state.channelDetails,
          preflightResults: state.preflightResults,
          businessInfo: {
            gymName: state.businessInfo!.gymName,
            icp: state.businessInfo!.icp,
            channels: state.businessInfo!.channels,
          },
        }),
      })

      // Collect streamed object
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let raw = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        raw += decoder.decode(value)
      }

      // Parse final JSON from stream (AI SDK format: last complete JSON line)
      const lines = raw.split('\n').filter(Boolean)
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i])
          if (parsed.channels) {
            dispatch({ type: 'SET_AUDIT_RESULTS', data: parsed.channels as AuditResult[] })
            dispatch({ type: 'SET_STEP', step: 5 })
            return
          }
        } catch { /* skip non-JSON lines */ }
      }
    }

    runAudit()
  }, [])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-10 h-10 border-4 border-[#81A1D3] border-t-transparent rounded-full animate-spin mb-6" />
      <p className="text-sm font-medium text-[#1E212E] mb-1">{MESSAGES[msgIndex]}</p>
      <p className="text-xs text-[#444444]/60">This usually takes 15–30 seconds</p>
    </div>
  )
}
```

- [ ] **Step 2: Implement StepAuditResults**

```tsx
// components/steps/StepAuditResults.tsx
'use client'

import { useWizard } from '@/hooks/useWizard'
import { ChannelCard } from '@/components/audit/ChannelCard'
import { PdfCallout } from '@/components/ui/PdfCallout'

export function StepAuditResults() {
  const { state, dispatch } = useWizard()
  const results = state.auditResults ?? []
  const gymName = state.businessInfo?.gymName ?? 'your gym'

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Audit Results</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Here's what we found, {gymName}</h2>
      <p className="text-sm text-[#444444] mb-5">You're showing up — but are you telling stories? Here's the breakdown.</p>

      <PdfCallout />

      {results.map((result) => (
        <ChannelCard key={result.channel} result={result} />
      ))}

      <button
        onClick={() => dispatch({ type: 'SET_STEP', step: 6 })}
        className="w-full bg-[#81A1D3] text-[#1E212E] font-extrabold py-3 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors mt-2"
      >
        Let's find your stories →
      </button>
    </div>
  )
}
```

- [ ] **Step 3: Verify audit flow end-to-end**

With `FIRECRAWL_API_KEY` and `ANTHROPIC_API_KEY` set in `.env.local`:
```bash
npm run dev
```
Complete Steps 1–4 with a real gym URL. Verify Step 5 shows channel cards with scores, narratives, and callouts.

- [ ] **Step 4: Commit**

```bash
git add components/steps/StepAuditLoading.tsx components/steps/StepAuditResults.tsx
git commit -m "feat: add audit loading and results steps"
```

---

## Task 12: Step 6 — Story Mine

**Files:**
- Implement: `components/steps/StepStoryMine.tsx`

- [ ] **Step 1: Implement StepStoryMine**

```tsx
// components/steps/StepStoryMine.tsx
'use client'

import { useState } from 'react'
import { useWizard } from '@/hooks/useWizard'

const QUESTIONS = [
  'Describe a member win from the last 30 days — what changed for them?',
  'What does a typical morning look like at your gym? Walk us through it.',
  'Tell us about a mistake you made as an owner and what you learned.',
  'Why did you start this gym — what\'s the real reason, not the elevator pitch?',
  'Who is your "typical" member, and what were they afraid of before they joined?',
  'What does your gym do that most gyms don\'t?',
  'Describe your coaching philosophy in one or two sentences.',
  'What\'s a moment in the last 6 months that made you proud?',
  'If a new member could only read one thing about your gym before joining, what would you want it to say?',
  'What does your gym look like on its best day?',
]

export function StepStoryMine() {
  const { state, dispatch } = useWizard()
  const [currentQ, setCurrentQ] = useState(0)
  const [answer, setAnswer] = useState(state.storyMineAnswers[currentQ] ?? '')

  function saveAndAdvance() {
    if (answer.trim()) {
      dispatch({ type: 'SET_STORY_MINE_ANSWER', questionIndex: currentQ, answer: answer.trim() })
    }
    if (currentQ < QUESTIONS.length - 1) {
      const next = currentQ + 1
      setCurrentQ(next)
      setAnswer(state.storyMineAnswers[next] ?? '')
    } else {
      dispatch({ type: 'SET_STEP', step: 7 })
    }
  }

  function skip() {
    if (currentQ < QUESTIONS.length - 1) {
      const next = currentQ + 1
      setCurrentQ(next)
      setAnswer(state.storyMineAnswers[next] ?? '')
    } else {
      dispatch({ type: 'SET_STEP', step: 7 })
    }
  }

  const progress = ((currentQ) / QUESTIONS.length) * 100

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Story Mine</p>
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1 bg-gray-100 rounded-full">
          <div className="h-1 bg-[#81A1D3] rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs text-[#444444]/60 shrink-0">{currentQ + 1} / {QUESTIONS.length}</span>
      </div>

      <h2 className="text-xl font-extrabold text-[#1E212E] leading-snug mb-2">
        {QUESTIONS[currentQ]}
      </h2>
      <p className="text-xs text-[#444444]/60 mb-4">Take your time — there's no wrong answer. Skip if you'd rather move on.</p>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        rows={6}
        className="w-full border border-gray-200 rounded-lg px-3 py-3 text-sm text-[#444444] resize-none focus:outline-none focus:border-[#81A1D3] mb-4"
        placeholder="Write as much or as little as you'd like…"
      />

      <div className="flex justify-between items-center">
        <button type="button" onClick={skip} className="text-sm text-[#444444]/50 hover:text-[#444444]">
          Skip →
        </button>
        <button
          type="button"
          onClick={saveAndAdvance}
          className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors"
        >
          {currentQ < QUESTIONS.length - 1 ? 'Next question →' : 'Build my plan →'}
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/steps/StepStoryMine.tsx
git commit -m "feat: add Story Mine step with one-question-at-a-time flow"
```

---

## Task 13: Story Generation API Route

**Files:**
- Create: `app/api/generate/route.ts`

- [ ] **Step 1: Implement generate route**

```ts
// app/api/generate/route.ts
import { NextRequest } from 'next/server'
import { anthropic } from '@ai-sdk/anthropic'
import { streamObject } from 'ai'
import { z } from 'zod'
import { GYM_MARKETING_SYSTEM_PROMPT } from '@/lib/prompts/gym-marketing'
import { AuditResult, Channel } from '@/lib/types'

const storyChannelSchema = z.object({
  copy: z.string(),
  visualRecommendation: z.string(),
  suggestedPostDate: z.string(),
})

const storySchema = z.object({
  title: z.string(),
  type: z.string(),
  whySelected: z.string(),
  channels: z.record(storyChannelSchema),
})

const generateResponseSchema = z.object({
  stories: z.array(storySchema),
})

export async function POST(request: NextRequest) {
  const body: {
    businessInfo: { gymName: string; channels: Channel[]; services: string[]; icp: string }
    auditResults: AuditResult[]
    storyMineAnswers: Partial<Record<number, string>>
  } = await request.json()

  const answersText = Object.entries(body.storyMineAnswers)
    .filter(([, v]) => v)
    .map(([i, v]) => `Q${parseInt(i) + 1}: ${v}`)
    .join('\n\n')

  const auditSummary = body.auditResults
    .map((r) => `${r.channel}: score ${r.score ?? 'self-reported'} — opportunities: ${r.opportunities.join(', ')}`)
    .join('\n')

  const prompt = `
Gym: ${body.businessInfo.gymName}
Services: ${body.businessInfo.services.join(', ')}
Ideal member: ${body.businessInfo.icp}
Active channels: ${body.businessInfo.channels.join(', ')}

## Audit Summary
${auditSummary}

## Owner Interview Answers
${answersText}

Based on the interview answers and audit findings, select the 4 most compelling stories and produce a 30-day content plan.

For each story:
- Give it a title and type (e.g. "Member Transformation", "Day in the Life", "Origin Story", "Mistake/Lesson", "Philosophy")
- Explain in 2-3 sentences why you selected it (whySelected)
- For EACH active channel (${body.businessInfo.channels.join(', ')}), generate:
  - Platform-appropriate copy (follow the platform conventions in your instructions)
  - A specific visual asset recommendation
  - A suggested post date within a 30-day calendar (e.g. "Week 1, Wednesday")

Only generate channel copy for the active channels listed above. Do not generate copy for unlisted channels.
`.trim()

  const result = streamObject({
    model: anthropic('claude-sonnet-4-6'),
    system: GYM_MARKETING_SYSTEM_PROMPT,
    prompt,
    schema: generateResponseSchema,
  })

  return result.toTextStreamResponse()
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/generate/route.ts
git commit -m "feat: add story generation API route with Claude streaming"
```

---

## Task 14: StoryCard + PlatformTabs Components

**Files:**
- Create: `components/plan/CopyBlock.tsx`
- Create: `components/plan/PlatformTabs.tsx`
- Create: `components/plan/StoryCard.tsx`
- Create: `__tests__/components/StoryCard.test.tsx`

- [ ] **Step 1: Write StoryCard tests**

```tsx
// __tests__/components/StoryCard.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StoryCard } from '@/components/plan/StoryCard'
import { Story } from '@/lib/types'

const mockStory: Story = {
  title: 'Sarah Lost 22 lbs in 90 Days',
  type: 'Member Transformation',
  whySelected: 'Transformation stories are the highest-converting content for gym audiences.',
  channels: {
    instagram: {
      copy: '90 days ago, Sarah walked in nervous…',
      visualRecommendation: 'Before/after photo',
      suggestedPostDate: 'Week 1, Wednesday',
    },
  },
}

test('renders story title', () => {
  render(<StoryCard story={mockStory} activeChannels={['instagram']} defaultExpanded={false} />)
  expect(screen.getByText('Sarah Lost 22 lbs in 90 Days')).toBeInTheDocument()
})

test('is collapsed by default when defaultExpanded is false', () => {
  render(<StoryCard story={mockStory} activeChannels={['instagram']} defaultExpanded={false} />)
  expect(screen.queryByText(mockStory.whySelected)).not.toBeInTheDocument()
})

test('expands on click to show whySelected', async () => {
  render(<StoryCard story={mockStory} activeChannels={['instagram']} defaultExpanded={false} />)
  await userEvent.click(screen.getByText('Sarah Lost 22 lbs in 90 Days'))
  expect(screen.getByText(mockStory.whySelected)).toBeInTheDocument()
})

test('renders expanded by default when defaultExpanded is true', () => {
  render(<StoryCard story={mockStory} activeChannels={['instagram']} defaultExpanded={true} />)
  expect(screen.getByText(mockStory.whySelected)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npx jest __tests__/components/StoryCard.test.tsx
```
Expected: FAIL

- [ ] **Step 3: Implement CopyBlock**

```tsx
// components/plan/CopyBlock.tsx
import { StoryChannelCopy } from '@/lib/types'

export function CopyBlock({ channelCopy }: { channelCopy: StoryChannelCopy }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="bg-gray-50 rounded-lg px-3 py-2.5">
        <p className="text-xs font-bold text-[#1E212E] mb-1.5">Copy</p>
        <p className="text-xs text-[#444444] leading-relaxed whitespace-pre-wrap">{channelCopy.copy}</p>
      </div>
      <div className="flex gap-2">
        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-xs font-bold text-[#1E212E] mb-1">Visual</p>
          <p className="text-xs text-[#444444] leading-relaxed">{channelCopy.visualRecommendation}</p>
        </div>
        <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2.5">
          <p className="text-xs font-bold text-[#1E212E] mb-1">Post on</p>
          <p className="text-xs text-[#444444] leading-relaxed">{channelCopy.suggestedPostDate}</p>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Implement PlatformTabs**

```tsx
// components/plan/PlatformTabs.tsx
'use client'

import { useState } from 'react'
import { Channel, Story } from '@/lib/types'
import { CopyBlock } from './CopyBlock'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

interface PlatformTabsProps {
  story: Story
  activeChannels: Channel[]
}

export function PlatformTabs({ story, activeChannels }: PlatformTabsProps) {
  const available = activeChannels.filter((c) => story.channels[c])
  const [activeTab, setActiveTab] = useState<Channel>(available[0])

  if (available.length === 0) return null

  const channelCopy = story.channels[activeTab]

  return (
    <div>
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {available.map((channel) => (
          <button
            key={channel}
            onClick={() => setActiveTab(channel)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              activeTab === channel
                ? 'bg-[#81A1D3] text-[#1E212E]'
                : 'bg-gray-100 text-[#444444] hover:bg-gray-200'
            }`}
          >
            {CHANNEL_LABELS[channel]}
          </button>
        ))}
      </div>
      {channelCopy && <CopyBlock channelCopy={channelCopy} />}
    </div>
  )
}
```

- [ ] **Step 5: Implement StoryCard**

```tsx
// components/plan/StoryCard.tsx
'use client'

import { useState } from 'react'
import { Story, Channel } from '@/lib/types'
import { PlatformTabs } from './PlatformTabs'

interface StoryCardProps {
  story: Story
  activeChannels: Channel[]
  defaultExpanded: boolean
  index: number
}

export function StoryCard({ story, activeChannels, defaultExpanded, index }: StoryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  return (
    <div className={`rounded-xl mb-3 overflow-hidden border transition-colors ${expanded ? 'border-[#81A1D3]' : 'border-gray-200'}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full ${expanded ? 'bg-[#81A1D3] text-[#1E212E]' : 'bg-gray-100 text-[#444444]'}`}>
            Story {index + 1}
          </span>
          <span className="text-sm font-bold text-[#1E212E]">{story.title}</span>
        </div>
        <span className="text-sm text-[#444444]/50 ml-2">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className={`border-t border-[#81A1D3]/20 px-4 py-4 bg-white`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[#444444] bg-gray-100 px-2 py-0.5 rounded-full">{story.type}</span>
          </div>
          <p className="text-xs text-[#444444] leading-relaxed mb-4">{story.whySelected}</p>
          <PlatformTabs story={story} activeChannels={activeChannels} />
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Run StoryCard tests**

```bash
npx jest __tests__/components/StoryCard.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add components/plan/ __tests__/components/StoryCard.test.tsx
git commit -m "feat: add StoryCard, PlatformTabs, and CopyBlock plan components"
```

---

## Task 15: Step 7 — Your Plan

**Files:**
- Implement: `components/steps/StepYourPlan.tsx`

- [ ] **Step 1: Implement StepYourPlan**

This step fires the generate API call on mount and renders story cards as the result arrives.

```tsx
// components/steps/StepYourPlan.tsx
'use client'

import { useEffect, useState } from 'react'
import { useWizard } from '@/hooks/useWizard'
import { StoryCard } from '@/components/plan/StoryCard'
import { PdfCallout } from '@/components/ui/PdfCallout'
import { Story } from '@/lib/types'

export function StepYourPlan() {
  const { state, dispatch } = useWizard()
  const [loading, setLoading] = useState(!state.storyPlan)
  const [stories, setStories] = useState<Story[]>(state.storyPlan?.stories ?? [])
  const [downloading, setDownloading] = useState(false)

  const activeChannels = state.businessInfo?.channels ?? []

  useEffect(() => {
    if (state.storyPlan) return

    async function generate() {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessInfo: state.businessInfo,
          auditResults: state.auditResults,
          storyMineAnswers: state.storyMineAnswers,
        }),
      })

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let raw = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        raw += decoder.decode(value)
      }

      const lines = raw.split('\n').filter(Boolean)
      for (let i = lines.length - 1; i >= 0; i--) {
        try {
          const parsed = JSON.parse(lines[i])
          if (parsed.stories) {
            const plan = { stories: parsed.stories as Story[] }
            dispatch({ type: 'SET_STORY_PLAN', data: plan })
            setStories(parsed.stories)
            setLoading(false)
            return
          }
        } catch { /* skip */ }
      }
      setLoading(false)
    }

    generate()
  }, [])

  async function downloadPdf() {
    setDownloading(true)
    const res = await fetch('/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gymName: state.businessInfo?.gymName,
        auditResults: state.auditResults,
        storyPlan: state.storyPlan,
        activeChannels,
      }),
    })
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'storybuildr-report.pdf'
    a.click()
    URL.revokeObjectURL(url)
    setDownloading(false)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-[#81A1D3] border-t-transparent rounded-full animate-spin mb-6" />
        <p className="text-sm font-medium text-[#1E212E]">Building your 30-day content plan…</p>
        <p className="text-xs text-[#444444]/60 mt-1">This takes about 20–30 seconds</p>
      </div>
    )
  }

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Your Content Plan</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">30 days of stories, built from yours</h2>
      <p className="text-sm text-[#444444] mb-5">
        We picked {stories.length} stories from your answers and mapped them across your channels.
      </p>

      <PdfCallout />

      {stories.map((story, i) => (
        <StoryCard
          key={i}
          story={story}
          activeChannels={activeChannels}
          defaultExpanded={i === 0}
          index={i}
        />
      ))}

      <button
        onClick={downloadPdf}
        disabled={downloading}
        className="w-full bg-[#81A1D3] text-[#1E212E] font-extrabold py-3 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors mt-4"
      >
        {downloading ? 'Generating PDF…' : 'Download your full report →'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add components/steps/StepYourPlan.tsx
git commit -m "feat: add Your Plan step with story generation and download CTA"
```

---

## Task 16: PDF Generation

**Files:**
- Create: `lib/pdf/ReportDocument.tsx`
- Create: `app/api/pdf/route.ts`

- [ ] **Step 1: Implement ReportDocument**

```tsx
// lib/pdf/ReportDocument.tsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { AuditResult, Story, Channel, StoryPlan } from '@/lib/types'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', color: '#444444' },
  h1: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#1E212E', marginBottom: 6 },
  h2: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E212E', marginBottom: 4, marginTop: 16 },
  h3: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#1E212E', marginBottom: 3 },
  label: { fontSize: 8, color: '#81A1D3', fontFamily: 'Helvetica-Bold', letterSpacing: 1, marginBottom: 4 },
  body: { fontSize: 10, lineHeight: 1.6, color: '#444444', marginBottom: 6 },
  small: { fontSize: 9, color: '#888888', marginBottom: 2 },
  divider: { height: 1, backgroundColor: '#e2e8f0', marginVertical: 12 },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  chip: { fontSize: 8, color: '#81A1D3', backgroundColor: '#f0f5fb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 3 },
  bullet: { fontSize: 9, color: '#444444', marginBottom: 2 },
})

interface Props {
  gymName: string
  auditResults: AuditResult[]
  storyPlan: StoryPlan
  activeChannels: Channel[]
}

export function ReportDocument({ gymName, auditResults, storyPlan, activeChannels }: Props) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <Text style={s.label}>STORYBUILDR REPORT</Text>
        <Text style={s.h1}>{gymName}</Text>
        <View style={s.divider} />

        {/* Section 1: Audit Results */}
        <Text style={s.label}>SECTION 1 — AUDIT RESULTS</Text>
        {auditResults.map((r) => (
          <View key={r.channel}>
            <View style={[s.row, { alignItems: 'flex-start', marginBottom: 4 }]}>
              <View style={s.col}>
                <Text style={s.h3}>{CHANNEL_LABELS[r.channel] ?? r.channel}</Text>
              </View>
              <View>
                {r.score !== null
                  ? <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1E212E' }}>{r.score}/10</Text>
                  : <Text style={s.chip}>Self-reported</Text>
                }
              </View>
            </View>
            <Text style={s.body}>{r.narrative}</Text>
            <View style={s.row}>
              <View style={s.col}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#81A1D3', marginBottom: 3 }}>Doing well</Text>
                {r.doingWell.map((item, i) => <Text key={i} style={s.bullet}>✓ {item}</Text>)}
              </View>
              <View style={s.col}>
                <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#f87171', marginBottom: 3 }}>Opportunities</Text>
                {r.opportunities.map((item, i) => <Text key={i} style={s.bullet}>→ {item}</Text>)}
              </View>
            </View>
            <View style={s.divider} />
          </View>
        ))}

        {/* Section 2: Stories */}
        <Text style={s.label}>SECTION 2 — YOUR STORIES</Text>
        {storyPlan.stories.map((story, i) => (
          <View key={i}>
            <Text style={s.h2}>Story {i + 1}: {story.title}</Text>
            <Text style={s.chip}>{story.type}</Text>
            <Text style={s.body}>{story.whySelected}</Text>
            {activeChannels.map((channel) => {
              const copy = story.channels[channel]
              if (!copy) return null
              return (
                <View key={channel} style={{ marginBottom: 8 }}>
                  <Text style={s.h3}>{CHANNEL_LABELS[channel]}</Text>
                  <Text style={s.body}>{copy.copy}</Text>
                  <Text style={s.small}>Visual: {copy.visualRecommendation}</Text>
                  <Text style={s.small}>Post date: {copy.suggestedPostDate}</Text>
                </View>
              )
            })}
            <View style={s.divider} />
          </View>
        ))}

        {/* Section 3: Timeline */}
        <Text style={s.label}>SECTION 3 — 30-DAY POSTING TIMELINE</Text>
        {storyPlan.stories.map((story, si) =>
          activeChannels.map((channel) => {
            const copy = story.channels[channel]
            if (!copy) return null
            return (
              <Text key={`${si}-${channel}`} style={s.bullet}>
                {copy.suggestedPostDate} · {CHANNEL_LABELS[channel]} · {story.title}
              </Text>
            )
          })
        )}
      </Page>
    </Document>
  )
}
```

- [ ] **Step 2: Implement PDF API route**

```ts
// app/api/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReportDocument } from '@/lib/pdf/ReportDocument'
import { AuditResult, Channel, StoryPlan } from '@/lib/types'
import React from 'react'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const body: {
    gymName: string
    auditResults: AuditResult[]
    storyPlan: StoryPlan
    activeChannels: Channel[]
  } = await request.json()

  const buffer = await renderToBuffer(
    React.createElement(ReportDocument, {
      gymName: body.gymName,
      auditResults: body.auditResults,
      storyPlan: body.storyPlan,
      activeChannels: body.activeChannels,
    })
  )

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="storybuildr-${body.gymName.toLowerCase().replace(/\s+/g, '-')}-report.pdf"`,
    },
  })
}
```

- [ ] **Step 3: Verify PDF download**

Complete the full flow end-to-end in `npm run dev`. Click "Download your full report →" and verify a PDF downloads with all three sections populated.

- [ ] **Step 4: Run all tests**

```bash
npx jest
```
Expected: All tests PASS.

- [ ] **Step 5: Final commit**

```bash
git add lib/pdf/ app/api/pdf/route.ts
git commit -m "feat: add PDF generation with audit results, stories, and posting timeline"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| 7-step sidebar wizard | Task 4 (WizardLayout + WizardSidebar) |
| Brand colors applied | Task 4–16 (Tailwind classes throughout) |
| Business info form with chip selects | Task 5 (StepBusinessInfo) |
| Channel details with URL inputs | Task 7 (StepChannelDetails) |
| URL preflight HEAD-check | Task 6 (lib/preflight.ts + API route) |
| Blocked channel fallback form | Task 7 (FallbackChannelForm) |
| "Skip this channel" option | Task 7 (StepChannelDetails handleSkip) |
| Audit loading with cycling copy | Task 11 (StepAuditLoading) |
| Per-channel score + narrative + callouts | Task 10 (ChannelCard) |
| Score bar blue ≥6, red <6 | Task 10 (ScoreBar) |
| PDF retention callout on Steps 5 & 7 | Tasks 11, 15 (PdfCallout) |
| Story Mine one-question-at-a-time | Task 12 (StepStoryMine) |
| 10 story mine questions | Task 12 |
| Story cards expandable with platform tabs | Task 14 (StoryCard + PlatformTabs) |
| All-channel copy in PDF (not last tab) | Task 16 (ReportDocument iterates all channels) |
| PDF: audit + stories + timeline | Task 16 (ReportDocument sections 1–3) |
| Claude system prompt | Task 8 |
| Firecrawl scraping | Task 9 |
| Streaming audit + generation | Tasks 9, 13 |
| Self-reported badge | Task 10 (ScoreBar null case) |
| No penalty framing for blocked channels | Task 7 (FallbackChannelForm copy) |
