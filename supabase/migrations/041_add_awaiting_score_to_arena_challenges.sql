-- Add 'awaiting_score' to arena_challenges status check constraint
ALTER TABLE public.arena_challenges
  DROP CONSTRAINT challenge_status_check;

ALTER TABLE public.arena_challenges
  ADD CONSTRAINT challenge_status_check
    CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'cancelled', 'counter_proposal', 'awaiting_score'));
