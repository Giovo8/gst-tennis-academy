"use client";

import { useState } from "react";
import { Check, ChevronDown, User, X } from "lucide-react";
import { type UserRole } from "@/lib/roles";

interface Athlete {
  id: string;
  full_name: string | null;
  email: string;
  phone?: string | null;
  role: UserRole;
}

interface SelectedAthlete {
  userId?: string;
  fullName: string;
  email?: string;
  phone?: string;
  isRegistered: boolean;
}

interface AthletesSelectorProps {
  athletes: Athlete[];
  selectedAthletes: SelectedAthlete[];
  onAthleteAdd: (athlete: SelectedAthlete) => void;
  onAthleteRemove: (index: number) => void;
  maxAthletes?: number;
}

export default function AthletesSelector({
  athletes,
  selectedAthletes,
  onAthleteAdd,
  onAthleteRemove,
  maxAthletes = 4,
}: AthletesSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const canAddMore = selectedAthletes.length < maxAthletes;

  const filteredAthletes = athletes.filter((athlete) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      athlete.full_name?.toLowerCase().includes(term) ||
      athlete.email?.toLowerCase().includes(term) ||
      athlete.phone?.toLowerCase().includes(term)
    );
  });

  const handleSelectAthlete = (athlete: Athlete) => {
    if (!canAddMore) return;
    onAthleteAdd({
      userId: athlete.id,
      fullName: athlete.full_name || "Atleta",
      email: athlete.email,
      phone: athlete.phone || undefined,
      isRegistered: true,
    });
  };

  const handleAddGuest = () => {
    if (!guestName.trim()) {
      alert("Inserisci il nome dell'ospite");
      return;
    }

    if (!canAddMore) return;

    onAthleteAdd({
      fullName: guestName.trim(),
      email: guestEmail.trim() || undefined,
      isRegistered: false,
    });

    setGuestName("");
    setGuestEmail("");
    setShowGuestForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-left text-secondary flex items-center justify-between focus:outline-none"
        >
          <span className={selectedAthletes.length > 0 ? "" : "text-secondary/40"}>
            {selectedAthletes.length > 0
              ? `Partecipanti selezionati (${selectedAthletes.length}/${maxAthletes})`
              : "Seleziona partecipanti"}
          </span>
          <ChevronDown
            className={`h-4 w-4 text-secondary/60 ml-2 flex-shrink-0 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-100 bg-white shadow-lg">
            <div className="p-3 space-y-4">
              {athletes.length > 0 && (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Cerca atleta..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/40"
                  />

                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {filteredAthletes.map((athlete) => {
                      const selectedIndex = selectedAthletes.findIndex(
                        (item) => item.userId === athlete.id
                      );
                      const isSelected = selectedIndex >= 0;
                      const canToggle = isSelected || canAddMore;

                      return (
                        <button
                          key={athlete.id}
                          onClick={() => {
                            if (!canToggle) return;
                            if (isSelected) {
                              onAthleteRemove(selectedIndex);
                            } else {
                              handleSelectAthlete(athlete);
                            }
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm border ${
                            isSelected
                              ? "border-transparent bg-secondary/5"
                              : "border-transparent hover:bg-secondary/5"
                          } ${canToggle ? "" : "opacity-60 cursor-not-allowed"}`}
                        >
                          <span
                            className={`flex items-center justify-center h-4 w-4 rounded border ${
                              isSelected
                                ? "border-secondary/60 bg-secondary/10"
                                : "border-gray-300"
                            }`}
                          >
                            {isSelected && <Check className="h-3 w-3 text-secondary" />}
                          </span>
                          <span className="font-medium text-secondary truncate">
                            {athlete.full_name}
                          </span>
                          <span className="text-secondary/60 text-xs flex-1 text-right truncate">
                            {[athlete.email, athlete.phone].filter(Boolean).join(" ")}
                          </span>
                        </button>
                      );
                    })}

                    {filteredAthletes.length === 0 && searchTerm && (
                      <p className="text-xs text-secondary/50">Nessun atleta trovato</p>
                    )}
                  </div>
                </div>
              )}

              {athletes.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white text-secondary/50">o</span>
                  </div>
                </div>
              )}

              <div>
                <button
                  onClick={() => setShowGuestForm((prev) => !prev)}
                  className="text-sm font-medium text-secondary hover:text-secondary/80 mb-2"
                >
                  {showGuestForm ? "Annulla" : "+ Aggiungi ospite non registrato"}
                </button>

                {showGuestForm && (
                  <div className="space-y-2 p-3 bg-white border border-gray-200 rounded-lg">
                    <input
                      type="text"
                      placeholder="Nome e cognome"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/40"
                    />
                    <input
                      type="email"
                      placeholder="Email (facoltativo)"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/40"
                    />
                    <button
                      onClick={handleAddGuest}
                      disabled={!canAddMore}
                      className="w-full px-3 py-2 bg-secondary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Aggiungi
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedAthletes.length > 0 && (
        <div className="space-y-3">
          <div className="bg-secondary rounded-lg px-4 py-3 border border-secondary">
            <div className="grid grid-cols-[40px_1fr_1fr_64px] items-center gap-4">
              <div className="text-xs font-bold text-white/80 uppercase text-center">#</div>
              <div className="text-xs font-bold text-white/80 uppercase">Nome</div>
              <div className="text-xs font-bold text-white/80 uppercase">Contatti</div>
              <div className="text-xs font-bold text-white/80 uppercase text-center">Azioni</div>
            </div>
          </div>

          {selectedAthletes.map((athlete, index) => {
            const borderColor = athlete.isRegistered ? "#08b3f7" : "#056c94";
            const contacts = [athlete.email, athlete.phone].filter(Boolean).join(" ");

            return (
              <div
                key={`${athlete.userId || athlete.fullName}-${index}`}
                className="bg-white rounded-lg px-4 py-3 border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all border-l-4"
                style={{ borderLeftColor: borderColor }}
              >
                <div className="grid grid-cols-[40px_1fr_1fr_64px] items-center gap-4">
                  <div className="flex items-center justify-center">
                    {athlete.isRegistered ? (
                      <User className="h-5 w-5 text-secondary/60" strokeWidth={2} />
                    ) : (
                      <span className="text-xs font-bold text-secondary">O</span>
                    )}
                  </div>
                  <div className="font-semibold text-secondary text-sm truncate">
                    {athlete.fullName}
                  </div>
                  <div className="text-xs text-secondary/60 truncate">
                    {contacts || "-"}
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => onAthleteRemove(index)}
                      className="inline-flex items-center justify-center p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-secondary transition-all focus:outline-none w-8 h-8"
                      aria-label={`Rimuovi ${athlete.fullName}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
