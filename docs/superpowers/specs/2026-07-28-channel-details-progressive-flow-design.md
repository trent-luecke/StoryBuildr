# Progressive Channel Details flow — design spec

**Date:** 2026-07-28
**Status:** Approved (design), pending spec review
**Area:** Wizard Step 3 — Channel Details
**Prototype:** validated via clickable mockup at `public/mockup-channel-details.html` (throwaway; delete before wrapping the branch)

## Problem

Today, Step 3 (`components/steps/StepChannelDetails.tsx`) renders **every** selected
channel's inputs stacked in one card: each social channel's method picker + link/manual
inputs, then the website URL + preflight, then the full email-marketing block. For a gym
using Instagram + Facebook + website + email, that is a wall of forms — the densest screen
in the product, arriving right when we're asking the most of the user. Two risks:

1. **Cognitive overload** — everything at once reads as "this is a lot," inviting low-effort
   or abandoned entries.
2. **Thin inputs** — with no framing or examples, descriptions come back scant, which starves
   the audit (the whole point of the step).

## Decision

Restructure Step 3 into a **progressive, one-screen-at-a-time flow** — without adding a
wizard step or changing the 7-step sidebar. Step 3 becomes an internal state machine:

```
[lead-in]  →  channel 1  →  channel 2  →  …  →  channel N  →  (Begin Audit → Step 4)
```

- A short **lead-in** screen frames the effort as ROI ("the more real detail, the sharper
  your audit"), shown **once**.
- Then **one focused screen per selected channel**, with visible progress ("Channel X of N").
- Screens and progress are **derived from the user's selected channels** (`businessInfo.channels`)
  — a channel the user didn't select never appears.

This keeps the wall gone while preserving all existing data capture and wizard state.

### Decisions locked during brainstorming

| Question | Decision |
|---|---|
| Flow model | Sub-pages **inside** Step 3 (internal cursor). Sidebar stays 7 steps; `WizardStep` type unchanged. |
| Scope of one-at-a-time | **Every** selected channel gets its own screen (socials, website, email). |
| Interstitial | **Lightweight lead-in** screen at the start of Step 3 — not a numbered sidebar step. |
| Lead-in frequency | **Once.** Persisted; skipped on return visits. |
| Channel navigation | **Strictly linear** (Back / Continue). No jump-to-channel. |

## Non-goals (YAGNI)

- No new wizard step, no change to `WizardStep` (`1..7`) or the sidebar.
- No clickable/jumpable channel navigation.
- No change to Steps 1–2 or 4–7, or to channel **selection** (still in Business Info, Step 2).
- No change to the audit API contract — it already consumes `socialInputs`, `channelDetails`,
  and `preflightResults`.

## Flow & screens

Screen order within Step 3, given `channels = businessInfo.channels`:

1. **Lead-in** (only if not yet seen) — see copy below.
2. **Social channel screens**, one per social channel in selection order (Instagram,
   Facebook, LinkedIn).
3. **Website screen** (if `website` selected).
4. **Email screen** (if `email` selected).

The final screen's primary button reads **"Begin Audit →"** and advances to Step 4. All
earlier screens' primary button reads **"Continue →"**.

### Progress indicator

Every channel screen shows, above the heading: a **"Channel X of N"** label and a thin
progress bar, where `N` = count of selected channels and `X` = 1-based position. The lead-in
has no progress bar.

### Navigation rules

- **Lead-in → Continue:** mark lead-in seen (persisted), advance to channel 1.
- **Lead-in → Back:** go to Step 2 (Business Info).
- **Channel screen → Continue:** advance to the next channel; on the last channel, this is
  "Begin Audit →" and advances to Step 4.
- **Channel screen → Back:** go to the previous channel; from channel 1, go back to the
  lead-in on the first pass, or directly to Step 2 on return visits (when the lead-in is
  skipped).
- Re-entering Step 3 later (e.g. Back from Step 4) skips the lead-in and lands on channel 1,
  with all prior entries pre-filled from wizard state.

## Screen content

### Lead-in

- Eyebrow: `STEP 3 · CHANNEL DETAILS`
- Heading: **First — the part that does the heavy lifting**
- Body: *Everything after this (your audit and your 30-day plan) is built from what you share
  here. A couple of real minutes now = a sharper, more personalized result.*
- Three value props:
  - **Real examples beat guesses** — Paste a few actual posts and we audit the real thing —
    not a rough description.
  - **About 2–3 minutes** — We'll take one channel at a time so it never feels like a wall of forms.
  - **No wrong answers** — Not sure? Just describe the channel in your own words — that works too.
- Primary button: **Let's do it →** · Secondary: **← Back**

### Social channel screen (Instagram / Facebook / LinkedIn)

Reuses the existing `components/ui/SocialChannelInput.tsx` as the screen body, wrapped in
screen chrome (progress + heading + nav):

- Progress: **Channel X of N**
- Eyebrow: channel name (e.g. `INSTAGRAM`)
- Heading: **Your {Channel}**
- Sub: *Show us what you're posting so the audit reflects your real content.*
- Method pills: **Paste example posts** | **Describe it manually** (existing behavior).
- **Links branch** (existing `PostLinkField` × up to 3, plus `CopyLinkHelp`), with two changes
  (see "Component changes"): example-URL placeholders, and the copy-link helper (already shipped).
- **Manual branch** (existing questions), with one change: a **persistent example** under the
  "Describe 2–3 recent posts" field (see below).
- Nav: **← Back** / **Continue →** (or **Begin Audit →** if last).

#### Example-URL placeholders (links branch)

`PostLinkField`'s input placeholder changes from the instructional
"Paste a link to one Instagram post" to a **format-hint example URL** per platform, mirroring
the website field's `https://yourgym.com` style. The trailing `...` signals it is an example,
not a pre-filled value:

- Instagram: `https://instagram.com/p/...`
- Facebook: `https://facebook.com/yourgym/posts/...`
- LinkedIn: `https://linkedin.com/posts/...`

#### Persistent manual example (manual branch)

Under the "Describe 2–3 recent posts" textarea, show a **muted, persistent** example line
(stays visible while typing — it is not placeholder text). The textarea's own placeholder is
a short prompt: **"Describe them here…"**. Per-platform example copy:

- **Instagram:** *Example: A Reel of a coach demoing proper squat form, shot on a phone; a
  carousel of a member's 12-week transformation with a caption about training 4×/week; a
  Monday-motivation quote in our brand colors.*
- **Facebook:** *Example: A photo album from our Saturday community workout with 20+ members
  tagged; a post promoting our 6-week challenge with a sign-up link; a shared 5-star member
  review with a thank-you.*
- **LinkedIn:** *Example: A post celebrating a coach's certification; a short thread on why
  strength training matters for desk workers; a client win with a photo and a tag.*

### Website screen

- Progress + eyebrow `WEBSITE` + heading **Your website**
- Sub: *We'll take a quick look to make sure it's reachable, then audit it.*
- URL input (`https://yourgym.com`), plus a reassurance line (*We only read public pages —
  nothing behind a login.*).
- Primary button runs the existing `/api/preflight` check ("Check & continue →"). Preserve
  current behavior: on `unreachable`, show the inline "update it and try again, or skip this
  channel" affordance; on `pass`/`skipped`, advance.

### Email screen

- Progress + eyebrow `EMAIL` + heading **Your email list**
- Sub: existing marketing-list clarification copy.
- Existing questions: uses-a-platform Yes/No (**required** — same gating/error as today),
  platform select (+ "Other"), subscriber count, send frequency.
- Nav: **← Back** / **Continue →** (or **Begin Audit →** if last).

## Data flow & wizard state

The redesign is primarily **presentational** — it re-paginates existing inputs. Existing
wizard state and dispatches are preserved:

- **Social channels** continue to dispatch `SET_SOCIAL_INPUT` on change (unchanged).
- **Website** runs `/api/preflight` on its screen's Continue and records the result in local
  step state (`pass` / `unreachable` / `skipped`).
- **Email** captures its fields in local step state.
- On the **final "Begin Audit →"**, the step assembles `ChannelDetailsData` (website + email)
  and `preflightResults` and dispatches `SET_CHANNEL_DETAILS` + `SET_PREFLIGHT_RESULTS`, then
  `SET_STEP: 4` — exactly as today's `proceed()` does. Only the *timing of the website
  preflight* moves earlier (to the website screen), which is a UX improvement, not a contract
  change.

### New state: lead-in "seen" flag

Add a persisted boolean to `WizardState` (e.g. `channelIntroSeen`, default `false`) plus an
action to set it (e.g. `MARK_CHANNEL_INTRO_SEEN`). Set on advancing past the lead-in. Drives
"show the lead-in once." This is the only new wizard-state surface.

The **sub-screen cursor** (which channel we're on, and whether the lead-in is showing) is
**local component state** in the Step 3 orchestrator — it does not belong in global wizard
state, since it is transient within the step.

## Component structure

Favor small, single-purpose units over one large file:

- **`StepChannelDetails`** (rewritten) — the orchestrator/state machine: derives the ordered
  screen list from `businessInfo.channels`, owns the cursor + lead-in visibility, renders the
  active screen, and performs the final assemble-and-dispatch on Begin Audit.
- **`ChannelDetailsIntro`** (new) — the lead-in screen (presentational; `onContinue`, `onBack`).
- **`ChannelProgress`** (new) — the "Channel X of N" label + bar (presentational).
- **`WebsiteChannelScreen`** (new) — website URL + preflight + inline unreachable/skip
  (extracted from today's inline website block).
- **`EmailChannelScreen`** (new) — the email-marketing questions (extracted from today's
  inline email block).
- **Reused:** `SocialChannelInput` (already renders method pills + link/manual branches),
  `PostLinkField`, `CopyLinkHelp`, `ChipSelect`.

### Changes to existing components

- `PostLinkField` — per-platform example-URL placeholder (see above). Requires the platform
  key/label to select the example; today it receives `platformLabel`.
- `SocialChannelInput` — manual branch gains the persistent per-platform example line + short
  textarea placeholder.

## Edge cases

- **Zero selected channels** — not expected (Business Info requires ≥1). Defensive behavior:
  lead-in → Begin Audit directly (no channel screens). Note in implementation.
- **Single channel** — "Channel 1 of 1"; its Continue is "Begin Audit →".
- **Website is the last channel** — its "Check & continue →" doubles as Begin Audit: run
  preflight, then on pass advance to Step 4 (mirrors today).
- **Return visit** — lead-in skipped; land on channel 1; all fields pre-filled from wizard state.

## Testing

Unit / RTL (repo uses `next/jest`; type gate is `tsc --noEmit`):

- Screen list derives from `businessInfo.channels` — only selected channels get screens; a
  deselected channel (e.g. email) produces no email screen.
- Progress "Channel X of N" reflects the selected count and advances/retreats with nav.
- Lead-in shows on first entry; after `channelIntroSeen`, re-entering Step 3 skips it.
- Linear nav: Continue advances, Back retreats; last screen's button reads "Begin Audit →"
  and dispatches `SET_STEP: 4`.
- Final assembly dispatches `SET_CHANNEL_DETAILS` + `SET_PREFLIGHT_RESULTS` with website/email
  data; social `SET_SOCIAL_INPUT` still fires on change.
- Website preflight: pass advances; unreachable shows skip; skip advances.
- Email: uses-platform required gating preserved.
- `PostLinkField` renders the per-platform example-URL placeholder.
- Manual branch renders the persistent per-platform example line.

Preview harness:

- Update the existing `3 · Channel Details` and social preview views to the paged UI, seeding
  `currentStep: 3` and a representative `businessInfo.channels`. Ensure the settled social
  states (link success / manual / blocked) still render within a channel screen.

## Verification

- `npm test` green; `npx tsc --noEmit` clean.
- Real dev server: walk the flow for a multi-channel gym — lead-in → each channel → Begin
  Audit → Step 4 — and confirm a deselected channel has no screen and the progress count is
  correct. Paste a real public IG post on a social screen to confirm the live link check still
  works end-to-end.
