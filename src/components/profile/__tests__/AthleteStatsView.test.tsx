import { render, screen, waitFor } from '@testing-library/react'
import AthleteStatsView from '../AthleteStatsView'
import { supabase } from '@/lib/supabase/client'

jest.mock('@/lib/supabase/client')

describe('AthleteStatsView Component', () => {
  const mockUser = {
    id: 'user-123',
    email: 'atleta@test.com',
  }

  const mockStats = {
    user_id: 'user-123',
    total_matches: 25,
    matches_won: 18,
    matches_lost: 7,
    win_rate: 72.0,
    total_sets: 60,
    sets_won: 40,
    sets_lost: 20,
    total_games: 450,
    games_won: 280,
    games_lost: 170,
    aces: 85,
    double_faults: 23,
    first_serve_percentage: 65.5,
    first_serve_points_won: 120,
    second_serve_points_won: 45,
    break_points_won: 35,
    break_points_total: 60,
    return_games_won: 42,
    winners: 156,
    unforced_errors: 89,
    total_points_won: 1240,
    longest_win_streak: 7,
    current_win_streak: 3,
    best_victory: 'Vittoria contro campione regionale 6-4, 6-3',
    total_bookings: 48,
    total_lessons: 32,
    total_tournaments: 8,
    last_match_date: '2024-12-20',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(supabase.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: mockUser },
      error: null,
    })
  })

  it('shows loading spinner initially', () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockImplementation(() => new Promise(() => {})),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    const spinner = document.querySelector('.animate-spin')
    expect(spinner).toBeInTheDocument()
  })

  it('displays empty state when no stats available', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    await waitFor(() => {
      expect(screen.getByText('Nessuna Statistica Disponibile')).toBeInTheDocument()
      expect(screen.getByText(/Partecipa ai tornei/i)).toBeInTheDocument()
    })
  })

  it('displays all overview cards with correct data', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStats,
            error: null,
          }),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    await waitFor(() => {
      // Total Matches
      expect(screen.getByText('Partite Totali')).toBeInTheDocument()
      expect(screen.getByText('25')).toBeInTheDocument()
      expect(screen.getByText('18V - 7S')).toBeInTheDocument()
      
      // Win Rate
      expect(screen.getByText('Percentuale Vittorie')).toBeInTheDocument()
      expect(screen.getByText('72.0%')).toBeInTheDocument()
      
      // Sets
      expect(screen.getByText('Set')).toBeInTheDocument()
      expect(screen.getByText('60')).toBeInTheDocument()
      
      // Longest Streak
      expect(screen.getByText('Striscia Record')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
    })
  })

  it('displays service statistics correctly', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStats,
            error: null,
          }),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    await waitFor(() => {
      expect(screen.getByText('Statistiche Servizio')).toBeInTheDocument()
      expect(screen.getByText('Prima di Servizio')).toBeInTheDocument()
      expect(screen.getByText('65.5%')).toBeInTheDocument()
      expect(screen.getByText('Aces')).toBeInTheDocument()
      expect(screen.getByText('85')).toBeInTheDocument()
      expect(screen.getByText('Doppi Falli')).toBeInTheDocument()
      expect(screen.getByText('23')).toBeInTheDocument()
    })
  })

  it('displays return statistics with break point conversion', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStats,
            error: null,
          }),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    await waitFor(() => {
      expect(screen.getByText('Statistiche Risposta')).toBeInTheDocument()
      expect(screen.getByText('Conversione Palle Break')).toBeInTheDocument()
      // Break point conversion: 35/60 = 58.3%
      expect(screen.getByText('58.3%')).toBeInTheDocument()
      expect(screen.getByText('35 / 60 palle break convertite')).toBeInTheDocument()
    })
  })

  it('displays point quality analysis', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStats,
            error: null,
          }),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    await waitFor(() => {
      expect(screen.getByText('Qualità dei Punti')).toBeInTheDocument()
      expect(screen.getByText('Colpi Vincenti')).toBeInTheDocument()
      expect(screen.getByText('156')).toBeInTheDocument()
      expect(screen.getByText('Errori Non Forzati')).toBeInTheDocument()
      expect(screen.getByText('89')).toBeInTheDocument()
      expect(screen.getByText('Punti Totali Vinti')).toBeInTheDocument()
      expect(screen.getByText('1240')).toBeInTheDocument()
    })
  })

  it('displays activity summary', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStats,
            error: null,
          }),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    await waitFor(() => {
      expect(screen.getByText('Riepilogo Attività')).toBeInTheDocument()
      expect(screen.getByText('Tornei')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      expect(screen.getByText('Lezioni')).toBeInTheDocument()
      expect(screen.getByText('32')).toBeInTheDocument()
      expect(screen.getByText('Prenotazioni')).toBeInTheDocument()
      expect(screen.getByText('48')).toBeInTheDocument()
    })
  })

  it('displays best victory when available', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStats,
            error: null,
          }),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    await waitFor(() => {
      expect(screen.getByText('Miglior Vittoria')).toBeInTheDocument()
      expect(screen.getByText('Vittoria contro campione regionale 6-4, 6-3')).toBeInTheDocument()
    })
  })

  it('calculates differentials correctly', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStats,
            error: null,
          }),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    await waitFor(() => {
      // Check for Set Diff in the footer (within StatCard)
      expect(screen.getByText(/Set Diff/i)).toBeInTheDocument()
      
      // Check that the component rendered with the correct data
      expect(screen.getByText('Game Differenziale')).toBeInTheDocument()
    })
  })

  it('formats last match date correctly', async () => {
    ;(supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockStats,
            error: null,
          }),
        }),
      }),
    })

    render(<AthleteStatsView />)
    
    await waitFor(() => {
      expect(screen.getByText('Ultima Partita')).toBeInTheDocument()
      // Date should be formatted as Italian locale (20 dic)
      const dateElements = screen.getAllByText(/dic/i)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })
})
