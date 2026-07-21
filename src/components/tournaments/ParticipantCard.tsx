"use client";

import { MoreVertical, Trash2 } from "lucide-react";
import { getAvatarUrl } from "@/lib/utils";
import Avatar from "@/components/ui/Avatar";

interface GroupInfo {
  id: string;
  group_name: string;
}

interface ParticipantCardProps {
  participant: any;
  isAdmin: boolean;
  currentPhase: string;
  groups?: GroupInfo[];
  teamsAdvancing?: number;
  showGroupInfo?: boolean;
  showGroupPosition?: boolean;
  openMenuId: string | null;
  onMenuToggle: (id: string | null) => void;
  onRemove: (id: string, name: string) => void;
}

export function ParticipantCard({
  participant,
  isAdmin,
  currentPhase,
  groups = [],
  teamsAdvancing = 2,
  showGroupInfo = false,
  showGroupPosition = false,
  openMenuId,
  onMenuToggle,
  onRemove,
}: ParticipantCardProps) {
  const fullName = participant.profiles?.full_name || participant.player_name || "Giocatore";
  const avatarUrl = participant.profiles?.avatar_url
    ? getAvatarUrl(participant.profiles.avatar_url)
    : null;
  const isGuest = !participant.user_id;

  return (
    <div
      className={`bg-white rounded-lg px-5 py-4 border border-black/10 hover:border-gray-300 transition-all border-l-4 ${
        isGuest ? "border-l-gray-300" : "border-l-secondary"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="w-10 flex-shrink-0 flex items-center justify-center">
          <div
            className={`w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg flex items-center justify-center text-sm font-bold overflow-hidden relative ${
              isGuest ? "bg-gray-200 text-gray-400" : "bg-secondary text-white"
            }`}
          >
            {avatarUrl ? (
              <Avatar src={avatarUrl} name={fullName} fill />
            ) : (
              <span>{fullName?.charAt(0)?.toUpperCase() || "U"}</span>
            )}
          </div>
        </div>

        {/* Name + optional group info */}
        <div className="flex-1">
          <div className={`font-bold ${isGuest ? "text-gray-400" : "text-secondary"}`}>
            {fullName}
          </div>
          {showGroupInfo && participant.group_id && (
            <div className="text-xs text-secondary/60 mt-0.5">
              {groups.find((g) => g.id === participant.group_id)?.group_name || "Girone"}
              {showGroupPosition && participant.group_position != null && (
                <>
                  {" - "}
                  {participant.group_position <= teamsAdvancing
                    ? `Posizione ${participant.group_position}`
                    : "Non Qualificato"}
                </>
              )}
            </div>
          )}
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() =>
                onMenuToggle(openMenuId === participant.id ? null : participant.id)
              }
              className="inline-flex items-center justify-center p-2.5 rounded-lg hover:bg-gray-100 text-secondary/60 hover:text-secondary transition-colors touch-manipulation min-w-[40px] min-h-[40px]"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            {openMenuId === participant.id && (
              <div
                className="absolute right-0 top-9 z-20 bg-white border border-black/10 rounded-lg shadow-lg min-w-[160px] py-1"
                onClick={() => onMenuToggle(null)}
              >
                {currentPhase === "iscrizioni" && (
                  <button
                    onClick={() => onRemove(participant.id, fullName)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#022431] hover:bg-[#022431]/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Rimuovi
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
