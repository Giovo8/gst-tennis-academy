import { supabase } from "@/lib/supabase/client";
import logger from '@/lib/logger/secure-logger';

export async function notifyTournamentStart(tournamentId: string, tournamentName: string) {
  try {
    // Get all participants of the tournament
    const { data: participants } = await supabase
      .from("tournament_participants")
      .select("user_id")
      .eq("tournament_id", tournamentId);

    if (!participants || participants.length === 0) return;

    // Create notification for each participant using API
    for (const participant of participants) {
      await fetch("/api/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: participant.user_id,
          type: "tournament",
          title: "Il torneo è iniziato!",
          message: `Il torneo "${tournamentName}" è ora in corso. Controlla il tabellone per vedere i tuoi match.`,
          link: `/tornei/${tournamentId}`,
        }),
      });
    }
  } catch (error) {
    logger.error("Error notifying tournament start:", error);
  }
}

export async function notifyMatchScheduled(
  userId: string,
  tournamentName: string,
  opponentName: string,
  tournamentId: string
) {
  try {
    await fetch("/api/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        type: "tournament",
        title: "Nuovo match programmato",
        message: `Il tuo match contro ${opponentName} nel torneo "${tournamentName}" è stato programmato.`,
        link: `/tornei/${tournamentId}`,
      }),
    });
  } catch (error) {
    logger.error("Error notifying match scheduled:", error);
  }
}
