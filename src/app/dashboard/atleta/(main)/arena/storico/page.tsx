"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  History,
  Shield,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Challenge {
  id: string;
  challenger_id: string;
  opponent_id: string;
  status: "pending" | "accepted" | "declined" | "completed" | "cancelled" | "counter_proposal";
  scheduled_date?: string;
  court?: string;
  message?: string;
  booking_id?: string;
  challenge_type?: string;
  created_at: string;
  challenger?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  opponent?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  booking?: {
    id: string;
    court: string;
    start_time: string;
    end_time: string;
    status: string;
    manager_confirmed: boolean;
  };
}

export default function StoricoPage() {
  const router = useRouter();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    loadArenaData();
  }, []);

  async function loadArenaData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    // Load challenges
    try {
      const challengesRes = await fetch(`/api/arena/challenges?user_id=${user.id}`);
      if (challengesRes.ok) {
        const challengesData = await challengesRes.json();
        setChallenges(challengesData.challenges || []);
      }
    } catch (error) {
      console.error("Error loading challenges:", error);
    }

    setLoading(false);
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "In Attesa",
      accepted: "Accettata",
      declined: "Rifiutata",
      completed: "Completata",
      cancelled: "Cancellata",
      counter_proposal: "Controproposta",
    };
    return labels[status] || status;
  };

  const pastChallenges = challenges.filter((challenge) => {
    // Only include completed, declined, or cancelled challenges
    return ["completed", "declined", "cancelled"].includes(challenge.status);
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-12 bg-gray-200 rounded-xl w-48" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <p className="breadcrumb text-secondary/60">
        <Link href="/dashboard/atleta/arena" className="hover:text-secondary/80 transition-colors">Arena</Link>
        {" › "}
        <span>Storico</span>
      </p>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-secondary">Storico Sfide</h1>
        <p className="text-secondary/70 text-sm mt-1">
          Tutte le tue sfide completate, rifiutate o annullate
        </p>
      </div>

      {/* Content */}
      {pastChallenges.length === 0 ? (
        <div className="text-center py-20 rounded-xl bg-white">
          <History className="w-16 h-16 mx-auto text-secondary/20 mb-4" />
          <h3 className="text-xl font-semibold text-secondary mb-2">Nessuna sfida passata</h3>
          <p className="text-secondary/70">Le tue sfide completate appariranno qui</p>
        </div>
      ) : (
        <div className="overflow-x-auto scrollbar-hide">
          <div className="space-y-3 min-w-[750px]">
            {/* Header Row */}
            <div className="bg-secondary rounded-lg px-5 py-3 mb-3 border border-secondary">
              <div className="flex items-center gap-4">
                <div className="w-8 flex-shrink-0">
                  <div className="text-xs font-bold text-white/80 uppercase"></div>
                </div>
                <div className="w-10 flex-shrink-0">
                  <div className="text-xs font-bold text-white/80 uppercase"></div>
                </div>
                <div className="w-48 flex-shrink-0">
                  <div className="text-xs font-bold text-white/80 uppercase">Avversario</div>
                </div>
                <div className="w-24 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Data</div>
                </div>
                <div className="w-20 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Ora</div>
                </div>
                <div className="w-24 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Campo</div>
                </div>
                <div className="w-28 flex-shrink-0 text-center">
                  <div className="text-xs font-bold text-white/80 uppercase">Stato</div>
                </div>
              </div>
            </div>

            {/* Data Rows */}
            {pastChallenges.map((challenge) => {
              const isChallenger = challenge.challenger_id === userId;
              const opponent = isChallenger ? challenge.opponent : challenge.challenger;

              return (
                <div
                  key={challenge.id}
                  onClick={() => router.push(`/dashboard/atleta/arena/challenge/${challenge.id}`)}
                  className="bg-white rounded-lg px-5 py-4 border border-gray-200 hover:border-gray-300 transition-all cursor-pointer border-l-4 border-l-secondary"
                >
                  <div className="flex items-center gap-4">
                    {/* Icona Tipo Sfida */}
                    <div className="w-8 flex-shrink-0 flex items-center justify-center">
                      {challenge.challenge_type === "ranked" ? (
                        <Shield className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      ) : (
                        <Star className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                      )}
                    </div>

                    {/* Avatar Avversario */}
                    <div className="w-10 h-10 rounded-lg bg-secondary text-white flex items-center justify-center text-sm font-bold flex-shrink-0 overflow-hidden">
                      {opponent?.avatar_url ? (
                        <img
                          src={opponent.avatar_url}
                          alt={opponent.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{opponent?.full_name?.charAt(0).toUpperCase()}</span>
                      )}
                    </div>

                    {/* Nome Avversario */}
                    <div className="w-48 flex-shrink-0">
                      <div className="font-bold text-secondary text-sm truncate">
                        {opponent?.full_name}
                      </div>
                    </div>

                    {/* Data */}
                    <div className="w-24 flex-shrink-0 text-center">
                      <span className="text-xs text-secondary/60">
                        {challenge.booking
                          ? new Date(challenge.booking.start_time).toLocaleDateString("it-IT", {
                              day: "2-digit",
                              month: "short",
                            })
                          : "-"}
                      </span>
                    </div>

                    {/* Ora */}
                    <div className="w-20 flex-shrink-0 text-center">
                      <span className="text-xs text-secondary/60">
                        {challenge.booking
                          ? new Date(challenge.booking.start_time).toLocaleTimeString("it-IT", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "-"}
                      </span>
                    </div>

                    {/* Campo */}
                    <div className="w-24 flex-shrink-0 text-center">
                      <span className="text-xs text-secondary/60">
                        {challenge.booking?.court || "-"}
                      </span>
                    </div>

                    {/* Stato */}
                    <div className="w-28 flex-shrink-0 text-center">
                      <span className="text-xs text-secondary/60">
                        {getStatusLabel(challenge.status)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
