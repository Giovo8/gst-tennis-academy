/**
 * Type definitions for tournament system
 */

export interface TournamentParticipant {
  id: string;
  tournament_id: string;
  user_id: string;
  group_name?: string | null;
  seed?: number | null;
  status?: string;
  created_at?: string;
  profile?: UserProfile;
}

export interface UserProfile {
  id: string;
  full_name: string;
  email?: string;
  avatar_url?: string;
  role?: string;
}

export interface BracketMatch {
  id?: string;
  tournament_id: string;
  round: number;
  match_number: number;
  player1_id: string | null;
  player2_id: string | null;
  winner_id?: string | null;
  player1_score?: string | null;
  player2_score?: string | null;
  scheduled_at?: string | null;
  status?: 'pending' | 'in_progress' | 'completed';
  next_match_id?: string | null;
}

export interface GroupStanding {
  user_id: string;
  wins: number;
  losses: number;
  sets_won: number;
  sets_lost: number;
  games_won: number;
  games_lost: number;
  points?: number;
  profile?: UserProfile;
}

export interface GroupData {
  group_name: string;
  participants: string[];
}

export interface RoundData {
  round: number;
  matches: Array<{
    player1_id: string;
    player2_id: string;
    match_number: number;
  }>;
}

export interface TournamentBody {
  name?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  max_participants?: number;
  competition_type?: 'knockout' | 'round_robin' | 'groups_then_knockout' | 'championship';
  status?: 'draft' | 'open' | 'in_progress' | 'completed';
  visibility?: 'public' | 'private';
  registration_deadline?: string;
  rounds_data?: RoundData[];
  groups_data?: GroupData[];
  standings?: GroupStanding[];
  winner_id?: string | null;
  created_by?: string;
}

export interface Tournament extends TournamentBody {
  id: string;
  created_at: string;
  updated_at?: string;
}
