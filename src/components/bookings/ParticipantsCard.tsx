"use client";

import AthletesSelector, {
  type Athlete,
  type PreviousGuest,
  type SelectedAthlete,
} from "@/components/bookings/AthletesSelector";

interface ParticipantsCardProps {
  athletes: Athlete[];
  selectedAthletes: SelectedAthlete[];
  onAthleteAdd: (athlete: SelectedAthlete) => void;
  onAthleteRemove: (index: number) => void;
  maxAthletes: number | null;
  previousGuests?: PreviousGuest[];
}

export default function ParticipantsCard({
  athletes,
  selectedAthletes,
  onAthleteAdd,
  onAthleteRemove,
  maxAthletes,
  previousGuests = [],
}: ParticipantsCardProps) {
  return (
    <div className="bg-white border border-black/10 rounded-lg overflow-hidden overflow-visible relative z-20">
      <div className="px-4 sm:px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">Partecipanti</h2>
      </div>
      <div className="p-4 sm:p-6">
        <AthletesSelector
          athletes={athletes}
          selectedAthletes={selectedAthletes}
          inlineMode
          keepNeutralSelectedBorder
          keepNeutralInputFocus
          hideEmptyMessages
          onAthleteAdd={onAthleteAdd}
          onAthleteRemove={onAthleteRemove}
          maxAthletes={maxAthletes}
          previousGuests={previousGuests}
        />
      </div>
    </div>
  );
}
