import { ChannelDetailsData } from '@/lib/types'

export type EmailDetails = NonNullable<ChannelDetailsData['email']>

// Human-readable platform name. Assumes a platform is in use; never emits "Other".
export function platformDisplayName(email: EmailDetails): string {
  if (email.platform === 'Other') {
    return email.otherPlatform?.trim() || 'a dedicated platform'
  }
  return email.platform?.trim() || 'a dedicated platform'
}

// Prompt block for the PLAN route: describes the email setup and forks the
// email tactics guidance by marketing maturity. Undefined usesPlatform is
// treated as the manual (conservative) tier.
export function buildEmailContext(email: EmailDetails): string {
  const maturity = email.usesPlatform
    ? `Uses a dedicated email platform (${platformDisplayName(email)})`
    : 'No dedicated platform — sends manually (e.g. BCC or a basic email list)'

  const rules = email.usesPlatform
    ? 'They run a real email platform. You MAY use platform-native tactics: segment members vs past leads, suggest simple automated sequences, and use richer formatting. Lean into the two-audience split (members vs leads).'
    : 'They send manually. Keep email guidance low-lift and plain-text friendly: one story-driven send, simple structure, no segmentation or automation assumptions.'

  return `## Email Context
- List size: ${email.subscriberCount} subscribers
- Current cadence: ${email.sendFrequency}
- Email maturity: ${maturity}

Email guidance rules:
- ${rules}
- NEVER recommend purchasing, upgrading, or switching email tools. Meet them where they are; calibrate tactics to their current capability only.`
}

// Prompt block for the AUDIT route's self-reported email channel.
export function buildAuditEmailBlock(email: EmailDetails): string {
  const maturity = email.usesPlatform
    ? `Platform: ${platformDisplayName(email)}`
    : 'Email sending: manual (no dedicated platform)'

  return `## email (Self-reported)
${maturity}
Subscribers: ${email.subscriberCount}
Send frequency: ${email.sendFrequency}`
}
