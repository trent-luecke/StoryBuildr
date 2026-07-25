import { renderHook, act } from '@testing-library/react'
import { WizardProvider, useWizard } from '@/hooks/useWizard'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <WizardProvider>{children}</WizardProvider>
)

test('starts on step 1', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  expect(result.current.state.currentStep).toBe(1)
})

test('SET_STEP advances the step', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  act(() => result.current.dispatch({ type: 'SET_STEP', step: 3 }))
  expect(result.current.state.currentStep).toBe(3)
})

test('SET_BUSINESS_INFO stores business info', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  const info = { gymName: 'Iron Peak', services: ['Personal Training'], icp: 'Adults 30-50', channels: ['instagram' as const] }
  act(() => result.current.dispatch({ type: 'SET_BUSINESS_INFO', data: info }))
  expect(result.current.state.businessInfo).toEqual(info)
})

test('SET_STORY_MINE_ANSWER stores individual answer', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  act(() => result.current.dispatch({ type: 'SET_STORY_MINE_ANSWER', questionIndex: 0, answer: 'Sarah lost 22 lbs' }))
  expect(result.current.state.storyMineAnswers[0]).toBe('Sarah lost 22 lbs')
})

test('starts with an empty socialInputs map', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  expect(result.current.state.socialInputs).toEqual({})
})

test('SET_SOCIAL_INPUT stores a per-channel input and merges', () => {
  const { result } = renderHook(() => useWizard(), { wrapper })
  act(() =>
    result.current.dispatch({
      type: 'SET_SOCIAL_INPUT',
      channel: 'instagram',
      input: { method: 'links', posts: [{ url: 'https://instagram.com/p/A', caption: 'hi' }] },
    })
  )
  act(() =>
    result.current.dispatch({
      type: 'SET_SOCIAL_INPUT',
      channel: 'facebook',
      input: { method: 'manual', postFrequency: 'Weekly', contentTypes: ['tips'], recentPosts: 'x' },
    })
  )
  expect(result.current.state.socialInputs.instagram).toEqual({
    method: 'links',
    posts: [{ url: 'https://instagram.com/p/A', caption: 'hi' }],
  })
  expect(result.current.state.socialInputs.facebook).toEqual({
    method: 'manual',
    postFrequency: 'Weekly',
    contentTypes: ['tips'],
    recentPosts: 'x',
  })
})
