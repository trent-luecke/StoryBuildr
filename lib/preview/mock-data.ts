import { WizardState } from '@/lib/types'

export interface PreviewView {
  id: string
  label: string
  seed: Partial<WizardState>
}

// One happy-path gym, reused to derive every view's seed.
export const HAPPY_PATH: WizardState = {
  currentStep: 7,
  businessInfo: {
    gymName: 'Iron Peak Fitness',
    services: ['Group Classes', 'Personal Training', 'Open Gym'],
    icp: 'Adults 30–50 looking to lose weight and build consistency',
    channels: ['instagram', 'facebook', 'website', 'email'],
  },
  channelDetails: {
    instagram: { url: 'https://instagram.com/ironpeakfitness' },
    facebook: { url: 'https://facebook.com/ironpeakfitness' },
    website: { url: 'https://ironpeakfitness.com' },
    email: { usesPlatform: true, platform: 'Mailchimp', subscriberCount: 340, sendFrequency: 'Weekly' },
  },
  preflightResults: {
    instagram: { status: 'pass' },
    facebook: { status: 'pass' },
    website: { status: 'pass' },
    email: { status: 'pass' },
  },
  auditResults: [
    {
      channel: 'instagram',
      score: 7,
      narrative:
        'Consistent posting (3–4x/week) with strong member engagement — workout tips, member spotlights, class announcements. Room to lean into transformation storytelling and behind-the-scenes culture.',
      doingWell: ['Consistent posting schedule', 'Good visual quality', 'Clear CTAs for class sign-ups'],
      opportunities: ['Lacking origin/founder story', 'Limited transformation narratives', 'Few "day in the life" posts'],
      selfReported: false,
    },
    {
      channel: 'facebook',
      score: 5,
      narrative:
        'Presence exists but less active (1–2 posts/week), reaching an older demographic. Community building via comments/engagement is limited.',
      doingWell: ['Reaches older demographic', 'Clear event announcements'],
      opportunities: ['More member testimonials', 'Greater engagement focus', 'Story-based content'],
      selfReported: false,
    },
    {
      channel: 'website',
      score: null,
      narrative:
        'Clean navigation and a working class schedule, but team bios read generic and the homepage emphasizes features over member stories.',
      doingWell: ['Clean layout', 'Functional class scheduling'],
      opportunities: ['Add member testimonials', 'Founder story section', 'Transformation gallery'],
      selfReported: true,
    },
    {
      channel: 'email',
      score: null,
      narrative:
        'Weekly email to 340 subscribers covers class updates and promotions. Opportunity to add narrative-driven content (member wins, behind-the-scenes).',
      doingWell: ['Regular schedule', 'Clear calls-to-action'],
      opportunities: ['More narrative-driven content', 'Less promo-focused'],
      selfReported: true,
    },
  ],
  storyMineAnswers: {
    0: 'Sarah came to us 6 months ago unable to do a single pushup. Last month she did 20 in a row and teared up — she said it changed how she sees herself.',
    1: '6 AM early-bird class: music pumping, coach energizing the room, coffee brewing, regulars laughing in the lobby between sessions.',
    2: 'I once launched a new program without getting member feedback first. Low signups. Learned to involve members in decisions, not just broadcast at them.',
    3: 'My own transformation changed my life. I wanted to build a place where transformation is the culture, not the exception.',
    4: 'Busy professionals tired of cookie-cutter gyms. They were afraid of judgment and wanted a community, not just equipment.',
    5: 'We care about member transformations, not just monthly fees. Coaches know names. We celebrate wins like they are our own.',
    6: 'Help people become the strongest version of themselves — physically, mentally, and as a community.',
    7: 'A member who had struggled for 2 years hit her squat PR in front of the whole class. Everyone erupted. That is when I knew we had built something real.',
    8: 'Iron Peak is not just a gym — it is a community committed to becoming our best selves, together.',
    9: 'Packed morning class, contagious energy, everyone cheering each other on, people leaving more confident than when they arrived.',
  },
  storyPlan: {
    stories: [
      {
        title: "Sarah's 20 Pushup Journey",
        type: 'Member Transformation',
        whySelected:
          'Concrete, emotional proof that the transformation culture is real and celebrated — exactly what a prospective member wants to see.',
        channels: {
          instagram: {
            copy: "Sarah couldn't do ONE pushup 6 months ago. Last month? 20 in a row. 💪 Ready to start YOUR transformation? DM us.",
            visualRecommendation: 'Before/after carousel or short clip of Sarah (with consent)',
            suggestedPostDate: 'Week 1, Wednesday',
          },
          facebook: {
            copy: 'Meet Sarah. Six months ago she couldn\'t do a single pushup. Today she crushed 20 — and couldn\'t hold back the tears. We don\'t just count reps. We celebrate transformations.',
            visualRecommendation: 'Before/after photos or a short testimonial video',
            suggestedPostDate: 'Week 2, Monday',
          },
          website: {
            copy: "Sarah's Transformation — six months ago she walked in nervous and unable to do a pushup. With her coaches and community behind her, she trained consistently. Last month: 20 pushups, and tears of joy. That's what transformation looks like at Iron Peak.",
            visualRecommendation: 'High-quality before/after photos or embedded testimonial video',
            suggestedPostDate: 'Week 1, Friday',
          },
          email: {
            copy: "Subject: Sarah's Story — Six months ago Sarah couldn't do a single pushup. She showed up. Her coaches believed in her. Last month she did 20 in a row and cried. That moment is Iron Peak. Let's write your transformation story next.",
            visualRecommendation: 'Embedded photo of Sarah or a link to the testimonial video',
            suggestedPostDate: 'Week 2, Wednesday',
          },
        },
      },
      {
        title: 'A Morning at Iron Peak',
        type: 'Day in the Life',
        whySelected:
          'The 6 AM energy — music, coaches, camaraderie — is a real differentiator. Shows prospects what the culture feels like, not just what happens.',
        channels: {
          instagram: {
            copy: "5:55 AM at Iron Peak. Coffee's brewing. Music's up. Regulars streaming in. 🌅 Then class starts and the room comes alive. Ready to join the early-bird flock?",
            visualRecommendation: 'Short reel of the morning class: arrivals, coach energizing, camaraderie',
            suggestedPostDate: 'Week 2, Thursday',
          },
          facebook: {
            copy: 'Every morning at Iron Peak tells the same story: transformation, community, and real human connection. People show up for the workout — and for each other.',
            visualRecommendation: 'Photo carousel of morning-class energy',
            suggestedPostDate: 'Week 3, Tuesday',
          },
          website: {
            copy: 'A Morning at Iron Peak — 6 AM, the doors open, regular faces stream in, coffee brewing, music pumping. Coaches greet people by name. By the time class ends, everyone leaves a little stronger. That is the Iron Peak difference.',
            visualRecommendation: 'High-quality photo gallery or embedded morning-class video',
            suggestedPostDate: 'Week 1, Monday',
          },
          email: {
            copy: "Subject: A Day in the Life at Iron Peak — The doors open at 5:55. Coach is pumped. Music is playing. For 60 minutes everyone is fully present, pushing and celebrating each other. That's Iron Peak every single day.",
            visualRecommendation: 'Embedded photos or a clip from morning class',
            suggestedPostDate: 'Week 3, Friday',
          },
        },
      },
      {
        title: 'The Lesson I Learned the Hard Way',
        type: 'Mistake/Lesson',
        whySelected:
          'Vulnerability builds trust. Sharing the "launched without member input" mistake shows authentic leadership and validates the community-first approach.',
        channels: {
          instagram: {
            copy: 'I once launched a new program without asking our members what they wanted. Flop. Lesson learned: build WITH your community, not AT them. 🙌',
            visualRecommendation: 'Candid founder photo or a lighthearted meme',
            suggestedPostDate: 'Week 2, Friday',
          },
          facebook: {
            copy: 'Real talk: I made a mistake. I announced a new program without asking members first. Nobody signed up. It taught me this gym only thrives when we build it together.',
            visualRecommendation: 'Honest, relatable founder photo',
            suggestedPostDate: 'Week 3, Wednesday',
          },
          website: {
            copy: 'Building Iron Peak Together — early on I thought I had all the answers and launched a program without asking members. It failed. Now we listen, ask, and collaborate before we launch anything. Your voice shapes our decisions.',
            visualRecommendation: 'Candid founder or behind-the-scenes image',
            suggestedPostDate: 'Week 2, Tuesday',
          },
          email: {
            copy: 'Subject: Why I Listen — I designed a program I was sure members would love, didn\'t ask anyone, and got zero signups. Humbling. The lesson: we build WITH you, not at you. Every decision now starts with listening.',
            visualRecommendation: 'Personal letter-style format',
            suggestedPostDate: 'Week 3, Monday',
          },
        },
      },
      {
        title: 'Why I Started Iron Peak',
        type: 'Origin Story',
        whySelected:
          "Roots everything in purpose: a personal transformation that became a movement. Directly answers 'why should I join?' and builds emotional buy-in.",
        channels: {
          instagram: {
            copy: 'Why I started Iron Peak: my own transformation changed my life, and I wanted to build a place where transformation is the culture — all of us getting stronger, together. 🏋️',
            visualRecommendation: 'Founder photo (then vs. now) with a mission-statement overlay',
            suggestedPostDate: 'Week 3, Thursday',
          },
          facebook: {
            copy: 'The story behind Iron Peak: my fitness journey gave me confidence, health, and purpose. I built this place so people don\'t transform alone — they lift each other up. It\'s not just a gym. It\'s a movement.',
            visualRecommendation: 'Founder testimony photo or video intro',
            suggestedPostDate: 'Week 1, Thursday',
          },
          website: {
            copy: 'The Story of Iron Peak — my transformation changed my life, but I kept it private for years. Then I realized I could build a place where transformation is the CULTURE: a community committed to lifting each other up. We are not here to sell memberships. We are here to build a movement.',
            visualRecommendation: 'Founder bio section with transformation photo and mission statement',
            suggestedPostDate: 'Week 1, Wednesday',
          },
          email: {
            copy: 'Subject: Why I Built Iron Peak — my own transformation changed my life, and I realized I\'d been keeping the gift to myself. Iron Peak exists so people transform together, not alone. We\'re not a gym business. We\'re a transformation movement — and you\'re the heart of it.',
            visualRecommendation: 'Personal letter format with founder photo or video link',
            suggestedPostDate: 'Week 1, Tuesday',
          },
        },
      },
    ],
  },
}

// Derive each view's seed from HAPPY_PATH so the mock gym stays a single source of truth.
export const PREVIEW_VIEWS: PreviewView[] = [
  { id: 'welcome', label: '1 · Welcome', seed: { currentStep: 1 } },
  {
    id: 'business-info',
    label: '2 · Business Info',
    seed: { currentStep: 2, businessInfo: HAPPY_PATH.businessInfo },
  },
  {
    id: 'channel-details',
    label: '3 · Channel Details',
    seed: {
      currentStep: 3,
      businessInfo: HAPPY_PATH.businessInfo,
      channelDetails: HAPPY_PATH.channelDetails,
      preflightResults: HAPPY_PATH.preflightResults,
    },
  },
  {
    id: 'audit-loading',
    label: '4 · Story Audit (loading)',
    seed: {
      currentStep: 4,
      businessInfo: HAPPY_PATH.businessInfo,
      channelDetails: HAPPY_PATH.channelDetails,
      preflightResults: HAPPY_PATH.preflightResults,
      // no auditResults → StepAuditLoading shows the spinner (fetch suppressed by previewMode)
    },
  },
  {
    id: 'audit-results',
    label: '5 · Audit Results',
    seed: {
      currentStep: 5,
      businessInfo: HAPPY_PATH.businessInfo,
      channelDetails: HAPPY_PATH.channelDetails,
      preflightResults: HAPPY_PATH.preflightResults,
      auditResults: HAPPY_PATH.auditResults,
    },
  },
  {
    id: 'story-mine',
    label: '6 · Story Mine',
    seed: {
      currentStep: 6,
      businessInfo: HAPPY_PATH.businessInfo,
      auditResults: HAPPY_PATH.auditResults,
      storyMineAnswers: HAPPY_PATH.storyMineAnswers,
    },
  },
  {
    id: 'plan-loading',
    label: '7 · Your Plan (loading)',
    seed: {
      currentStep: 7,
      businessInfo: HAPPY_PATH.businessInfo,
      auditResults: HAPPY_PATH.auditResults,
      storyMineAnswers: HAPPY_PATH.storyMineAnswers,
      // no storyPlan → StepYourPlan shows the loading spinner (fetch suppressed)
    },
  },
  {
    id: 'plan-result',
    label: '7 · Your Plan (result)',
    seed: {
      currentStep: 7,
      businessInfo: HAPPY_PATH.businessInfo,
      auditResults: HAPPY_PATH.auditResults,
      storyMineAnswers: HAPPY_PATH.storyMineAnswers,
      storyPlan: HAPPY_PATH.storyPlan,
    },
  },
]
