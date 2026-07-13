"use client";

import AthletesSelector from "@/components/bookings/AthletesSelector";
import { type UserRole } from "@/lib/roles";

interface Coach {
  id: string;
  full_name: string;
  email?: string;
}

interface CoachCardProps {
  coaches: Coach[];
  selectedCoaches: string[];
  onChange: (coachIds: string[]) => void;
}

export default function CoachCard({ coaches, selectedCoaches, onChange }: CoachCardProps) {
  return (
    <div className="bg-white border border-black/10 rounded-lg overflow-hidden">
      <div className="px-4 sm:px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
        <h2 className="text-base sm:text-lg font-semibold text-secondary">Maestro</h2>
      </div>
      <div className="p-4 sm:p-6">
        <AthletesSelector
          athletes={coaches.map((coach) => ({
            id: coach.id,
            full_name: coach.full_name,
            email: coach.email || "",
            phone: null,
            role: "maestro" as UserRole,
          }))}
          selectedAthletes={selectedCoaches[0]
            ? [{
                userId: selectedCoaches[0],
                fullName: coaches.find((coach) => coach.id === selectedCoaches[0])?.full_name || "Maestro",
                isRegistered: true,
              }]
            : []}
          inlineMode
          keepNeutralSelectedBorder
          keepNeutralInputFocus
          allowGuestParticipants={false}
          searchPlaceholder="Cerca maestro"
          participantToneByIndex={() => "dark"}
          maxAthletes={null}
          onAthleteAdd={(athlete) => {
            if (athlete.userId) {
              onChange([athlete.userId]);
            }
          }}
          onAthleteRemove={() => {
            onChange([]);
          }}
        />
      </div>
    </div>
  );
}
