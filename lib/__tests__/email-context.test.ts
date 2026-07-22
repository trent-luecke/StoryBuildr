import {
  platformDisplayName,
  buildEmailContext,
  buildAuditEmailBlock,
  EmailDetails,
} from '@/lib/email-context'

const base: EmailDetails = { subscriberCount: 340, sendFrequency: 'Weekly' }

describe('platformDisplayName', () => {
  it('returns the named platform', () => {
    expect(platformDisplayName({ ...base, usesPlatform: true, platform: 'Mailchimp' })).toBe('Mailchimp')
  })
  it('returns the Other free-text when platform is Other', () => {
    expect(platformDisplayName({ ...base, usesPlatform: true, platform: 'Other', otherPlatform: 'Brevo' })).toBe('Brevo')
  })
  it('never emits the literal "Other" when the free-text is blank', () => {
    expect(platformDisplayName({ ...base, usesPlatform: true, platform: 'Other', otherPlatform: '' })).toBe('a dedicated platform')
  })
})

describe('buildEmailContext', () => {
  it('describes the platform tier and uses the segmentation guidance', () => {
    const out = buildEmailContext({ ...base, usesPlatform: true, platform: 'Klaviyo' })
    expect(out).toContain('Uses a dedicated email platform (Klaviyo)')
    expect(out).toContain('segment members vs past leads')
    expect(out).toContain('NEVER recommend purchasing, upgrading, or switching email tools')
  })
  it('describes the manual tier and uses low-lift guidance', () => {
    const out = buildEmailContext({ ...base, usesPlatform: false })
    expect(out).toContain('No dedicated platform')
    expect(out).toContain('low-lift and plain-text friendly')
    expect(out).toContain('NEVER recommend purchasing, upgrading, or switching email tools')
  })
  it('treats undefined usesPlatform as the manual tier', () => {
    expect(buildEmailContext({ ...base })).toContain('No dedicated platform')
  })
})

describe('buildAuditEmailBlock', () => {
  it('prints the platform when one is used', () => {
    expect(buildAuditEmailBlock({ ...base, usesPlatform: true, platform: 'HubSpot' })).toContain('Platform: HubSpot')
  })
  it('flags manual sending when no platform is used', () => {
    expect(buildAuditEmailBlock({ ...base, usesPlatform: false })).toContain('Email sending: manual (no dedicated platform)')
  })
})
