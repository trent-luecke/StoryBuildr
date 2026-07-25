import { StrictMode } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { WizardProvider, useWizard } from '@/hooks/useWizard'
import { SocialChannelInput } from '@/components/ui/SocialChannelInput'
import { SocialInput, Channel } from '@/lib/types'

function setup(value?: SocialInput) {
  const onChange = jest.fn()
  render(
    <WizardProvider previewMode>
      <SocialChannelInput channel="instagram" value={value} onChange={onChange} />
    </WizardProvider>
  )
  return { onChange }
}

// Mirrors the real parent (components/steps/StepChannelDetails.tsx), whose
// onChange dispatches into WizardProvider's useReducer. A mock onChange
// wouldn't reproduce the "setState while rendering a different component"
// warning since it isn't a real state setter — this harness routes through
// an actual dispatch so the bug (or its fix) is observable.
function DispatchHarness({ channel, value }: { channel: Channel; value?: SocialInput }) {
  const { dispatch } = useWizard()
  return (
    <SocialChannelInput
      channel={channel}
      value={value}
      onChange={(input) => dispatch({ type: 'SET_SOCIAL_INPUT', channel, input })}
    />
  )
}

it('shows neither branch until a method is chosen', () => {
  setup()
  expect(screen.queryByPlaceholderText(/Paste a link to one Instagram post/i)).toBeNull()
  expect(screen.queryByText(/How often do you post/i)).toBeNull()
})

it('reveals link fields when "Paste example posts" is chosen', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /Paste example posts/i }))
  expect(screen.getByPlaceholderText(/Paste a link to one Instagram post/i)).toBeInTheDocument()
})

it('adds up to three link fields', () => {
  setup()
  fireEvent.click(screen.getByRole('button', { name: /Paste example posts/i }))
  fireEvent.click(screen.getByRole('button', { name: /add another post/i }))
  fireEvent.click(screen.getByRole('button', { name: /add another post/i }))
  expect(screen.getAllByPlaceholderText(/Paste a link to one Instagram post/i)).toHaveLength(3)
  // capped at 3 — the add button is gone
  expect(screen.queryByRole('button', { name: /add another post/i })).toBeNull()
})

it('reveals manual questions and commits manual input', () => {
  const { onChange } = setup()
  fireEvent.click(screen.getByRole('button', { name: /Describe it manually/i }))
  const select = screen.getByText('Select frequency').closest('select') as HTMLSelectElement
  fireEvent.change(select, { target: { value: 'Weekly' } })
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ method: 'manual', postFrequency: 'Weekly' })
  )
})

it('seeds the manual branch from an existing manual value', () => {
  setup({ method: 'manual', postFrequency: 'Weekly', contentTypes: ['tips'], recentPosts: 'a recent post' })
  expect((screen.getByText('Select frequency').closest('select') as HTMLSelectElement).value).toBe('Weekly')
  expect(screen.getByDisplayValue('a recent post')).toBeInTheDocument()
})

it('does not trigger a setState-in-render warning when a seeded link resolves', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

  // previewMode + a seeded links value makes PostLinkField's mount effect
  // resolve the post synchronously (onResolved -> setPostAt), which used to
  // call onChange -> dispatch from inside the setPosts updater — the old
  // bug path. Routing onChange through a real dispatch (DispatchHarness)
  // is required to reproduce the warning; a jest.fn() onChange wouldn't.
  // StrictMode (on by default in this app's dev server, per next.config.ts)
  // is what surfaces the warning reliably, matching how it was found live.
  render(
    <StrictMode>
      <WizardProvider previewMode>
        <DispatchHarness
          channel="instagram"
          value={{
            method: 'links',
            posts: [{ url: 'https://instagram.com/p/abc123', caption: 'A sample post', author: 'yourgym' }],
          }}
        />
      </WizardProvider>
    </StrictMode>
  )

  const offending = errorSpy.mock.calls.find((args) =>
    String(args[0] ?? '').includes('while rendering a different component')
  )
  expect(offending).toBeUndefined()

  errorSpy.mockRestore()
})
