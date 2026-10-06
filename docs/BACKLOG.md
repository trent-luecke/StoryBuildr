# StoryBuildr Backlog

## Next-step modal: click-through tracking (HubSpot)

The post-workflow modal and banner (`components/next-step/`) currently have no analytics. Needs:

- HubSpot tracking code installed in `app/layout.tsx` (needs the HubSpot portal ID / embed snippet)
- Events for: modal shown (with trigger: `download` vs `fallback`), modal closed, CTA clicked (modal vs banner)
- UTM params on `NEXT_STEP_URL` (`lib/next-step.ts`) so the landing page can attribute StoryBuildr traffic.
  Needs utm_source / utm_medium / utm_campaign values from marketing; tag modal vs banner with utm_content.
  Also confirm with marketing that the landing page loads the HubSpot tracking code (page uses HubSpot
  forms, but the standard hs-scripts loader wasn't visible in its HTML — may be loaded via a tag manager).

Blocked on: HubSpot install materials.
