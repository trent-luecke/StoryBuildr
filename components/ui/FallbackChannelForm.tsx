// components/ui/FallbackChannelForm.tsx
'use client'

import { useForm, Controller } from 'react-hook-form'
import { ChipSelect } from './ChipSelect'
import { FallbackChannelData } from '@/lib/types'

const CONTENT_TYPE_OPTIONS = [
  { value: 'promos', label: 'Promotions & announcements' },
  { value: 'tips', label: 'Workout tips' },
  { value: 'spotlights', label: 'Member spotlights' },
  { value: 'bts', label: 'Behind-the-scenes' },
  { value: 'motivation', label: 'Motivational content' },
]

const FREQUENCY_OPTIONS = ['Daily', 'A few times a week', 'Weekly', 'Rarely']

interface FallbackChannelFormProps {
  channelLabel: string
  onSubmit: (data: FallbackChannelData) => void
  onSkip: () => void
}

export function FallbackChannelForm({ channelLabel, onSubmit, onSkip }: FallbackChannelFormProps) {
  const { register, control, handleSubmit } = useForm<FallbackChannelData>({
    defaultValues: { postFrequency: '', contentTypes: [], recentPosts: '' },
  })

  return (
    <div className="bg-[#f0f5fb] border border-[#81A1D3] rounded-lg p-4 mt-3">
      <p className="text-xs font-bold text-[#1E212E] mb-0.5">
        {channelLabel} often restricts automated access — no big deal, we can do this a different way.
      </p>
      <p className="text-xs text-[#444444] mb-4">Tell us a bit about your {channelLabel} presence and we'll include it in your audit.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-3">
        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">How often do you post?</label>
          <select {...register('postFrequency', { required: true })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] bg-white focus:outline-none focus:border-[#81A1D3]">
            <option value="">Select frequency</option>
            {FREQUENCY_OPTIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">What types of content do you mostly share?</label>
          <Controller name="contentTypes" control={control} render={({ field }) => (
            <ChipSelect options={CONTENT_TYPE_OPTIONS} value={field.value} onChange={field.onChange} />
          )} />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1">Describe 2–3 recent posts</label>
          <textarea {...register('recentPosts', { required: true })} rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] resize-none focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. Before/after transformation photo for a member, a class schedule graphic, a motivational quote..." />
        </div>

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onSkip} className="text-xs text-[#444444]/60 hover:text-[#444444] px-3 py-1.5">Skip this channel</button>
          <button type="submit" className="bg-[#81A1D3] text-[#1E212E] font-bold px-4 py-1.5 rounded-lg text-xs hover:bg-[#6b8fbf] transition-colors">Use this info →</button>
        </div>
      </form>
    </div>
  )
}
