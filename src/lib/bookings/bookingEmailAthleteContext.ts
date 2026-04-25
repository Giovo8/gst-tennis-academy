type BookingEmailOwner = {
  full_name?: string | null;
  email?: string | null;
  role?: string | null;
};

type BookingEmailParticipant = {
  full_name?: string | null;
  email?: string | null;
};

type ResolveBookingEmailAthleteContextInput = {
  owner?: BookingEmailOwner | null;
  participants?: BookingEmailParticipant[] | null;
  fallbackName?: string;
};

type ResolveBookingEmailAthleteContextResult = {
  athleteName: string;
  athleteEmail: string | null;
  athleteRecipientEmails: string[];
  additionalAthleteNames: string[];
};

import { isStaffRole } from "@/lib/roles";
import { normalizeEmail } from "@/lib/email/email-utils";

export function resolveBookingEmailAthleteContext({
  owner,
  participants,
  fallbackName = "Un atleta",
}: ResolveBookingEmailAthleteContextInput): ResolveBookingEmailAthleteContextResult {
  const normalizedParticipants = (participants || [])
    .map((participant) => ({
      full_name: participant.full_name?.trim() || null,
      email: normalizeEmail(participant.email),
    }))
    .filter((participant) => Boolean(participant.full_name || participant.email));

  const primaryParticipant = normalizedParticipants[0] || null;
  const ownerName = owner?.full_name?.trim() || null;
  const ownerEmail = normalizeEmail(owner?.email);
  const ownerIsStaff = isStaffRole(owner?.role);
  const shouldPreferParticipantIdentity = ownerIsStaff && normalizedParticipants.length > 0;

  const athleteName = shouldPreferParticipantIdentity
    ? primaryParticipant?.full_name || ownerName || fallbackName
    : ownerName || primaryParticipant?.full_name || fallbackName;

  const athleteEmail = shouldPreferParticipantIdentity
    ? primaryParticipant?.email || null
    : ownerEmail || primaryParticipant?.email || null;

  const athleteRecipientEmails = Array.from(
    new Set(
      [
        shouldPreferParticipantIdentity ? null : ownerEmail,
        ...normalizedParticipants.map((participant) => participant.email),
      ].filter((email): email is string => Boolean(email))
    )
  );

  const normalizedAthleteName = athleteName.trim().toLowerCase();
  const additionalAthleteNames = Array.from(
    new Set(
      normalizedParticipants
        .map((participant) => participant.full_name)
        .filter((name): name is string => Boolean(name))
        .filter((name) => name.toLowerCase() !== normalizedAthleteName)
    )
  );

  return {
    athleteName,
    athleteEmail,
    athleteRecipientEmails,
    additionalAthleteNames,
  };
}