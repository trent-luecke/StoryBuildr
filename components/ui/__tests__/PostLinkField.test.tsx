import { render, screen, fireEvent, act } from '@testing-library/react'
import { PostLinkField } from '@/components/ui/PostLinkField'
import { FetchedPost } from '@/lib/types'

function setup(over: Partial<React.ComponentProps<typeof PostLinkField>> = {}) {
  const onResolved = jest.fn()
  const onSwitchToManual = jest.fn()
  render(
    <PostLinkField
      platformLabel="Instagram"
      previewMode
      onResolved={onResolved}
      onSwitchToManual={onSwitchToManual}
      {...over}
    />
  )
  return { onResolved, onSwitchToManual }
}

it('shows the success card with author and caption on an ok result', () => {
  const post: FetchedPost = { url: 'https://instagram.com/p/A', caption: 'Leg day PRs', author: 'ironpeak' }
  const { onResolved } = setup({ initialPost: post })
  expect(screen.getByText(/Got it — post from @ironpeak/i)).toBeInTheDocument()
  expect(screen.getByText('Leg day PRs')).toBeInTheDocument()
  expect(onResolved).toHaveBeenCalledWith(expect.objectContaining({ author: 'ironpeak', caption: 'Leg day PRs' }))
})

it('shows the blocked nudge and switches to manual', () => {
  const post: FetchedPost = { url: 'https://instagram.com/p/B#preview=blocked', caption: '' }
  const { onSwitchToManual, onResolved } = setup({ initialPost: post })
  expect(screen.getByText(/Couldn't access this post|Couldn't access this post/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /describe your posts manually/i }))
  expect(onSwitchToManual).toHaveBeenCalled()
  expect(onResolved).toHaveBeenCalledWith(null)
})

it('keeps the settled blocked nudge on blur so its manual button stays clickable', async () => {
  // Regression: blurring the input (which happens when clicking the nudge button)
  // must NOT re-run the check and flip status back to 'checking', which would
  // unmount the "describe manually" button before the click lands.
  jest.useFakeTimers()
  const fetchMock = jest.fn().mockResolvedValue({ json: async () => ({ status: 'blocked' }) })
  global.fetch = fetchMock as unknown as typeof fetch

  const onSwitchToManual = jest.fn()
  render(
    <PostLinkField platformLabel="Instagram" onResolved={() => {}} onSwitchToManual={onSwitchToManual} />
  )
  const input = screen.getByRole('textbox') as HTMLInputElement

  fireEvent.change(input, { target: { value: 'https://www.instagram.com/p/ZzZ/' } })
  await act(async () => { jest.advanceTimersByTime(400) })
  // Settled to blocked; the debounced check ran exactly once.
  expect(fetchMock).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('button', { name: /describe your posts manually/i })).toBeInTheDocument()

  // Blur (as clicking the nudge would) must not re-fetch or unmount the button.
  await act(async () => { fireEvent.blur(input) })
  expect(fetchMock).toHaveBeenCalledTimes(1)
  const nudge = screen.getByRole('button', { name: /describe your posts manually/i })
  fireEvent.click(nudge)
  expect(onSwitchToManual).toHaveBeenCalled()
  jest.useRealTimers()
})

it('shows the invalid message for a non-post link', () => {
  const post: FetchedPost = { url: 'https://instagram.com/x#preview=invalid', caption: '' }
  setup({ initialPost: post })
  expect(screen.getByText(/doesn't look like a post link|doesn't look like a post link/i)).toBeInTheDocument()
})

it('ignores a stale response when a newer check supersedes it', async () => {
  jest.useFakeTimers()
  let resolveFirst: (v: unknown) => void = () => {}
  let resolveSecond: (v: unknown) => void = () => {}
  const fetchMock = jest
    .fn()
    .mockImplementationOnce(() => new Promise((r) => { resolveFirst = r }))
    .mockImplementationOnce(() => new Promise((r) => { resolveSecond = r }))
  global.fetch = fetchMock as unknown as typeof fetch

  const onResolved = jest.fn()
  render(
    <PostLinkField platformLabel="Instagram" onResolved={onResolved} onSwitchToManual={() => {}} />
  )
  const input = screen.getByRole('textbox') as HTMLInputElement

  fireEvent.change(input, { target: { value: 'https://www.instagram.com/p/AAA/' } })
  act(() => { jest.advanceTimersByTime(400) })
  fireEvent.change(input, { target: { value: 'https://www.instagram.com/p/BBB/' } })
  act(() => { jest.advanceTimersByTime(400) })

  await act(async () => {
    resolveSecond({ json: async () => ({ status: 'ok', caption: 'newest', author: 'gym' }) })
  })
  await act(async () => {
    resolveFirst({ json: async () => ({ status: 'blocked' }) })
  })

  expect(screen.getByText(/Got it/i)).toBeInTheDocument()
  expect(screen.queryByText(/access this post/i)).toBeNull()
  jest.useRealTimers()
})
