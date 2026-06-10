// __tests__/components/ChipSelect.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipSelect } from '@/components/ui/ChipSelect'

const options = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'email', label: 'Email' },
]

test('renders all options as chips', () => {
  render(<ChipSelect options={options} value={[]} onChange={() => {}} />)
  expect(screen.getByText('Instagram')).toBeInTheDocument()
  expect(screen.getByText('Facebook')).toBeInTheDocument()
  expect(screen.getByText('Email')).toBeInTheDocument()
})

test('selected chips have active styling', () => {
  render(<ChipSelect options={options} value={['instagram']} onChange={() => {}} />)
  expect(screen.getByText('Instagram').closest('button')).toHaveAttribute('data-selected', 'true')
  expect(screen.getByText('Facebook').closest('button')).toHaveAttribute('data-selected', 'false')
})

test('clicking an unselected chip adds it to value', async () => {
  const onChange = jest.fn()
  render(<ChipSelect options={options} value={['instagram']} onChange={onChange} />)
  await userEvent.click(screen.getByText('Facebook'))
  expect(onChange).toHaveBeenCalledWith(['instagram', 'facebook'])
})

test('clicking a selected chip removes it from value', async () => {
  const onChange = jest.fn()
  render(<ChipSelect options={options} value={['instagram', 'facebook']} onChange={onChange} />)
  await userEvent.click(screen.getByText('Instagram'))
  expect(onChange).toHaveBeenCalledWith(['facebook'])
})
