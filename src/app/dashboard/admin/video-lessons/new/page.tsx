"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import AuthGuard from "@/components/auth/AuthGuard";
import AthletesSelector from "@/components/bookings/AthletesSelector";
import { type UserRole } from "@/lib/roles";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
};

type SelectedAthlete = {
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isRegistered: boolean;
};

export default function VideoLessonFormPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const videoId = searchParams.get("id");
  const isEditMode = !!videoId;
  const isMaestroRoute = pathname.startsWith("/dashboard/maestro");
  const baseVideosPath = isMaestroRoute
    ? "/dashboard/maestro/videos"
    : "/dashboard/admin/video-lessons";
  const allowedRoles = isMaestroRoute
    ? (["maestro", "admin", "gestore"] as const)
    : (["admin", "gestore"] as const);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    video_url: "",
    thumbnail_url: "",
    duration_minutes: "",
    category: "generale",
    level: "tutti",
  });

  const selectedAthletes: SelectedAthlete[] = selectedUsers
    .map((id) => users.find((user) => user.id === id))
    .filter((user): user is User => Boolean(user))
    .map((user) => ({
      userId: user.id,
      fullName: user.full_name || "Utente",
      email: user.email,
      isRegistered: true,
    }));

  useEffect(() => {
    loadUsers();
    if (isEditMode) {
      loadVideo();
    }
  }, [videoId]);

  function formatDbError(err: any): string {
    if (!err) return "Errore sconosciuto";
    if (typeof err === "string") return err;
    const message = err.message || err.error_description || err.details;
    const code = err.code ? ` (${err.code})` : "";
    return message ? `${message}${code}` : `Errore durante il salvataggio${code}`;
  }

  async function loadUsers() {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("role", ["atleta", "maestro"])
        .order("full_name", { ascending: true });

      if (!error && data) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error loading users:", error);
    }
  }

  async function loadVideo() {
    try {
      const { data, error } = await supabase
        .from("video_lessons")
        .select("*")
        .eq("id", videoId)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          title: data.title,
          description: data.description || "",
          video_url: data.video_url,
          thumbnail_url: data.thumbnail_url || "",
          duration_minutes: data.duration_minutes?.toString() || "",
          category: data.category,
          level: data.level,
        });

        // Load assigned users
        const { data: assignments } = await supabase
          .from("video_assignments")
          .select("user_id")
          .eq("video_id", videoId);

        if (assignments) {
          setSelectedUsers(assignments.map((a) => a.user_id));
        }
      }
    } catch (error) {
      console.error("Error loading video:", error);
      alert("Errore nel caricamento del video");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.title || !formData.video_url) {
      alert("Titolo e URL video sono obbligatori");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        throw new Error("Sessione utente non valida. Effettua di nuovo il login.");
      }

      const { data: actorProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      const actorDisplayName = actorProfile?.full_name || user.email || "lo staff";

      const videoData = {
        title: formData.title,
        description: formData.description,
        video_url: formData.video_url,
        thumbnail_url: formData.thumbnail_url || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        category: formData.category,
        level: formData.level,
        is_active: true,
      };

      let currentVideoId = videoId;
      let previouslyAssignedIds: string[] = [];

      if (isEditMode) {
        // Update video
        const { error } = await supabase
          .from("video_lessons")
          .update(videoData)
          .eq("id", videoId);

        if (error) throw new Error(formatDbError(error));

        // Snapshot existing assignments to detect new ones
        const { data: existing } = await supabase
          .from("video_assignments")
          .select("user_id")
          .eq("video_id", videoId);
        previouslyAssignedIds = (existing ?? []).map((a) => a.user_id);

        // Delete existing assignments
        const { error: deleteAssignmentsError } = await supabase
          .from("video_assignments")
          .delete()
          .eq("video_id", videoId);

        if (deleteAssignmentsError) {
          throw new Error(formatDbError(deleteAssignmentsError));
        }
      } else {
        // Create new video
        const { data: newVideo, error } = await supabase
          .from("video_lessons")
          .insert({
            ...videoData,
            created_by: user?.id,
          })
          .select()
          .single();

        if (error) throw new Error(formatDbError(error));
        currentVideoId = newVideo.id;
      }

      // Insert new assignments
      if (selectedUsers.length > 0 && currentVideoId) {
        const assignments = selectedUsers.map((userId) => ({
          video_id: currentVideoId,
          user_id: userId,
          assigned_by: user?.id,
        }));

        const { error: assignError } = await supabase
          .from("video_assignments")
          .insert(assignments);

        if (assignError) {
          let hint = "";
          if (assignError.code === "42501") {
            hint = " Verifica le policy RLS su video_assignments (migration 038).";
          }
          throw new Error(`${formatDbError(assignError)}.${hint}`.trim());
        }

        // Send notifications only to newly assigned users
        const newlyAssigned = selectedUsers.filter(
          (id) => !previouslyAssignedIds.includes(id)
        );
        for (const userId of newlyAssigned) {
          const assignedUser = users.find((u) => u.id === userId);
          const notificationLink = assignedUser?.role === "maestro"
            ? "/dashboard/maestro/videos"
            : "/dashboard/atleta/videos";
          try {
            await createNotification({
              userId: userId,
              type: "general",
              title: "Nuovo video assegnato",
              message: `Ti è stato assegnato il video: ${formData.title} da ${actorDisplayName}`,
              link: notificationLink,
            });
          } catch {
            // Notification failures should not block video creation/update
          }
        }

        if (isEditMode) {
          const alreadyAssigned = selectedUsers.filter((id) =>
            previouslyAssignedIds.includes(id)
          );

          for (const userId of alreadyAssigned) {
            const assignedUser = users.find((u) => u.id === userId);
            const notificationLink = assignedUser?.role === "maestro"
              ? "/dashboard/maestro/videos"
              : "/dashboard/atleta/videos";
            try {
              await createNotification({
                userId,
                type: "general",
                title: "Video aggiornato",
                message: `E stato aggiornato il video: ${formData.title} da ${actorDisplayName}`,
                link: notificationLink,
              });
            } catch {
              // Notification failures should not block video creation/update
            }
          }
        }
      }

      alert(isEditMode ? "Video aggiornato con successo!" : "Video creato con successo!");
      router.push(baseVideosPath);
    } catch (error: any) {
      console.error("Error saving video:", error);
      alert(formatDbError(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Sei sicuro di voler eliminare "${formData.title}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("video_lessons")
        .delete()
        .eq("id", videoId);

      if (error) throw new Error(formatDbError(error));

      alert("Video eliminato con successo!");
      router.push(baseVideosPath);
    } catch (error: any) {
      console.error("Error deleting video:", error);
      alert(formatDbError(error));
    }
  }

  return (
    <AuthGuard allowedRoles={[...allowedRoles]}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="breadcrumb text-secondary/60">
            <Link href={baseVideosPath} className="hover:text-secondary/80 transition-colors">
              Video Lab
            </Link>
            {" › "}
            <span>{isEditMode ? "Modifica Video Lezione" : "Nuovo Video Lezione"}</span>
          </p>
          <h1 className="text-4xl font-bold text-secondary">
            {isEditMode ? "Modifica Video Lezione" : "Nuovo Video Lezione"}
          </h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni Video</h2>
            </div>
            <div className="p-6 space-y-6">
            {/* Title */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary sm:w-48 sm:pt-2 flex-shrink-0">
                Titolo *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="Es: Dritto in slice"
                required
              />
            </div>

            {/* Description */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary sm:w-48 sm:pt-2 flex-shrink-0">
                Descrizione
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="Descrizione dettagliata del video..."
              />
            </div>

            {/* Video URL */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="text-sm font-semibold text-secondary sm:w-48 sm:pt-2 flex-shrink-0">
                URL Video *
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="https://youtube.com/..."
                required
              />
            </div>

            {/* Thumbnail URL */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
              <label className="text-sm font-semibold text-secondary sm:w-48 sm:pt-2 flex-shrink-0">
                URL Thumbnail
              </label>
              <input
                type="url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-secondary/20"
                placeholder="https://..."
              />
            </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Utenti Assegnati</h2>
            </div>
            <div className="p-4 sm:p-6">
              <AthletesSelector
                athletes={users}
                selectedAthletes={selectedAthletes}
                onAthleteAdd={(athlete) => {
                  if (athlete.userId && !selectedUsers.includes(athlete.userId)) {
                    setSelectedUsers((prev) => [...prev, athlete.userId as string]);
                  }
                }}
                onAthleteRemove={(index) => {
                  const athleteToRemove = selectedAthletes[index];
                  if (athleteToRemove?.userId) {
                    setSelectedUsers((prev) => prev.filter((id) => id !== athleteToRemove.userId));
                  }
                }}
                maxAthletes={null}
                useSecondaryParticipantBorder
                allowGuestParticipants={false}
              />
            </div>
          </div>

        </form>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          {isEditMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="w-full sm:flex-1 flex items-center justify-center px-6 py-3 text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all font-medium"
            >
              Elimina Video
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            onClick={() => document.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true }))}
            className="w-full sm:flex-1 flex items-center justify-center px-6 py-3 bg-secondary text-white font-medium rounded-lg hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Salvataggio..." : isEditMode ? "Salva Modifiche" : "Crea Video"}</span>
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
