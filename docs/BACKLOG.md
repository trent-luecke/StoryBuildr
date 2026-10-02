# StoryBuildr Backlog

## Next-step modal: click-through tracking (HubSpot)

The post-workflow modal and banner (`components/next-step/`) currently have no analytics. Needs:

- HubSpot tracking code installed in `app/layout.tsx` (needs the HubSpot portal ID / embed snippet)
- Events for: modal shown (with trigger: `download` vs `fallback`), modal closed, CTA clicked (modal vs banner)
- UTM params on `NEXT_STEP_URL` (`lib/next-step.ts`) so the landing page can attribute StoryBuildr traffic

Blocked on: HubSpot install materials.

## Next-step modal: real landing page URL

`NEXT_STEP_URL` in `lib/next-step.ts` is a placeholder (`https://example.com/storybuildr-next-step`). Replace before merging to `main`.
