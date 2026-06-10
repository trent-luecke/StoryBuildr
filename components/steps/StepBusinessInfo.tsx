'use client'

import { useForm, Controller, Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useWizard } from '@/hooks/useWizard'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { BusinessInfo, Channel } from '@/lib/types'

const schema = z.object({
  gymName: z.string().min(1, 'Required'),
  services: z.array(z.string()).min(1, 'Select at least one'),
  icp: z.string().min(1, 'Required'),
  channels: z.array(z.string()).min(1, 'Select at least one channel') as z.ZodType<Channel[]>,
})

const SERVICE_OPTIONS = [
  { value: 'Group Classes', label: 'Group Classes' },
  { value: 'Personal Training', label: 'Personal Training' },
  { value: 'Nutrition Coaching', label: 'Nutrition Coaching' },
  { value: 'Youth Programs', label: 'Youth Programs' },
  { value: 'Open Gym', label: 'Open Gym' },
  { value: 'Other', label: 'Other' },
]

const CHANNEL_OPTIONS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'email', label: 'Email' },
  { value: 'website', label: 'Website' },
]

export function StepBusinessInfo() {
  const { state, dispatch } = useWizard()
  const { register, control, handleSubmit, formState: { errors } } = useForm<BusinessInfo>({
    resolver: zodResolver(schema) as Resolver<BusinessInfo>,
    defaultValues: state.businessInfo ?? { gymName: '', services: [], icp: '', channels: [] },
  })

  function onSubmit(data: BusinessInfo) {
    dispatch({ type: 'SET_BUSINESS_INFO', data })
    dispatch({ type: 'SET_STEP', step: 3 })
  }

  return (
    <div className="px-8 py-8 max-w-xl">
      <p className="text-xs font-bold text-[#81A1D3] tracking-widest uppercase mb-2">Step 2</p>
      <h2 className="text-2xl font-extrabold text-[#1E212E] mb-1">Tell us about your gym</h2>
      <p className="text-sm text-[#444444] mb-6">This helps us tailor your audit and content plan.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Gym Name</label>
          <input {...register('gymName')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. Iron Peak Fitness" />
          {errors.gymName && <p className="text-red-500 text-xs mt-1">{errors.gymName.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Services Offered</label>
          <Controller name="services" control={control} render={({ field }) => (
            <ChipSelect options={SERVICE_OPTIONS} value={field.value} onChange={field.onChange} />
          )} />
          {errors.services && <p className="text-red-500 text-xs mt-1">{errors.services.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Who is your ideal member?</label>
          <input {...register('icp')} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-[#444444] focus:outline-none focus:border-[#81A1D3]" placeholder="e.g. Adults 30–50 looking to lose weight and build consistency" />
          {errors.icp && <p className="text-red-500 text-xs mt-1">{errors.icp.message}</p>}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#1E212E] uppercase tracking-wide mb-1.5">Active Channels</label>
          <Controller name="channels" control={control} render={({ field }) => (
            <ChipSelect options={CHANNEL_OPTIONS} value={field.value} onChange={field.onChange} />
          )} />
          {errors.channels && <p className="text-red-500 text-xs mt-1">{errors.channels.message}</p>}
        </div>

        <div className="flex justify-between items-center pt-2">
          <button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 1 })} className="text-sm text-[#444444]/60 hover:text-[#444444]">← Back</button>
          <button type="submit" className="bg-[#81A1D3] text-[#1E212E] font-extrabold px-6 py-2.5 rounded-lg text-sm tracking-wide hover:bg-[#6b8fbf] transition-colors">Continue →</button>
        </div>
      </form>
    </div>
  )
}
