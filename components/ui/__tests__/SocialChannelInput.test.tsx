import { render, screen, fireEvent } from '@testing-library/react'
import { WizardProvider } from '@/hooks/useWizard'
import { SocialChannelInput } from '@/components/ui/SocialChannelInput'
import { SocialInput } from '@/lib/types'

function setup(value?: SocialInput) {
  const onChange = jest.fn()
  render(
    <WizardProvider previewMode>
      <SocialChannelInput channel="instagram" value={value} onChange={onChange} />
    </WizardProvider>
  )
  return { onChange }
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
