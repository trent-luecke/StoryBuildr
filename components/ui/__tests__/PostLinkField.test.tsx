import { render, screen, fireEvent } from '@testing-library/react'
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

it('shows the invalid message for a non-post link', () => {
  const post: FetchedPost = { url: 'https://instagram.com/x#preview=invalid', caption: '' }
  setup({ initialPost: post })
  expect(screen.getByText(/doesn't look like a post link|doesn't look like a post link/i)).toBeInTheDocument()
})
