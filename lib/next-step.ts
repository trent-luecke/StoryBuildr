// Post-workflow funnel: after the user finishes, push them to the next marketing asset.

// Member Booked Appointments landing page. UTM params pending from marketing (see docs/BACKLOG.md).
export const NEXT_STEP_URL = 'https://www.teambuildr.com/os-features/member-booked-appointments'

// Modal opens this long after a successful PDF download (lets the browser's download UI land first).
export const NEXT_STEP_DOWNLOAD_DELAY_MS = 2000

// Fallback: open the modal if the plan has been on screen this long without a download click.
export const NEXT_STEP_FALLBACK_MS = 30000
