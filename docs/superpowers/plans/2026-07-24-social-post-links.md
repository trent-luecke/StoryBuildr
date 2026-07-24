# Social Post Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users paste links to individual social posts and pull real caption/engagement content from them via a server-side Open-Graph fetch, falling back gracefully to manual self-report when a fetch is blocked.

**Architecture:** A thin `POST /api/fetch-post` route delegates to a pure, unit-testable `lib/og-fetch.ts` helper that host-allowlists the URL (the allowlist is also the SSRF guard), fetches it with the `facebookexternalhit` unfurl-bot User-Agent under an 8s timeout, and parses `og:*` tags into a discriminated `{ status: 'ok' | 'blocked' | 'invalid' }` response. On the client, each social channel offers a two-way choice — paste example post links (live-checked) or describe manually — stored in a new `socialInputs` slice of wizard state and fed to the audit as self-reported content. Social channels no longer preflight.

**Tech Stack:** Next.js 16.2.9 (App Router, Route Handlers), React 19, TypeScript, react-hook-form (website/email only), Tailwind v4, jest + React Testing Library, `@ai-sdk/anthropic` + `ai` (audit route, unchanged).

## Global Constraints

- **This is NOT the Next.js in your training data.** The route-handler contract for 16.2.9 is documented in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route.md`. Route handlers use the Web `Request`/`Response` API; `NextResponse.json(...)` is available from `next/server`. Read that doc before writing `app/api/fetch-post/route.ts` if anything below is unclear.
- **Zero new dependencies, zero cost.** No Firecrawl for social (it refuses social platforms as policy), no Apify/Bright Data, no OAuth. The OG fetch is a plain `fetch`.
- **The unfurl-bot UA is load-bearing.** The exact header value must be `facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)`. A normal browser UA gets a login wall.
- **The fetch MUST use `AbortSignal.timeout(8000)`** so a hung request never stalls the UI.
- **The host allowlist IS the SSRF guard.** The route fetches a user-supplied URL server-side; it must NEVER fetch a non-allowlisted host. Any non-allowlisted or unparseable URL → `{ status: 'invalid' }` with no fetch.
- **`/api/fetch-post` always responds `200`** with a `status` discriminator; network/timeout errors map to `{ status: 'blocked' }` (same user-facing treatment as a login wall).
- **Prod-IP risk is real and unverifiable pre-deploy.** The fetch was proven from a residential IP only. Vercel prod is a datacenter IP that Instagram may block. The feature is best-effort and MUST degrade to manual entry — never make the link method required, never create a dead end.
- **Branch:** `feat/social-post-links` (already checked out; spec already committed here).
- **Commit trailer:** every commit message ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Type gate:** `npx tsc --noEmit` must pass. **Test gate:** `npm test` (currently 28 passing) must stay green.
- **Copy/brand:** reuse existing color tokens (`#81A1D3` accent, `#1E212E` ink, `#444444` body, `#f0f5fb` accent-bg). Match the existing Tailwind class idiom in `StepChannelDetails.tsx` / `FallbackChannelForm.tsx`.

---

## File Structure

**New:**
- `lib/og-fetch.ts` — pure helper: host allowlist / SSRF guard (`isAllowedPostUrl`), OG-tag parser (`parseOgTags`), entity decode (`decodeEntities`), author extractor (`extractAuthor`), and the orchestrating `fetchPost`. Exports the `FetchPostResponse` type.
- `app/api/fetch-post/route.ts` — thin `POST` handler that validates the body shape and delegates to `fetchPost`.
- `components/ui/PostLinkField.tsx` — one link input with debounced live-check and its four inline status states (checking / ok / blocked / invalid).
- `components/ui/SocialChannelInput.tsx` — per social channel: the method choice (paste links vs describe manually) and the branch it renders.
- Test files: `__tests__/lib/og-fetch.test.ts`, `app/api/fetch-post/__tests__/route.test.ts`, `components/ui/__tests__/PostLinkField.test.tsx`, `components/ui/__tests__/SocialChannelInput.test.tsx`.

**Modified:**
- `lib/types.ts` — add `FetchedPost`, `SocialInput`; add `socialInputs` to `WizardState`; add `SET_SOCIAL_INPUT` action; remove the now-dead `fallback` variant of `PreflightStatus`.
- `hooks/useWizard.tsx` — seed `socialInputs: {}`; handle `SET_SOCIAL_INPUT`.
- `components/steps/StepChannelDetails.tsx` — social channels render `SocialChannelInput`; only Website preflights; drop social from the preflight/fallback path.
- `app/api/audit/route.ts` — read `socialInputs` when building social channel summaries; drop the dead `fallback` branch.
- `components/steps/StepAuditLoading.tsx` — include `socialInputs` in the `/api/audit` POST body.
- `lib/preview/mock-data.ts` — add `socialInputs` to `HAPPY_PATH`; add link-success / manual / blocked preview views.
- `components/steps/__tests__/channel-details-email.test.tsx` — update to the new email-only flow (no website ⇒ button is "Begin Audit", no preflight call).

**Deleted:**
- `components/ui/FallbackChannelForm.tsx` — its questions are rehomed into `SocialChannelInput`'s manual branch; nothing else imports it.

---

## Task 1: `lib/og-fetch.ts` — pure OG-fetch helper + unit tests

**Files:**
- Create: `lib/og-fetch.ts`
- Test: `__tests__/lib/og-fetch.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module; uses global `fetch`).
- Produces:
  - `type FetchPostResponse = { status: 'ok'; caption: string; imageUrl?: string; author?: string } | { status: 'blocked' } | { status: 'invalid' }`
  - `function isAllowedPostUrl(raw: string): boolean`
  - `function decodeEntities(input: string): string`
  - `function parseOgTags(html: string): { title?: string; description?: string; image?: string }`
  - `function extractAuthor(ogTitle: string): string | undefined`
  - `async function fetchPost(rawUrl: string): Promise<FetchPostResponse>`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/og-fetch.test.ts`:

```ts
import {
  isAllowedPostUrl,
  decodeEntities,
  parseOgTags,
  extractAuthor,
  fetchPost,
} from '@/lib/og-fetch'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch
afterEach(() => mockFetch.mockReset())

const OG_HTML = `<!doctype html><html><head>
  <meta property="og:title" content="Jane Doe on Instagram: &quot;Leg day PRs&quot;" />
  <meta property="og:description" content="1,240 likes, 33 comments" />
  <meta property="og:image" content="https://scontent.example/leg.jpg" />
</head><body></body></html>`

describe('isAllowedPostUrl (SSRF guard)', () => {
  it('allows known social hosts', () => {
    expect(isAllowedPostUrl('https://www.instagram.com/p/ABC/')).toBe(true)
    expect(isAllowedPostUrl('https://instagram.com/p/ABC/')).toBe(true)
    expect(isAllowedPostUrl('https://fb.watch/xyz/')).toBe(true)
    expect(isAllowedPostUrl('https://www.linkedin.com/posts/x')).toBe(true)
  })
  it('rejects non-allowlisted and internal hosts', () => {
    expect(isAllowedPostUrl('https://evil.com/p/ABC')).toBe(false)
    expect(isAllowedPostUrl('http://localhost/admin')).toBe(false)
    expect(isAllowedPostUrl('http://169.254.169.254/latest/meta-data')).toBe(false)
  })
  it('rejects unparseable and non-http(s) input', () => {
    expect(isAllowedPostUrl('not a url')).toBe(false)
    expect(isAllowedPostUrl('file:///etc/passwd')).toBe(false)
  })
})

describe('decodeEntities', () => {
  it('decodes named and numeric entities', () => {
    expect(decodeEntities('Tom &amp; Jerry')).toBe('Tom & Jerry')
    expect(decodeEntities('&quot;hi&quot; &#39;yo&#39;')).toBe('"hi" \'yo\'')
    expect(decodeEntities('caf&#233;')).toBe('café')
  })
})

describe('parseOgTags', () => {
  it('extracts og:title / og:description / og:image and decodes entities', () => {
    const og = parseOgTags(OG_HTML)
    expect(og.title).toBe('Jane Doe on Instagram: "Leg day PRs"')
    expect(og.description).toBe('1,240 likes, 33 comments')
    expect(og.image).toBe('https://scontent.example/leg.jpg')
  })
  it('returns undefined fields when tags are absent', () => {
    expect(parseOgTags('<html><head></head></html>')).toEqual({
      title: undefined,
      description: undefined,
      image: undefined,
    })
  })
})

describe('extractAuthor', () => {
  it('pulls the author from the "<author> on <Platform>:" pattern', () => {
    expect(extractAuthor('Jane Doe on Instagram: "Leg day"')).toBe('Jane Doe')
    expect(extractAuthor('@ironpeak on Facebook: post')).toBe('ironpeak')
  })
  it('returns undefined when the pattern is absent', () => {
    expect(extractAuthor('Some random title')).toBeUndefined()
  })
})

describe('fetchPost', () => {
  it('returns invalid for a disallowed host without fetching', async () => {
    const res = await fetchPost('https://evil.com/p/ABC')
    expect(res).toEqual({ status: 'invalid' })
    expect(mockFetch).not.toHaveBeenCalled()
  })
  it('returns ok with caption/author/image on a good response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => OG_HTML })
    const res = await fetchPost('https://www.instagram.com/p/ABC/')
    expect(res).toEqual({
      status: 'ok',
      caption: 'Jane Doe on Instagram: "Leg day PRs"',
      imageUrl: 'https://scontent.example/leg.jpg',
      author: 'Jane Doe',
    })
  })
  it('sends the unfurl-bot UA and an abort signal', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => OG_HTML })
    await fetchPost('https://www.instagram.com/p/ABC/')
    const [, opts] = mockFetch.mock.calls[0]
    expect(opts.headers['user-agent']).toBe(
      'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
    )
    expect(opts.signal).toBeInstanceOf(AbortSignal)
  })
  it('returns blocked when og:title is missing (login wall)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, text: async () => '<html><head></head></html>' })
    const res = await fetchPost('https://www.instagram.com/p/ABC/')
    expect(res).toEqual({ status: 'blocked' })
  })
  it('returns blocked on a non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429, text: async () => '' })
    const res = await fetchPost('https://www.instagram.com/p/ABC/')
    expect(res).toEqual({ status: 'blocked' })
  })
  it('returns blocked when fetch throws (timeout/DNS)', async () => {
    mockFetch.mockRejectedValueOnce(new Error('The operation was aborted'))
    const res = await fetchPost('https://www.instagram.com/p/ABC/')
    expect(res).toEqual({ status: 'blocked' })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- og-fetch`
Expected: FAIL — `Cannot find module '@/lib/og-fetch'`.

- [ ] **Step 3: Write `lib/og-fetch.ts`**

```ts
// lib/og-fetch.ts

export type FetchPostResponse =
  | { status: 'ok'; caption: string; imageUrl?: string; author?: string }
  | { status: 'blocked' }
  | { status: 'invalid' }

// The exact unfurl-bot UA is load-bearing: a normal browser UA gets a login wall.
const UNFURL_UA =
  'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'

// Allowlist doubles as the SSRF guard: the route fetches a user-supplied URL
// server-side, so it must ONLY ever fetch these hosts.
const ALLOWED_HOSTS = new Set([
  'instagram.com',
  'www.instagram.com',
  'facebook.com',
  'www.facebook.com',
  'm.facebook.com',
  'fb.watch',
  'linkedin.com',
  'www.linkedin.com',
])

export function isAllowedPostUrl(raw: string): boolean {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return false
  return ALLOWED_HOSTS.has(url.hostname.toLowerCase())
}

const NAMED_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}

export function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&(?:amp|lt|gt|quot|apos);/g, (m) => NAMED_ENTITIES[m] ?? m)
}

function metaContent(html: string, property: string): string | undefined {
  // Handle both attribute orderings and both property= / name= forms.
  const attrFirst = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
    'i'
  )
  const contentFirst = new RegExp(
    `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
    'i'
  )
  const m = html.match(attrFirst) ?? html.match(contentFirst)
  return m ? decodeEntities(m[1]) : undefined
}

export function parseOgTags(html: string): {
  title?: string
  description?: string
  image?: string
} {
  return {
    title: metaContent(html, 'og:title'),
    description: metaContent(html, 'og:description'),
    image: metaContent(html, 'og:image'),
  }
}

// og:title on IG/FB/LinkedIn posts is often "<author> on <Platform>: <caption>".
export function extractAuthor(ogTitle: string): string | undefined {
  const m = ogTitle.match(/^(.+?)\s+on\s+(?:Instagram|Facebook|LinkedIn)\b/i)
  return m ? m[1].trim().replace(/^@/, '') : undefined
}

export async function fetchPost(rawUrl: string): Promise<FetchPostResponse> {
  if (!isAllowedPostUrl(rawUrl)) return { status: 'invalid' }
  try {
    const res = await fetch(rawUrl, {
      headers: { 'user-agent': UNFURL_UA },
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { status: 'blocked' }
    const html = await res.text()
    const og = parseOgTags(html)
    if (!og.title) return { status: 'blocked' } // login wall / no preview data
    return {
      status: 'ok',
      caption: og.title || og.description || '',
      imageUrl: og.image,
      author: extractAuthor(og.title),
    }
  } catch {
    return { status: 'blocked' } // network/timeout — same user-facing treatment
  }
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- og-fetch`
Expected: PASS (all cases).

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add lib/og-fetch.ts __tests__/lib/og-fetch.test.ts
git commit -m "feat: add og-fetch helper (host allowlist + OG parse + unfurl-bot fetch)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: `app/api/fetch-post/route.ts` — route + preview-deploy de-risking gate

This is the spec's **early de-risking** step: the route ships to a Vercel preview deployment and is called against real public post URLs to learn whether the fetch works from a datacenter IP **before** UI is built around it.

**Files:**
- Create: `app/api/fetch-post/route.ts`
- Test: `app/api/fetch-post/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `fetchPost` and `FetchPostResponse` from `@/lib/og-fetch` (Task 1).
- Produces: `POST /api/fetch-post` accepting `{ url: string }`, always responding `200` with a `FetchPostResponse` JSON body.

- [ ] **Step 1: Write the failing test**

Create `app/api/fetch-post/__tests__/route.test.ts`:

```ts
import { POST } from '../route'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch
afterEach(() => mockFetch.mockReset())

function postReq(body: unknown) {
  return new Request('http://localhost/api/fetch-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const OG_HTML =
  '<meta property="og:title" content="Jane on Instagram: hi" />' +
  '<meta property="og:image" content="https://x/y.jpg" />'

test('returns ok for a good post URL', async () => {
  mockFetch.mockResolvedValueOnce({ ok: true, text: async () => OG_HTML })
  const res = await POST(postReq({ url: 'https://www.instagram.com/p/ABC/' }))
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json.status).toBe('ok')
  expect(json.author).toBe('Jane')
})

test('returns invalid for a disallowed host (200 body, no fetch)', async () => {
  const res = await POST(postReq({ url: 'https://evil.com/p/ABC' }))
  expect(res.status).toBe(200)
  expect((await res.json()).status).toBe('invalid')
  expect(mockFetch).not.toHaveBeenCalled()
})

test('returns invalid when url is missing or not a string', async () => {
  const res = await POST(postReq({ url: 123 }))
  expect(res.status).toBe(200)
  expect((await res.json()).status).toBe('invalid')
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- fetch-post`
Expected: FAIL — `Cannot find module '../route'`.

- [ ] **Step 3: Write `app/api/fetch-post/route.ts`**

```ts
// app/api/fetch-post/route.ts
import { NextResponse } from 'next/server'
import { fetchPost } from '@/lib/og-fetch'

export async function POST(request: Request) {
  let body: { url?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ status: 'invalid' }, { status: 200 })
  }
  if (typeof body.url !== 'string') {
    return NextResponse.json({ status: 'invalid' }, { status: 200 })
  }
  const result = await fetchPost(body.url)
  return NextResponse.json(result, { status: 200 })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- fetch-post`
Expected: PASS.

- [ ] **Step 5: Type-check and commit**

Run: `npx tsc --noEmit` (expect no errors), then:

```bash
git add app/api/fetch-post/route.ts app/api/fetch-post/__tests__/route.test.ts
git commit -m "feat: add /api/fetch-post route delegating to og-fetch

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

- [ ] **Step 6: Verify locally against real public posts (residential IP)**

Start the dev server and call the route with a real, public Instagram post URL (a post the implementer can see logged-out in a browser):

```bash
npm run dev
```

In a second shell:

```bash
curl -s -X POST http://localhost:3000/api/fetch-post \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.instagram.com/p/REAL_PUBLIC_POST_ID/"}'
```

Expected locally: `{"status":"ok","caption":"...","author":"...","imageUrl":"..."}`. Also confirm a bogus post URL on an allowed host (or a private post) returns `{"status":"blocked"}`, and a non-social URL returns `{"status":"invalid"}`.

- [ ] **Step 7: Deploy to a Vercel preview and record the prod-IP hit rate — DE-RISKING GATE**

> This is a human-in-the-loop checkpoint. The repo is not yet `vercel link`ed. Deploy a preview and call the route from the datacenter IP. **Pause here and report the result before starting Task 3.**

```bash
npx vercel link      # first run only; select/create the project
npx vercel deploy     # prints a preview URL, e.g. https://storybuildr-xxxx.vercel.app
```

Then, from the preview deployment, call the route against 2–3 real public post URLs:

```bash
curl -s -X POST https://<preview-url>/api/fetch-post \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://www.instagram.com/p/REAL_PUBLIC_POST_ID/"}'
```

Record, in the task report, whether each returned `ok` or `blocked`.

- **If `ok` from prod IPs:** proceed with the full design — the link method is the featured path.
- **If `blocked` from prod IPs:** the feature still ships exactly as designed (it degrades to the manual nudge), but note in the report that manual entry is the effective primary path in prod. **Do not change any code based on this** — the graceful fallback is already the design. This is a framing/expectations finding, not a code change.

Either way, the remaining tasks are unchanged. Report the outcome and continue.

---

## Task 3: Types + wizard state for `socialInputs`

**Files:**
- Modify: `lib/types.ts`
- Modify: `hooks/useWizard.tsx`
- Test: `__tests__/hooks/useWizard.test.tsx` (add a case)

**Interfaces:**
- Consumes: existing `FallbackChannelData`, `Channel`, `WizardState`, `WizardAction` from `@/lib/types`.
- Produces:
  - `interface FetchedPost { url: string; caption: string; imageUrl?: string; author?: string }`
  - `type SocialInput = { method: 'links'; posts: FetchedPost[] } | ({ method: 'manual' } & FallbackChannelData)`
  - `WizardState.socialInputs: Partial<Record<Channel, SocialInput>>`
  - `WizardAction` gains `{ type: 'SET_SOCIAL_INPUT'; channel: Channel; input: SocialInput }`

- [ ] **Step 1: Write the failing test**

Add to `__tests__/hooks/useWizard.test.tsx`:

```ts
test('starts with an empty socialInputs map', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  expect(result.current.state.socialInputs).toEqual({})
})

test('SET_SOCIAL_INPUT stores a per-channel input and merges', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  act(() =>
    result.current.dispatch({
      type: 'SET_SOCIAL_INPUT',
      channel: 'instagram',
      input: { method: 'links', posts: [{ url: 'https://instagram.com/p/A', caption: 'hi' }] },
    })
  )
  act(() =>
    result.current.dispatch({
      type: 'SET_SOCIAL_INPUT',
      channel: 'facebook',
      input: { method: 'manual', postFrequency: 'Weekly', contentTypes: ['tips'], recentPosts: 'x' },
    })
  )
  expect(result.current.state.socialInputs.instagram).toEqual({
    method: 'links',
    posts: [{ url: 'https://instagram.com/p/A', caption: 'hi' }],
  })
  expect(result.current.state.socialInputs.facebook).toEqual({
    method: 'manual',
    postFrequency: 'Weekly',
    contentTypes: ['tips'],
    recentPosts: 'x',
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- useWizard`
Expected: FAIL — `socialInputs` is undefined / `SET_SOCIAL_INPUT` not handled.

- [ ] **Step 3: Add the types to `lib/types.ts`**

After the `FallbackChannelData` interface (currently lines 29–33), add:

```ts
export interface FetchedPost {
  url: string
  caption: string
  imageUrl?: string
  author?: string
}

// Per social channel: either pasted example-post links (live-fetched) or the
// self-report manual questions. The 'manual' variant reuses FallbackChannelData.
export type SocialInput =
  | { method: 'links'; posts: FetchedPost[] }
  | ({ method: 'manual' } & FallbackChannelData)
```

In the `PreflightStatus` union, **remove the now-dead `fallback` variant** (social no longer preflights; nothing else produces it). Change:

```ts
export type PreflightStatus =
  | { status: 'pass' }
  | { status: 'unreachable' }
  | { status: 'blocked' }
  | { status: 'skipped' }
  | { status: 'fallback'; data: FallbackChannelData }
```

to:

```ts
export type PreflightStatus =
  | { status: 'pass' }
  | { status: 'unreachable' }
  | { status: 'blocked' }
  | { status: 'skipped' }
```

In `WizardState`, add `socialInputs` after `preflightResults`:

```ts
export interface WizardState {
  currentStep: WizardStep
  businessInfo: BusinessInfo | null
  channelDetails: ChannelDetailsData | null
  preflightResults: Partial<Record<Channel, PreflightStatus>> | null
  socialInputs: Partial<Record<Channel, SocialInput>>
  auditResults: AuditResult[] | null
  storyMineAnswers: Partial<Record<number, string>>
  storyPlan: StoryPlan | null
}
```

In `WizardAction`, add the new action (e.g. after `SET_PREFLIGHT_RESULTS`):

```ts
  | { type: 'SET_SOCIAL_INPUT'; channel: Channel; input: SocialInput }
```

- [ ] **Step 4: Wire the reducer in `hooks/useWizard.tsx`**

In `initialState`, add `socialInputs: {}` (after `preflightResults: null`):

```ts
const initialState: WizardState = {
  currentStep: 1,
  businessInfo: null,
  channelDetails: null,
  preflightResults: null,
  socialInputs: {},
  auditResults: null,
  storyMineAnswers: {},
  storyPlan: null,
}
```

In `wizardReducer`, add a case (after `SET_PREFLIGHT_RESULTS`):

```ts
    case 'SET_SOCIAL_INPUT':
      return {
        ...state,
        socialInputs: { ...state.socialInputs, [action.channel]: action.input },
      }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- useWizard`
Expected: PASS.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: errors ONLY in files that still reference the removed `fallback` variant — namely `components/steps/StepChannelDetails.tsx` and `app/api/audit/route.ts`. These are rewritten in Tasks 6 and 7. That is expected at this checkpoint; do not patch them here.

> Note: because tsc will not be fully clean until Task 7, run the **test suite** as the gate for this commit (`npm test` — the failing-to-compile step files are not imported by any test yet except `channel-details-email.test.tsx`, which is updated in Task 6). If `npm test` surfaces a compile error from `StepChannelDetails.tsx`, that is expected; proceed — Task 6 resolves it. Commit the type/state changes now:

- [ ] **Step 7: Commit**

```bash
git add lib/types.ts hooks/useWizard.tsx __tests__/hooks/useWizard.test.tsx
git commit -m "feat: add socialInputs state slice and SocialInput types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `components/ui/PostLinkField.tsx` — single link field with live check

**Files:**
- Create: `components/ui/PostLinkField.tsx`
- Test: `components/ui/__tests__/PostLinkField.test.tsx`

**Interfaces:**
- Consumes: `FetchPostResponse` from `@/lib/og-fetch`; `FetchedPost` from `@/lib/types`.
- Produces:
  ```ts
  interface PostLinkFieldProps {
    platformLabel: string
    initialPost?: FetchedPost
    previewMode?: boolean
    onResolved: (post: FetchedPost | null) => void
    onSwitchToManual: () => void
  }
  export function PostLinkField(props: PostLinkFieldProps): JSX.Element
  ```
- Behavior: debounced (~400ms) live check on change, immediate check on blur. Calls `POST /api/fetch-post`. Renders inline status: checking / ok (caption + `@author`) / blocked (with "describe manually" button → `onSwitchToManual`) / invalid. On `ok` calls `onResolved(post)`; on blocked/invalid/empty calls `onResolved(null)`. **In `previewMode` it never fetches** — it derives a settled status from the URL (a `#preview=blocked` / `#preview=invalid` sentinel → that state; otherwise `ok`, using `initialPost`'s caption/author if present).

- [ ] **Step 1: Write the failing tests**

Create `components/ui/__tests__/PostLinkField.test.tsx`. These use `previewMode` so no network or timers are involved:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { PostLinkField } from '@/components/ui/PostLinkField'
import { FetchedPost } from '@/lib/types'

function setup(over: Partial<React.ComponentProps<typeof PostLinkField>> = {}) {
  const onResolved = jest.fn()
  const onSwitchToManual = jest.fn()
  render(
    <PostLinkField
      platformLabel="Instagram"
      previewMode
      onResolved={onResolved}
      onSwitchToManual={onSwitchToManual}
      {...over}
    />
  )
  return { onResolved, onSwitchToManual }
}

it('shows the success card with author and caption on an ok result', () => {
  const post: FetchedPost = { url: 'https://instagram.com/p/A', caption: 'Leg day PRs', author: 'ironpeak' }
  const { onResolved } = setup({ initialPost: post })
  expect(screen.getByText(/Got it — post from @ironpeak/i)).toBeInTheDocument()
  expect(screen.getByText('Leg day PRs')).toBeInTheDocument()
  expect(onResolved).toHaveBeenCalledWith(expect.objectContaining({ author: 'ironpeak', caption: 'Leg day PRs' }))
})

it('shows the blocked nudge and switches to manual', () => {
  const post: FetchedPost = { url: 'https://instagram.com/p/B#preview=blocked', caption: '' }
  const { onSwitchToManual, onResolved } = setup({ initialPost: post })
  expect(screen.getByText(/Couldn’t access this post|Couldn't access this post/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /describe your posts manually/i }))
  expect(onSwitchToManual).toHaveBeenCalled()
  expect(onResolved).toHaveBeenCalledWith(null)
})

it('shows the invalid message for a non-post link', () => {
  const post: FetchedPost = { url: 'https://instagram.com/x#preview=invalid', caption: '' }
  setup({ initialPost: post })
  expect(screen.getByText(/doesn’t look like a post link|doesn't look like a post link/i)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- PostLinkField`
Expected: FAIL — `Cannot find module '@/components/ui/PostLinkField'`.

- [ ] **Step 3: Write `components/ui/PostLinkField.tsx`**

```tsx
// components/ui/PostLinkField.tsx
'use client'

import { useEffect, useRef, useState } from 'react'
import { FetchPostResponse } from '@/lib/og-fetch'
import { FetchedPost } from '@/lib/types'

type Status = 'idle' | 'checking' | 'ok' | 'blocked' | 'invalid'

interface PostLinkFieldProps {
  platformLabel: string
  initialPost?: FetchedPost
  previewMode?: boolean
  onResolved: (post: FetchedPost | null) => void
  onSwitchToManual: () => void
}

export function PostLinkField({
  platformLabel,
  initialPost,
  previewMode = false,
  onResolved,
  onSwitchToManual,
}: PostLinkFieldProps) {
  const [url, setUrl] = useState(initialPost?.url ?? '')
  const [status, setStatus] = useState<Status>(initialPost ? 'ok' : 'idle')
  const [result, setResult] = useState<FetchedPost | null>(initialPost ?? null)
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const didMountCheck = useRef(false)

  async function runCheck(value: string) {
    const trimmed = value.trim()
    if (!trimmed) {
      setStatus('idle')
      setResult(null)
      onResolved(null)
      return
    }
    setStatus('checking')

    // Preview harness: never hit the network; derive a settled status.
    if (previewMode) {
      if (trimmed.includes('#preview=blocked')) {
        setResult(null); setStatus('blocked'); onResolved(null); return
      }
      if (trimmed.includes('#preview=invalid')) {
        setResult(null); setStatus('invalid'); onResolved(null); return
      }
      const post: FetchedPost = initialPost
        ? { ...initialPost, url: trimmed }
        : { url: trimmed, caption: 'Sample caption from a real post', author: 'yourgym' }
      setResult(post); setStatus('ok'); onResolved(post); return
    }

    try {
      const res = await fetch('/api/fetch-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data: FetchPostResponse = await res.json()
      if (data.status === 'ok') {
        const post: FetchedPost = {
          url: trimmed,
          caption: data.caption,
          imageUrl: data.imageUrl,
          author: data.author,
        }
        setResult(post); setStatus('ok'); onResolved(post)
      } else {
        setResult(null); setStatus(data.status); onResolved(null)
      }
    } catch {
      setResult(null); setStatus('blocked'); onResolved(null)
    }
  }

  function scheduleCheck(value: string) {
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(() => runCheck(value), 400)
  }

  // In preview mode, resolve a seeded URL once on mount (no fetch) so the
  // harness can show blocked / invalid / ok states from the seed.
  useEffect(() => {
    if (didMountCheck.current) return
    didMountCheck.current = true
    if (previewMode && (initialPost?.url ?? '').trim()) {
      runCheck(initialPost!.url)
    }
    return () => {
      if (debounce.current) clearTimeout(debounce.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      <input
        type="url"
        value={url}
        onChange={(e) => {
          setUrl(e.target.value)
          scheduleCheck(e.target.value)
        }}
        onBlur={() => {
          if (debounce.current) clearTimeout(debounce.current)
          runCheck(url)
        }}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]"
        placeholder={`Paste a link to one ${platformLabel} post`}
      />

      {status === 'checking' && (
        <p className="mt-1.5 text-xs text-[#444444]/70 flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 border-2 border-[#81A1D3] border-t-transparent rounded-full animate-spin" />
          Checking this post…
        </p>
      )}

      {status === 'ok' && result && (
        <div className="mt-1.5 bg-[#f0f5fb] border border-[#81A1D3] rounded-lg px-3 py-2">
          <p className="text-xs font-bold text-[#1E212E]">
            ✓ Got it{result.author ? ` — post from @${result.author}` : ''}
          </p>
          {result.caption && (
            <p className="text-xs text-[#444444] mt-1 whitespace-pre-wrap">{result.caption}</p>
          )}
        </div>
      )}

      {status === 'blocked' && (
        <p className="mt-1.5 text-xs text-amber-700">
          ⚠ Couldn’t access this post — {platformLabel} sometimes blocks automated access. Try
          another post, or{' '}
          <button
            type="button"
            onClick={onSwitchToManual}
            className="underline font-bold hover:text-amber-900"
          >
            describe your posts manually instead →
          </button>
        </p>
      )}

      {status === 'invalid' && (
        <p className="mt-1.5 text-xs text-amber-700">
          ⚠ That doesn’t look like a post link — paste a link to a single post.
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- PostLinkField`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/PostLinkField.tsx components/ui/__tests__/PostLinkField.test.tsx
git commit -m "feat: add PostLinkField with debounced live post check

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: `components/ui/SocialChannelInput.tsx` — method choice + branches; delete FallbackChannelForm

**Files:**
- Create: `components/ui/SocialChannelInput.tsx`
- Test: `components/ui/__tests__/SocialChannelInput.test.tsx`
- Delete: `components/ui/FallbackChannelForm.tsx`

**Interfaces:**
- Consumes: `useWizard` (for `previewMode`); `ChipSelect` from `./ChipSelect`; `PostLinkField` from `./PostLinkField`; `Channel`, `FetchedPost`, `SocialInput`, `FallbackChannelData` from `@/lib/types`.
- Produces:
  ```ts
  interface SocialChannelInputProps {
    channel: Channel
    value?: SocialInput
    onChange: (input: SocialInput) => void
  }
  export function SocialChannelInput(props: SocialChannelInputProps): JSX.Element
  ```
- Behavior: renders the channel label + "How would you like to share your <Label>?" with two unselected pills: **Paste example posts** / **Describe it manually**. Links branch: 1–3 `PostLinkField`s ("+ add another post" up to 3), collecting resolved posts → `onChange({ method: 'links', posts })`. Manual branch: frequency `<select>`, `ChipSelect` content types, recent-posts `<textarea>` → `onChange({ method: 'manual', ... })`. Method may be switched at any time; switching commits the current branch's value.

- [ ] **Step 1: Write the failing tests**

Create `components/ui/__tests__/SocialChannelInput.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { SocialChannelInput } from '@/components/ui/SocialChannelInput'
import { SocialInput } from '@/lib/types'

function setup(value?: SocialInput) {
  const onChange = jest.fn()
  render(
    <WizardProvider previewMode>
      <SocialChannelInput channel="instagram" value={value} onChange={onChange} />
    </WizardProvider>
  )
  return { onChange }
}

it('shows neither branch until a method is chosen', () => {
  setup()
  expect(screen.queryByPlaceholderText(/Paste a link to one Instagram post/i)).toBeNull()
  expect(screen.queryByText(/How often do you post/i)).toBeNull()
})

it('reveals link fields when "Paste example posts" is chosen', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /Paste example posts/i }))
  expect(screen.getByPlaceholderText(/Paste a link to one Instagram post/i)).toBeInTheDocument()
})

it('adds up to three link fields', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /Paste example posts/i }))
  fireEvent.click(screen.getByRole('button', { name: /add another post/i }))
  fireEvent.click(screen.getByRole('button', { name: /add another post/i }))
  expect(screen.getAllByPlaceholderText(/Paste a link to one Instagram post/i)).toHaveLength(3)
  // capped at 3 — the add button is gone
  expect(screen.queryByRole('button', { name: /add another post/i })).toBeNull()
})

it('reveals manual questions and commits manual input', () => {
  const { onChange } = setup()
  fireEvent.click(screen.getByRole('button', { name: /Describe it manually/i }))
  const select = screen.getByText('Select frequency').closest('select') as HTMLSelectElement
  fireEvent.change(select, { target: { value: 'Weekly' } })
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ method: 'manual', postFrequency: 'Weekly' })
  )
})

it('seeds the manual branch from an existing manual value', () => {
  setup({ method: 'manual', postFrequency: 'Weekly', contentTypes: ['tips'], recentPosts: 'a recent post' })
  expect((screen.getByText('Select frequency').closest('select') as HTMLSelectElement).value).toBe('Weekly')
  expect(screen.getByDisplayValue('a recent post')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- SocialChannelInput`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `components/ui/SocialChannelInput.tsx`**

```tsx
// components/ui/SocialChannelInput.tsx
'use client'

import { useState } from 'react'
import { useWizard } from '@/hooks/useWizard'
import { ChipSelect } from './ChipSelect'
import { PostLinkField } from './PostLinkField'
import { Channel, FetchedPost, SocialInput, FallbackChannelData } from '@/lib/types'

const CONTENT_TYPE_OPTIONS = [
  { value: 'promos', label: 'Promotions & announcements' },
  { value: 'tips', label: 'Workout tips' },
  { value: 'spotlights', label: 'Member spotlights' },
  { value: 'bts', label: 'Behind-the-scenes' },
  { value: 'motivation', label: 'Motivational content' },
]
const FREQUENCY_OPTIONS = ['Daily', 'A few times a week', 'Weekly', 'Rarely']

const CHANNEL_LABELS: Partial<Record<Channel, string>> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
}

interface SocialChannelInputProps {
  channel: Channel
  value?: SocialInput
  onChange: (input: SocialInput) => void
}

const pill = (active: boolean) =>
  `rounded-full px-3 py-1.5 text-sm font-medium border transition-colors ${
    active
      ? 'border-[#81A1D3] bg-[#f0f5fb] text-[#81A1D3]'
      : 'border-gray-200 bg-white text-[#444444] hover:border-[#81A1D3]'
  }`

export function SocialChannelInput({ channel, value, onChange }: SocialChannelInputProps) {
  const { previewMode } = useWizard()
  const label = CHANNEL_LABELS[channel] ?? channel
  const [method, setMethod] = useState<'links' | 'manual' | undefined>(value?.method)

  // --- links branch state ---
  const seededPosts = value?.method === 'links' ? value.posts : []
  const [fieldCount, setFieldCount] = useState(Math.max(1, seededPosts.length))
  const [posts, setPosts] = useState<(FetchedPost | null)[]>(() => {
    const arr: (FetchedPost | null)[] = Array(Math.max(1, seededPosts.length)).fill(null)
    seededPosts.forEach((p, i) => (arr[i] = p))
    return arr
  })

  function commitLinks(next: (FetchedPost | null)[]) {
    onChange({ method: 'links', posts: next.filter((p): p is FetchedPost => p != null) })
  }

  function setPostAt(i: number, post: FetchedPost | null) {
    setPosts((prev) => {
      const next = [...prev]
      next[i] = post
      commitLinks(next)
      return next
    })
  }

  // --- manual branch state (local; rehomed from FallbackChannelForm) ---
  const [manual, setManual] = useState<FallbackChannelData>(
    value?.method === 'manual'
      ? { postFrequency: value.postFrequency, contentTypes: value.contentTypes, recentPosts: value.recentPosts }
      : { postFrequency: '', contentTypes: [], recentPosts: '' }
  )

  function updateManual(patch: Partial<FallbackChannelData>) {
    setManual((prev) => {
      const next = { ...prev, ...patch }
      onChange({ method: 'manual', ...next })
      return next
    })
  }

  function chooseMethod(m: 'links' | 'manual') {
    setMethod(m)
    if (m === 'links') commitLinks(posts)
    else onChange({ method: 'manual', ...manual })
  }

  return (
    <div>
      <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <p className="text-sm text-[#444444] mb-2">How would you like to share your {label}?</p>

      <div className="flex gap-2 mb-3">
        <button type="button" onClick={() => chooseMethod('links')} className={pill(method === 'links')}>
          Paste example posts
        </button>
        <button type="button" onClick={() => chooseMethod('manual')} className={pill(method === 'manual')}>
          Describe it manually
        </button>
      </div>

      {method === 'links' && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: fieldCount }).map((_, i) => (
            <PostLinkField
              key={i}
              platformLabel={label}
              previewMode={previewMode}
              initialPost={posts[i] ?? undefined}
              onResolved={(post) => setPostAt(i, post)}
              onSwitchToManual={() => chooseMethod('manual')}
            />
          ))}
          {fieldCount < 3 && (
            <button
              type="button"
              onClick={() => {
                setFieldCount((n) => n + 1)
                setPosts((p) => [...p, null])
              }}
              className="text-xs text-[#81A1D3] font-bold self-start hover:text-[#6b8fbf]"
            >
              + add another post
            </button>
          )}
        </div>
      )}

      {method === 'manual' && (
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">
              How often do you post?
            </label>
            <select
              value={manual.postFrequency}
              onChange={(e) => updateManual({ postFrequency: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]"
            >
              <option value="">Select frequency</option>
              {FREQUENCY_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">
              What types of content do you mostly share?
            </label>
            <ChipSelect
              options={CONTENT_TYPE_OPTIONS}
              value={manual.contentTypes}
              onChange={(v) => updateManual({ contentTypes: v })}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">
              Describe 2–3 recent posts
            </label>
            <textarea
              value={manual.recentPosts}
              onChange={(e) => updateManual({ recentPosts: e.target.value })}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] resize-none focus:outline-none focus:border-[#81A1D3]"
              placeholder="e.g. Before/after transformation photo for a member, a class schedule graphic, a motivational quote..."
            />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- SocialChannelInput`
Expected: PASS.

- [ ] **Step 5: Delete the dead `FallbackChannelForm` after confirming it is unreferenced by code**

`StepChannelDetails.tsx` still imports it at this checkpoint; that import is removed in Task 6. To keep this task's deliverable clean, delete the file here and let Task 6 drop the import (the intervening tsc break is expected and noted in Task 6). Confirm no OTHER code imports it:

Run: `grep -rl "FallbackChannelForm" --include='*.ts' --include='*.tsx' . | grep -v node_modules`
Expected: only `components/steps/StepChannelDetails.tsx` (handled in Task 6). If anything else appears, stop and reassess.

```bash
git rm components/ui/FallbackChannelForm.tsx
```

- [ ] **Step 6: Commit**

```bash
git add components/ui/SocialChannelInput.tsx components/ui/__tests__/SocialChannelInput.test.tsx
git commit -m "feat: add SocialChannelInput; rehome manual questions from FallbackChannelForm

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Rewrite `StepChannelDetails.tsx` — social uses SocialChannelInput; only Website preflights

**Files:**
- Modify: `components/steps/StepChannelDetails.tsx` (full rewrite of the render + flow)
- Modify: `components/steps/__tests__/channel-details-email.test.tsx` (update to new email-only flow)

**Interfaces:**
- Consumes: `useWizard` (`state`, `dispatch`); `SocialChannelInput` (Task 5); `SocialInput`, `Channel`, `ChannelDetailsData`, `PreflightStatus` from `@/lib/types`.
- Produces: dispatches `SET_SOCIAL_INPUT` (per social channel, live), `SET_CHANNEL_DETAILS`, `SET_PREFLIGHT_RESULTS`, `SET_STEP`. Social channels no longer appear in `channelDetails` (no URL) or `preflightResults`. Website preflights via `POST /api/preflight` (unchanged mechanism, website-only). Email block unchanged.

Key behavior changes from the current file:
- Social channels render `<SocialChannelInput>` instead of a URL input + preflight badge + `FallbackChannelForm`.
- Only Website runs the HEAD preflight. The button is "Check & Continue" when a website check is still pending; otherwise "Begin Audit". With no website, it is "Begin Audit" (no `/api/preflight` call at all).
- Email gating (the `usesPlatform` yes/no question) is unchanged and still blocks proceeding.

- [ ] **Step 1: Update the existing test to the new flow**

Rewrite `components/steps/__tests__/channel-details-email.test.tsx`. The seed has `channels: ['email']` — no website — so the primary button is now **"Begin Audit"** and proceeding must NOT call `/api/preflight`:

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

  it('blocks proceeding and shows an error when the gating question is unanswered', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
    expect(screen.getByText('Let us know so we can tailor your email plan.')).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
    jest.resetAllMocks()
  })

  it('proceeds without any preflight call once gating is answered (email-only, no website)', () => {
    global.fetch = jest.fn(() => new Promise(() => {})) as unknown as typeof fetch
    renderStep()
    fireEvent.click(screen.getByRole('button', { name: 'No' }))
    fireEvent.click(screen.getByRole('button', { name: /Begin Audit/i }))
    // no website ⇒ no /api/preflight call
    expect(global.fetch).not.toHaveBeenCalled()
    jest.resetAllMocks()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- channel-details-email`
Expected: FAIL — the current component still renders "Check & Continue" and calls `/api/preflight`; also it still imports the deleted `FallbackChannelForm` (compile error). Both are fixed by the rewrite below.

- [ ] **Step 3: Rewrite `components/steps/StepChannelDetails.tsx`**

Replace the entire file with:

```tsx
// components/steps/StepChannelDetails.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useWizard } from '@/hooks/useWizard'
import { STEP_CARD } from '@/components/wizard/stepLayout'
import { SocialChannelInput } from '@/components/ui/SocialChannelInput'
import { Channel, ChannelDetailsData, PreflightStatus, SocialInput } from '@/lib/types'

const CHANNEL_LABELS: Record<Channel, string> = {
  instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn',
  website: 'Website', email: 'Email',
}

type WebsiteState = 'idle' | 'checking' | 'pass' | 'unreachable' | 'skipped'

function seededFormValues(cd: ChannelDetailsData | null): Record<string, string> {
  if (!cd) return {}
  const v: Record<string, string> = {}
  if (cd.website) v.website = cd.website.url
  if (cd.email) {
    v['email-platform'] = cd.email.platform ?? ''
    v['email-other-platform'] = cd.email.otherPlatform ?? ''
    v['email-subscribers'] = String(cd.email.subscriberCount)
    v['email-frequency'] = cd.email.sendFrequency
  }
  return v
}

export function StepChannelDetails() {
  const { state, dispatch } = useWizard()
  const channels = state.businessInfo?.channels ?? []
  const socialChannels = channels.filter((c) => c !== 'email' && c !== 'website')
  const hasWebsite = channels.includes('website')
  const hasEmail = channels.includes('email')

  const { register, getValues, watch, setValue } = useForm<Record<string, string>>({
    defaultValues: seededFormValues(state.channelDetails),
  })

  const [websiteState, setWebsiteState] = useState<WebsiteState>(() => {
    const w = state.preflightResults?.website
    if (w?.status === 'pass') return 'pass'
    if (w?.status === 'skipped') return 'skipped'
    if (w?.status === 'unreachable') return 'unreachable'
    return 'idle'
  })
  const [isChecking, setIsChecking] = useState(false)
  const [emailUsesPlatform, setEmailUsesPlatform] = useState<boolean | undefined>(
    state.channelDetails?.email?.usesPlatform
  )
  const [emailError, setEmailError] = useState<string | null>(null)
  const platformValue = watch('email-platform')

  const websiteResolved = !hasWebsite || websiteState === 'pass' || websiteState === 'skipped'
  const needsWebsiteCheck = hasWebsite && websiteState !== 'pass' && websiteState !== 'skipped'

  function handleSocialChange(channel: Channel, input: SocialInput) {
    dispatch({ type: 'SET_SOCIAL_INPUT', channel, input })
  }

  async function runWebsiteCheck() {
    if (hasEmail && emailUsesPlatform === undefined) {
      setEmailError('Let us know so we can tailor your email plan.')
      return
    }
    if (!hasWebsite) {
      proceed()
      return
    }
    setIsChecking(true)
    setWebsiteState('checking')
    const res = await fetch('/api/preflight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls: { website: getValues('website') } }),
    })
    const results: Partial<Record<Channel, PreflightStatus>> = await res.json()
    const status = results.website?.status ?? 'unreachable'
    const next: WebsiteState = status === 'pass' ? 'pass' : status === 'skipped' ? 'skipped' : 'unreachable'
    setWebsiteState(next)
    setIsChecking(false)
    if (next === 'pass') proceed('pass')
  }

  function skipWebsite() {
    setWebsiteState('skipped')
  }

  // `overrideWebsite` lets runWebsiteCheck proceed immediately with the freshly
  // computed 'pass' before the state update has flushed.
  function proceed(overrideWebsite?: WebsiteState) {
    if (hasEmail && emailUsesPlatform === undefined) {
      setEmailError('Let us know so we can tailor your email plan.')
      return
    }
    const ws = overrideWebsite ?? websiteState
    const vals = getValues()
    const channelDetails: ChannelDetailsData = {}
    if (hasWebsite && ws !== 'skipped') channelDetails.website = { url: vals.website }
    if (hasEmail) {
      channelDetails.email = {
        usesPlatform: emailUsesPlatform,
        platform: emailUsesPlatform ? (getValues('email-platform') || undefined) : undefined,
        otherPlatform:
          emailUsesPlatform && getValues('email-platform') === 'Other'
            ? (getValues('email-other-platform') || undefined)
            : undefined,
        subscriberCount: parseInt(vals['email-subscribers'] || '0'),
        sendFrequency: vals['email-frequency'],
      }
    }

    const preflightResults: Partial<Record<Channel, PreflightStatus>> = {}
    if (hasWebsite) preflightResults.website = ws === 'skipped' ? { status: 'skipped' } : { status: 'pass' }
    if (hasEmail) preflightResults.email = { status: 'pass' }

    dispatch({ type: 'SET_CHANNEL_DETAILS', data: channelDetails })
    dispatch({ type: 'SET_PREFLIGHT_RESULTS', data: preflightResults })
    dispatch({ type: 'SET_STEP', step: 4 })
  }

  return (
    <div className={STEP_CARD}>
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Step 3</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Your channel details</h2>
      <p className="text-sm text-[#444444] mb-6">We&apos;ll use these to audit your current content.</p>

      <div className="flex flex-col gap-6">
        {socialChannels.map((channel) => (
          <SocialChannelInput
            key={channel}
            channel={channel}
            value={state.socialInputs[channel]}
            onChange={(input) => handleSocialChange(channel, input)}
          />
        ))}

        {hasWebsite && (
          <div>
            <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">
              {CHANNEL_LABELS.website} URL
              {websiteState === 'pass' && <span className="ml-2 text-green-600 normal-case font-normal">✓ Accessible</span>}
              {websiteState === 'unreachable' && <span className="ml-2 text-red-500 normal-case font-normal">⚠ Unreachable</span>}
              {websiteState === 'skipped' && <span className="ml-2 text-[#444444]/50 normal-case font-normal">Skipped</span>}
            </label>
            <input
              {...register('website')}
              disabled={websiteState === 'skipped'}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3] disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="https://yourgym.com"
            />
            {websiteState === 'unreachable' && (
              <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                <p className="text-xs text-red-700 mb-2">We had trouble reaching this URL. You can update it and try again, or skip this channel.</p>
                <button type="button" onClick={skipWebsite} className="text-xs text-[#444444]/60 hover:text-[#444444]">Skip this channel</button>
              </div>
            )}
          </div>
        )}

        {hasEmail && (
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">Marketing Email List</p>
            <p className="text-xs text-[#444444]/70 mb-3">Got more than one list? Describe your marketing list: the one for promos, new offerings, and events you send to members and past leads, not a members-only newsletter.</p>
            <div className="flex flex-col gap-3">
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
        {needsWebsiteCheck ? (
          <button type="button" onClick={runWebsiteCheck} disabled={isChecking} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors">
            {isChecking ? 'Checking…' : websiteState === 'unreachable' ? 'Re-check →' : 'Check & Continue →'}
          </button>
        ) : (
          <button type="button" onClick={() => proceed()} disabled={!websiteResolved} className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] disabled:opacity-50 transition-colors">
            Begin Audit →
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run the updated test to verify it passes**

Run: `npm test -- channel-details-email`
Expected: PASS.

- [ ] **Step 5: Type-check the full project**

Run: `npx tsc --noEmit`
Expected: errors ONLY remaining in `app/api/audit/route.ts` (still reads the removed `fallback` variant) — fixed in Task 7. No other file should error. If `StepChannelDetails.tsx` still errors, resolve before continuing.

- [ ] **Step 6: Commit**

```bash
git add components/steps/StepChannelDetails.tsx components/steps/__tests__/channel-details-email.test.tsx
git commit -m "feat: social channels use SocialChannelInput; only website preflights

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Feed `socialInputs` into the audit

**Files:**
- Modify: `app/api/audit/route.ts`
- Modify: `components/steps/StepAuditLoading.tsx`

**Interfaces:**
- Consumes: `SocialInput` from `@/lib/types`; `state.socialInputs` from the wizard.
- Produces: the `/api/audit` request body gains `socialInputs`; the route reads it to build social channel summaries. Social channels are labeled self-reported (`score: null`) — scoring rules do not change.

- [ ] **Step 1: Send `socialInputs` from `StepAuditLoading.tsx`**

In the `/api/audit` fetch body (currently lines 42–51), add `socialInputs`:

```tsx
          body: JSON.stringify({
            channelDetails: state.channelDetails,
            preflightResults: state.preflightResults,
            socialInputs: state.socialInputs,
            businessInfo: {
              gymName: state.businessInfo!.gymName,
              icp: state.businessInfo!.icp,
              channels: state.businessInfo!.channels,
              services: state.businessInfo!.services,
              otherServices: state.businessInfo!.otherServices,
            },
          }),
```

- [ ] **Step 2: Update `app/api/audit/route.ts`**

Change the imports on line 8 to bring in `SocialInput` and drop the unused `FallbackChannelData`:

```ts
import { Channel, ChannelDetailsData, PreflightStatus, SocialInput } from '@/lib/types'
```

Add `socialInputs` to the request-body type (in the `const body: {...}` on lines 25–29):

```ts
  const body: {
    channelDetails: ChannelDetailsData
    preflightResults: Partial<Record<Channel, PreflightStatus>>
    socialInputs?: Partial<Record<Channel, SocialInput>>
    businessInfo: { gymName: string; icp: string; channels: Channel[]; services?: string[]; otherServices?: string }
  } = await request.json()
```

Add a social-channel set near the top of `POST` (after the body parse):

```ts
  const SOCIAL = new Set<Channel>(['instagram', 'facebook', 'linkedin'])
```

Replace the `channelSummaries` builder (currently lines 45–68). Social channels branch on `socialInputs` FIRST; the `fallback` branch is removed (it no longer exists):

```ts
  const channelSummaries = body.businessInfo.channels
    .map((channel) => {
      if (SOCIAL.has(channel)) {
        const si = body.socialInputs?.[channel]
        if (!si) {
          return `## ${channel} (Self-reported — no details provided; do not score)`
        }
        if (si.method === 'links') {
          const lines = si.posts
            .map((p, i) => `Post ${i + 1}${p.author ? ` by @${p.author}` : ''}: ${p.caption}${p.imageUrl ? ' [has image]' : ''}`)
            .join('\n')
          return `## ${channel} (Self-reported example posts — no score, use "Self-reported" badge)
${lines || 'No posts provided'}`
        }
        return `## ${channel} (Self-reported — no score, use "Self-reported" badge)
Post frequency: ${si.postFrequency}
Content types: ${si.contentTypes.join(', ')}
Recent posts described: ${si.recentPosts}`
      }

      const preflight = body.preflightResults[channel]
      if (preflight?.status === 'skipped') {
        return `## ${channel} (SKIPPED — exclude from audit)`
      }
      if (channel === 'email') {
        const em = body.channelDetails.email
        return em ? buildAuditEmailBlock(em) : '## email (Self-reported)\nNo details provided'
      }
      const scrapeResult = scraped.find((s) => s.channel === channel)
      if (!scrapeResult || scrapeResult.content === 'scrape_unavailable') {
        return `## ${channel} (Scrape unavailable — note this in narrative, do not score)`
      }
      return `## ${channel}\n${scrapeResult.content}`
    })
    .join('\n\n')
```

> The `scrapableUrls` loop above it (lines 31–40) is unchanged: social channels never have `preflight.status === 'pass'` anymore, so only Website is scraped. No edit needed there.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: **no errors** across the whole project now (the `fallback` variant is fully gone).

- [ ] **Step 4: Run the full suite**

Run: `npm test`
Expected: all green (original 28 + the new tests from Tasks 1–6).

- [ ] **Step 5: Commit**

```bash
git add app/api/audit/route.ts components/steps/StepAuditLoading.tsx
git commit -m "feat: feed socialInputs into the audit as self-reported content

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Preview harness — settled social states

**Files:**
- Modify: `lib/preview/mock-data.ts`

**Interfaces:**
- Consumes: `WizardState`, `SocialInput` shapes; `PostLinkField`'s preview convention (`#preview=blocked` / `#preview=invalid` sentinels in a seeded post URL; any other URL → `ok`).
- Produces: three new `PREVIEW_VIEWS` entries showing the settled link-success, manual, and blocked states of `StepChannelDetails`, plus a `socialInputs` field on `HAPPY_PATH` so it satisfies the updated `WizardState` type.

- [ ] **Step 1: Add `socialInputs` to `HAPPY_PATH`**

`HAPPY_PATH` is typed `WizardState`, which now requires `socialInputs`. Add it (after `preflightResults`, before `auditResults`):

```ts
  socialInputs: {
    instagram: {
      method: 'links',
      posts: [
        {
          url: 'https://www.instagram.com/p/EXAMPLE1/',
          caption: 'Member spotlight: Sarah hit 20 pushups today 💪',
          author: 'ironpeakfitness',
          imageUrl: 'https://example.com/sarah.jpg',
        },
      ],
    },
    facebook: {
      method: 'manual',
      postFrequency: 'Weekly',
      contentTypes: ['promos', 'spotlights'],
      recentPosts: 'Class schedule graphic, a member win, and a weekend challenge announcement.',
    },
  },
```

- [ ] **Step 2: Add the three settled preview views**

Append to the `PREVIEW_VIEWS` array (after the existing `channel-details` entry). Each seeds a single-social-channel business so the state under review is unambiguous:

```ts
  {
    id: 'channel-links-success',
    label: '3 · Social: link success',
    seed: {
      currentStep: 3,
      businessInfo: { gymName: 'Iron Peak Fitness', services: ['Group Classes'], icp: HAPPY_PATH.businessInfo!.icp, channels: ['instagram'] },
      socialInputs: {
        instagram: {
          method: 'links',
          posts: [
            { url: 'https://www.instagram.com/p/EXAMPLE1/', caption: 'Member spotlight: Sarah hit 20 pushups today 💪', author: 'ironpeakfitness' },
          ],
        },
      },
    },
  },
  {
    id: 'channel-manual',
    label: '3 · Social: manual',
    seed: {
      currentStep: 3,
      businessInfo: { gymName: 'Iron Peak Fitness', services: ['Group Classes'], icp: HAPPY_PATH.businessInfo!.icp, channels: ['instagram'] },
      socialInputs: {
        instagram: {
          method: 'manual',
          postFrequency: 'A few times a week',
          contentTypes: ['tips', 'spotlights', 'motivation'],
          recentPosts: 'Before/after transformation, a class schedule graphic, and a motivational quote card.',
        },
      },
    },
  },
  {
    id: 'channel-links-blocked',
    label: '3 · Social: blocked',
    seed: {
      currentStep: 3,
      businessInfo: { gymName: 'Iron Peak Fitness', services: ['Group Classes'], icp: HAPPY_PATH.businessInfo!.icp, channels: ['instagram'] },
      socialInputs: {
        instagram: {
          method: 'links',
          // Preview-only sentinel: PostLinkField renders the blocked state without a live fetch.
          posts: [{ url: 'https://www.instagram.com/p/EXAMPLE2/#preview=blocked', caption: '' }],
        },
      },
    },
  },
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Visually verify the preview views**

Start the dev server (`npm run dev`) and open `/preview`. Using the Browser pane / preview tools:
- Click **"3 · Social: link success"** → the Instagram channel shows "Paste example posts" selected with a green ✓ success card and the caption.
- Click **"3 · Social: manual"** → "Describe it manually" selected with frequency, content chips, and the recent-posts text filled.
- Click **"3 · Social: blocked"** → the amber "Couldn't access this post … describe your posts manually instead →" nudge; clicking it switches the channel to the manual branch.

Capture a screenshot of each for the review record.

- [ ] **Step 5: Commit**

```bash
git add lib/preview/mock-data.ts
git commit -m "feat: add settled social preview states (link success / manual / blocked)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: End-to-end verification + docs

**Files:**
- No code changes (verification only). Commit any doc updates if made.

- [ ] **Step 1: Full gates**

Run: `npx tsc --noEmit` → no errors.
Run: `npm test` → all green.

- [ ] **Step 2: Live dev-server proof — the primary acceptance test**

Start `npm run dev`, walk to Step 3 (Channel Details) with a social channel active, choose **"Paste example posts"** for Instagram, and:
- Paste a **real public Instagram post URL** → confirm the live check shows the success card with the caption (and `@author` when parsed). This exercises `POST /api/fetch-post` against a live IP.
- Paste a **private/blocked or bogus post URL on an allowed host** → confirm the amber "couldn't access … describe your posts manually instead →" nudge, and that clicking it switches the channel to the manual branch.
- Paste a **non-social URL** (e.g. `https://example.com`) → confirm the "That doesn't look like a post link" invalid message.

Capture the success and blocked states as screenshots for the completion record.

- [ ] **Step 3: Confirm the audit receives social content**

Complete the wizard through the audit with a link-method social channel and confirm (via server logs or the audit result) that the social channel appears as self-reported (`score: null`) with the pasted caption reflected — not as a scraped/scored channel.

- [ ] **Step 4: Verify `/preview` in a preview deployment (optional but recommended)**

If a Vercel preview from Task 2 is still available, redeploy and confirm `/preview` renders (it 404s only in production). This confirms the settled states render on the deployed build.

- [ ] **Step 5: Finalize**

Confirm the working tree is clean and all task commits are present:

```bash
git status
git log --oneline feat/social-post-links -12
```

Then use the `superpowers:finishing-a-development-branch` skill to decide how to integrate (this branch merges toward `main` per the branch workflow; refer to the StoryBuildr branch-workflow memory).

---

## Self-Review

**Spec coverage:**
- Two-option per-channel choice (paste links / describe manually), not pre-selected, switchable → Task 5 (`SocialChannelInput`).
- 1–3 link fields with "+ add another post" → Task 5.
- Live check on blur/paste, debounced ~400ms, four inline states → Task 4 (`PostLinkField`).
- Blocked → "describe manually" switches the channel to manual → Tasks 4 + 5.
- `POST /api/fetch-post` with host allowlist (= SSRF guard), unfurl-bot UA, `AbortSignal.timeout(8000)`, OG parse, entity decode, author extraction, always-200 discriminated response, network errors → blocked → Tasks 1 + 2.
- Data model: `FetchedPost`, `SocialInput` union, `socialInputs` state slice + action, `FallbackChannelData` retained inside the manual variant → Task 3.
- Audit reads `SocialInput`, both methods labeled self-reported (`score: null`) → Task 7.
- Social no longer preflights; failure-theater removed → Task 6 (+ `fallback` variant removed in Task 3, dead branch removed in Task 7).
- Website (Firecrawl) and email flows unchanged → Task 6 preserves both.
- Unit tests for `lib/og-fetch.ts` (parse + allowlist) → Task 1. Live dev-server proof → Task 9. Preview settled states → Task 8.
- Early de-risking: minimal route to a Vercel preview, called against real posts, before UI → Task 2 (gate before Tasks 3+).

**Placeholder scan:** No TBD/TODO/"add error handling"/"similar to Task N". Every code step shows full code; every command has an expected result.

**Type consistency:** `FetchPostResponse` (og-fetch) and `FetchedPost` (types) are distinct and used consistently; `SocialInput` union shape matches across types/state/component/audit; `SET_SOCIAL_INPUT` action signature matches its dispatch sites; `previewMode` threads from `useWizard` → `SocialChannelInput` → `PostLinkField`; the `#preview=blocked`/`#preview=invalid` sentinel convention is defined in Task 4 and used in Task 8.
