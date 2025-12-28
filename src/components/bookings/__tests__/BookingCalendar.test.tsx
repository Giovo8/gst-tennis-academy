import { render, screen } from '@testing-library/react'
import BookingCalendar from '../BookingCalendar'

// Mock the supabase client
jest.mock('@/lib/supabase/client')

describe('BookingCalendar Component', () => {
  it('renders booking calendar component', () => {
    const { container } = render(<BookingCalendar />)
    expect(container).toBeTruthy()
  })
})
