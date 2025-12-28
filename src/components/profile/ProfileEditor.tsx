"use client";

import { useState, useEffect } from "react";
import { User, Mail, Phone, Calendar, MapPin, Award, Save, ChevronRight, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  phone_secondary: string;
  birth_date: string;
  location: string;
  bio: string;
  skill_level: string;
  preferred_times: string[];
  emergency_contact: {
    name: string;
    phone: string;
    relation: string;
  };
  tennis_stats: {
    racket: string;
    grip_size: string;
    playing_style: string;
    hand: string;
  };
  website_url: string;
  social_media: {
    instagram: string;
    facebook: string;
    youtube: string;
  };
}

export default function ProfileEditor() {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [completion, setCompletion] = useState(0);

  const [formData, setFormData] = useState<ProfileData>({
    full_name: "",
    email: "",
    phone: "",
    phone_secondary: "",
    birth_date: "",
    location: "",
    bio: "",
    skill_level: "principiante",
    preferred_times: [],
    emergency_contact: {
      name: "",
      phone: "",
      relation: "",
    },
    tennis_stats: {
      racket: "",
      grip_size: "",
      playing_style: "",
      hand: "destro",
    },
    website_url: "",
    social_media: {
      instagram: "",
      facebook: "",
      youtube: "",
    },
  });

  const steps = [
    { id: 1, name: "Info Personali", icon: User },
    { id: 2, name: "Contatti", icon: Phone },
    { id: 3, name: "Tennis", icon: Award },
    { id: 4, name: "Bio & Social", icon: Mail },
  ];

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFormData({
          full_name: profile.full_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
          phone_secondary: profile.phone_secondary || "",
          birth_date: profile.birth_date || "",
          location: profile.location || "",
          bio: profile.bio || "",
          skill_level: profile.skill_level || "principiante",
          preferred_times: profile.preferred_times || [],
          emergency_contact: profile.emergency_contact || { name: "", phone: "", relation: "" },
          tennis_stats: profile.tennis_stats || { racket: "", grip_size: "", playing_style: "", hand: "destro" },
          website_url: profile.website_url || "",
          social_media: profile.social_media || { instagram: "", facebook: "", youtube: "" },
        });
        setCompletion(profile.profile_completion_percentage || 0);
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          phone: formData.phone,
          phone_secondary: formData.phone_secondary,
          birth_date: formData.birth_date || null,
          location: formData.location,
          bio: formData.bio,
          skill_level: formData.skill_level,
          preferred_times: formData.preferred_times,
          emergency_contact: formData.emergency_contact,
          tennis_stats: formData.tennis_stats,
          website_url: formData.website_url,
          social_media: formData.social_media,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Reload to get updated completion percentage
      await loadProfile();
      alert("Profilo aggiornato con successo!");
    } catch (error: any) {
      console.error("Error saving profile:", error);
      alert("Errore nel salvataggio: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  function togglePreferredTime(time: string) {
    if (formData.preferred_times.includes(time)) {
      setFormData({
        ...formData,
        preferred_times: formData.preferred_times.filter((t) => t !== time),
      });
    } else {
      setFormData({
        ...formData,
        preferred_times: [...formData.preferred_times, time],
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Progress */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Modifica Profilo</h1>
            <p className="text-gray-600 dark:text-gray-400">Completa il tuo profilo atleta</p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{completion}%</div>
            <div className="text-sm text-gray-500">Completato</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${completion}%` }}
          ></div>
        </div>
      </div>

      {/* Steps Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentStep === step.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200"
                }`}
              >
                <step.icon className="w-5 h-5" />
                <span className="hidden md:inline">{step.name}</span>
              </button>
              {index < steps.length - 1 && (
                <ChevronRight className="w-5 h-5 mx-2 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Informazioni Personali
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nome Completo *
              </label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">L'email non può essere modificata</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Data di Nascita
                </label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Città
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Roma, Italia"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contacts */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Contatti
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefono Principale
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+39 ..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Telefono Secondario
                </label>
                <input
                  type="tel"
                  value={formData.phone_secondary}
                  onChange={(e) => setFormData({ ...formData, phone_secondary: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="+39 ..."
                />
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Contatto di Emergenza
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={formData.emergency_contact.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, name: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telefono
                  </label>
                  <input
                    type="tel"
                    value={formData.emergency_contact.phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, phone: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Relazione
                  </label>
                  <select
                    value={formData.emergency_contact.relation}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        emergency_contact: { ...formData.emergency_contact, relation: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleziona...</option>
                    <option value="genitore">Genitore</option>
                    <option value="coniuge">Coniuge</option>
                    <option value="fratello">Fratello/Sorella</option>
                    <option value="amico">Amico/a</option>
                    <option value="altro">Altro</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Tennis */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Preferenze Tennis
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Livello di Gioco
              </label>
              <select
                value={formData.skill_level}
                onChange={(e) => setFormData({ ...formData, skill_level: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="principiante">Principiante</option>
                <option value="intermedio">Intermedio</option>
                <option value="avanzato">Avanzato</option>
                <option value="agonista">Agonista</option>
                <option value="professionista">Professionista</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Orari Preferiti
              </label>
              <div className="flex flex-wrap gap-2">
                {["mattina", "pomeriggio", "sera", "weekend", "feriale"].map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => togglePreferredTime(time)}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors capitalize ${
                      formData.preferred_times.includes(time)
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Racchetta
                </label>
                <input
                  type="text"
                  value={formData.tennis_stats.racket}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tennis_stats: { ...formData.tennis_stats, racket: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Wilson Pro Staff, Babolat Pure Drive..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Misura Grip
                </label>
                <select
                  value={formData.tennis_stats.grip_size}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tennis_stats: { ...formData.tennis_stats, grip_size: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona...</option>
                  <option value="1">1 (4 pollici)</option>
                  <option value="2">2 (4 1/8 pollici)</option>
                  <option value="3">3 (4 1/4 pollici)</option>
                  <option value="4">4 (4 3/8 pollici)</option>
                  <option value="5">5 (4 1/2 pollici)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Stile di Gioco
                </label>
                <select
                  value={formData.tennis_stats.playing_style}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tennis_stats: { ...formData.tennis_stats, playing_style: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona...</option>
                  <option value="baseline">Giocatore da fondo (Baseline)</option>
                  <option value="serve-volley">Serve & Volley</option>
                  <option value="all-court">All-Court</option>
                  <option value="counterpuncher">Contrattaccante (Counterpuncher)</option>
                  <option value="aggressive">Aggressivo</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Mano
                </label>
                <select
                  value={formData.tennis_stats.hand}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tennis_stats: { ...formData.tennis_stats, hand: e.target.value },
                    })
                  }
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="destro">Destro</option>
                  <option value="mancino">Mancino</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Bio & Social */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Bio & Social Media
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Biografia
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Racconta qualcosa di te, la tua esperienza nel tennis, i tuoi obiettivi..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sito Web
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
              />
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Social Media
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Instagram
                  </label>
                  <input
                    type="text"
                    value={formData.social_media.instagram}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        social_media: { ...formData.social_media, instagram: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="@username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Facebook
                  </label>
                  <input
                    type="text"
                    value={formData.social_media.facebook}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        social_media: { ...formData.social_media, facebook: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="facebook.com/username"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    YouTube
                  </label>
                  <input
                    type="text"
                    value={formData.social_media.youtube}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        social_media: { ...formData.social_media, youtube: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="youtube.com/@username"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Indietro
          </button>

          <div className="flex gap-3">
            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Avanti
                <ChevronRight className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-colors"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Salva Profilo
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
