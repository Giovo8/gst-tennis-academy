'use client';

import AthletesSelector, {
  type Athlete,
  type PreviousGuest,
  type AthletesSelectorProps,
  type SelectedAthlete,
} from '@/components/bookings/AthletesSelector';

interface ParticipantsCardProps {
  athletes: Athlete[];
  selectedAthletes: SelectedAthlete[];
  onAthleteAdd: (athlete: SelectedAthlete) => void;
  onAthleteRemove: (index: number) => void;
  maxAthletes: number | null;
  previousGuests?: PreviousGuest[];
  title?: string;
  allowGuestParticipants?: boolean;
  searchPlaceholder?: string;
  nonRemovableIndexes?: number[];
  guestNameOnly?: boolean;
  participantLabelByIndex?: AthletesSelectorProps['participantLabelByIndex'];
  participantToneByIndex?: AthletesSelectorProps['participantToneByIndex'];
}

export default function ParticipantsCard({
  athletes,
  selectedAthletes,
  onAthleteAdd,
  onAthleteRemove,
  maxAthletes,
  previousGuests = [],
  title = 'Partecipanti',
  allowGuestParticipants = true,
  searchPlaceholder,
  nonRemovableIndexes,
  guestNameOnly,
  participantLabelByIndex,
  participantToneByIndex,
}: ParticipantsCardProps) {
  return (
    <div className="bg-white border border-black/10 rounded-lg overflow-hidden overflow-visible relative z-20">
      <div className="px-4 sm:px-6 py-4 border-b border-black/10 bg-gray-50">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">{title}</h2>
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
          allowGuestParticipants={allowGuestParticipants}
          searchPlaceholder={searchPlaceholder}
          nonRemovableIndexes={nonRemovableIndexes}
          guestNameOnly={guestNameOnly}
          participantLabelByIndex={participantLabelByIndex}
          participantToneByIndex={participantToneByIndex}
        />
      </div>
    </div>
  );
}
