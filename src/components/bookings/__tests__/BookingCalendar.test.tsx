import { render, screen } from '@testing-library/react'
import BookingCalendar from '../BookingCalendar'

// Mock the supabase client
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
    })),
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    })),
    removeChannel: jest.fn(),
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      }),
    },
  },
}))

describe('BookingCalendar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders booking calendar component', () => {
    const { container } = render(<BookingCalendar />)
    expect(container).toBeTruthy()
  })
})
