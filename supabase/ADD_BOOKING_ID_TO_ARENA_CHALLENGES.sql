-- Add booking_id to arena_challenges table to link challenges with court bookings

-- Add the booking_id column
ALTER TABLE arena_challenges
ADD COLUMN IF NOT EXISTS booking_id UUID;

-- Add foreign key constraint to bookings table
ALTER TABLE arena_challenges
ADD CONSTRAINT fk_arena_challenges_booking
FOREIGN KEY (booking_id)
REFERENCES bookings(id)
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_arena_challenges_booking_id
ON arena_challenges(booking_id);

-- Add comment
COMMENT ON COLUMN arena_challenges.booking_id IS 'Reference to the court booking created for this challenge';
