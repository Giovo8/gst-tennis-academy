"use client";

import { X, Mail, Swords, User as UserIcon, Award, Trophy, Target } from "lucide-react";
import { useRouter } from "next/navigation";

interface PlayerProfile {
  id: string;
  full_name: string;
  avatar_url?: string;
  bio?: string;
  stats?: {
    ranking: number;
    totalMatches: number;
    wins: number;
    losses: number;
    winRate: number;
    streak: number;
    points: number;
    level: string;
  };
}

interface PlayerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: PlayerProfile | null;
  onChallenge?: (player: PlayerProfile) => void;
  onMessage?: (playerId: string) => void;
}

export default function PlayerProfileModal({
  isOpen,
  onClose,
  player,
  onChallenge,
  onMessage,
}: PlayerProfileModalProps) {
  const router = useRouter();

  if (!isOpen || !player) return null;

  const getLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case "oro":
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "argento":
        return "text-gray-600 bg-gray-50 border-gray-200";
      case "bronzo":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "platino":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "diamante":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  function handleMessage() {
    if (!player) return;
    router.push(`/dashboard/atleta/mail?recipient=${player.id}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header with gradient background */}
        <div className="relative bg-gradient-to-r from-frozen-500 to-frozen-600 h-32">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Profile Picture */}
        <div className="px-6 -mt-16 mb-4">
          <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-xl mx-auto overflow-hidden">
            {player.avatar_url ? (
              <img
                src={player.avatar_url}
                alt={player.full_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-frozen-500 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {player.full_name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Player Info */}
        <div className="px-6 pb-6 space-y-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{player.full_name}</h2>
            {player.stats && (
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getLevelColor(
                    player.stats.level
                  )}`}
                >
                  <Award className="h-3 w-3" />
                  {player.stats.level}
                </span>
                <span className="text-sm text-gray-600">#{player.stats.ranking}</span>
              </div>
            )}
          </div>

          {/* Bio */}
          {player.bio && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-700">{player.bio}</p>
            </div>
          )}

          {/* Stats */}
          {player.stats && (
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Trophy className="h-4 w-4 text-frozen-600" />
                  <p className="text-xs text-gray-600 font-medium">Punti</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{player.stats.points}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-green-600" />
                  <p className="text-xs text-gray-600 font-medium">Win Rate</p>
                </div>
                <p className="text-xl font-bold text-gray-900">{player.stats.winRate.toFixed(1)}%</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">Record</p>
                    <p className="text-lg font-bold text-gray-900">
                      {player.stats.wins}W - {player.stats.losses}L
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600 font-medium mb-1">Match Totali</p>
                    <p className="text-lg font-bold text-gray-900">{player.stats.totalMatches}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            {onMessage && (
              <button
                onClick={handleMessage}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Mail className="h-4 w-4" />
                Messaggio
              </button>
            )}
            {onChallenge && (
              <button
                onClick={() => {
                  onChallenge(player);
                  onClose();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white bg-frozen-500 rounded-lg hover:bg-frozen-600 transition-colors"
              >
                <Swords className="h-4 w-4" />
                Lancia Sfida
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
