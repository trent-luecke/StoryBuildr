import { render, screen, fireEvent } from '@testing-library/react'
import { CopyLinkHelp } from '@/components/ui/CopyLinkHelp'

function trigger() {
  return screen.getByRole('button', { name: /how do i copy a post link/i })
}

function panelOf(btn: HTMLElement) {
  const id = btn.getAttribute('aria-controls')
  return id ? document.getElementById(id) : null
}

it('renders a trigger and is collapsed by default', () => {
  render(<CopyLinkHelp platformLabel="Instagram" />)
  const btn = trigger()
  expect(btn).toHaveAttribute('aria-expanded', 'false')
  // Step content is not in the DOM until expanded.
  expect(screen.queryByText(/Copy link/i)).toBeNull()
})

it('expands to reveal the copy-link steps when the trigger is clicked', () => {
  render(<CopyLinkHelp platformLabel="Instagram" />)
  const btn = trigger()
  fireEvent.click(btn)
  expect(btn).toHaveAttribute('aria-expanded', 'true')
  const panel = panelOf(btn)
  expect(panel).toBeInTheDocument()
  // The two-tap flow — asserted against the panel's full text so inline
  // emphasis (bold label / ⋯ symbol) doesn't break the match.
  expect(panel).toHaveTextContent(/tap the/i)
  expect(panel).toHaveTextContent(/menu/i)
  expect(panel).toHaveTextContent(/copy link/i)
})

it('personalizes the first step with the platform label', () => {
  render(<CopyLinkHelp platformLabel="Facebook" />)
  const btn = trigger()
  fireEvent.click(btn)
  expect(panelOf(btn)).toHaveTextContent(/open your\s+Facebook\s+post/i)
})

it('collapses again when the trigger is clicked a second time', () => {
  render(<CopyLinkHelp platformLabel="Instagram" />)
  const btn = trigger()
  fireEvent.click(btn)
  expect(btn).toHaveAttribute('aria-expanded', 'true')
  fireEvent.click(btn)
  expect(btn).toHaveAttribute('aria-expanded', 'false')
  expect(screen.queryByText(/Copy link/i)).toBeNull()
})
