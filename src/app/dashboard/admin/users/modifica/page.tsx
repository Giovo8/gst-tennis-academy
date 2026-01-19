"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Loader2, Check, ArrowLeft, Crown, GraduationCap, Home, UserCheck, Camera, Upload, Link as LinkIcon, X } from "lucide-react";
import Link from "next/link";

type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  role: "admin" | "gestore" | "maestro" | "atleta";
  phone: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  bio: string | null;
  metadata: any;
  subscription_type: string | null;
  email_notifications_enabled: boolean;
  created_at: string;
};

export default function ModificaUtentePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get("id");

  const [user, setUser] = useState<Profile | null>(null);
  const [arenaStats, setArenaStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    date_of_birth: "",
    birth_city: "",
    fiscal_code: "",
    address: "",
    city: "",
    province: "",
    postal_code: "",
    arena_rank: "Bronzo" as "Bronzo" | "Argento" | "Oro" | "Platino" | "Diamante",
    notes: "",
    role: "atleta" as "admin" | "gestore" | "maestro" | "atleta",
    subscription_type: "",
    email_notifications_enabled: true
  });

  const roleLabels = {
    admin: { label: "Admin", icon: Crown, borderColor: "#022431" },
    gestore: { label: "Gestore", icon: Home, borderColor: "#044462" },
    maestro: { label: "Maestro", icon: GraduationCap, borderColor: "#056c94" },
    atleta: { label: "Atleta", icon: UserCheck, borderColor: "#08b3f7" },
  };

  useEffect(() => {
    if (userId) {
      loadUser();
    } else {
      router.push("/dashboard/admin/users");
    }
  }, [userId]);

  async function loadUser() {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error || !data) {
        alert("Utente non trovato");
        router.push("/dashboard/admin/users");
        return;
      }

      // Carica anche arena_stats
      const { data: arenaData } = await supabase
        .from("arena_stats")
        .select("*")
        .eq("user_id", userId)
        .single();

      setUser(data);
      setArenaStats(arenaData);

      const metadata = data.metadata || {};
      setFormData({
        full_name: data.full_name || "",
        email: data.email,
        phone: data.phone || "",
        date_of_birth: data.date_of_birth || "",
        birth_city: metadata.birth_city || "",
        fiscal_code: metadata.fiscal_code || "",
        address: metadata.address || "",
        city: metadata.city || "",
        province: metadata.province || "",
        postal_code: metadata.postal_code || "",
        arena_rank: arenaData?.level || "Bronzo",
        notes: data.bio || "",
        role: data.role,
        subscription_type: data.subscription_type || "",
        email_notifications_enabled: data.email_notifications_enabled ?? true
      });
    } catch (error) {
      console.error("Error loading user:", error);
      alert("Errore nel caricamento dell'utente");
      router.push("/dashboard/admin/users");
    } finally {
      setLoading(false);
    }
  }

  async function updateUser(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.email || !formData.full_name) {
      alert("Email e Nome sono obbligatori");
      return;
    }

    setUpdating(true);
    try {
      // Aggiorna il profilo
      const { error } = await supabase
        .from("profiles")
        .update({
          email: formData.email.trim().toLowerCase(),
          full_name: formData.full_name,
          phone: formData.phone,
          date_of_birth: formData.date_of_birth || null,
          bio: formData.notes || null,
          role: formData.role,
          subscription_type: formData.subscription_type || null,
          email_notifications_enabled: formData.email_notifications_enabled,
          metadata: {
            birth_city: formData.birth_city,
            fiscal_code: formData.fiscal_code,
            address: formData.address,
            city: formData.city,
            province: formData.province,
            postal_code: formData.postal_code
          }
        })
        .eq("id", userId);

      if (error) throw error;

      // Aggiorna arena_stats se il rank è cambiato
      if (arenaStats && arenaStats.level !== formData.arena_rank) {
        const rankPoints = {
          "Bronzo": 0,
          "Argento": 800,
          "Oro": 1500,
          "Platino": 2000,
          "Diamante": 2500
        };

        const { error: arenaError } = await supabase
          .from("arena_stats")
          .update({
            level: formData.arena_rank,
            points: rankPoints[formData.arena_rank]
          })
          .eq("user_id", userId);

        if (arenaError) {
          console.error("Errore aggiornamento arena:", arenaError);
        }
      } else if (!arenaStats) {
        // Crea arena_stats se non esiste
        const rankPoints = {
          "Bronzo": 0,
          "Argento": 800,
          "Oro": 1500,
          "Platino": 2000,
          "Diamante": 2500
        };

        const { error: arenaError } = await supabase
          .from("arena_stats")
          .insert({
            user_id: userId,
            points: rankPoints[formData.arena_rank],
            level: formData.arena_rank,
            wins: 0,
            losses: 0,
            total_matches: 0
          });

        if (arenaError) {
          console.error("Errore creazione arena:", arenaError);
        }
      }

      alert("Profilo aggiornato con successo!");
      router.push("/dashboard/admin/users");
    } catch (error: any) {
      console.error("Error updating user:", error);
      alert(error.message || "Errore durante l'aggiornamento del profilo");
    } finally {
      setUpdating(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("L'immagine deve essere inferiore a 5MB");
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Il file deve essere un'immagine");
      return;
    }

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      if (user.avatar_url && user.avatar_url.includes("/avatars/")) {
        const oldPath = user.avatar_url.split("/avatars/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        alert("Errore durante l'upload dell'immagine");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        alert("Errore durante l'aggiornamento del profilo");
        return;
      }

      setUser({ ...user, avatar_url: publicUrl });
      
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Errore durante l'upload dell'immagine");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleAvatarUrl() {
    if (!avatarUrl || !user) return;

    try {
      new URL(avatarUrl);
    } catch {
      alert("Inserisci un URL valido");
      return;
    }

    setUploadingAvatar(true);
    setShowAvatarModal(false);

    try {
      if (user.avatar_url && user.avatar_url.includes("/avatars/")) {
        const oldPath = user.avatar_url.split("/avatars/").pop();
        if (oldPath) {
          await supabase.storage.from("avatars").remove([oldPath]);
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: avatarUrl })
        .eq("id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        alert("Errore durante l'aggiornamento del profilo");
        return;
      }

      setUser({ ...user, avatar_url: avatarUrl });
      setAvatarUrl("");
      
    } catch (error) {
      console.error("Error updating avatar:", error);
      alert("Errore durante l'aggiornamento dell'immagine");
    } finally {
      setUploadingAvatar(false);
    }
  }

  function getInitials(name: string | null, email: string) {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-secondary" />
        <p className="mt-4 text-secondary/60">Caricamento utente...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <p className="text-secondary">Utente non trovato</p>
        <Link href="/dashboard/admin/users" className="text-secondary hover:underline mt-4 inline-block">
          Torna agli utenti
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div>
          <p className="breadcrumb text-secondary/60 mb-1">
            <Link
              href="/dashboard/admin/users"
              className="hover:text-secondary/80 transition-colors"
            >
              Gestione Utenti
            </Link>
            {" › "}
            <span>Modifica Utente</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Modifica Utente</h1>
          <p className="text-secondary/70 text-sm mt-1">
            Aggiorna le informazioni dell'utente
          </p>
        </div>
      </div>

      {/* Avatar Card */}
      <div
        className="bg-secondary rounded-xl border-t border-r border-b border-secondary p-4 sm:p-6 border-l-4"
        style={{ borderLeftColor: roleLabels[formData.role].borderColor }}
      >
        <div className="flex items-center gap-4 sm:gap-6">
          <button
            type="button"
            onClick={() => setShowAvatarModal(true)}
            disabled={uploadingAvatar}
            className="relative flex-shrink-0 group cursor-pointer disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden group-hover:bg-white/30 transition-all">
              {uploadingAvatar ? (
                <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-white" />
              ) : user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || "Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  {getInitials(user.full_name, user.email)}
                </span>
              )}
            </div>
            {!uploadingAvatar && (
              <div className="absolute inset-0 rounded-lg bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white opacity-0 group-hover:opacity-100 transition-all" />
              </div>
            )}
          </button>

          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {user.full_name || "Nome non impostato"}
            </h2>
          </div>
        </div>
      </div>

      <form onSubmit={updateUser} className="space-y-6">
        {/* Sezione Dati Anagrafici */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-secondary">Dati Anagrafici</h2>
          </div>
          <div className="space-y-6">
            {/* Nome Completo */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Nome Completo *</label>
              <div className="flex-1">
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  placeholder="Mario Rossi"
                  required
                />
              </div>
            </div>

            {/* Email */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Email *</label>
              <div className="flex-1">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  placeholder="utente@esempio.com"
                  required
                />
              </div>
            </div>

            {/* Telefono */}
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

            {/* Data di nascita */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data di Nascita</label>
              <div className="flex-1">
                <input
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                />
              </div>
            </div>

            {/* Città di Nascita */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Città di Nascita</label>
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

            {/* Codice Fiscale */}
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

            {/* Residenza - Indirizzo */}
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

            {/* Residenza - Città, Provincia, CAP */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Città / Provincia / CAP</label>
              <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                  placeholder="Milano"
                />
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value.toUpperCase() })}
                    className="w-20 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50 uppercase text-center"
                    placeholder="MI"
                    maxLength={2}
                  />
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-24 sm:w-28 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:border-secondary/50"
                    placeholder="20100"
                    maxLength={5}
                  />
                </div>
              </div>
            </div>

            {/* Rank Arena */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Rank Arena</label>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  {[
                    { value: "Bronzo" },
                    { value: "Argento" },
                    { value: "Oro" },
                    { value: "Platino" },
                    { value: "Diamante" }
                  ].map((rank) => (
                    <button
                      key={rank.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, arena_rank: rank.value as any })}
                      className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                        formData.arena_rank === rank.value
                          ? 'bg-secondary text-white border-secondary'
                          : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                      }`}
                    >
                      {rank.value}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-secondary/50 mt-3">
                  Modificare il rank resetterà i punti Arena dell'utente
                </p>
              </div>
            </div>

            {/* Ruolo */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Ruolo *</label>
              <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:gap-3">
                {Object.entries(roleLabels).map(([role, info]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: role as any })}
                    className={`px-5 py-2 text-sm text-left rounded-lg border transition-all ${
                      formData.role === role
                        ? 'bg-secondary text-white border-secondary'
                        : 'bg-white text-secondary border-gray-300 hover:border-secondary'
                    }`}
                  >
                    {info.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Note */}
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

        {/* Sezione Info Sistema */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-secondary">Info Sistema</h2>
          </div>
          <div className="space-y-6">
            {/* ID Utente */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">ID Utente</label>
              <div className="flex-1">
                <input
                  type="text"
                  value={user?.id || ""}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Data Registrazione */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8 pb-6 border-b border-gray-200">
              <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Data Registrazione</label>
              <div className="flex-1">
                <input
                  type="text"
                  value={user ? new Date(user.created_at).toLocaleDateString("it-IT", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  }) : ""}
                  readOnly
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm text-secondary/70 cursor-not-allowed"
                />
              </div>
            </div>

            {/* Arena Stats */}
            {arenaStats && (
              <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-8">
                <label className="sm:w-48 sm:pt-2.5 text-sm text-secondary font-medium flex-shrink-0">Statistiche Arena</label>
                <div className="flex-1">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <div className="text-xs text-secondary/60 mb-1">Punti</div>
                      <div className="text-lg font-bold text-secondary">{arenaStats.points || 0}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <div className="text-xs text-secondary/60 mb-1">Ranking</div>
                      <div className="text-lg font-bold text-secondary">#{arenaStats.ranking || "-"}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <div className="text-xs text-secondary/60 mb-1">Vittorie</div>
                      <div className="text-lg font-bold text-green-600">{arenaStats.wins || 0}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
                      <div className="text-xs text-secondary/60 mb-1">Sconfitte</div>
                      <div className="text-lg font-bold text-red-600">{arenaStats.losses || 0}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <button
          type="submit"
          disabled={updating}
          className="w-full px-8 py-4 text-base font-semibold text-white bg-secondary rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {updating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Salvataggio...
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Salva Modifiche
            </>
          )}
        </button>
      </form>

      {/* Avatar Modal */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-secondary">Cambia Avatar</h3>
              <button
                onClick={() => setShowAvatarModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-secondary/60" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Upload File */}
              <div>
                <label className="block text-sm font-bold text-secondary mb-2">
                  Carica un'immagine
                </label>
                <button
                  type="button"
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary/90 transition-all"
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
                <p className="text-xs text-secondary/60 mt-2">
                  Massimo 5MB - Formati: JPG, PNG, GIF
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-secondary/60 font-medium">oppure</span>
                </div>
              </div>

              {/* URL Input */}
              <div>
                <label className="block text-sm font-bold text-secondary mb-2">
                  Inserisci URL immagine
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://esempio.com/immagine.jpg"
                    className="flex-1 px-4 py-3 rounded-lg border border-gray-200 bg-white text-secondary focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                    onKeyDown={(e) => e.key === 'Enter' && handleAvatarUrl()}
                  />
                  <button
                    type="button"
                    onClick={handleAvatarUrl}
                    disabled={!avatarUrl}
                    className="px-4 py-3 bg-secondary text-white rounded-xl font-semibold hover:bg-secondary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <LinkIcon className="h-5 w-5" />
                  </button>
                </div>
                <p className="text-xs text-secondary/60 mt-2">
                  Incolla l'URL di un'immagine già caricata online
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
