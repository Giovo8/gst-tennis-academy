"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, X } from "lucide-react";
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

export interface PreviousGuest {
  fullName: string;
  email?: string;
  phone?: string;
}

interface AthletesSelectorProps {
  athletes: Athlete[];
  selectedAthletes: SelectedAthlete[];
  onAthleteAdd: (athlete: SelectedAthlete) => void;
  onAthleteRemove: (index: number) => void;
  participantLabelByIndex?: (index: number, athlete: SelectedAthlete) => string | null;
  participantToneByIndex?: (index: number, athlete: SelectedAthlete) => "secondary" | "dark";
  selectedDisplayOrder?: number[];
  maxAthletes?: number | null;
  useSecondaryParticipantBorder?: boolean;
  previousGuests?: PreviousGuest[];
  allowGuestParticipants?: boolean;
}

export default function AthletesSelector({
  athletes,
  selectedAthletes,
  onAthleteAdd,
  onAthleteRemove,
  participantLabelByIndex,
  participantToneByIndex,
  selectedDisplayOrder,
  maxAthletes = 4,
  useSecondaryParticipantBorder = false,
  previousGuests = [],
  allowGuestParticipants = true,
}: AthletesSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [showGuestForm, setShowGuestForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const hasMaxLimit = typeof maxAthletes === "number" && Number.isFinite(maxAthletes);
  const canAddMore = !hasMaxLimit || selectedAthletes.length < maxAthletes;
  const displayOrder = (selectedDisplayOrder || [])
    .filter((index, position, array) => index >= 0 && index < selectedAthletes.length && array.indexOf(index) === position);
  const orderedSelectedAthletes = displayOrder.length > 0
    ? displayOrder.map((index) => ({ athlete: selectedAthletes[index], originalIndex: index }))
    : selectedAthletes.map((athlete, index) => ({ athlete, originalIndex: index }));

  const filteredAthletes = athletes.filter((athlete) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      athlete.full_name?.toLowerCase().includes(term) ||
      athlete.email?.toLowerCase().includes(term) ||
      athlete.phone?.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const visiblePreviousGuests = allowGuestParticipants ? previousGuests : [];

  const filteredPreviousGuests = visiblePreviousGuests.filter((guest) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      guest.fullName.toLowerCase().includes(term) ||
      guest.email?.toLowerCase().includes(term) ||
      guest.phone?.toLowerCase().includes(term)
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
      phone: guestPhone.trim() || undefined,
      isRegistered: false,
    });

    setGuestName("");
    setGuestEmail("");
    setGuestPhone("");
    setShowGuestForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="w-full rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-left text-secondary flex items-center justify-between focus:outline-none"
        >
          <span className={selectedAthletes.length > 0 ? "" : "text-secondary/40"}>
            Cerca Utenti
          </span>
          <ChevronDown
            className={`h-4 w-4 text-secondary/60 ml-2 flex-shrink-0 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-100 bg-white shadow-lg">
            <div className="p-3 space-y-3">
              {/* Unica barra di ricerca */}
              <input
                type="text"
                placeholder={allowGuestParticipants ? "Cerca atleta o ospite..." : "Cerca atleta..."}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary/40"
              />

              <div className="max-h-64 overflow-y-auto space-y-1">
                {/* Atleti registrati */}
                {athletes.length > 0 && (
                  <>
                    {(visiblePreviousGuests.length > 0 || filteredAthletes.length > 0) && (
                      <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wide px-1 pt-1">Atleti</p>
                    )}
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
                          <span className="text-secondary/60 text-xs flex-1 text-right truncate hidden sm:block">
                            {[athlete.email, athlete.phone].filter(Boolean).join(" ")}
                          </span>
                        </button>
                      );
                    })}
                    {filteredAthletes.length === 0 && searchTerm && athletes.length > 0 && (
                      <p className="text-xs text-secondary/50 px-3">Nessun atleta trovato</p>
                    )}
                  </>
                )}

                {/* Ospiti precedenti */}
                {allowGuestParticipants && visiblePreviousGuests.length > 0 && filteredPreviousGuests.length > 0 && (
                  <>
                    <div className="pt-1 pb-0.5">
                      <div className="border-t border-gray-100" />
                    </div>
                    <p className="text-xs font-semibold text-secondary/50 uppercase tracking-wide px-1">Ospiti precedenti</p>
                    {filteredPreviousGuests.map((guest, idx) => {
                      const alreadySelected = selectedAthletes.some(
                        (a) => !a.isRegistered && a.fullName.toLowerCase() === guest.fullName.toLowerCase()
                      );
                      const canToggle = alreadySelected || canAddMore;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (alreadySelected || !canAddMore) return;
                            onAthleteAdd({
                              fullName: guest.fullName,
                              email: guest.email,
                              phone: guest.phone,
                              isRegistered: false,
                            });
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm border ${
                            alreadySelected
                              ? "border-transparent bg-secondary/5"
                              : "border-transparent hover:bg-secondary/5"
                          } ${canToggle ? "" : "opacity-60 cursor-not-allowed"}`}
                        >
                          <span
                            className={`flex items-center justify-center h-4 w-4 rounded border flex-shrink-0 ${
                              alreadySelected
                                ? "border-secondary/60 bg-secondary/10"
                                : "border-gray-300"
                            }`}
                          >
                            {alreadySelected && <Check className="h-3 w-3 text-secondary" />}
                          </span>
                          <span className="font-medium text-secondary truncate">{guest.fullName}</span>
                          <span className="text-secondary/60 text-xs flex-1 text-right truncate hidden sm:block">
                            {[guest.email, guest.phone].filter(Boolean).join(" ")}
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Nessun risultato */}
                {searchTerm && filteredAthletes.length === 0 && filteredPreviousGuests.length === 0 && (
                  <p className="text-xs text-secondary/50 px-3 py-2">Nessun risultato</p>
                )}
              </div>

              {allowGuestParticipants && (
                <>
                  <div className="border-t border-gray-200" />

                  <div>
                    <button
                      onClick={() => setShowGuestForm((prev) => !prev)}
                      className="text-sm font-medium text-secondary hover:text-secondary/80 mb-2 pl-3"
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
                        <input
                          type="tel"
                          placeholder="Telefono (facoltativo)"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
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
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedAthletes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {orderedSelectedAthletes.map(({ athlete, originalIndex }) => (
            (() => {
              const customLabel = participantLabelByIndex?.(originalIndex, athlete);
              const participantLabel = customLabel || null;
              const tone = participantToneByIndex?.(originalIndex, athlete) || "secondary";
              const cardBackground = tone === "dark" ? "#023047" : "var(--secondary)";
              return (
            <li key={`${athlete.userId || athlete.fullName}-${originalIndex}`}>
              <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: cardBackground }}>
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center">
                  <span className="text-sm font-bold text-white leading-none">
                    {athlete.fullName.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white text-sm truncate">{athlete.fullName}</p>
                  {(athlete.email || athlete.phone) && (
                    <p className="text-xs text-white/60 mt-0.5 truncate">
                      {[athlete.email, athlete.phone].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
                {participantLabel && (
                  <span className="flex-shrink-0 text-xs font-bold text-white/50 uppercase tracking-wide">
                    {participantLabel}
                  </span>
                )}
                <button
                  onClick={() => onAthleteRemove(originalIndex)}
                  className="flex-shrink-0 inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all focus:outline-none w-8 h-8"
                  aria-label={`Rimuovi ${athlete.fullName}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </li>
              );
            })()
          ))}
        </ul>
      )}
    </div>
  );
}
