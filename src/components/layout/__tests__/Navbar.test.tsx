import { render } from '@testing-library/react'
import Navbar from '../Navbar'

// Mock the supabase client
jest.mock('@/lib/supabase/client')

describe('Navbar Component', () => {
  it('renders navbar component', () => {
    const { container } = render(<Navbar />)
    expect(container).toBeTruthy()
  })
})
