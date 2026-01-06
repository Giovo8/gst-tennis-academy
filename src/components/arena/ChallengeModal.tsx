"use client";

import { useState } from "react";
import { X, Loader2, Send } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  opponent: {
    id: string;
    full_name: string;
    avatar_url?: string;
  } | null;
  onChallengeCreated?: () => void;
}

export default function ChallengeModal({
  isOpen,
  onClose,
  opponent,
  onChallengeCreated,
}: ChallengeModalProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !opponent) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!opponent) {
      setError("Nessun avversario selezionato");
      setLoading(false);
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Devi essere autenticato per lanciare una sfida");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/arena/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenger_id: user.id,
          opponent_id: opponent.id,
          message: message.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Errore nella creazione della sfida");
      }

      // Success
      setMessage("");
      onChallengeCreated?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-frozen-500 to-frozen-600">
          <h2 className="text-xl font-bold text-white">Lancia Sfida</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            disabled={loading}
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Opponent Info */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="w-12 h-12 rounded-full bg-frozen-500 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
              {opponent.avatar_url ? (
                <img
                  src={opponent.avatar_url}
                  alt={opponent.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                opponent.full_name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <p className="font-bold text-gray-900">Sfidi:</p>
              <p className="text-gray-600">{opponent.full_name}</p>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Messaggio (opzionale)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Aggiungi un messaggio alla tua sfida..."
              rows={4}
              maxLength={500}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-frozen-500 focus:border-frozen-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{message.length}/500 caratteri</p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Info */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">
              Il tuo avversario riceverà una notifica e potrà accettare o rifiutare la sfida.
              Dopo l'accettazione, potrete organizzare data e campo insieme.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-frozen-500 rounded-lg hover:bg-frozen-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Invio...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Lancia Sfida
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
