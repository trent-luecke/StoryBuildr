# Social Post Links — Design

**Date:** 2026-07-07
**Status:** Approved, pending implementation plan

## Problem

StoryBuildr audits a gym's social channels (Instagram / Facebook / LinkedIn) to find story
gaps. Today the app tries to reach each social URL via a preflight HEAD check, then scrape it —
but social platforms block automated access, so the check almost always fails and the user is
dropped into a self-report "fallback" form that reads like an error. Firecrawl (the app's
scraper) refuses social platforms outright as a matter of policy.

We want users to be able to **paste links to individual example posts** and have the app pull
real content from them, because self-report-only is more work for the user and produces a
weaker audit. This must work without heavy infrastructure (StoryBuildr is a free lead magnet —
no OAuth, no paid scraping service).

## Key finding that drives this design

Firecrawl and a normal-browser `fetch` both hit an Instagram login wall. But a **plain
server-side `fetch` sending the `facebookexternalhit/1.1` User-Agent** (the link-unfurl bot)
returns the post's Open Graph tags clean — `og:title` (full caption), `og:description`
(engagement + author + date), and `og:image` — with no login wall. Verified against a real
public Instagram post from a residential IP.

This means the paste-a-link feature is achievable with **zero new dependencies and zero cost** —
a small server route that fetches the URL with the unfurl-bot UA and parses OG tags. No
Firecrawl (it refuses social), no Apify.

## Goals

- Per social channel, let the user choose: **paste example post links** OR **describe manually**.
- On the link route, run a **live background check** as each link is filled, showing inline
  status (checking / success / blocked / invalid).
- On a blocked or failed fetch, **direct the user to the manual method** for that channel.
- Feed whatever we get (real captions or manual answers) into the audit as self-reported /
  example content.
- Remove the failure-theater: social channels no longer preflight and no longer surface a
  "blocked" error as the path to self-report.

## Non-Goals

- OAuth / official platform APIs (out of scope for a free lead magnet; Meta App Review required).
- Paid scraping services (Apify, Bright Data, etc.).
- Scraping social *profiles* or enumerating multiple posts — only individual post URLs the user
  pastes.
- Changing the website (Firecrawl) or email (self-report config) flows.

## Architecture

### User flow (per social channel)

In Channel Details, each active social channel (Instagram / Facebook / LinkedIn) presents a
two-option choice — not pre-selected:

> **Instagram** — How would you like to share your Instagram?
> **[ Paste example posts ]** · **[ Describe it manually ]**

- **Paste example posts:** 1–3 link fields (start with one; "+ add another post" up to 3). Each
  field runs the live check (below).
- **Describe it manually:** the existing self-report questions (post frequency / content types /
  describe a recent post) — the current `FallbackChannelForm` content, rehomed.
- The user can switch methods for a channel at any time.

Website keeps its URL field + Firecrawl scrape. Email keeps its config block. Neither changes.

### Live link check

When a link field is filled (on blur / paste, debounced ~400ms), it calls `POST /api/fetch-post`
and renders inline status:

| State | Indicator + copy |
|---|---|
| Checking | spinner · "Checking this post…" |
| Success | ✓ · "Got it — post from @&lt;author&gt;" + the fetched caption shown as confirmation |
| Blocked | ⚠ · "Couldn't access this post — &lt;platform&gt; sometimes blocks automated access. Try another post, or **describe your posts manually instead →**" (the link switches this channel to manual mode) |
| Invalid | ⚠ · "That doesn't look like a post link — paste a link to a single post." |

### API route: `POST /api/fetch-post`

Request: `{ url: string }`

Behavior:
1. Validate the URL is a recognized social **post** URL against an **allowlist of hosts**
   (instagram.com, www.instagram.com, facebook.com, fb.watch, linkedin.com, and common
   variants). Reject anything else → `{ status: 'invalid' }`. This allowlist is also the SSRF
   guard — the route fetches a user-supplied URL server-side, so it must never fetch arbitrary
   or internal hosts.
2. `fetch(url, { headers: { 'user-agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)' }, redirect: 'follow', signal: AbortSignal.timeout(8000) })`.
3. Parse `og:title`, `og:description`, `og:image` from the returned HTML. Decode HTML entities.
4. If no `og:title` is present (login wall / no preview data) → `{ status: 'blocked' }`.
5. Otherwise → `{ status: 'ok', caption, imageUrl, author }`, where `caption` comes from
   `og:title` (falling back to `og:description`), `author` is parsed from the `og:title`
   pattern ("&lt;author&gt; on Instagram: …") when available, `imageUrl` from `og:image`.

Always responds `200` with a `status` discriminator so the client handles every case uniformly;
network/timeout errors map to `{ status: 'blocked' }` (same user-facing treatment).

### Data model

Replace the social channel's `FallbackChannelData` usage with a per-channel discriminated union:

```ts
export interface FetchedPost {
  url: string
  caption: string
  imageUrl?: string
  author?: string
}

export type SocialInput =
  | { method: 'links'; posts: FetchedPost[] }
  | { method: 'manual'; postFrequency: string; contentTypes: string[]; recentPosts: string }
```

The wizard state gains a dedicated field, `socialInputs: Partial<Record<Channel, SocialInput>>`
(a new key on `WizardState` with its own reducer action), keeping social input separate from
`channelDetails` (URLs) and `preflightResults` (website reachability) rather than overloading
either. `FallbackChannelData` is retained as the shape inside the `'manual'` variant (its three
fields are unchanged). The audit request body gains `socialInputs` alongside the existing
`channelDetails` / `preflightResults` / `businessInfo`.

### How it feeds the audit

`app/api/audit/route.ts` builds a summary block per channel. For social channels it reads the
`SocialInput`:

- `method: 'links'` → a block listing each fetched post's caption (and noting the image), framed
  as "self-reported example posts — no score."
- `method: 'manual'` → the existing self-report block (frequency / content types / described
  posts), unchanged.

Both are labeled self-reported (score `null`), exactly like today's fallback path — so the
model's scoring rules do not change; social channels simply carry richer input when links
succeed.

### Preflight

Social channels **no longer run preflight**. The HEAD-check → "blocked" → fallback-form path is
removed for social (it only ever produced failure theater). Website still preflights and scrapes
via Firecrawl; email is unchanged.

## Components & Files

**New:**
- `app/api/fetch-post/route.ts` — the OG-fetch route (host allowlist, unfurl-bot UA, OG parse).
- `components/ui/SocialChannelInput.tsx` — per-channel: the method choice + renders either the
  link fields or the manual questions.
- `components/ui/PostLinkField.tsx` — a single link field with its live-check status states.
- `lib/og-fetch.ts` — the fetch + OG-parse helper (host allowlist, entity decode), so the route
  stays thin and the parser is unit-testable in isolation.

**Modified:**
- `lib/types.ts` — add `FetchedPost` and `SocialInput`; keep `FallbackChannelData`.
- `components/steps/StepChannelDetails.tsx` — social channels use `SocialChannelInput` instead of
  URL→preflight→fallback; website/email paths unchanged; drop social from the preflight set.
- `app/api/audit/route.ts` — read `SocialInput` when building social channel summaries.

**Reused:**
- The manual-mode questions are the existing `FallbackChannelForm` content (frequency / content
  types / recent posts), moved into `SocialChannelInput`'s manual branch.

## Error handling & degradation

- Every `/api/fetch-post` outcome is a visible, expected state — success, blocked, or invalid.
  There is no unhandled failure; blocked is a first-class result with a manual path attached.
- **Production IP risk:** the OG fetch was verified from a residential IP. Vercel production runs
  on datacenter IPs, which Instagram may serve or may rate-limit/block. This cannot be verified
  before deploy. The design absorbs it: if prod fetches are blocked, users see the "couldn't
  access → describe manually" nudge and use manual entry — the feature degrades to exactly the
  self-report experience, with no dead end. The spec explicitly does not promise a prod hit rate.
- **ToS/fragility:** reading OG preview tags is the same mechanism every link-unfurler uses, but
  it is outside the platforms' formal terms and could change. Acceptable for a free lead magnet;
  noted, not mitigated.

## Early de-risking: verify the prod-IP hit rate first

The single biggest unknown is whether the `facebookexternalhit`-UA fetch works from Vercel's
datacenter IPs (it's only been verified from a residential IP — see Error handling). This should
be resolved **before** UI is built around it, because the answer reshapes priorities:

- **The plan's first implementable task should be:** ship a minimal `/api/fetch-post` (route +
  `lib/og-fetch.ts` only, no UI) to a **Vercel preview deployment**, then call it from that
  deployment against a few real public post URLs and record whether they return `ok` or
  `blocked`.
- **If it works from prod IPs:** proceed with the full design as written (link method as the
  featured path).
- **If prod IPs are blocked:** the feature still ships, but the framing shifts — manual entry
  becomes the primary path and the link method is a residential-only bonus. Better to learn this
  from one deploy than after building the full per-channel UI.

This front-loads the risk into a cheap, throwaway check rather than discovering it post-build.

## Testing / verification

- **Unit:** `lib/og-fetch.ts` OG-parsing and host-allowlist logic (given sample HTML → parsed
  fields; given disallowed host → rejected). These are pure and jest-testable.
- **Live (dev server):** walk the real Channel Details step, choose "paste example posts" for
  Instagram, paste a real public post URL, and confirm the live check shows success with the
  caption; paste a bad/blocked URL and confirm the manual nudge appears. This is the primary
  proof, since the feature is the live fetch.
- **Preview harness:** add settled states (link-success, manual, blocked) to `/preview` so the UI
  can be reviewed with mock data (no live fetch).

## Risks

- **Prod IP blocking** (above) — the main unknown; verified early via the Vercel-preview check
  (see "Early de-risking") and absorbed by graceful degradation regardless of the outcome.
- **OG-parse brittleness** — platforms vary their tag formats; the parser reads standard `og:*`
  tags and tolerates missing fields (missing `og:title` → blocked). Isolated in `lib/og-fetch.ts`
  so it's easy to adjust.
- **SSRF** — mitigated by the host allowlist; the route never fetches non-allowlisted hosts.
