"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  User,
  Mail,
  Phone,
  Award,
  Calendar,
  Save,
  Camera,
  MapPin,
  Clock,
  Star,
  FileText,
} from "lucide-react";

interface CoachProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  bio: string | null;
  specializations: string[];
  certifications: string[];
  experience_years: number | null;
  availability: {
    [key: string]: { start: string; end: string }[];
  };
}

export default function CoachProfilePage() {
  const [profile, setProfile] = useState<CoachProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "availability" | "specializations">("info");

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [newSpec, setNewSpec] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState("");

  const specializationOptions = [
    "Tennis per principianti",
    "Tennis agonistico",
    "Tennis per bambini",
    "Tecnica avanzata",
    "Preparazione atletica",
    "Mental coaching",
    "Servizio",
    "Rovescio",
    "Diritto",
    "Volée",
    "Doppio",
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setProfile(data as CoachProfile);
      setFullName(data.full_name || "");
      setPhone(data.phone || "");
      setBio(data.bio || "");
      setExperienceYears(data.experience_years || 0);
      setSpecializations(data.specializations || []);
      setCertifications(data.certifications || []);
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!profile) return;
    
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        phone,
        bio,
        experience_years: experienceYears,
        specializations,
        certifications,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      alert("Errore nel salvataggio: " + error.message);
    } else {
      alert("Profilo aggiornato con successo!");
    }

    setSaving(false);
  }

  function addSpecialization() {
    if (newSpec && !specializations.includes(newSpec)) {
      setSpecializations([...specializations, newSpec]);
      setNewSpec("");
    }
  }

  function removeSpecialization(spec: string) {
    setSpecializations(specializations.filter(s => s !== spec));
  }

  function addCertification() {
    if (newCert && !certifications.includes(newCert)) {
      setCertifications([...certifications, newCert]);
      setNewCert("");
    }
  }

  function removeCertification(cert: string) {
    setCertifications(certifications.filter(c => c !== cert));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 skeleton rounded-lg w-48" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 skeleton rounded-xl" />
          <div className="lg:col-span-2 h-96 skeleton rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Il Mio Profilo</h1>
          <p className="text-[var(--foreground-muted)] mt-1">
            Gestisci le tue informazioni professionali
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-green)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Save className="h-4 w-4" />
          {saving ? "Salvataggio..." : "Salva"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card rounded-xl p-6">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--accent-green)] to-[var(--accent-yellow)] flex items-center justify-center text-3xl font-bold text-white">
                {fullName?.split(" ").map(n => n[0]).join("").toUpperCase() || "M"}
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-[var(--surface)] border border-[var(--border)] rounded-full shadow-sm hover:bg-[var(--surface-hover)]">
                <Camera className="h-4 w-4 text-[var(--foreground-muted)]" />
              </button>
            </div>
            
            <h2 className="text-lg font-semibold text-[var(--foreground)] mt-4">
              {fullName || "Maestro"}
            </h2>
            <p className="text-[var(--foreground-muted)]">{profile?.email}</p>

            <div className="w-full mt-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Award className="h-4 w-4 text-[var(--accent-green)]" />
                <span className="text-[var(--foreground-muted)]">
                  {experienceYears} anni di esperienza
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Star className="h-4 w-4 text-[var(--accent-yellow)]" />
                <span className="text-[var(--foreground-muted)]">
                  {specializations.length} specializzazioni
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <FileText className="h-4 w-4 text-[var(--accent-blue)]" />
                <span className="text-[var(--foreground-muted)]">
                  {certifications.length} certificazioni
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 card rounded-xl">
          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {[
              { id: "info", label: "Informazioni" },
              { id: "specializations", label: "Specializzazioni" },
              { id: "availability", label: "Disponibilità" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-[var(--accent-green)] text-[var(--accent-green)]"
                    : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Info Tab */}
            {activeTab === "info" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-muted)]" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Telefono
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--foreground-muted)]" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                      placeholder="+39..."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Anni di Esperienza
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={experienceYears}
                    onChange={e => setExperienceYears(parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Biografia
                  </label>
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] resize-none"
                    placeholder="Descrivi la tua esperienza e il tuo approccio all'insegnamento..."
                  />
                </div>
              </div>
            )}

            {/* Specializations Tab */}
            {activeTab === "specializations" && (
              <div className="space-y-6">
                {/* Current Specializations */}
                <div>
                  <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">
                    Le tue specializzazioni
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {specializations.map(spec => (
                      <span
                        key={spec}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent-green)]/10 text-[var(--accent-green)] rounded-full text-sm"
                      >
                        {spec}
                        <button
                          onClick={() => removeSpecialization(spec)}
                          className="hover:opacity-70"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {specializations.length === 0 && (
                      <p className="text-sm text-[var(--foreground-muted)]">
                        Nessuna specializzazione aggiunta
                      </p>
                    )}
                  </div>
                </div>

                {/* Add Specialization */}
                <div>
                  <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">
                    Aggiungi specializzazione
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {specializationOptions
                      .filter(s => !specializations.includes(s))
                      .map(spec => (
                        <button
                          key={spec}
                          onClick={() => setSpecializations([...specializations, spec])}
                          className="px-3 py-1.5 border border-[var(--border)] rounded-full text-sm text-[var(--foreground-muted)] hover:border-[var(--accent-green)] hover:text-[var(--accent-green)] transition-colors"
                        >
                          + {spec}
                        </button>
                      ))}
                  </div>
                </div>

                {/* Certifications */}
                <div className="pt-6 border-t border-[var(--border)]">
                  <h3 className="text-sm font-medium text-[var(--foreground)] mb-3">
                    Certificazioni
                  </h3>
                  <div className="space-y-2">
                    {certifications.map(cert => (
                      <div
                        key={cert}
                        className="flex items-center justify-between p-3 bg-[var(--surface)] border border-[var(--border)] rounded-lg"
                      >
                        <span className="text-[var(--foreground)]">{cert}</span>
                        <button
                          onClick={() => removeCertification(cert)}
                          className="text-[var(--foreground-muted)] hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <input
                      type="text"
                      value={newCert}
                      onChange={e => setNewCert(e.target.value)}
                      placeholder="es. FIT - Maestro Nazionale"
                      className="flex-1 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)]"
                    />
                    <button
                      onClick={addCertification}
                      disabled={!newCert}
                      className="px-4 py-2 bg-[var(--accent-green)] text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                    >
                      Aggiungi
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Tab */}
            {activeTab === "availability" && (
              <div className="space-y-4">
                <p className="text-[var(--foreground-muted)]">
                  Imposta la tua disponibilità settimanale per le lezioni.
                </p>

                {["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"].map((day, idx) => (
                  <div
                    key={day}
                    className="flex items-center justify-between p-4 border border-[var(--border)] rounded-lg"
                  >
                    <span className="font-medium text-[var(--foreground)]">{day}</span>
                    <div className="flex items-center gap-3">
                      <select className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm">
                        <option value="">Non disponibile</option>
                        <option value="08:00">08:00</option>
                        <option value="09:00">09:00</option>
                        <option value="10:00">10:00</option>
                      </select>
                      <span className="text-[var(--foreground-muted)]">-</span>
                      <select className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] text-sm">
                        <option value="">-</option>
                        <option value="18:00">18:00</option>
                        <option value="19:00">19:00</option>
                        <option value="20:00">20:00</option>
                        <option value="21:00">21:00</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
