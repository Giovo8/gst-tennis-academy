"use client";

import { useState } from "react";
import { X, Plus, User, Mail } from "lucide-react";
import { type UserRole } from "@/lib/roles";

interface Athlete {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole;
}

interface SelectedAthlete {
  userId?: string;
  fullName: string;
  email?: string;
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

  const availableAthletes = athletes.filter(a => 
    !selectedAthletes.some(s => s.userId === a.id) &&
    (searchTerm === "" || a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelectAthlete = (athlete: Athlete) => {
    onAthleteAdd({
      userId: athlete.id,
      fullName: athlete.full_name || "Atleta",
      email: athlete.email,
      isRegistered: true,
    });
    setSearchTerm("");
    if (selectedAthletes.length + 1 >= maxAthletes) {
      setIsOpen(false);
    }
  };

  const handleAddGuest = () => {
    if (!guestName.trim()) {
      alert("Inserisci il nome dell'ospite");
      return;
    }

    onAthleteAdd({
      fullName: guestName.trim(),
      email: guestEmail.trim() || undefined,
      isRegistered: false,
    });

    setGuestName("");
    setGuestEmail("");
    setShowGuestForm(false);
    
    if (selectedAthletes.length + 1 >= maxAthletes) {
      setIsOpen(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Selected Athletes */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          <Users2 className="inline h-4 w-4 mr-2" />
          Partecipanti ({selectedAthletes.length}/{maxAthletes}) *
        </label>
        
        {selectedAthletes.length > 0 && (
          <div className="space-y-2">
            {selectedAthletes.map((athlete, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center flex-shrink-0">
                    {athlete.isRegistered ? (
                      <User className="h-4 w-4 text-blue-600" />
                    ) : (
                      <span className="text-xs font-bold text-blue-600">O</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{athlete.fullName}</p>
                    {athlete.email && (
                      <p className="text-xs text-gray-600 truncate">{athlete.email}</p>
                    )}
                    {!athlete.isRegistered && (
                      <p className="text-xs text-orange-600 font-medium">Ospite non registrato</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onAthleteRemove(index)}
                  className="flex-shrink-0 p-1 ml-2 text-gray-400 hover:text-red-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedAthletes.length === 0 && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-sm text-gray-600">
            Nessun partecipante selezionato
          </div>
        )}
      </div>

      {/* Add button */}
      {canAddMore && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-50 transition"
        >
          <Plus className="h-4 w-4" />
          Aggiungi partecipante
        </button>
      )}

      {/* Dropdown */}
      {isOpen && canAddMore && (
        <div className="border border-gray-200 rounded-lg p-4 bg-white space-y-3">
          {/* Search Athletes */}
          {athletes.length > 0 && (
            <div>
              <input
                type="text"
                placeholder="Cerca atleta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              
              {availableAthletes.length > 0 && (
                <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                  {availableAthletes.map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => handleSelectAthlete(athlete)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 transition flex items-center gap-2 text-sm"
                    >
                      <User className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{athlete.full_name}</span>
                      <span className="text-gray-500 text-xs flex-1 text-right truncate">{athlete.email}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {searchTerm && availableAthletes.length === 0 && (
                <p className="text-xs text-gray-500 mt-2">Nessun atleta trovato</p>
              )}
            </div>
          )}

          {/* Divider */}
          {athletes.length > 0 && (
            <div className="relative my-3">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-white text-gray-500">o</span>
              </div>
            </div>
          )}

          {/* Guest Form */}
          <div>
            <button
              onClick={() => setShowGuestForm(!showGuestForm)}
              className="text-sm font-medium text-orange-600 hover:text-orange-700 mb-2"
            >
              {showGuestForm ? "Annulla" : "+ Aggiungi ospite non registrato"}
            </button>

            {showGuestForm && (
              <div className="space-y-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <input
                  type="text"
                  placeholder="Nome e cognome *"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <input
                  type="email"
                  placeholder="Email (facoltativo)"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={handleAddGuest}
                  className="w-full px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 transition"
                >
                  Aggiungi
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Import for Users2 icon
import { Users2 } from "lucide-react";
