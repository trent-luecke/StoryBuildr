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
