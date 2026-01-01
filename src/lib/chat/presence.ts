"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";

type UserStatus = "online" | "offline" | "away" | "busy";

interface UseUserPresenceReturn {
  status: UserStatus;
  lastSeen: string | null;
  isOnline: boolean;
}

/**
 * Hook per tracciare e aggiornare lo stato di presenza di un utente
 * @param userId - ID dell'utente da monitorare
 * @returns Stato di presenza dell'utente
 */
export function useUserPresence(userId: string | null): UseUserPresenceReturn {
  const [status, setStatus] = useState<UserStatus>("offline");
  const [lastSeen, setLastSeen] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    // Load initial presence
    loadPresence();

    // Subscribe to real-time presence updates
    const channel = supabase
      .channel(`presence:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_presence",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.new) {
            setStatus((payload.new as any).status || "offline");
            setLastSeen((payload.new as any).last_seen || null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  async function loadPresence() {
    if (!userId) return;

    const { data } = await supabase
      .from("user_presence")
      .select("status, last_seen")
      .eq("user_id", userId)
      .single();

    if (data) {
      setStatus(data.status || "offline");
      setLastSeen(data.last_seen);
    }
  }

  return {
    status,
    lastSeen,
    isOnline: status === "online" || status === "away" || status === "busy",
  };
}

/**
 * Hook per aggiornare automaticamente la presenza dell'utente corrente
 * Imposta online all'attivazione e gestisce offline alla chiusura
 */
export function useCurrentUserPresence() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    initializePresence();

    // Update presence every 30 seconds
    const interval = setInterval(() => {
      updatePresence("online");
    }, 30000);

    // Handle visibility change (tab focus)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence("away");
      } else {
        updatePresence("online");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Set offline on unmount
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      updatePresence("offline");
    };
  }, []);

  async function initializePresence() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setUserId(user.id);
    await updatePresence("online");
  }

  async function updatePresence(status: UserStatus) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Upsert presence
    await supabase.from("user_presence").upsert(
      {
        user_id: user.id,
        status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "user_id",
      }
    );
  }

  return { userId };
}

/**
 * Hook per gestire gli indicatori di digitazione
 * @param conversationId - ID della conversazione
 */
export function useTypingIndicator(conversationId: string | null) {
  const [typingUsers, setTypingUsers] = useState<
    Array<{ user_id: string; full_name: string }>
  >([]);

  useEffect(() => {
    if (!conversationId) return;

    // Subscribe to typing indicators
    const channel = supabase
      .channel(`typing:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "typing_indicators",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const newData = payload.new as any;
            if (newData.is_typing) {
              // Fetch user profile
              const { data: profile } = await supabase
                .from("profiles")
                .select("id, full_name")
                .eq("id", newData.user_id)
                .single();

              if (profile) {
                setTypingUsers((prev) => {
                  // Avoid duplicates
                  if (prev.some((u) => u.user_id === profile.id)) return prev;
                  return [...prev, { user_id: profile.id, full_name: profile.full_name }];
                });

                // Auto-remove after 5 seconds
                setTimeout(() => {
                  setTypingUsers((prev) =>
                    prev.filter((u) => u.user_id !== profile.id)
                  );
                }, 5000);
              }
            } else {
              // Remove user from typing list
              setTypingUsers((prev) =>
                prev.filter((u) => u.user_id !== newData.user_id)
              );
            }
          } else if (payload.eventType === "DELETE") {
            const oldData = payload.old as any;
            setTypingUsers((prev) =>
              prev.filter((u) => u.user_id !== oldData.user_id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  async function setTyping(isTyping: boolean) {
    if (!conversationId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("typing_indicators").upsert(
      {
        conversation_id: conversationId,
        user_id: user.id,
        is_typing: isTyping,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "conversation_id,user_id",
      }
    );
  }

  return { typingUsers, setTyping };
}
