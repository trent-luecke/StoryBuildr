# Preview Harness — Design

**Date:** 2026-07-06
**Status:** Approved, pending implementation plan

## Problem

StoryBuildr is a 7-step wizard. Reviewing the UI/UX of any given step today means manually
filling out every prior step — business info, channel URLs, waiting on a live Claude/Firecrawl
audit, answering a 10-question interview, and waiting on live story generation. This makes
iterating on the look and feel of individual steps slow and painful.

We want a **staging area** where any step can be viewed pre-filled, including the outputs
(audit results, generated stories) and the transient loading states, without touching the real
APIs.

## Goals

- View any of the 7 wizard steps in a completed, filled-in state.
- View the two async/loading states (audit running, plan generating) as static spinners.
- No live API calls — deterministic, instant, works with no API keys, offline.
- Reachable in local dev and on Vercel preview deployments; **404 in production**.
- Reuse the real production step components and styles (true fidelity, not mockups).

## Non-Goals

- Multiple data scenarios / edge cases (blocked channels, low scores, single-channel gyms).
  Scoped to **one rich happy-path gym**. Edge-case scenarios can be added later by extending
  the mock-data module.
- Any change to the real user-facing wizard flow.

## Architecture

### Fidelity approach: mock-seeded real components

The wizard renders every step inside `WizardLayout` based on `state.currentStep`, all reading
from a single React context (`useWizard()` in `hooks/useWizard.tsx`). The entire wizard state is
one `WizardState` object driven by a reducer.

The harness mounts the **real step components** inside a `WizardProvider` **seeded with mock
data**, and suppresses the API-firing effects. Same components, same Tailwind styles, same
layout — just pre-filled.

Rejected alternative: a live "demo mode" that flows through the real `/api/audit` and
`/api/generate` routes. Marginally more realistic, but adds latency, cost, API-key dependency,
and flakiness for zero benefit when the goal is reviewing layout and copy.

### View model

The harness holds a list of **views**. Each view = a wizard step + the seed state that step
needs to render its filled (or loading) form. Selecting a view **fully remounts** the
`WizardProvider` (via a React `key` on the provider), so the seed *is* the scenario — no
dispatch juggling or stale state.

| # | View label | `currentStep` | Seeded fields | Notes |
|---|---|---|---|---|
| 1 | Welcome | 1 | — | Intro screen |
| 2 | Business Info | 2 | `businessInfo` | Form shown filled |
| 3 | Channel Details | 3 | `businessInfo`, `channelDetails`, `preflightResults` | Form + passed preflight |
| 4 | Story Audit (loading) | 4 | `businessInfo`, `channelDetails`, `preflightResults` (no `auditResults`) | Static spinner; fetch suppressed |
| 5 | Audit Results | 5 | + `auditResults` | Filled results grid |
| 6 | Story Mine | 6 | + `storyMineAnswers` | 10 answers filled |
| 7 | Your Plan (loading) | 7 | everything except `storyPlan` | Static spinner; fetch suppressed |
| 8 | Your Plan (result) | 7 | + `storyPlan` | Filled 4-story plan |

All seeds derive from one happy-path gym ("Iron Peak Fitness", channels:
Instagram / Facebook / Website / Email).

## Components & Files

### New files

- **`lib/preview/mock-data.ts`** — the canonical happy-path `WizardState`, plus a `PREVIEW_VIEWS`
  array describing each view (label, and the seed `Partial<WizardState>` including `currentStep`).
  Seeds are derived by picking fields off the full happy-path state so there's a single source of
  truth for the mock gym.
- **`app/preview/page.tsx`** — the route. Server component that gates on environment (see Gating)
  and renders `<PreviewHarness />`. Calls `notFound()` in production.
- **`components/preview/PreviewHarness.tsx`** — client component. Holds `selectedViewId` in local
  React state. Renders `<PreviewToolbar />` above a keyed `WizardProvider` (keyed by
  `selectedViewId`) that wraps the exported `WizardContent`. Passes `initialState` (the view's
  seed) and `previewMode` to the provider.
- **`components/preview/PreviewToolbar.tsx`** — a top bar of buttons, one per view, that sets
  `selectedViewId`. Purely the harness chrome; visually distinct from the app so it's obviously a
  staging tool.

### Edits to existing files (surgical)

- **`hooks/useWizard.tsx`** — `WizardProvider` gains two optional props:
  - `initialState?: Partial<WizardState>` — merged over the default `initialState` to seed.
  - `previewMode?: boolean` — defaults `false`; exposed on the context value.
  The context value type becomes `{ state, dispatch, previewMode }`. Default behavior of the real
  app is unchanged (no props passed → empty seed, `previewMode` false).
- **`components/wizard/WizardLayout.tsx`** — export the inner `WizardContent` component so the
  harness reuses the exact sidebar + step-area rendering rather than duplicating it.
- **`components/steps/StepAuditLoading.tsx`** — add `if (previewMode) return` at the top of the
  audit-fetch `useEffect`. Read `previewMode` from `useWizard()`. Spinner + cycling messages still
  render; no network call. Message-cycling interval is unaffected.
- **`components/steps/StepYourPlan.tsx`** — add `if (previewMode) return` at the top of the
  generate-fetch `useEffect`. When seeded without `storyPlan`, `loading` stays `true` → the
  spinner view renders indefinitely, which is exactly the loading state we want to preview.

### Form hydration (verify during implementation)

Steps 2, 3, and 6 are forms. If a form initializes its inputs to empty and only *writes* to
wizard state on submit (rather than *reading* seeded state on mount), seeding won't make the
inputs appear filled. During implementation, verify each form step hydrates its local input
state from the seeded wizard state; where one doesn't, add that hydration. This is a small change
that also improves the real app (going "Back" preserves entered answers). This is the one place
scope may grow slightly.

## Gating (dev + preview, not production)

Gate on **`process.env.VERCEL_ENV`**, not `NODE_ENV`.

Vercel preview deployments run with `NODE_ENV=production`, so gating on `NODE_ENV` would 404 the
harness on preview deployments too — contradicting the requirement. `VERCEL_ENV` is:
- `'production'` on production deployments → **404**
- `'preview'` on preview deployments → allowed
- `undefined` in local dev → allowed

`app/preview/page.tsx`:

```ts
if (process.env.VERCEL_ENV === 'production') notFound()
```

## API behavior in preview

- `/api/audit` and `/api/generate` — **never called** (fetch effects suppressed by `previewMode`).
- `/api/pdf` — **stays live**. The Download button renders the PDF locally from seeded state with
  no external cost. A useful bonus: reviewing the real PDF output. No change needed.
- `/api/preflight` — user-triggered (button), not fired on mount; the seeded `preflightResults`
  render the passed state. Not called unless the reviewer clicks a preflight button.

## Testing / verification

- Manual: visit `/preview` in local dev, click through all 8 views, confirm each renders filled /
  loading correctly with no network calls to `/api/audit` or `/api/generate` (check the network
  panel).
- Confirm the real app (`/`) is unchanged: fresh wizard, `previewMode` false, APIs fire as before.
- Confirm production gating: `VERCEL_ENV=production` → `/preview` 404s.

## Risks

- **Form hydration** (see above) is the main unknown; bounded to steps 2/3/6.
- Exporting `WizardContent` and adding provider props are low-risk, additive changes with no
  effect on default behavior.
