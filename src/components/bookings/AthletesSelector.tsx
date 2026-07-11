"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { type UserRole } from "@/lib/roles";
import { toast } from "sonner";

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
  nonRemovableUserIds?: string[];
  participantLabelByIndex?: (index: number, athlete: SelectedAthlete) => string | null;
  participantToneByIndex?: (index: number, athlete: SelectedAthlete) => "secondary" | "dark";
  selectedDisplayOrder?: number[];
  maxAthletes?: number | null;
  useSecondaryParticipantBorder?: boolean;
  previousGuests?: PreviousGuest[];
  allowGuestParticipants?: boolean;
  avatarByUserId?: Record<string, string>;
  inlineMode?: boolean;
  searchPlaceholder?: string;
  keepNeutralSelectedBorder?: boolean;
  keepNeutralInputFocus?: boolean;
  hideEmptyMessages?: boolean;
}

export default function AthletesSelector({
  athletes,
  selectedAthletes,
  onAthleteAdd,
  onAthleteRemove,
  nonRemovableUserIds = [],
  participantLabelByIndex,
  participantToneByIndex,
  selectedDisplayOrder,
  maxAthletes = 4,
  useSecondaryParticipantBorder = false,
  previousGuests = [],
  allowGuestParticipants = true,
  avatarByUserId = {},
  inlineMode = false,
  searchPlaceholder,
  keepNeutralSelectedBorder = true,
  keepNeutralInputFocus = true,
  hideEmptyMessages = false,
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
    if (inlineMode) return;
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inlineMode, isOpen]);

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
    setSearchTerm("");
  };

  const handleAddGuest = () => {
    if (!guestName.trim()) {
      toast.warning("Inserisci il nome dell'ospite");
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

  const getInitials = (name: string) =>
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  const inputPlaceholder = searchPlaceholder || (allowGuestParticipants ? "Cerca atleta o ospite..." : "Cerca atleta...");

  return (
    <div className="space-y-4">
      <div className="relative" ref={dropdownRef}>
        {!inlineMode && (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="h-11 w-full rounded-lg border border-black/10 bg-white px-4 text-sm text-left text-secondary flex items-center justify-between focus:outline-none focus:ring-0 focus:border-black/10"
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
        )}

        {(inlineMode || isOpen) && (
          <div className={`${inlineMode ? "w-full" : "absolute z-50 mt-1 w-full rounded-lg border border-black/10 bg-white overflow-hidden"}`}>
            <div className={`space-y-4 ${inlineMode ? "" : "bg-white p-6 border-b border-black/10"}`}>
              <div className={inlineMode ? "" : ""}>
              <div className={inlineMode ? "flex items-center gap-2" : ""}>
              <div className={`${inlineMode ? "relative flex-1" : "relative w-full"}`}>
                <input
                  type="text"
                  placeholder={inputPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`${inlineMode ? "h-11 w-full" : "w-full"} rounded-lg border border-black/10 bg-white pl-4 pr-10 ${inlineMode ? "" : "py-3"} text-secondary placeholder:text-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10`}
                />
                {searchTerm.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded text-secondary/60 hover:bg-secondary/10 hover:text-secondary transition-colors"
                    aria-label="Svuota ricerca"
                    title="Svuota"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {inlineMode && allowGuestParticipants && (
                <button
                  type="button"
                  onClick={() => setShowGuestForm((prev) => !prev)}
                  className="inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-white hover:opacity-90 transition-all"
                  aria-label={showGuestForm ? "Chiudi form ospite" : "Aggiungi ospite non registrato"}
                  title={showGuestForm ? "Chiudi" : "Aggiungi ospite"}
                >
                  {showGuestForm ? <X className="h-5 w-5" /> : <span className="text-xl leading-none">+</span>}
                </button>
              )}
              </div>
              </div>
            </div>

              {(searchTerm.trim().length > 0 || !inlineMode) && (
                <div className={`max-h-[360px] overflow-y-auto scrollbar-hide space-y-2 ${inlineMode ? "mt-3" : "p-6 bg-white"}`}>
                {/* Atleti registrati */}
                {athletes.length > 0 && (
                  <>
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
                          className={`w-full text-left p-3 rounded-lg transition flex items-center gap-3 text-sm border ${
                            isSelected
                              ? `${keepNeutralSelectedBorder ? "border-black/10" : "border-secondary"} bg-secondary text-white hover:opacity-95`
                              : "border-black/10 bg-white text-secondary hover:border-secondary/50 hover:shadow-sm"
                          } ${canToggle ? "" : "opacity-60 cursor-not-allowed"}`}
                        >
                          <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold overflow-hidden ${
                            isSelected ? "bg-white/10 text-white" : "bg-secondary text-white"
                          }`}>
                            {avatarByUserId[athlete.id] ? (
                              <img src={avatarByUserId[athlete.id]} alt={athlete.full_name || "Atleta"} className="w-full h-full object-cover" />
                            ) : (
                              <span>{getInitials(athlete.full_name || "Atleta")}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${isSelected ? "text-white" : "text-secondary"}`}>{athlete.full_name}</p>
                            <p className={`text-xs mt-0.5 truncate ${isSelected ? "text-white/80" : "text-secondary/60"}`}>
                              {[athlete.email, athlete.phone].filter(Boolean).join(" ")}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                    {!hideEmptyMessages && filteredAthletes.length === 0 && searchTerm && athletes.length > 0 && (
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
                            setSearchTerm("");
                          }}
                          className={`w-full text-left p-3 rounded-lg transition flex items-center gap-3 text-sm border ${
                            alreadySelected
                              ? `${keepNeutralSelectedBorder ? "border-black/10" : "border-secondary"} bg-secondary text-white hover:opacity-95`
                              : "border-black/10 bg-white text-secondary hover:border-secondary/50 hover:shadow-sm"
                          } ${canToggle ? "" : "opacity-60 cursor-not-allowed"}`}
                        >
                          <div className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center text-sm font-bold overflow-hidden ${
                            alreadySelected ? "bg-white/10 text-white" : "bg-secondary text-white"
                          }`}>
                            <span>{getInitials(guest.fullName)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium truncate ${alreadySelected ? "text-white" : "text-secondary"}`}>{guest.fullName}</p>
                            <p className={`text-xs mt-0.5 truncate ${alreadySelected ? "text-white/80" : "text-secondary/60"}`}>
                              {[guest.email, guest.phone].filter(Boolean).join(" ")}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Nessun risultato */}
                {!hideEmptyMessages && searchTerm && filteredAthletes.length === 0 && filteredPreviousGuests.length === 0 && (
                  <p className="text-xs text-secondary/50 px-3 py-2">Nessun risultato</p>
                )}
                </div>
              )}

              {allowGuestParticipants && (
                <>
                  {!inlineMode ? <div className="border-t border-black/10" /> : null}

                  <div className={inlineMode ? "pt-2" : "p-6 bg-white"}>
                    {!inlineMode && (
                      <button
                        onClick={() => setShowGuestForm((prev) => !prev)}
                        className="mb-2 w-full px-6 py-3 bg-secondary hover:opacity-90 text-white font-medium rounded-lg transition-all flex items-center justify-center"
                      >
                        {showGuestForm ? "Annulla" : "+ Aggiungi ospite non registrato"}
                      </button>
                    )}

                    {showGuestForm && (
                      <div className={inlineMode ? "space-y-2" : "space-y-2 p-3 bg-white border border-black/10 rounded-lg"}>
                        <input
                          type="text"
                          placeholder="Nome e cognome"
                          value={guestName}
                          onChange={(e) => setGuestName(e.target.value)}
                          className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                        />
                        <input
                          type="email"
                          placeholder="Email"
                          value={guestEmail}
                          onChange={(e) => setGuestEmail(e.target.value)}
                          className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                        />
                        <input
                          type="tel"
                          placeholder="Telefono"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm text-secondary placeholder-secondary/40 focus:outline-none focus:ring-0 focus:border-black/10"
                        />
                        <button
                          onClick={handleAddGuest}
                          disabled={!canAddMore}
                          className="h-11 w-full px-3 bg-secondary text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          Aggiungi
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
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
              const cardBackground = !athlete.isRegistered
                ? "#023b52"
                : tone === "dark"
                  ? "#023047"
                  : "var(--secondary)";
              const isNonRemovable = Boolean(athlete.userId && nonRemovableUserIds.includes(athlete.userId));
              return (
            <li key={`${athlete.userId || athlete.fullName}-${originalIndex}`}>
              <div className="flex items-center gap-4 py-3 px-3 rounded-lg" style={{ background: cardBackground }}>
                <div className="flex-shrink-0 w-11 h-11 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden">
                  {athlete.userId && avatarByUserId[athlete.userId] ? (
                    <img src={avatarByUserId[athlete.userId]} alt={athlete.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-sm font-bold text-white leading-none">
                      {athlete.fullName.trim().split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  )}
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
                {!isNonRemovable && (
                  <button
                    onClick={() => onAthleteRemove(originalIndex)}
                    className="flex-shrink-0 inline-flex items-center justify-center p-1.5 rounded hover:bg-white/10 text-white/60 hover:text-white transition-all focus:outline-none w-8 h-8"
                    aria-label={`Rimuovi ${athlete.fullName}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
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
