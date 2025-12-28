import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ProfileEditor from '../ProfileEditor'
import { supabase } from '@/lib/supabase/client'

jest.mock('@/lib/supabase/client')

describe('ProfileEditor Component', () => {
  const mockUser = {
    id: 'user-123',
    email: 'atleta@test.com',
  }

  const mockProfile = {
    id: 'user-123',
    full_name: 'Mario Rossi',
    email: 'atleta@test.com',
    phone: '+39 123456789',
    phone_secondary: '',
    birth_date: '1990-01-01',
    location: 'Roma',
    bio: 'Appassionato di tennis',
    skill_level: 'intermedio',
    preferred_times: ['mattina', 'sera'],
    emergency_contact: {
      name: 'Luigi Rossi',
      phone: '+39 987654321',
      relation: 'fratello',
    },
    tennis_stats: {
      racket: 'Wilson Pro Staff',
      grip_size: '3',
      playing_style: 'baseline',
      hand: 'destro',
    },
    website_url: '',
    social_media: {
      instagram: '@mariorossi',
      facebook: '',
      youtube: '',
    },
    profile_completion_percentage: 75,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockProfile,
            error: null,
          }),
        }),
      }),
      update: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          error: null,
        }),
      }),
    })
  })

  it('renders profile editor with loading state initially', () => {
    render(<ProfileEditor />)
    
    // Should show loading spinner initially
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('loads and displays profile data', async () => {
    render(<ProfileEditor />)
    
    await waitFor(() => {
      expect(screen.getByText('Modifica Profilo')).toBeInTheDocument()
    })
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Mario Rossi')).toBeInTheDocument()
    })
  })

  it('displays completion percentage', async () => {
    render(<ProfileEditor />)
    
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument()
      expect(screen.getByText('Completato')).toBeInTheDocument()
    })
  })

  it('shows all 4 navigation steps', async () => {
    render(<ProfileEditor />)
    
    await waitFor(() => {
      expect(screen.getByText('Info Personali')).toBeInTheDocument()
      expect(screen.getByText('Contatti')).toBeInTheDocument()
      expect(screen.getByText('Tennis')).toBeInTheDocument()
      expect(screen.getByText('Bio & Social')).toBeInTheDocument()
    })
  })

  it('navigates between steps', async () => {
    render(<ProfileEditor />)
    
    await waitFor(() => {
      expect(screen.getByText('Modifica Profilo')).toBeInTheDocument()
    })
    
    // Click "Avanti" button to go to step 2
    const avantiButton = screen.getByText('Avanti')
    fireEvent.click(avantiButton)
    
    // Should show contacts form
    await waitFor(() => {
      expect(screen.getByText('Telefono Principale')).toBeInTheDocument()
    })
    
    // Click "Indietro" to go back to step 1
    const indietroButton = screen.getByText('Indietro')
    fireEvent.click(indietroButton)
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Mario Rossi')).toBeInTheDocument()
    })
  })

  it('allows editing text fields', async () => {
    render(<ProfileEditor />)
    
    await waitFor(() => {
      const nameInput = screen.getByDisplayValue('Mario Rossi')
      expect(nameInput).toBeInTheDocument()
      
      fireEvent.change(nameInput, { target: { value: 'Mario Verdi' } })
      expect(nameInput).toHaveValue('Mario Verdi')
    })
  })

  it('displays email as readonly', async () => {
    render(<ProfileEditor />)
    
    await waitFor(() => {
      const emailInput = screen.getByDisplayValue('atleta@test.com')
      expect(emailInput).toBeDisabled()
    })
  })
})
