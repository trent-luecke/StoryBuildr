# Email block → plan calibration

**Date:** 2026-07-22
**Branch:** `feat/wizard-card-layout`
**Status:** Draft for review

## Goal

Make the email details collected on Channel Details actually shape the user's 30-day
plan. Today that data dead-ends at the audit and never reaches plan generation. The
centerpiece is **calibrating the email tactics in the plan to the owner's actual
capability** — not recommending they buy tooling.

The driving signal is a new gating question: *"Do you use an email marketing platform?"*
The meaningful bit is the yes/no (marketing maturity), not the brand.

## Current state

- `ChannelDetailsData.email` = `{ platform, subscriberCount, sendFrequency }`
  ([lib/types.ts:20](../../../lib/types.ts)).
- The email block reaches the **audit** prompt only
  ([app/api/audit/route.ts:57-62](../../../app/api/audit/route.ts)), as a self-reported,
  unscored channel. The `Platform:` line prints the literal dropdown value — so choosing
  "Other" emits `Platform: Other`, which is misleading noise.
- The **plan** route (`/api/generate`) never receives `channelDetails` at all
  ([app/api/generate/route.ts:38-42](../../../app/api/generate/route.ts)). `StepYourPlan`
  sends only `businessInfo`, `auditResults`, `storyMineAnswers`
  ([components/steps/StepYourPlan.tsx:34-38](../../../components/steps/StepYourPlan.tsx)).
- Channel Details uses `react-hook-form` **without** a zod resolver — values are read via
  `getValues()`; there is no form-level validation gate. Any "required" behavior must be
  custom.

## Design

### 1. Data model ([lib/types.ts](../../../lib/types.ts))

Extend the email shape:

```ts
email?: {
  usesPlatform?: boolean      // gating question answer; undefined = not answered
  platform?: string           // only meaningful when usesPlatform; existing options + 'Other'
  otherPlatform?: string      // only when platform === 'Other'
  subscriberCount: number
  sendFrequency: string
}
```

`usesPlatform` optional (undefined when unanswered). `subscriberCount` / `sendFrequency`
stay as-is and are collected in **both** tiers (list size + cadence calibrate the plan
regardless of tooling).

### 2. UI — gating question ([StepChannelDetails.tsx](../../../components/steps/StepChannelDetails.tsx))

Inside the Marketing Email List block, **above** the Platform dropdown:

- A Yes/No control for the question, with an illustrative example:
  *"Do you use an email marketing platform? (e.g., MailChimp, ConvertKit, HubSpot, etc.)"*
  Rendered as a two-button toggle styled like the existing chips. Default unset.
- **Yes** → reveal the existing Platform dropdown; when `Other` is picked, reveal a free-text
  input (mirrors the services "Other" pattern from Business Info — placeholder e.g.
  *"Which platform?"*).
- **No** → hide the Platform dropdown and Other input entirely. Still show Subscriber count
  and Send frequency.
- `seededFormValues` extended to seed `usesPlatform`, `platform`, `otherPlatform` from state.

### 2a. Required-answer gate (email only)

Unlike social/website URLs — where a blank field degrades gracefully to generic
best-practice advice — the gating answer materially forks the plan's email strategy, so it
**must be answered** when email is an active channel.

- Enforced as a **targeted check at the proceed step**, not a full form resolver (the step
  still has no zod resolver, and URLs remain optional by design). When `hasEmail` and
  `usesPlatform` is still `undefined`, block `runPreflight`/`proceed` and show an inline error
  by the question, e.g. *"Let us know so we can tailor your email plan."*
- Because the toggle both drives conditional rendering and gates proceeding, `usesPlatform`
  is held as controlled state (RHF `watch`/`setValue` or local `useState`) rather than a
  plain `register`.
- The platform dropdown and the `Other` text remain **optional** even when the answer is Yes
  (brand is low signal; graceful fallback to "a dedicated platform"). Only the yes/no is
  required.

### 3. Wire email block into the plan route — **the focus**

**a. `StepYourPlan`** ([StepYourPlan.tsx:34-38](../../../components/steps/StepYourPlan.tsx)):
add `channelDetails: state.channelDetails` to the POST body.

**b. Generate route body type**
([app/api/generate/route.ts:38-42](../../../app/api/generate/route.ts)): add
`channelDetails?: ChannelDetailsData`.

**c. Email context block** — built only when `email` is an active channel, via a small pure
helper `buildEmailContext(email)` (extracted so it's unit-testable without the LLM):

```
## Email Context
- List size: {subscriberCount} subscribers
- Current cadence: {sendFrequency}
- Email maturity: {usesPlatform
    ? "Uses a dedicated email platform ({platformName})"
    : "No dedicated platform — sends manually (e.g. BCC or a basic email list)"}
```

`platformName` = `otherPlatform` when `platform === 'Other'` and non-empty; otherwise
`platform`; otherwise "a dedicated platform". Never emits the literal `"Other"`.

**d. Calibration instructions** appended to the prompt when email is active:

```
Email guidance rules:
- {usesPlatform
    ? "They run a real email platform. You MAY use platform-native tactics: segment
       members vs past leads, suggest simple automated sequences, and use richer
       formatting. Lean into the two-audience split (members vs leads)."
    : "They send manually. Keep email guidance low-lift and plain-text friendly: one
       story-driven send, simple structure, no segmentation or automation assumptions."}
- NEVER recommend purchasing, upgrading, or switching email tools. Meet them where they
  are; calibrate tactics to their current capability only.
```

This is the crux and directly encodes the "don't sell them tooling" constraint. The
existing per-channel email conventions in the system prompt
([gym-marketing.ts:57](../../../lib/prompts/gym-marketing.ts)) remain; this layers on top.

### 4. Audit prompt cleanup ([app/api/audit/route.ts:60](../../../app/api/audit/route.ts))

Replace the `Platform:` line with maturity-aware wording using the same `platformName`
logic, so the "Other" noise is gone and the manual tier is represented:

```
{usesPlatform ? "Platform: {platformName}" : "Email sending: manual (no dedicated platform)"}
```

## Data flow

```
Channel Details (gating Q + platform)
   → state.channelDetails.email
       → audit prompt  (maturity line; existing)
       → generate/plan (NEW: email context + calibration rules)
           → per-story email copy calibrated to tier
```

## Edge cases

- Email not an active channel → no email block anywhere (email section already gated on
  `hasEmail`).
- `usesPlatform` undefined → cannot occur in the normal flow (required gate, §2a); but
  `buildEmailContext` still defaults undefined → manual tier defensively (preview seeds,
  future entry points).
- `platform === 'Other'` with empty `otherPlatform` → generic "a dedicated platform"; never
  print "Other".
- Preview `HAPPY_PATH` email object gains `usesPlatform: true` so the preview stays
  representative ([lib/preview/mock-data.ts](../../../lib/preview/mock-data.ts)).

## Testing

- **Unit:** `buildEmailContext` for both tiers, `Other`+name, `Other`+empty, and the
  no-platform default. Pure function, no LLM.
- **Unit:** `StepYourPlan` includes `channelDetails` in the request body (mirrors the
  existing preview-mode-fetch test pattern).
- **Unit/interaction:** with email active and the gating question unanswered, proceeding is
  blocked and the inline error shows; answering (Yes or No) unblocks it.
- **Manual/browser:** via `/preview`, toggle the gating question and confirm the dropdown
  shows/hides; confirm the plan request payload carries `channelDetails`.
- Note in the review: we are **not** asserting on generated copy text (non-deterministic);
  we verify the inputs and the prompt-building, not the model's prose.

## Out of scope (YAGNI)

- Recommending, comparing, or upselling email tools — explicitly excluded by the calibration
  rule.
- Per-brand differentiation beyond passing the name through.
- Validation on the URL / platform-name / subscriber / frequency fields — these stay
  optional (generic fallback is fine). Only the gating yes/no is required (§2a).
