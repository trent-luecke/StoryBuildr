// lib/types.ts

export type Channel = 'instagram' | 'facebook' | 'linkedin' | 'email' | 'website'

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface BusinessInfo {
  gymName: string
  services: string[]
  icp: string
  channels: Channel[]
}

export interface ChannelDetailsData {
  instagram?: { url: string }
  facebook?: { url: string }
  linkedin?: { url: string }
  website?: { url: string }
  email?: {
    platform: string
    subscriberCount: number
    sendFrequency: string
  }
}

export interface FallbackChannelData {
  postFrequency: string
  contentTypes: string[]
  recentPosts: string
}

export type PreflightStatus =
  | { status: 'pass' }
  | { status: 'unreachable' }
  | { status: 'blocked' }
  | { status: 'skipped' }
  | { status: 'fallback'; data: FallbackChannelData }

export interface AuditResult {
  channel: Channel
  score: number | null
  narrative: string
  doingWell: string[]
  opportunities: string[]
  selfReported: boolean
}

export interface StoryChannelCopy {
  copy: string
  visualRecommendation: string
  suggestedPostDate: string
}

export interface Story {
  title: string
  type: string
  whySelected: string
  channels: Partial<Record<Channel, StoryChannelCopy>>
}

export interface StoryPlan {
  stories: Story[]
}

export interface WizardState {
  currentStep: WizardStep
  businessInfo: BusinessInfo | null
  channelDetails: ChannelDetailsData | null
  preflightResults: Partial<Record<Channel, PreflightStatus>> | null
  auditResults: AuditResult[] | null
  storyMineAnswers: Partial<Record<number, string>>
  storyPlan: StoryPlan | null
}

export type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_BUSINESS_INFO'; data: BusinessInfo }
  | { type: 'SET_CHANNEL_DETAILS'; data: ChannelDetailsData }
  | { type: 'SET_PREFLIGHT_RESULTS'; data: Partial<Record<Channel, PreflightStatus>> }
  | { type: 'SET_AUDIT_RESULTS'; data: AuditResult[] }
  | { type: 'SET_STORY_MINE_ANSWER'; questionIndex: number; answer: string }
  | { type: 'SET_STORY_PLAN'; data: StoryPlan }
