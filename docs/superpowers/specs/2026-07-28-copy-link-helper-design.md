# Copy-link helper — design spec

**Date:** 2026-07-28
**Status:** Approved (design), pending spec review
**Area:** Channel Details step → social link input

## Problem

In the Channel Details step, social channels (Instagram, Facebook, LinkedIn) offer a
"Paste example posts" mode that renders one to three `PostLinkField` inputs. Gym owners
who aren't sure how to obtain a direct link to a single post get stuck at the input with
no guidance. We want a lightweight, always-available explanation of how to copy a post
link — without cluttering the form or depending on external assets.

## Decision

Add a small, collapsible **text** helper ("How do I copy a post link?") at the top of the
links branch. Chosen over a GIF or annotated screenshot because the copy-link action is
the same trivial two-tap flow on every platform and device — **open the post → tap the ⋯
menu → Copy link** — so a video's advantage (explaining a long flow) does not apply, while
text is accurate, accessible, asset-free, and editable in seconds when Meta or LinkedIn
reshuffle their UI.

## Scope

**In scope:**
- New `components/ui/CopyLinkHelp.tsx` — a self-contained, presentational client component
  with local open/closed state.
- Render it **once** at the top of the `method === 'links'` branch in
  `components/ui/SocialChannelInput.tsx` (below the method pills, above the `PostLinkField`
  list). Not per-field.
- Unit tests for the new component + one assertion in the `SocialChannelInput` tests.

**Out of scope (YAGNI):**
- No GIF, video, images, or screenshots.
- No per-platform copy variants (the flow is identical across IG / FB / LinkedIn).
- No changes to `PostLinkField`, the `/api/fetch-post` route, `og-fetch`, or any fetch/debounce logic.
- No new `/preview` fixtures — the helper appears automatically in the existing
  `3 · Social: link success` and `3 · Social: blocked` views (both use the links branch).

## Component: `CopyLinkHelp`

### Interface

```ts
interface CopyLinkHelpProps {
  platformLabel: string // e.g. "Instagram", "Facebook", "LinkedIn"
}
```

- **What it does:** renders a collapsed trigger; when expanded, shows the three-step
  copy-link instructions personalized with `platformLabel` in step 1.
- **How you use it:** drop `<CopyLinkHelp platformLabel={label} />` at the top of the links
  branch. No callbacks, no wizard state — it owns only its own open/closed `useState`.
- **Depends on:** React only. No hooks into `useWizard`, no network.

### Collapsed (default)

A subtle trigger styled as an accent-color text link with a rotating chevron:

> How do I copy a post link?

### Expanded

A soft panel (`bg-[#f0f5fb]`, rounded, `text-xs`) containing three numbered steps and one
device note:

1. Open your **{platformLabel}** post.
2. Tap the **⋯** menu in the top-right corner of the post.
3. Choose **Copy link** — then paste it above.

> *Works the same in the app or on the web. On a computer, you can also copy the link
> straight from your browser's address bar with the post open.*

### Accessibility

- Trigger is a real `<button type="button">` with `aria-expanded={open}` and
  `aria-controls={panelId}`; the panel carries the matching `id`.
- Keyboard operable (native button semantics).
- Chevron rotates on open (visual only; not the sole affordance).

### Styling

Existing tokens only — `#81A1D3` (accent), `#1E212E` (ink), `#444444` (body),
`#f0f5fb` (accent background), `gray-200` (borders), `rounded-lg`, `text-xs`/`text-sm` —
matching the idiom already used in `SocialChannelInput.tsx` and `PostLinkField.tsx`.

## Integration

In `components/ui/SocialChannelInput.tsx`, inside the `method === 'links'` block, render
`<CopyLinkHelp platformLabel={label} />` as the first child, before the
`Array.from({ length: fieldCount })` map of `PostLinkField`s. No other changes to that
file's logic.

## Testing

- `components/ui/__tests__/CopyLinkHelp.test.tsx`:
  - Renders the trigger; the step content is **not** present when collapsed (default).
  - `aria-expanded` is `false` by default.
  - Clicking the trigger reveals the three steps and flips `aria-expanded` to `true`.
  - Step 1 includes the passed `platformLabel`.
- `components/ui/__tests__/SocialChannelInput.test.tsx` (extend existing):
  - When the links method is active, the "How do I copy a post link?" trigger renders
    exactly once (not per `PostLinkField`).

## Verification

- `npx tsc --noEmit` clean.
- `npm test` green (existing suite + new tests).
- Visual: `/preview` → `3 · Social: link success` shows the collapsed helper above the
  resolved post; expanding it shows the steps.
