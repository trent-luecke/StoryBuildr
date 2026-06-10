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
