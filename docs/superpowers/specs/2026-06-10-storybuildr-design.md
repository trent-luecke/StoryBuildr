# StoryBuildr — Design Spec

**Date:** 2026-06-10
**Status:** Approved

## Overview

StoryBuildr is a standalone, one-shot web app that guides gym owners through a three-phase content marketing workflow: auditing their current channels, mining stories from their day-to-day operations, and producing a downloadable 30-day content plan with platform-specific copy. It is a free lead gen tool — no auth, no email collection in-app, entry gated externally.

The core thesis: gym owners either don't know how to tell compelling stories or assume their day-to-day is too boring to be content. StoryBuildr proves them wrong by surfacing stories they already have and showing them exactly how to use them.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Deployment:** Vercel
- **UI:** Tailwind CSS + shadcn/ui
- **AI:** Anthropic Claude via AI SDK (streaming)
- **Web scraping:** Firecrawl
- **PDF generation:** `@react-pdf/renderer` (server-side, via Server Action)
- **Forms:** react-hook-form + zod

---

## Brand

| Token | Hex | Usage |
|---|---|---|
| Accent | `#81A1D3` | CTAs, active state, progress indicators, score bars, ✓ checkmarks |
| Dark | `#1E212E` | Sidebar background, headings |
| Body | `#444444` | Body text, labels, secondary UI |
| Surface | `#FFFFFF` | Content area background |

---

## Step Flow (7 Steps)

All steps share a sidebar layout: dark navy sidebar on the left with numbered step list and a progress bar at the bottom; white content area on the right.

### Step 1 — Welcome
Hero landing screen. Value prop headline, brief description of the three phases, single CTA button: **"Start your free audit"**. No form fields.

### Step 2 — Business Info
- Gym name (text input)
- Services offered (multi-select chips: Group Classes, Personal Training, Nutrition Coaching, Youth Programs, Open Gym, Other)
- Who is your ideal member? (short text — ICP in their own words)
- Active channels (multi-select chips: Instagram, Facebook, LinkedIn, Email, Website)

Only channels selected here appear in subsequent steps, copy generation, and the PDF.

### Step 3 — Channel Details
For each selected channel:
- **Instagram / Facebook / LinkedIn:** handle or profile URL
- **Website:** full URL
- **Email:** platform (dropdown: Mailchimp, Klaviyo, ConvertKit, Other), subscriber count (number), send frequency (dropdown: weekly, bi-weekly, monthly, rarely)

### Step 3b — URL Pre-Flight Check
Triggered on submission of Step 3, before any scraping begins. A Server Action fires lightweight HEAD requests against each provided URL. Three outcomes per URL:

- **Pass:** proceed to Step 4 normally
- **Unreachable** (timeout, 404, DNS failure): "We had trouble reaching [url] — the address may be incorrect or the site may be down. Want to try a different URL, or skip this channel?"
- **Blocked** (403, bot detection — common on Instagram/Facebook): "Instagram often restricts automated access, so we couldn't pull your profile directly. No big deal — we can do this a different way." Presents a fallback form (see below).

**Blocked channel fallback form:**
1. How often do you typically post? (dropdown: daily / a few times a week / weekly / rarely)
2. What types of content do you mostly share? (multi-select chips: Promotions & announcements, Workout tips, Member spotlights, Behind-the-scenes, Motivational quotes)
3. Describe 2–3 of your recent posts in a sentence each (free text)

For each failed URL, the user can: (a) update the URL and re-check, or (b) skip the channel (removes it from audit scope and downstream copy generation). Self-reported and skipped channels receive a "Self-reported" badge in the audit results.

The "Begin Audit" button unlocks only when every channel is either passing or explicitly resolved (skipped or fallback completed).

### Step 4 — Story Audit (Loading)
Full-screen loading state while Firecrawl scrapes URLs and Claude analyzes the results. Progress copy cycles through messages like "Reading your website…", "Scanning your social presence…", "Identifying story gaps…" to keep the user engaged during the wait.

### Step 5 — Audit Results
Per-channel analysis, one card per channel. Layout:

```
[Channel name]          [Score] /10
[URL or handle]         [Score bar — accent blue for 6+, red for 5 and below]

[Narrative paragraph — 2–4 sentences, plain English]

[Doing well]            [Opportunities]
✓ Specific item         → Specific item
✓ Specific item         → Specific item
✓ Specific item         → Specific item
```

Email and self-reported channels display a "Self-reported" badge instead of a score.

**PDF retention callout** (above first channel card):
> 📄 **These results are saved to your report** — Finish the full workflow and you'll get everything — audit results, your stories, and your 30-day content plan — in a downloadable PDF.

CTA at bottom: **"Let's find your stories →"**

### Step 6 — Story Mine
8–10 interview questions answered as free-text. Presented one question at a time (no long form). User can skip any question. Questions:

1. Describe a member win from the last 30 days — what changed for them?
2. What does a typical morning look like at your gym? Walk us through it.
3. Tell us about a mistake you made as an owner and what you learned.
4. Why did you start this gym — what's the real reason, not the elevator pitch?
5. Who is your "typical" member, and what were they afraid of before they joined?
6. What does your gym do that most gyms don't?
7. Describe your coaching philosophy in one or two sentences.
8. What's a moment in the last 6 months that made you proud?
9. If a new member could only read one thing about your gym before joining, what would you want it to say?
10. What does your gym look like on its best day?

After the final question, a second Claude call generates the content plan (see Claude Integration).

### Step 7 — Your Plan + Download
Story-first layout. 4 story cards, first expanded by default, rest collapsed. Each expanded card shows:

- Story title + type badge (e.g. "Member Transformation")
- Why Claude selected this story (2–3 sentences)
- Platform tabs — one per active channel
  - Per tab: caption/copy, visual asset recommendation, suggested post date
- Collapsed cards show title only; expand on click

**PDF reminder banner** (above story cards): same copy as Step 5 reminder.

**CTA at bottom:** "Download your full report →" — triggers server-side PDF generation and file download.

---

## Claude Integration

### System Prompt
Single file: `lib/prompts/gym-marketing.ts`

Covers:
- Gym content marketing best practices (what channels matter, what content types perform)
- Traditional gym ICP characteristics (fears, motivations, buying triggers)
- Content scoring rubric: authenticity, specificity, consistency, outcome framing, CTA presence
- Channel benchmarks (what "good" looks like per platform for a gym)
- Story narrative frameworks (transformation arc, day-in-the-life, origin story, mistake/lesson, philosophy)
- Platform copy conventions (Instagram caption structure, email subject + body, website testimonial placement)
- 30-day posting cadence guidelines

### Call 1 — Audit Analysis (streaming)
**Input:** scraped HTML per channel (or self-reported data) + channel metadata from intake  
**Output:** structured JSON per channel:
```ts
{
  channel: string,
  score: number | null,        // null for self-reported
  narrative: string,
  doingWell: string[],
  opportunities: string[],
  selfReported: boolean
}
```

### Call 2 — Story Generation (streaming)
**Input:** audit results + all Story Mine answers + active channel list  
**Output:** array of 4 story objects:
```ts
{
  title: string,
  type: string,               // e.g. "Member Transformation"
  whySelected: string,
  channels: {
    [channelKey: string]: {
      copy: string,
      visualRecommendation: string,
      suggestedPostDate: string   // e.g. "Week 1, Day 3 (Wednesday)"
    }
  }
}
```

Both calls stream into the UI. Audit results render channel cards as each channel's analysis completes. Story cards render as each story object completes.

---

## PDF Structure

Generated server-side via `@react-pdf/renderer` in a Next.js Server Action. Returns a binary PDF file download.

**Section 1 — Audit Results**
Full channel-by-channel breakdown: channel name, score, narrative, doing-well bullets, opportunity bullets. Self-reported channels noted.

**Section 2 — Your Stories**
For each of the 4 stories:
- Story title, type, why-selected rationale
- Per active channel: copy, visual recommendation, suggested post date

**Section 3 — 30-Day Posting Timeline**
Calendar grid (4 weeks × 7 days) showing which story is assigned to which channel on which day. Days with no content are blank.

---

## Firecrawl Scope

| Channel | What we scrape |
|---|---|
| Website | Homepage + /about (if exists) |
| Instagram | Public profile HTML: bio, follower count, visible recent posts, pinned content |
| Facebook | Public page HTML: about, recent posts |
| LinkedIn | Public company page: about, recent posts |
| Email | Not scraped — self-reported only |

If Firecrawl returns no meaningful content for a URL (empty body, JS-only render with no fallback), Claude is passed `"scrape_unavailable"` for that channel and skips scoring it rather than hallucinating. The channel card in the UI shows "We weren't able to analyze this channel" with the self-reported badge.

---

## Key UX Principles

- **No penalty framing:** when a URL is blocked or a channel is self-reported, copy never implies the user did something wrong.
- **Completion incentive:** PDF callout appears on both the Audit Results and Your Plan screens — the full deliverable is always visible as the reward for finishing.
- **Channel scope is consistent end-to-end:** channels not selected in Step 2 never appear in audit results, story copy, or the PDF.
- **Streaming builds trust:** both Claude calls stream results progressively so the user sees work happening rather than staring at a spinner.
