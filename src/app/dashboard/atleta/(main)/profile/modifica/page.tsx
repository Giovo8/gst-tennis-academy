"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import {
  Loader2,
  User,
  Dumbbell,
  Home,
  Crown,
  Upload,
  Link as LinkIcon,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { toast } from 'sonner';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "@/components/ui";

const WEEK_DAYS = ["lu", "ma", "me", "gi", "ve", "sa", "do"];

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "gestore" | "maestro" | "atleta";
  phone: string | null;
  avatar_url: string | null;
  birth_date?: string | null;
  date_of_birth?: string | null;
  bio: string | null;
  created_at: string;
  metadata?: {
    birth_city?: string;
    fiscal_code?: string;
    address?: string;
    city?: string;
    province?: string;
    postal_code?: string;
    certificato_medico_url?: string;
    certificato_medico_scadenza?: string;
    tesserato?: string;
    numero_tessera?: string;
    tesserato_scadenza?: string;
  } | null;
};

type AthleteProfileEditPageProps = {
  profilePath?: string;
};

export default function AthleteProfileEditPage({
  profilePath = "/dashboard/atleta/profile",
}: AthleteProfileEditPageProps) {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCertificato, setUploadingCertificato] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showCertificatoModal, setShowCertificatoModal] = useState(false);
  const [datePickerModalOpen, setDatePickerModalOpen] = useState(false);
  const [activeDateField, setActiveDateField] = useState<"certificato" | "tesserato" | "nascita">("certificato");
  const [pendingDate, setPendingDate] = useState<Date>(() => new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [dateTexts, setDateTexts] = useState({
    birth_date: "",
    certificato_medico_scadenza: "",
    tesserato_scadenza: "",
  });
  const [avatarUrl, setAvatarUrl] = useState("");
  const [certificatoLinkUrl, setCertificatoLinkUrl] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    birth_date: "",
    birth_city: "",
    fiscal_code: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    notes: "",
    certificato_medico_url: "",
    certificato_medico_scadenza: "",
    tesserato: "No" as "Sì" | "No" | "Agonista",
    numero_tessera: "",
    tesserato_scadenza: "",
  });

  const roleLabels = {
    admin: { label: "Admin", icon: Crown, bgColor: "#023047", borderLeftColor: "#011a24" },
    gestore: { label: "Gestore", icon: Home, bgColor: "#023047", borderLeftColor: "#011a24" },
    maestro: { label: "Maestro", icon: Dumbbell, bgColor: "#05384c", borderLeftColor: "#022431" },
    atleta: { label: "Atleta", icon: User, bgColor: "var(--secondary)", borderLeftColor: "#023047" },
  };

  const loadProfile = useCallback(async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (error || !data) {
        toast.error("Profilo non trovato");
        router.push(profilePath);
        return;
      }

      setUser(data);
      const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata : {};
      setFormData({
        full_name: data.full_name || "",
        phone: data.phone || "",
        birth_date: data.birth_date || data.date_of_birth || "",
        birth_city: metadata.birth_city || "",
        fiscal_code: metadata.fiscal_code || "",
        address: metadata.address || "",
        city: metadata.city || "",
        province: metadata.province || "",
        postal_code: metadata.postal_code || "",
        notes: data.bio || "",
        certificato_medico_url: metadata.certificato_medico_url || "",
        certificato_medico_scadenza: metadata.certificato_medico_scadenza || "",
        tesserato: metadata.tesserato || "No",
        numero_tessera: metadata.numero_tessera || "",
        tesserato_scadenza: metadata.tesserato_scadenza || "",
      });
      setDateTexts({
        birth_date: isoToDisplay(data.birth_date || data.date_of_birth || ""),
        certificato_medico_scadenza: isoToDisplay(metadata.certificato_medico_scadenza || ""),
        tesserato_scadenza: isoToDisplay(metadata.tesserato_scadenza || ""),
      });
    } catch (error) {
      console.error("Error loading profile:", error);
      toast.error("Errore nel caricamento del profilo");
      router.push(profilePath);
    } finally {
      setLoading(false);
    }
  }, [profilePath, router]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    try {
      const existingMetadata = user.metadata && typeof user.metadata === "object"
        ? user.metadata
        : {};

      const baseUpdatePayload = {
        full_name: formData.full_name || null,
        phone: formData.phone || null,
        bio: formData.notes || null,
        metadata: {
          ...(existingMetadata as Record<string, unknown>),
          birth_city: formData.birth_city || "",
          fiscal_code: formData.fiscal_code || "",
          address: formData.address || "",
          city: formData.city || "",
          province: formData.province || "",
          postal_code: formData.postal_code || "",
          certificato_medico_url: formData.certificato_medico_url || "",
          certificato_medico_scadenza: formData.certificato_medico_scadenza || "",
          tesserato: formData.tesserato || "No",
          numero_tessera: formData.numero_tessera || "",
          tesserato_scadenza: formData.tesserato_scadenza || "",
        },
      };

      const hasBirthDateColumn = Object.prototype.hasOwnProperty.call(user, "birth_date");
      const primaryDateColumn: "birth_date" | "date_of_birth" = hasBirthDateColumn
        ? "birth_date"
        : "date_of_birth";
      const fallbackDateColumn: "birth_date" | "date_of_birth" =
        primaryDateColumn === "birth_date" ? "date_of_birth" : "birth_date";

      let { error } = await supabase
        .from("profiles")
        .update({
          ...baseUpdatePayload,
          [primaryDateColumn]: formData.birth_date || null,
        })
        .eq("id", user.id);

      const missingPrimaryDateColumn =
        !!error &&
        typeof error.message === "string" &&
        error.message.toLowerCase().includes(primaryDateColumn);

      if (missingPrimaryDateColumn) {
        const retry = await supabase
          .from("profiles")
          .update({
            ...baseUpdatePayload,
            [fallbackDateColumn]: formData.birth_date || null,
          })
          .eq("id", user.id);
        error = retry.error;
      }

      if (error) throw error;

      router.push(profilePath);
    } catch (err: unknown) {
      console.error("Error updating profile:", err);
      toast.error(err instanceof Error ? err.message : "Errore durante il salvataggio del profilo");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.warning("L'immagine deve essere inferiore a 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast.warning("Il file deve essere un'immagine");
      return;
    }

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      if (user.avatar_url) {
        uploadFormData.append("oldImageUrl", user.avatar_url);
      }

      const uploadResponse = await fetch("/api/upload/staff-image", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadPayload?.url) {
        throw new Error(uploadPayload?.error || "Errore durante l'upload dell'immagine");
      }

      const publicUrl = uploadPayload.url as string;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setUser({ ...user, avatar_url: publicUrl });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Errore durante l'upload dell'immagine");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAvatarUrl() {
    if (!avatarUrl || !user) return;

    try {
      new URL(avatarUrl);
    } catch {
      toast.warning("Inserisci un URL valido");
      return;
    }

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setUser({ ...user, avatar_url: avatarUrl });
      setAvatarUrl("");
    } catch (error) {
      console.error("Error updating avatar:", error);
      toast.error("Errore durante l'aggiornamento dell'immagine");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleRemoveAvatar() {
    if (!user?.avatar_url) return;

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      const deleteFormData = new FormData();
      deleteFormData.append("deleteOnly", "true");
      deleteFormData.append("oldImageUrl", user.avatar_url);

      const deleteResponse = await fetch("/api/upload/staff-image", {
        method: "POST",
        body: deleteFormData,
      });

      const deletePayload = await deleteResponse.json().catch(() => ({}));
      if (!deleteResponse.ok) {
        throw new Error(deletePayload?.error || "Errore durante l'eliminazione dell'immagine");
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setUser({ ...user, avatar_url: null });
      setAvatarUrl("");
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error("Errore durante la rimozione dell'avatar");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function handleCertificatoUrl() {
    if (!certificatoLinkUrl) return;

    try {
      new URL(certificatoLinkUrl);
    } catch {
      toast.warning("Inserisci un URL valido");
      return;
    }

    setFormData((prev) => ({ ...prev, certificato_medico_url: certificatoLinkUrl }));
    setCertificatoLinkUrl("");
    setShowCertificatoModal(false);
  }

  async function handleCertificatoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.warning("Il file deve essere inferiore a 10MB");
      return;
    }

    if (file.type !== "application/pdf") {
      toast.warning("Il file deve essere un PDF");
      return;
    }

    setUploadingCertificato(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("targetUserId", user.id);
      if (formData.certificato_medico_url) {
        uploadFormData.append("oldCertificateUrl", formData.certificato_medico_url);
      }

      const uploadResponse = await fetch("/api/upload/certificate", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadPayload = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok || !uploadPayload?.url) {
        throw new Error(uploadPayload?.error || "Errore durante il caricamento del certificato");
      }

      setFormData((prev) => ({ ...prev, certificato_medico_url: uploadPayload.url as string }));
      toast.success("Certificato caricato con successo.");
    } catch (error) {
      console.error("Error uploading certificate:", error);
      toast.error(error instanceof Error ? error.message : "Errore durante il caricamento del certificato");
    } finally {
      setUploadingCertificato(false);
      event.target.value = "";
    }
  }

  async function handleRemoveCertificato() {
    if (!formData.certificato_medico_url) return;

    setUploadingCertificato(true);
    try {
      const deleteFormData = new FormData();
      deleteFormData.append("deleteOnly", "true");
      deleteFormData.append("targetUserId", user?.id || "");
      deleteFormData.append("oldCertificateUrl", formData.certificato_medico_url);

      const deleteResponse = await fetch("/api/upload/certificate", {
        method: "POST",
        body: deleteFormData,
      });

      const deletePayload = await deleteResponse.json().catch(() => ({}));
      if (!deleteResponse.ok) {
        throw new Error(deletePayload?.error || "Errore durante la rimozione del certificato");
      }

      setFormData((prev) => ({ ...prev, certificato_medico_url: "" }));
      toast.success("Certificato rimosso.");
    } catch (error) {
      console.error("Error removing certificate:", error);
      toast.error(error instanceof Error ? error.message : "Errore durante la rimozione del certificato");
    } finally {
      setUploadingCertificato(false);
    }
  }

  const calendarDays = useMemo(() => {
    const firstOfMonth = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), 1);
    const mondayBasedDayIndex = (firstOfMonth.getDay() + 6) % 7;
    const gridStartDate = new Date(firstOfMonth);
    gridStartDate.setDate(firstOfMonth.getDate() - mondayBasedDayIndex);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStartDate);
      date.setDate(gridStartDate.getDate() + index);
      return {
        date,
        isCurrentMonth: date.getMonth() === calendarViewDate.getMonth(),
      };
    });
  }, [calendarViewDate]);

  function normalizeDate(date: Date): Date {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(12, 0, 0, 0);
    return normalizedDate;
  }

  function isSameCalendarDay(a: Date, b: Date): boolean {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function openDatePicker(field: "certificato" | "tesserato" | "nascita") {
    const existing = field === "certificato"
      ? formData.certificato_medico_scadenza
      : field === "tesserato"
        ? formData.tesserato_scadenza
        : formData.birth_date;
    const base = existing ? normalizeDate(new Date(existing)) : normalizeDate(new Date());
    setActiveDateField(field);
    setPendingDate(base);
    setCalendarViewDate(new Date(base.getFullYear(), base.getMonth(), 1));
    setDatePickerModalOpen(true);
  }

  function changeCalendarMonth(delta: number) {
    setCalendarViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function selectCalendarDay(day: Date) {
    setPendingDate(normalizeDate(day));
  }

  function applyDateSelection() {
    const iso = pendingDate.toISOString().split("T")[0];
    const display = isoToDisplay(iso);

    if (activeDateField === "certificato") {
      setFormData((prev) => ({ ...prev, certificato_medico_scadenza: iso }));
      setDateTexts((prev) => ({ ...prev, certificato_medico_scadenza: display }));
    } else if (activeDateField === "tesserato") {
      setFormData((prev) => ({ ...prev, tesserato_scadenza: iso }));
      setDateTexts((prev) => ({ ...prev, tesserato_scadenza: display }));
    } else {
      setFormData((prev) => ({ ...prev, birth_date: iso }));
      setDateTexts((prev) => ({ ...prev, birth_date: display }));
    }

    setDatePickerModalOpen(false);
  }

  function handleDatePickerToday() {
    const today = normalizeDate(new Date());
    setPendingDate(today);
    setCalendarViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function getCalendarMonthLabel(date: Date): string {
    const label = date.toLocaleDateString("it-IT", { month: "long", year: "numeric" });
    return label.charAt(0).toUpperCase() + label.slice(1);
  }

  function getCalendarModalTitle(): string {
    if (activeDateField === "certificato") return "Scadenza Certificato";
    if (activeDateField === "tesserato") return "Scadenza Tesseramento";
    return "Data di Nascita";
  }

  function isoToDisplay(iso: string): string {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return "";
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  function displayToIso(text: string): string {
    const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return "";
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  function handleDateTextChange(
    field: "birth_date" | "certificato_medico_scadenza" | "tesserato_scadenza",
    value: string
  ) {
    setDateTexts((prev) => ({ ...prev, [field]: value }));
    const iso = displayToIso(value);

    if (iso) {
      setFormData((prev) => ({ ...prev, [field]: iso }));
    } else if (value === "") {
      setFormData((prev) => ({ ...prev, [field]: "" }));
    }
  }

  async function handleResetPassword() {
    if (!user) return;

    if (!confirm(`Vuoi inviare l'email di reset password a ${user.email}?`)) return;

    setResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      toast.success("Email di reset password inviata con successo.");
    } catch (err: unknown) {
      console.error("Error resetting password:", err);
      toast.error(err instanceof Error ? err.message : "Errore durante l'invio del reset password");
    } finally {
      setResettingPassword(false);
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento profilo...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const RoleIcon = roleLabels[user.role].icon;

  return (
    <div className="space-y-6 pt-3">
      <div
        className="rounded-lg border border-black/10 p-6 transition-all"
        style={{
          backgroundColor: roleLabels[user.role].bgColor,
        }}
      >
        <div className="flex items-start gap-6">
          <RoleIcon className="h-8 w-8 text-white flex-shrink-0" strokeWidth={2.5} />
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-white truncate">
              {formData.full_name || user.full_name || "Nome non impostato"}
            </h2>
          </div>
        </div>
      </div>

      <form onSubmit={updateProfile} className="space-y-6">
        <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Dati Profilo</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Nome Completo</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="Mario Rossi"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email</label>
                <div className="flex-1">
                  <input
                    type="email"
                    value={user.email}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Telefono</label>
                <div className="flex-1">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="+39 123 456 7890"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data di Nascita</label>
                <div className="flex-1">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => openDatePicker("nascita")}
                      className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-secondary/40 hover:text-secondary transition-colors"
                      tabIndex={-1}
                    >
                      <CalendarIcon className="h-4 w-4" />
                    </button>
                    <input
                      type="text"
                      placeholder="GG/MM/AAAA"
                      value={dateTexts.birth_date}
                      onChange={(e) => handleDateTextChange("birth_date", e.target.value)}
                      maxLength={10}
                      className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-secondary placeholder:text-secondary/30 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Citta di Nascita</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.birth_city}
                    onChange={(e) => setFormData({ ...formData, birth_city: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="Roma"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Codice Fiscale</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.fiscal_code}
                    onChange={(e) => setFormData({ ...formData, fiscal_code: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 uppercase"
                    placeholder="RSSMRA80A01H501U"
                    maxLength={16}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Indirizzo</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="Via Roma, 123"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Citta / Provincia / CAP</label>
                <div className="flex-1 grid grid-cols-4 gap-1 sm:grid-cols-[minmax(0,1fr)_64px_92px] sm:gap-2">
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="col-span-2 sm:col-span-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="Milano"
                  />
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value.toUpperCase() })}
                    className="col-span-1 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 uppercase text-center"
                    placeholder="MI"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="col-span-1 rounded-lg border border-gray-300 bg-white px-2 sm:px-3 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 text-center"
                    placeholder="20100"
                    maxLength={5}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Note</label>
                <div className="flex-1">
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Eventuali note..."
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:items-stretch">
          <div className="bg-white rounded-lg border border-black/10 overflow-hidden h-full lg:order-2">
            <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Avatar</h2>
            </div>
            <div className="px-6 py-6">
              <div className="flex flex-col gap-4">
                <div className="relative w-full rounded-xl bg-secondary/10 overflow-hidden border border-gray-200 lg:aspect-[4/3]">
                  {uploadingAvatar ? (
                    <div className="flex min-h-[220px] items-center justify-center lg:absolute lg:inset-0 lg:min-h-0">
                      <Loader2 className="h-7 w-7 animate-spin text-secondary" />
                    </div>
                  ) : user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt={user.full_name || "Avatar"}
                      className="block w-full h-auto object-cover lg:absolute lg:inset-0 lg:h-full lg:w-full"
                    />
                  ) : (
                    <div className="flex min-h-[220px] items-center justify-center lg:absolute lg:inset-0 lg:min-h-0">
                      <span className="text-5xl font-bold text-secondary">
                        {getInitials(user.full_name, user.email)}
                      </span>
                    </div>
                  )}
                </div>
                <div className={`w-full ${user.avatar_url ? "flex items-center gap-2" : ""}`}>
                  <button
                    type="button"
                    onClick={() => setShowAvatarModal(true)}
                    disabled={uploadingAvatar}
                    className={`h-12 px-4 text-sm font-medium text-white bg-secondary border border-secondary rounded-lg hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                      user.avatar_url ? "flex-1" : "w-full"
                    }`}
                  >
                    Cambia Avatar
                  </button>
                  {user.avatar_url && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      aria-label="Elimina avatar"
                      className="h-12 w-12 inline-flex items-center justify-center text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-black/10 overflow-hidden h-full lg:order-1">
            <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
              <h2 className="text-base sm:text-lg font-semibold text-secondary">Informazioni Corsi</h2>
            </div>
            <div className="px-6 py-6">
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Certificato Medico</label>
                  <div className="flex-1 space-y-3">
                    {formData.certificato_medico_url ? (
                      <div className="flex w-full items-stretch gap-2">
                        <a
                          href={formData.certificato_medico_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-secondary rounded-lg hover:bg-secondary/90 transition-all"
                        >
                          Visualizza PDF
                        </a>
                        <button
                          type="button"
                          onClick={handleRemoveCertificato}
                          disabled={uploadingCertificato}
                          className="flex-shrink-0 self-stretch aspect-square min-w-10 inline-flex items-center justify-center text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="Rimuovi certificato"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowCertificatoModal(true)}
                        disabled={uploadingCertificato}
                        className="w-full inline-flex items-center justify-center gap-2 px-5 py-2 text-sm font-medium rounded-lg border border-secondary bg-secondary text-white hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploadingCertificato ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                        {uploadingCertificato ? "Caricamento..." : "Carica PDF"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Scadenza Certificato</label>
                  <div className="flex-1">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => openDatePicker("certificato")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-secondary/40 hover:text-secondary transition-colors"
                        tabIndex={-1}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        placeholder="GG/MM/AAAA"
                        value={dateTexts.certificato_medico_scadenza}
                        onChange={(e) => handleDateTextChange("certificato_medico_scadenza", e.target.value)}
                        maxLength={10}
                        className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-secondary placeholder:text-secondary/30 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Tesserato</label>
                  <div className="flex-1 grid grid-cols-3 gap-1 sm:gap-2">
                    {(["Sì", "No", "Agonista"] as const).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setFormData({ ...formData, tesserato: option })}
                        className={`w-full inline-flex items-center justify-center px-5 py-2 text-sm rounded-lg border transition-all ${
                          formData.tesserato === option
                            ? "bg-secondary text-white border-secondary"
                            : "bg-white text-secondary border-gray-300 hover:border-secondary"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Numero Tessera</label>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={formData.numero_tessera}
                      onChange={(e) => setFormData({ ...formData, numero_tessera: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                      placeholder="es. FIT-123456"
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                  <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Scadenza Tesseramento</label>
                  <div className="flex-1">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => openDatePicker("tesserato")}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-secondary/40 hover:text-secondary transition-colors"
                        tabIndex={-1}
                      >
                        <CalendarIcon className="h-4 w-4" />
                      </button>
                      <input
                        type="text"
                        placeholder="GG/MM/AAAA"
                        value={dateTexts.tesserato_scadenza}
                        onChange={(e) => handleDateTextChange("tesserato_scadenza", e.target.value)}
                        maxLength={10}
                        className="w-full rounded-lg border border-gray-300 bg-white pl-10 pr-4 py-2 text-sm text-secondary placeholder:text-secondary/30 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="bg-white rounded-lg border border-black/10 overflow-hidden">
          <div className="px-6 py-4 border-b border-black/10 bg-gradient-to-r from-secondary/5 to-transparent">
            <h2 className="text-base sm:text-lg font-semibold text-secondary">Info Sistema</h2>
          </div>
          <div className="px-6 py-6">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">ID Utente</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={user.id}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Ruolo</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={roleLabels[user.role].label}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data Registrazione</label>
                <div className="flex-1">
                  <input
                    type="text"
                    value={new Date(user.created_at).toLocaleDateString("it-IT", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    readOnly
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={resettingPassword}
            className="flex-1 min-w-[140px] px-8 py-4 text-base font-semibold text-white bg-[#022431] rounded-lg hover:bg-[#022431]/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resettingPassword ? "Invio..." : "Reset Password"}
          </button>

          <button
            type="submit"
            disabled={updating}
            className="flex-1 min-w-[140px] px-8 py-4 text-base font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all disabled:opacity-50"
          >
            {updating ? "Salvataggio..." : "Salva Modifiche"}
          </button>
        </div>
      </form>

      <Modal open={datePickerModalOpen} onOpenChange={setDatePickerModalOpen}>
        <ModalContent size="sm" showBuiltinClose={false} className="overflow-hidden rounded-lg !border-gray-200 shadow-xl !bg-white dark:!bg-white dark:!border-gray-200">
          <ModalHeader withCloseButton closeButtonClassName="text-white/70 hover:text-white hover:bg-white/10" className="px-4 py-3 bg-secondary border-b border-secondary dark:!border-secondary">
            <ModalTitle className="text-white text-lg">
              {getCalendarModalTitle()}
            </ModalTitle>
          </ModalHeader>
          <ModalBody className="px-4 py-4 bg-white dark:!bg-white">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(-1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
                  aria-label="Mese precedente"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="text-sm font-semibold text-gray-900 capitalize">
                  {getCalendarMonthLabel(calendarViewDate)}
                </p>
                <button
                  type="button"
                  onClick={() => changeCalendarMonth(1)}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-gray-200 text-secondary hover:bg-gray-50 transition-colors"
                  aria-label="Mese successivo"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-500 uppercase">
                {WEEK_DAYS.map((day) => (
                  <span key={day} className="py-1">{day}</span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map(({ date, isCurrentMonth }) => {
                  const isSelected = isSameCalendarDay(date, pendingDate);
                  const isTodayDate = isSameCalendarDay(date, new Date());

                  return (
                    <button
                      key={date.toISOString()}
                      type="button"
                      onClick={() => selectCalendarDay(date)}
                      className={`h-9 rounded-md text-sm transition-colors ${
                        isSelected
                          ? "bg-secondary text-white font-semibold"
                          : isCurrentMonth
                            ? "text-gray-800 hover:bg-gray-100"
                            : "text-gray-400 hover:bg-gray-50"
                      } ${!isSelected && isTodayDate ? "ring-1 ring-secondary/40" : ""}`}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="p-0 border-t border-gray-200 bg-white dark:!bg-white dark:!border-gray-200">
            <button
              type="button"
              onClick={handleDatePickerToday}
              className="flex-1 py-3 border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
            >
              Oggi
            </button>
            <button
              type="button"
              onClick={applyDateSelection}
              className="flex-1 py-3 bg-secondary text-white font-semibold hover:opacity-90 transition-opacity"
            >
              Applica
            </button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-secondary rounded-t-xl">
              <h3 className="text-xl font-bold text-white">Cambia Avatar</h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white/80" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Carica un&apos;immagine</label>
                <button
                  onClick={() => document.getElementById("avatar-upload")?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary transition-all"
                >
                  <Upload className="h-5 w-5" />
                  Scegli File
                </button>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <p className="text-xs text-gray-500 mt-2">Massimo 5MB - Formati: JPG, PNG, GIF</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 font-medium">oppure</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Inserisci URL immagine</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://esempio.com/immagine.jpg"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    onKeyDown={(e) => e.key === "Enter" && handleAvatarUrl()}
                  />
                  <button
                    onClick={handleAvatarUrl}
                    disabled={!avatarUrl}
                    className="px-4 py-3 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LinkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Incolla l&apos;URL di un&apos;immagine gia caricata online</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <input
        id="cert-upload"
        type="file"
        accept="application/pdf"
        onChange={handleCertificatoUpload}
        className="hidden"
      />

      {showCertificatoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-secondary rounded-t-xl">
              <h3 className="text-xl font-bold text-white">Certificato Medico</h3>
              <button
                type="button"
                onClick={() => setShowCertificatoModal(false)}
                className="p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-5 w-5 text-white/80" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Carica un PDF</label>
                <button
                  type="button"
                  onClick={() => {
                    setShowCertificatoModal(false);
                    requestAnimationFrame(() => document.getElementById("cert-upload")?.click());
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary transition-all"
                >
                  <Upload className="h-5 w-5" />
                  Scegli File
                </button>
                <p className="text-xs text-gray-500 mt-2">Massimo 10MB - solo PDF</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500 font-medium">oppure</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Inserisci URL del certificato</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={certificatoLinkUrl}
                    onChange={(e) => setCertificatoLinkUrl(e.target.value)}
                    placeholder="https://esempio.com/certificato.pdf"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-secondary focus:border-secondary"
                    onKeyDown={(e) => e.key === "Enter" && handleCertificatoUrl()}
                  />
                  <button
                    type="button"
                    onClick={handleCertificatoUrl}
                    disabled={!certificatoLinkUrl}
                    className="px-4 py-3 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LinkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Incolla l&apos;URL di un PDF gia caricato online</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
