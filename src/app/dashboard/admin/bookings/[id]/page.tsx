"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { createNotification } from "@/lib/notifications/createNotification";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Loader2,
  Users,
  Circle,
  Trophy,
  Save,
} from "lucide-react";

type Booking = {
  id: string;
  court: string;
  user_id: string;
  coach_id: string | null;
  start_time: string;
  end_time: string;
  status: string;
  type: string;
  manager_confirmed: boolean;
  coach_confirmed: boolean;
  notes: string | null;
  created_at: string;
  user_profile?: { full_name: string; email: string; phone?: string } | null;
  coach_profile?: { full_name: string; email: string; phone?: string } | null;
};

export default function BookingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookingId = params?.id as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId]);

  async function loadBooking() {
    try {
      const { data: bookingData, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .single();

      if (error || !bookingData) {
        console.error("Errore caricamento prenotazione:", error);
        alert("Prenotazione non trovata");
        router.push("/dashboard/admin/bookings");
        return;
      }

      // Carica i profili
      const userIds = [bookingData.user_id, bookingData.coach_id].filter(Boolean);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone")
        .in("id", userIds);

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]) || []);

      const enrichedBooking = {
        ...bookingData,
        user_profile: profilesMap.get(bookingData.user_id) || null,
        coach_profile: bookingData.coach_id
          ? profilesMap.get(bookingData.coach_id) || null
          : null,
      };

      console.log("📅 Dettaglio prenotazione:", {
        id: enrichedBooking.id,
        start: new Date(enrichedBooking.start_time).toISOString(),
        end: new Date(enrichedBooking.end_time).toISOString(),
        duration: (new Date(enrichedBooking.end_time).getTime() - new Date(enrichedBooking.start_time).getTime()) / (1000 * 60) + " minuti"
      });

      setBooking(enrichedBooking);
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore nel caricamento della prenotazione");
      router.push("/dashboard/admin/bookings");
    } finally {
      setLoading(false);
    }
  }

  async function confirmBooking() {
    if (!booking) return;
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          manager_confirmed: true,
          status: "confirmed",
        })
        .eq("id", booking.id);

      if (!error) {
        const startDate = new Date(booking.start_time).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const startTime = new Date(booking.start_time).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        });

        await createNotification({
          userId: booking.user_id,
          type: "booking",
          title: "Prenotazione confermata",
          message: `La tua prenotazione per il campo ${booking.court} del ${startDate} alle ${startTime} è stata confermata.`,
          link: "/dashboard/atleta/bookings",
        });

        router.push("/dashboard/admin/bookings");
      }
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore durante la conferma");
    } finally {
      setActionLoading(false);
    }
  }

  async function rejectBooking() {
    if (!booking) return;
    if (!confirm("Sei sicuro di voler rifiutare questa prenotazione?")) return;
    
    setActionLoading(true);
    
    try {
      const { error } = await supabase
        .from("bookings")
        .update({
          status: "cancelled",
          manager_confirmed: false,
        })
        .eq("id", booking.id);

      if (!error) {
        const startDate = new Date(booking.start_time).toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
        const startTime = new Date(booking.start_time).toLocaleTimeString("it-IT", {
          hour: "2-digit",
          minute: "2-digit",
        });

        await createNotification({
          userId: booking.user_id,
          type: "booking",
          title: "Prenotazione rifiutata",
          message: `La tua prenotazione per il campo ${booking.court} del ${startDate} alle ${startTime} è stata rifiutata.`,
          link: "/dashboard/atleta/bookings",
        });

        router.push("/dashboard/admin/bookings");
      }
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore durante il rifiuto");
    } finally {
      setActionLoading(false);
    }
  }

  async function deleteBooking() {
    if (!booking) return;
    if (!confirm("Sei sicuro di voler eliminare questa prenotazione? Questa azione è irreversibile.")) return;

    setActionLoading(true);
    setDeleting(true);

    try {
      const { error } = await supabase
        .from("bookings")
        .delete()
        .eq("id", booking.id);

      if (!error) {
        router.push("/dashboard/admin/bookings");
      } else {
        alert("Errore durante l'eliminazione");
      }
    } catch (error) {
      console.error("Errore:", error);
      alert("Errore durante l'eliminazione");
    } finally {
      setActionLoading(false);
      setDeleting(false);
    }
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    campo: { label: "Campo", color: "bg-secondary text-white" },
    lezione_privata: { label: "Lezione Privata", color: "bg-secondary text-white" },
    lezione_gruppo: { label: "Lezione Gruppo", color: "bg-secondary text-white" },
  };

  const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    confirmed: { label: "Confermata", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    pending: { label: "In attesa", color: "bg-amber-100 text-amber-700", icon: Clock },
    cancelled: { label: "Annullata", color: "bg-red-100 text-red-700", icon: XCircle },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento...</p>
      </div>
    );
  }

  if (!booking) {
    return null;
  }

  const status = statusConfig[booking.status] || statusConfig.pending;
  const StatusIcon = status.icon;
  const bookingType = typeConfig[booking.type] || typeConfig.campo;
  const isLesson = booking.type === "lezione_privata" || booking.type === "lezione_gruppo";
  const needsApproval = !booking.manager_confirmed && booking.status !== "cancelled";

  // Determina icona e stile in base al tipo
  function getBookingStyle() {
    if (!booking) {
      return {
        icon: Circle,
        borderColor: "border-gray-400",
        bgColor: "bg-gray-400",
        iconColor: "text-gray-400",
      };
    }
    if (booking.type === "lezione_privata") {
      return {
        icon: User,
        borderColor: "border-frozen-lake-900",
        bgColor: "bg-frozen-lake-900",
        iconColor: "text-frozen-lake-900",
      };
    } else if (booking.type === "lezione_gruppo") {
      return {
        icon: Users,
        borderColor: "border-frozen-lake-900",
        bgColor: "bg-frozen-lake-900",
        iconColor: "text-frozen-lake-900",
      };
    } else if (booking.type === "arena") {
      return {
        icon: Trophy,
        borderColor: "border-frozen-lake-600",
        bgColor: "bg-frozen-lake-600",
        iconColor: "text-frozen-lake-600",
      };
    } else {
      return {
        icon: Circle,
        borderColor: "border-frozen-lake-700",
        bgColor: "bg-frozen-lake-700",
        iconColor: "text-frozen-lake-700",
      };
    }
  }

  const bookingStyle = getBookingStyle();
  const BookingIcon = bookingStyle.icon;

  // Determina colore bordo in base allo stato
  function getStatusBorderColor() {
    if (!booking) return "border-gray-400";
    if (booking.status === "cancelled") {
      return "border-red-500";
    } else if (needsApproval) {
      return "border-amber-500";
    } else {
      return "border-emerald-500";
    }
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="inline-flex items-center text-xs font-semibold text-secondary/60 uppercase tracking-wider mb-1">
        <Link
          href="/dashboard/admin/bookings"
          className="hover:text-secondary/80 transition-colors"
        >
          Prenotazioni
        </Link>
        <span className="mx-2">›</span>
        <span>Dettagli Prenotazione</span>
      </div>

      {/* Header con titolo e descrizione */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-secondary mb-2">
            Dettagli Prenotazione
          </h1>
          <p className="text-secondary/70 font-medium">
            Visualizza e gestisci i dettagli della prenotazione
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={deleteBooking}
            disabled={actionLoading}
            className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            title="Elimina Prenotazione"
          >
            {actionLoading && deleting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
          </button>

          {needsApproval && (
            <>
              <button
                onClick={rejectBooking}
                disabled={actionLoading}
                className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Rifiuta"
              >
                {actionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <XCircle className="h-5 w-5" />
                )}
              </button>
              <button
                onClick={confirmBooking}
                disabled={actionLoading}
                className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Conferma"
              >
                {actionLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-5 w-5" />
                )}
              </button>
            </>
          )}
          
          {booking.status !== "cancelled" && (
            <Link
              href={`/dashboard/admin/bookings/modifica?id=${booking.id}`}
              className="p-2.5 text-secondary/70 bg-white rounded-md hover:bg-secondary hover:text-white transition-all"
              title="Modifica"
            >
              <Edit className="h-5 w-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Header con info prenotazione */}
      <div className={`bg-white rounded-xl border-l-4 ${getStatusBorderColor()} p-6`}>
        <div className="flex items-start gap-6">
          <BookingIcon className="h-8 w-8 text-secondary flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-secondary">{booking.court}</h1>
          </div>
        </div>
      </div>

      {/* Dettagli prenotazione */}
      <div className="bg-white rounded-xl p-6">
        <h2 className="text-lg font-semibold text-secondary mb-6">Dettagli prenotazione</h2>
        
        <div className="space-y-6">
          {/* Data */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {new Date(booking.start_time).toLocaleDateString("it-IT", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Orario */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Orario</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {new Date(booking.start_time).toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                -{" "}
                {new Date(booking.end_time).toLocaleTimeString("it-IT", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Tipo e Stato */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tipo</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">{bookingType.label}</p>
            </div>
          </div>

          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Stato</label>
            <div className="flex-1">
              <span className="flex items-center gap-2 text-secondary font-semibold">
                <StatusIcon className="h-5 w-5" />
                {status.label}
              </span>
            </div>
          </div>

          {/* Atleta */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Atleta</label>
            <div className="flex-1">
              <p className="text-secondary font-semibold">
                {booking.user_profile?.full_name || "Nome non disponibile"}
              </p>
            </div>
          </div>

          {/* Email Atleta */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
            <div className="flex-1">
              <p className="text-secondary/70">{booking.user_profile?.email || "Non disponibile"}</p>
            </div>
          </div>

          {/* Telefono Atleta */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
            <div className="flex-1">
              <p className="text-secondary/70">{booking.user_profile?.phone || "Non disponibile"}</p>
            </div>
          </div>

          {/* Maestro - visibile solo per lezioni */}
          {isLesson && (
            <>
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Maestro</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {booking.coach_profile?.full_name || "Non assegnato"}
                  </p>
                </div>
              </div>

              {/* Email Maestro */}
              {booking.coach_profile?.email && (
                <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                  <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email Maestro</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{booking.coach_profile.email}</p>
                  </div>
                </div>
              )}

              {/* Telefono Maestro */}
              {booking.coach_profile?.phone && (
                <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                  <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono Maestro</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{booking.coach_profile.phone}</p>
                  </div>
                </div>
              )}

              {/* Conferma Maestro */}
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Conferma Maestro</label>
                <div className="flex-1">
                  {booking.coach_confirmed ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5" />
                      Confermata
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                      <Clock className="h-5 w-5" />
                      In attesa
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Conferma Manager */}
          <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Conferma Manager</label>
            <div className="flex-1">
              {booking.manager_confirmed ? (
                <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5" />
                  Confermata
                </span>
              ) : (
                <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                  <Clock className="h-5 w-5" />
                  In attesa
                </span>
              )}
            </div>
          </div>

          {/* Maestro */}
          {isLesson && (
            <>
              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Maestro</label>
                <div className="flex-1">
                  <p className="text-secondary font-semibold">
                    {booking.coach_profile?.full_name || "Non assegnato"}
                  </p>
                </div>
              </div>

              {/* Email Maestro */}
              {booking.coach_profile?.email && (
                <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                  <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email Maestro</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{booking.coach_profile.email}</p>
                  </div>
                </div>
              )}

              {/* Telefono Maestro */}
              {booking.coach_profile?.phone && (
                <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                  <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono Maestro</label>
                  <div className="flex-1">
                    <p className="text-secondary/70">{booking.coach_profile.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-8 pb-6 border-b border-gray-200">
                <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Conferma Maestro</label>
                <div className="flex-1">
                  {booking.coach_confirmed ? (
                    <span className="text-emerald-600 font-semibold flex items-center gap-1.5">
                      <CheckCircle2 className="h-5 w-5" />
                      Confermata
                    </span>
                  ) : (
                    <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                      <Clock className="h-5 w-5" />
                      In attesa
                    </span>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Data creazione */}
          <div className="flex items-start gap-8">
            <label className="w-48 pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Creata il</label>
            <div className="flex-1">
              <p className="text-secondary/70">
                {new Date(booking.created_at).toLocaleDateString("it-IT", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Note */}
      {booking.notes && (
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-lg font-semibold text-secondary mb-4">Note</h2>
          <p className="text-secondary/70">{booking.notes}</p>
        </div>
      )}
    </div>
  );
}
